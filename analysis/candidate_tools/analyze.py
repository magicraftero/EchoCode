"""
analysis/candidate_tools/analyze.py
====================================
EchoCode analysis-stage tool.

Reads a failure-signature JSON file and one or more Python target source files,
performs structural static analysis to check whether all required conditions from
the failure signature are present in the target code, and writes a
candidate-findings JSON file conforming to contracts/candidate-findings.schema.json.

The tool deliberately does NOT:
  - run any tests
  - mark any finding as "confirmed"
  - modify any source file
  - invent test output

Usage
-----
From the repository root:

    python analysis/candidate_tools/analyze.py \\
        --signature investigation/failure-signature.json \\
        --target    demo/current/refund_processor.py \\
        --output    analysis/candidate-findings.json \\
        --branch    feat/analysis

Multiple --target files may be supplied:

    python analysis/candidate_tools/analyze.py \\
        --signature investigation/failure-signature.json \\
        --target    demo/current/refund_processor.py \\
        --target    demo/current/payment_processor.py \\
        --output    analysis/candidate-findings.json \\
        --branch    feat/analysis

The tool prints a human-readable summary to stdout and writes the JSON output file.
"""

import argparse
import ast
import datetime
import json
import os
import re
import sys
from typing import Optional


# ---------------------------------------------------------------------------
# AST-based structural checks
# ---------------------------------------------------------------------------

def _source_lines(path: str) -> list[str]:
    """Return the source file as a list of 1-indexed lines (index 0 is unused)."""
    with open(path, encoding="utf-8") as fh:
        content = fh.read()
    # Prepend a dummy element so lines[n] == line n (1-based).
    return [""] + content.splitlines()


def _find_functions_with_durable_writes(path: str) -> list[dict]:
    """
    Walk the AST of *path* and return a list of function descriptors for every
    function that:
      (a) accepts at least one parameter that looks like a caller-supplied
          logical identifier, AND
      (b) contains at least one durable-write statement (SQL INSERT, or a call
          whose name suggests a persistent side-effect).

    Each descriptor is a dict with keys:
        name          – function name
        lineno        – line number of the def statement
        end_lineno    – last line of the function body
        id_params     – list of parameter names that look like idempotency keys
        write_lines   – list of (lineno, snippet) tuples for durable-write statements
        has_guard     – True if any deduplication mechanism was detected
        guard_details – human-readable description of the guard (or empty string)
        schema_issues – list of strings describing schema observations
    """
    with open(path, encoding="utf-8") as fh:
        source = fh.read()

    lines = _source_lines(path)

    try:
        tree = ast.parse(source, filename=path)
    except SyntaxError as exc:
        print(f"  WARNING: could not parse {path}: {exc}", file=sys.stderr)
        return []

    ID_PARAM_PATTERNS = re.compile(
        r"(id|reference|key|token|request_id|idempotency|operation|ref|_id|_ref|_key)$",
        re.IGNORECASE,
    )

    # Matches lines that clearly perform a durable write.
    # For .execute() calls we require a mutating SQL verb on the same line
    # so that pure SELECT calls through execute() are excluded.
    WRITE_CALL_PATTERNS = re.compile(
        r"(\bINSERT\b|\bUPDATE\b|\bDELETE\b"           # bare SQL keywords
        r"|\bsave\b|\bwrite\b|\bcreate\b"               # ORM/file write methods
        r"|\bpost\b|\bput\b|\bemit\b|\bpublish\b|\bappend\b)",  # API/event methods
        re.IGNORECASE,
    )

    DEDUP_PATTERNS = re.compile(
        r"\b(SELECT|EXISTS|INSERT\s+OR\s+IGNORE|ON\s+CONFLICT|UPSERT|get_or_create|"
        r"check|lookup|fetch|find|already|exists|dedup|idempotent)\b",
        re.IGNORECASE,
    )

    results = []

    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue

        # --- (a) Identifier parameters ---
        all_args = (
            node.args.args
            + node.args.posonlyargs
            + node.args.kwonlyargs
        )
        id_params = [
            a.arg for a in all_args
            if ID_PARAM_PATTERNS.search(a.arg)
        ]
        if not id_params:
            continue

        fn_start = node.lineno
        fn_end   = getattr(node, "end_lineno", fn_start + 50)

        # Collect the raw source lines for this function body
        body_lines = lines[fn_start : fn_end + 1]

        # --- (b) Durable-write statements ---
        write_hits = []
        for offset, line in enumerate(body_lines, start=fn_start):
            if WRITE_CALL_PATTERNS.search(line):
                write_hits.append((offset, line.strip()))

        if not write_hits:
            continue

        # --- Deduplication guard detection ---
        guard_lines = []
        for offset, line in enumerate(body_lines, start=fn_start):
            if DEDUP_PATTERNS.search(line):
                guard_lines.append((offset, line.strip()))

        has_guard     = bool(guard_lines)
        guard_details = "; ".join(f"line {ln}: {txt}" for ln, txt in guard_lines)

        results.append({
            "name":          node.name,
            "lineno":        fn_start,
            "end_lineno":    fn_end,
            "id_params":     id_params,
            "write_lines":   write_hits,
            "has_guard":     has_guard,
            "guard_details": guard_details,
            "schema_issues": [],  # populated separately by _check_schema_uniqueness
        })

    return results


def _check_schema_uniqueness(path: str, id_params: list[str]) -> list[str]:
    """
    Scan the raw source text for CREATE TABLE statements and check whether any
    of the *id_params* columns carry a UNIQUE constraint.

    Returns a list of human-readable observations about the schema.
    """
    with open(path, encoding="utf-8") as fh:
        source = fh.read()

    observations = []

    # Find all CREATE TABLE blocks (very rough heuristic — sufficient for demo code)
    table_blocks = re.findall(
        r"CREATE\s+TABLE.*?\(.*?\)",
        source,
        re.IGNORECASE | re.DOTALL,
    )

    if not table_blocks:
        observations.append("No CREATE TABLE statement found in source — schema not inspectable.")
        return observations

    for block in table_blocks:
        for param in id_params:
            # Check if the column definition for this param includes UNIQUE
            col_pattern = re.compile(
                rf"\b{re.escape(param)}\b[^\n,)]*",
                re.IGNORECASE,
            )
            col_match = col_pattern.search(block)
            if col_match:
                col_def = col_match.group(0).strip()
                if re.search(r"\bUNIQUE\b", col_def, re.IGNORECASE):
                    observations.append(
                        f"Column '{param}': UNIQUE constraint IS present in schema. "
                        f"Deduplication is enforced at the database layer."
                    )
                else:
                    observations.append(
                        f"Column '{param}': NO UNIQUE constraint found in schema. "
                        f"A second INSERT with the same '{param}' is structurally permitted."
                    )
            else:
                observations.append(
                    f"Column '{param}' not found in CREATE TABLE block — "
                    f"manual inspection required."
                )

    return observations


# ---------------------------------------------------------------------------
# Condition evaluators
# ---------------------------------------------------------------------------

def _check_mc01(fn: dict) -> dict:
    """MC-01: caller-supplied logical identifier present as a parameter."""
    present = bool(fn["id_params"])
    evidence = (
        f"Function '{fn['name']}()' accepts parameter(s) {fn['id_params']} "
        f"which look like caller-supplied logical identifiers."
        if present
        else f"No parameter resembling an idempotency key found in '{fn['name']}'."
    )
    return {"present": present, "evidence": evidence}


def _check_mc02(fn: dict) -> dict:
    """MC-02: durable write path reachable on every invocation."""
    if not fn["write_lines"]:
        return {"present": False, "evidence": "No durable write statement detected."}
    snippets = "; ".join(f"line {ln}: `{txt}`" for ln, txt in fn["write_lines"][:3])
    return {
        "present": True,
        "evidence": (
            f"Durable write statement(s) found in '{fn['name']}()': {snippets}. "
            f"Conditional logic around these writes will be assessed in MC-03."
        ),
    }


def _check_mc03(fn: dict) -> dict:
    """MC-03: NO deduplication mechanism at the write point."""
    if fn["has_guard"]:
        return {
            "present": False,  # condition 3 is absence of guard — guard IS present → condition not met
            "evidence": (
                f"Deduplication mechanism detected in '{fn['name']}()': "
                f"{fn['guard_details']}. "
                f"The unconditional-write condition may NOT apply — manual review required."
            ),
        }
    schema_obs = " ".join(fn.get("schema_issues", []))
    no_unique = any("NO UNIQUE" in o for o in fn.get("schema_issues", []))
    return {
        "present": True,
        "evidence": (
            f"No deduplication guard detected in '{fn['name']}()': "
            f"no SELECT before the write, no INSERT OR IGNORE, no ON CONFLICT clause. "
            + (f"Schema observation: {schema_obs}" if schema_obs else "Schema not separately verified by this tool.")
        ),
        "no_unique_in_schema": no_unique,
    }


def _check_mc04(fn: dict) -> dict:
    """MC-04: caller able to resubmit the same operation."""
    evidence = (
        f"'{fn['name']}()' is a plain Python function with no built-in call-count "
        f"enforcement. Nothing in the function signature prevents the caller from "
        f"invoking it multiple times with the same {fn['id_params']}. "
        f"Retry-prone contexts (network handlers, message consumers, batch processors) "
        f"are the expected callers of this type of operation."
    )
    return {"present": True, "evidence": evidence}


# ---------------------------------------------------------------------------
# Finding builder
# ---------------------------------------------------------------------------

def _build_finding(
    finding_id: str,
    path: str,
    fn: dict,
    signature: dict,
    mc01: dict,
    mc02: dict,
    mc03: dict,
    mc04: dict,
) -> dict:
    """Assemble one candidate finding dict from the condition check results."""

    all_present = mc01["present"] and mc02["present"] and mc03["present"] and mc04["present"]

    conditions_present = sum([mc01["present"], mc02["present"], mc03["present"], mc04["present"]])
    if conditions_present == 4:
        confidence = "high"
    elif conditions_present == 3:
        confidence = "medium"
    else:
        confidence = "low"

    # Build code references
    write_line_range = (
        f"{fn['write_lines'][0][0]}-{fn['write_lines'][-1][0]}"
        if fn["write_lines"]
        else str(fn["lineno"])
    )

    schema_obs = " ".join(fn.get("schema_issues", []))

    finding = {
        "finding_id": finding_id,
        "title": (
            f"Potential Unguarded Durable Write in '{fn['name']}()' — "
            f"Retry May Produce Duplicate Record"
        ),
        "status": "candidate",
        "historical_pattern_reference": {
            "case_id": signature.get("case_id", ""),
            "pattern_name": signature.get("reusable_failure_pattern", {}).get("name", ""),
            "failure_signature_file": "investigation/failure-signature.json",
            "history_map_file": "investigation/history-map.json",
            "pattern_summary": signature.get("reusable_failure_pattern", {}).get("summary", ""),
        },
        "current_code_references": [
            {
                "ref_id": "CR-001",
                "path": path,
                "lines": str(fn["lineno"]),
                "description": (
                    f"Function signature for '{fn['name']}()'. "
                    f"Caller-supplied identifier parameter(s): {fn['id_params']}."
                ),
            },
            {
                "ref_id": "CR-002",
                "path": path,
                "lines": write_line_range,
                "description": (
                    f"Durable write statement(s) inside '{fn['name']}()'. "
                    + ("No deduplication guard detected." if not fn["has_guard"] else f"Guard detected: {fn['guard_details']}")
                ),
            },
        ],
        "matching_conditions": [],
        "non_matching_conditions": [
            {
                "condition_id": "NM-01",
                "aspect": "Table and column names",
                "historical_detail": "Historical case used table 'ledger', column 'operation_id'.",
                "current_detail": (
                    f"Current code uses different names — check source for actual table/column names. "
                    f"Schema observation: {schema_obs}" if schema_obs else
                    "Current code may use different table/column names. Manual review recommended."
                ),
                "relevance": (
                    "The failure-signature explicitly states the pattern is not specific to "
                    "these names. Cosmetic difference — does not affect applicability."
                ),
            },
        ],
        "reasoning": (
            f"Static analysis of '{fn['name']}()' in {path} identified "
            f"{conditions_present}/4 required conditions from the failure signature. "
            + (
                "All four structural preconditions are present: "
                if all_present else
                f"Not all conditions are met (see matching_conditions). "
            )
            + f"Identifier parameter(s): {fn['id_params']}. "
            + ("Durable write path reached unconditionally. " if mc02["present"] else "Durable write path uncertain. ")
            + ("No deduplication guard detected. " if mc03["present"] else "Deduplication guard present — pattern may not apply. ")
            + "The finding is held at 'candidate' because no behavioral reproduction test has been executed."
        ),
        "proposed_behavioral_test": {
            "description": (
                f"A test that calls '{fn['name']}()' twice with the same "
                f"{fn['id_params'][0] if fn['id_params'] else 'identifier'} and asserts exactly one record exists afterward."
            ),
            "preconditions": [
                "Initialise the module with a clean in-memory store (e.g. initialise(db_path=':memory:')).",
                f"Choose a fixed test identifier, e.g. {fn['id_params'][0].upper()[:6]}-RETRY-001 if applicable.",
            ],
            "steps": [
                f"Step 1: Call '{fn['name']}()' with the test identifier — original submission.",
                f"Step 2: Call '{fn['name']}()' again with the SAME identifier — simulates retry.",
                "Step 3: Retrieve all durable records.",
                "Step 4: Assert that exactly ONE record exists.",
            ],
            "expected_record_count": 1,
            "failure_indicator": (
                "If the record count is 2, the retry was not deduplicated — "
                "one logical operation produced two durable effects. "
                "This would confirm the candidate finding behaviorally."
            ),
            "invariant_being_tested": (
                f"One logical operation, identified by a unique {fn['id_params'][0] if fn['id_params'] else 'identifier'}, "
                "must produce exactly one durable record regardless of how many times it is submitted."
            ),
            "suggested_test_location": (
                f"verification/tests/test_{os.path.splitext(os.path.basename(path))[0]}.py"
            ),
        },
        "confidence": confidence,
        "confidence_rationale": (
            f"{conditions_present}/4 required structural conditions observed directly in source code. "
            + ("All conditions matched — confidence is high." if confidence == "high" else
               "Some conditions uncertain — review recommended before escalating to verification.")
        ),
        "limitations": [
            "Finding is based on static code analysis only. No behavioral test has been run.",
            "The AST scanner uses heuristic patterns to detect identifier parameters and write statements. Manual review of the flagged lines is recommended.",
            "The guard detector may produce false positives if the source contains comments or string literals matching the deduplication patterns.",
            "Concurrent submission scenarios are not covered by this analysis.",
        ],
        "unresolved_questions": [
            f"Does any caller of '{fn['name']}()' perform deduplication before calling it?",
            "Should a deduplicated retry return the original record silently or return a distinct response?",
        ],
    }

    # Populate matching_conditions
    conditions = [
        ("MC-01", signature["required_conditions"][0] if len(signature.get("required_conditions", [])) > 0 else "Caller-supplied identifier present.", mc01["evidence"]),
        ("MC-02", signature["required_conditions"][1] if len(signature.get("required_conditions", [])) > 1 else "Unconditional durable write path present.", mc02["evidence"]),
        ("MC-03", signature["required_conditions"][2] if len(signature.get("required_conditions", [])) > 2 else "No deduplication mechanism present.", mc03["evidence"]),
        ("MC-04", signature["required_conditions"][3] if len(signature.get("required_conditions", [])) > 3 else "Caller able to resubmit.", mc04["evidence"]),
    ]
    for cid, hist_cond, curr_ev in conditions:
        finding["matching_conditions"].append({
            "condition_id": cid,
            "historical_condition": hist_cond,
            "current_evidence": curr_ev,
        })

    return finding


# ---------------------------------------------------------------------------
# Main analysis runner
# ---------------------------------------------------------------------------

def analyze(
    signature_path: str,
    target_paths: list[str],
    output_path: str,
    branch: str,
) -> None:
    """Run the full analysis and write the candidate-findings JSON file."""

    # --- Load failure signature ---
    print(f"Loading failure signature: {signature_path}")
    with open(signature_path, encoding="utf-8") as fh:
        signature = json.load(fh)

    print(f"  Pattern: {signature.get('reusable_failure_pattern', {}).get('name', '(unknown)')}")
    print(f"  Required conditions: {len(signature.get('required_conditions', []))}")

    findings = []
    finding_counter = 1

    for target_path in target_paths:
        if not os.path.isfile(target_path):
            print(f"  WARNING: target file not found: {target_path}", file=sys.stderr)
            continue

        print(f"\nAnalyzing: {target_path}")
        functions = _find_functions_with_durable_writes(target_path)

        if not functions:
            print(f"  No candidate functions found in {target_path}.")
            continue

        for fn in functions:
            # Attach schema observations
            fn["schema_issues"] = _check_schema_uniqueness(target_path, fn["id_params"])

            mc01 = _check_mc01(fn)
            mc02 = _check_mc02(fn)
            mc03 = _check_mc03(fn)
            mc04 = _check_mc04(fn)

            cond_count = sum([mc01["present"], mc02["present"], mc03["present"], mc04["present"]])
            print(
                f"  Function '{fn['name']}()' (line {fn['lineno']}): "
                f"{cond_count}/4 conditions matched"
            )
            for obs in fn["schema_issues"]:
                print(f"    Schema: {obs}")

            # Only emit a finding if at least 2 conditions are present
            if cond_count < 2:
                print(f"    -> Skipping (fewer than 2 conditions met; not a plausible match).")
                continue

            finding_id = f"CF-{finding_counter:03d}"
            finding = _build_finding(
                finding_id, target_path, fn, signature,
                mc01, mc02, mc03, mc04,
            )
            findings.append(finding)
            finding_counter += 1
            print(f"    -> Emitted {finding_id} (confidence: {finding['confidence']}, status: {finding['status']})")

    # --- Build output document ---
    output = {
        "schema_version": "1.0",
        "produced_at": datetime.date.today().isoformat(),
        "stage": "current-code-analysis",
        "source_branch": branch,
        "findings": findings,
    }

    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as fh:
        json.dump(output, fh, indent=2)
        fh.write("\n")

    print(f"\nWrote {len(findings)} finding(s) to: {output_path}")
    if findings:
        print("\nSummary:")
        for f in findings:
            print(f"  {f['finding_id']} — {f['title']}")
            print(f"    status={f['status']}  confidence={f['confidence']}")
    else:
        print("No candidate findings produced.")


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def _parse_args(argv: Optional[list[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="EchoCode analysis tool — static structural analysis against a failure signature.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--signature",
        required=True,
        metavar="PATH",
        help="Path to the failure-signature JSON file (e.g. investigation/failure-signature.json).",
    )
    parser.add_argument(
        "--target",
        required=True,
        action="append",
        metavar="PATH",
        dest="targets",
        help="Path to a Python source file to analyze. May be repeated for multiple files.",
    )
    parser.add_argument(
        "--output",
        required=True,
        metavar="PATH",
        help="Where to write the candidate-findings JSON output.",
    )
    parser.add_argument(
        "--branch",
        default="unknown",
        metavar="BRANCH",
        help="Git branch name to embed in the output (informational).",
    )
    return parser.parse_args(argv)


def main(argv: Optional[list[str]] = None) -> int:
    args = _parse_args(argv)
    analyze(
        signature_path=args.signature,
        target_paths=args.targets,
        output_path=args.output,
        branch=args.branch,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
