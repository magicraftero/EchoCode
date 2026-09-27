# EchoCode — Analysis Stage Prompt

**Component:** `analysis/`  
**Owner:** Abdulwahid  
**Reads:** `investigation/failure-signature.json`  
**Writes:** `analysis/candidate-findings.json`  
**Schema:** `contracts/candidate-findings.schema.json`

---

## Your role

You are performing the **current-code analysis** stage of the EchoCode pipeline.

You have been given a **failure signature** — a reusable behavioral failure pattern
extracted from a confirmed historical defect by the investigation stage. Your job is
to inspect the current target source files, check whether the structural preconditions
described in the signature are present, and produce a set of **candidate findings**.

You do **not** run any tests. You do **not** confirm any defect. You do **not** propose
a fix yet. You produce a precise, evidence-backed document that specifies exactly what
a behavioral test must verify — and you hold every finding at `"candidate"` status until
that test is run.

---

## Inputs

Before starting, read and understand:

1. **`investigation/failure-signature.json`** — the pattern you are checking against.
   Pay particular attention to:
   - `required_conditions` — the four structural conditions that must ALL be present
   - `reusable_failure_pattern.general_risk_indicators` — code signals to look for
   - `reusable_failure_pattern.analogous_contexts` — domain variants confirming the pattern applies beyond the historical domain
   - `reusable_failure_pattern.what_to_look_for_in_future_code` — specific code-level guidance

2. **The target source file(s)** — the current codebase under analysis. Unless otherwise
   specified, start with all Python files under `demo/current/`.

3. **`contracts/candidate-findings.schema.json`** — the schema your output must satisfy.

---

## Step-by-step procedure

### Step 1 — Understand the failure signature

Read `investigation/failure-signature.json` in full.  
Write out, in plain language:
- What the historical failure was
- The four required conditions
- The domain variants listed in `analogous_contexts`

Do not proceed until you have a clear mental model of the pattern.

### Step 2 — Locate candidate functions in the target code

For each source file under analysis:

1. Identify every function or method that:
   - Accepts a caller-supplied identifier parameter (operation_id, idempotency key, reference, request_id, or equivalent)
   - Performs a write to a durable store (database INSERT, file write, external API call that creates a record, etc.)

2. Note the file path and line numbers of:
   - The function signature
   - The schema / table definition (if applicable)
   - The durable write statement

### Step 3 — Check each required condition

For each candidate function, check all four conditions from `required_conditions` against
the actual source code. For each condition record:

- **`condition_id`** — MC-01, MC-02, MC-03, MC-04 (matching the signature order)
- **`historical_condition`** — copy the condition text verbatim from the signature
- **`current_evidence`** — quote the specific code or explain what was found (or not found)

**Condition MC-01:** Does the function accept a caller-supplied logical identifier?  
Look for: a parameter named `*_id`, `*_reference`, `*_key`, `*_token`, `request_id`, or similar.

**Condition MC-02:** Is there a durable write path reached on every invocation?  
Look for: `INSERT`, `CREATE`, `write()`, `save()`, `post()`, or equivalent — with no
enclosing conditional that would skip it for previously-seen identifiers.

**Condition MC-03:** Is there NO deduplication mechanism?  
Check for the ABSENCE of:
- A `SELECT` / existence check before the write
- `INSERT OR IGNORE` / `INSERT ... ON CONFLICT` / `UPSERT`
- A `UNIQUE` constraint on the identifier column in the schema
- Any application-layer dict/cache/set lookup for prior records

**Condition MC-04:** Can the caller invoke the function more than once with the same identifier?  
Look for: absence of call-count enforcement, public API surface, retry-prone context
(network handler, message consumer, webhook receiver, batch processor).

### Step 4 — Document non-matching conditions

Record differences between the historical case and the current code that do **not**
invalidate the pattern match — e.g. different table name, different column name, different
domain. For each, explain why the difference is cosmetic and irrelevant.

Do not invent non-matches. Only document genuine differences.

### Step 5 — Write the reasoning narrative

Write a single `"reasoning"` paragraph that:
- States which of the four conditions are present and how
- Acknowledges any differences from the historical case and explains why they don't matter
- States the overall confidence level (`"low"`, `"medium"`, or `"high"`)
- Ends with: *"The finding is held at 'candidate' because no behavioral reproduction test
  has been executed."*

### Step 6 — Specify the proposed behavioral test

Write a `"proposed_behavioral_test"` object with:

- **`description`** — one sentence: what the test does
- **`preconditions`** — setup steps (e.g. `initialise(db_path=':memory:')`)
- **`steps`** — numbered: Step 1 submit, Step 2 retry, Step 3 retrieve, Step 4 assert
- **`expected_record_count`** — the number of durable records that should exist (almost
  always `1`)
- **`failure_indicator`** — what a failing assertion would show (e.g. "count=2 instead of 1")
- **`invariant_being_tested`** — the business rule in one sentence
- **`suggested_test_location`** — e.g. `verification/tests/test_<component>.py`

Be precise enough that Joshua (verification stage) can implement the test directly from
this specification without reading the source code themselves.

### Step 7 — Assign confidence

| Level | Criteria |
|---|---|
| `"low"` | Fewer than all four conditions clearly present; significant uncertainty |
| `"medium"` | All four conditions appear present but one relies on inference, not direct code observation |
| `"high"` | All four conditions directly observed in source code; no significant ambiguity |
| `"confirmed"` | **Never assigned by the analysis stage.** Only set after a behavioral test FAILS then PASSES after repair. |

### Step 8 — Produce the output file

Write `analysis/candidate-findings.json` conforming to
`contracts/candidate-findings.schema.json`.

Required top-level fields:
```json
{
  "schema_version": "1.0",
  "produced_at": "<YYYY-MM-DD>",
  "stage": "current-code-analysis",
  "source_branch": "<current git branch>",
  "findings": [ ... ]
}
```

Each finding must include:
- `finding_id` (CF-001, CF-002, …)
- `title`
- `status`: always `"candidate"` when first written
- `historical_pattern_reference`
- `current_code_references` (one per condition observed)
- `matching_conditions` (all four)
- `non_matching_conditions` (cosmetic differences only)
- `reasoning`
- `proposed_behavioral_test`
- `confidence` (`"low"`, `"medium"`, or `"high"` — never `"confirmed"`)
- `limitations`

---

## Hard rules

1. **Never mark a finding `"confirmed"`** — that status belongs to the verification stage only, after real pytest output shows FAIL→PASS.
2. **Never invent test output** — if you have not run any tests, say so. Record only what you observed in source code.
3. **Never read another component's internal files** — only read agreed contract files (`contracts/`) and the target source under `demo/current/`.
4. **Never modify application source code** — analysis is read-only. Do not change `refund_processor.py` or any other source file.
5. **Never change contract field names** — field names in the output JSON must match `contracts/candidate-findings.schema.json` exactly.
6. **Quote actual code** — evidence descriptions must reference real file paths and real line numbers, not paraphrases.

---

## Quality checklist before writing output

- [ ] All four required conditions checked — each has a concrete code reference
- [ ] Every `current_evidence` field quotes or directly describes real code, not a guess
- [ ] `status` is `"candidate"` on every finding
- [ ] `confidence` is not `"confirmed"`
- [ ] `proposed_behavioral_test` is specific enough to implement without reading the source
- [ ] `limitations` includes at least: "Finding is based on static analysis only. No behavioral test has been run."
- [ ] Output validates against `contracts/candidate-findings.schema.json`

---

## Example invocation (automated tool)

If using the analysis tool directly:

```bash
python analysis/candidate_tools/analyze.py \
    --signature investigation/failure-signature.json \
    --target    demo/current/refund_processor.py \
    --output    analysis/candidate-findings.json \
    --branch    feat/analysis
```

The tool scaffolds the JSON skeleton and inserts code references automatically.
You then review and complete the `reasoning`, `confidence_rationale`, and
`proposed_behavioral_test` fields.
