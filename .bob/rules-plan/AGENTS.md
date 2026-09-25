# Project Architecture Rules (Non-Obvious Only)

- **Components are strictly decoupled by design** — the only legal cross-component interface is a JSON file validated against a `contracts/` schema. No component may import or read another component's source files.
- **JSON schemas are currently stubs** — planning must derive field requirements from `contracts/sample-report.json`, not from the schema files themselves.
- Files under `contracts/` define shared interfaces between all EchoCode components. Field names and required structure must not be silently renamed, removed, or changed — any modification must be coordinated across all five component owners (demo, investigation, analysis, verification, dashboard). Once schema files are populated they become the authoritative machine-readable contracts; `contracts/sample-report.json` remains illustrative sample data only.
- **Finding lifecycle is strictly gated**: `candidate` → `confirmed` only after (a) demo app reproduces the defect AND (b) a passing pytest test exists. Skipping either step violates the pipeline invariant.
- **`verification_results.tests_executed`** must be a boolean; it must be `false` until actual pytest output is available — never set to `true` based on assumptions.
- **`memory/`** is append-only for verified records. Nothing from `artifacts/` or `runs/` flows into `memory/` automatically — this is a manual human step.
- **`runs/` is ephemeral and git-ignored** — do not design components that depend on its persistence across environments.
- The pipeline has **no CI/CD, no auth, and no auto-merge** — these are hard out-of-scope constraints, not deferred work.
- **Dashboard is strictly read-only** — it reads the report JSON and renders it; it must never write or mutate any pipeline artifact.
