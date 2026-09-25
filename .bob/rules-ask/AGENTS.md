# Project Documentation Rules (Non-Obvious Only)

- **`contracts/` schemas are stubs** — `failure-signature.schema.json`, `candidate-findings.schema.json`, and `report.schema.json` each contain only `{"type": "object"}`. The actual intended structure is documented in `contracts/sample-report.json`, which is the canonical reference.
- **`sample-report.json` is illustrative, not real** — it contains `"_sample_data": true` and a `_comment` field; no tests were run to produce it.
- **`workflow/coordinator-prompt.md`** exists but contains only a heading — it is a placeholder, not a real prompt.
- The project is a **hackathon pipeline for IBM Bob** (`workflow/project-brief.md` has the authoritative scope and constraints). Scope questions should reference that file.
- **`runs/` is git-ignored** and does not appear in the file tree — it is where generated local run output goes.
- `memory/` stores **verified** failure records only; `artifacts/example-run/` is for a sanitized real run to be added later.
