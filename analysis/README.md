# Analysis Component — EchoCode

**Owner:** Abdulwahid  
**Pipeline stage:** 3 of 5  
**Receives from:** Investigation stage (`investigation/failure-signature.json`)  
**Hands off to:** Verification stage (`analysis/candidate-findings.json`)

---

## Purpose

The analysis component takes a **failure signature** — a reusable behavioral
failure pattern extracted from a confirmed historical defect — and applies it
to the current target codebase via **static structural analysis**.

It produces a **candidate findings file** that:

- identifies code locations where all required structural preconditions are present
- documents the evidence for each matched condition
- specifies a precise behavioral test that would confirm (or rule out) each finding
- holds every finding at `"candidate"` status — no finding is ever confirmed here

The analysis component is **read-only**. It does not modify any source file,
does not run any tests, and does not assert any result as confirmed.

---

## Directory layout

```
analysis/
  README.md                   ← this file
  candidate-findings.json     ← output: written after a run, consumed by verification
  prompts/
    analyze.md                ← Bob prompt: step-by-step analysis instructions for a human or AI analyst
  candidate_tools/
    analyze.py                ← Python tool: automated structural analysis
```

---

## Inputs

| File | Stage that produces it | Description |
|---|---|---|
| `investigation/failure-signature.json` | Investigation | Reusable failure pattern with required conditions and evidence |
| `investigation/history-map.json` | Investigation | Commit history and observed test outcomes |
| Target source file(s) | Demo (Arindam) | Python source to analyse (e.g. `demo/current/refund_processor.py`) |

---

## Output

| File | Consumed by | Schema |
|---|---|---|
| `analysis/candidate-findings.json` | Verification (Joshua) | `contracts/candidate-findings.schema.json` |

### Key output fields

| Field | Meaning |
|---|---|
| `findings[].status` | Always `"candidate"` when first written; only verification may promote to `"confirmed"` |
| `findings[].matching_conditions` | Evidence for each of the four required conditions |
| `findings[].proposed_behavioral_test` | Precise test specification Joshua implements |
| `findings[].confidence` | `"low"` / `"medium"` / `"high"` — never `"confirmed"` |
| `findings[].limitations` | What static analysis cannot guarantee |

---

## Running the automated tool

Prerequisites: Python 3.10+. No third-party packages required — the tool uses
only the standard library.

```bash
# From the repository root:
python analysis/candidate_tools/analyze.py \
    --signature investigation/failure-signature.json \
    --target    demo/current/refund_processor.py \
    --output    analysis/candidate-findings.json \
    --branch    feat/analysis
```

Multiple target files:

```bash
python analysis/candidate_tools/analyze.py \
    --signature investigation/failure-signature.json \
    --target    demo/current/refund_processor.py \
    --target    demo/current/payment_processor.py \
    --output    analysis/candidate-findings.json \
    --branch    feat/analysis
```

The tool prints a human-readable summary and writes the JSON output file.

### What the tool does

1. Loads `investigation/failure-signature.json` and reads the four required conditions.
2. Parses each target Python file with the standard-library `ast` module.
3. For every function that:
   - accepts a parameter resembling a caller-supplied logical identifier, **and**
   - contains a statement resembling a durable write (SQL `INSERT`, `execute`, `save`, etc.)
4. Checks all four conditions against that function using heuristic pattern matching.
5. Inspects any `CREATE TABLE` statements for `UNIQUE` constraints on the identifier column.
6. Emits one `"candidate"` finding per matched function (confidence ≥ 2/4 conditions met).
7. Writes the full output to `analysis/candidate-findings.json`.

### Limitations of the automated tool

The tool uses **heuristic AST analysis** — it is not a formal verifier. It will:

- Flag false positives if a function name or string literal matches write patterns
- Miss writes that go through deeply-wrapped helpers not visible in the immediate function body
- Miss deduplication guards implemented in calling layers above the function

**Always review the tool's output manually before handing off to the verification stage.**
The `analysis/prompts/analyze.md` prompt provides the manual review checklist.

---

## Using the Bob prompt instead of the tool

If you prefer a guided manual analysis (or want to cross-check the tool's output),
open `analysis/prompts/analyze.md` and follow the step-by-step procedure with IBM Bob.

The prompt walks through:

1. Reading and understanding the failure signature
2. Locating candidate functions in the target code
3. Checking each of the four required conditions with specific code evidence
4. Documenting non-matching conditions (cosmetic differences)
5. Writing the reasoning narrative
6. Specifying the proposed behavioral test
7. Assigning a confidence level
8. Producing the output JSON

---

## Critical rules

These rules apply to everyone who works in this component:

1. **Never mark a finding `"confirmed"`** in this stage. `"confirmed"` is set only
   by the verification stage after a real pytest FAIL→PASS evidence chain.

2. **Never invent test output.** If you have not run tests, the `verification_evidence`
   block must not appear in the output.

3. **Never modify application source code.** This component is read-only.

4. **Never change contract field names.** All field names in `analysis/candidate-findings.json`
   must match `contracts/candidate-findings.schema.json` exactly.

5. **Only read agreed contract files.** Do not reach into `investigation/`'s internal
   files beyond `failure-signature.json` and `history-map.json`.

---

## The candidate/confirmed lifecycle

```
Static analysis
    └─ All four conditions present in source?
         YES → emit finding with status="candidate"
         NO  → do not emit (or emit with status="candidate", confidence="low", noting incomplete match)

Verification stage (Joshua)
    └─ Runs pytest behavioral test against live code
         FAIL (count=2, expected 1) → promotes status to "confirmed"
         PASS (count=1)             → finding was wrong; marks status="rejected"
```

A finding that was never behaviorally reproduced must never appear as `"confirmed"` in
`artifacts/final-run/report.json` or anywhere else in the pipeline.

---

## Example run output (from the automated tool)

```
Loading failure signature: investigation/failure-signature.json
  Pattern: Unguarded Durable Write on Repeated Logical Operation
  Required conditions: 4

Analyzing: demo/current/refund_processor.py
  Function 'process_refund()' (line 57): 3/4 conditions matched
    Schema: Column 'refund_reference': UNIQUE constraint IS present in schema. Deduplication is enforced at the database layer.
    → Emitted CF-001 (confidence: medium, status: candidate)

Wrote 1 finding(s) to: analysis/candidate-findings.json

Summary:
  CF-001 — Potential Unguarded Durable Write in 'process_refund()' — Retry May Produce Duplicate Record
    status=candidate  confidence=medium
```

> **Note:** In the example above the tool correctly detects the `UNIQUE` constraint and
> marks MC-03 as not met (deduplication IS present), producing `confidence=medium` rather
> than `high`. This reflects the **current repaired state** of `refund_processor.py`.
> Against the original buggy code (bare `INSERT`, no `UNIQUE`), the tool would produce
> `confidence=high` with all four conditions matched.
