# Project Coding Rules (Non-Obvious Only)

- **No source code exists yet** — all component directories contain only `.gitkeep`. Do not assume any implementation when writing new code.
- Component directories are strictly isolated: `demo/`, `investigation/`, `analysis/`, `verification/`, `dashboard/` must only exchange data via JSON files matching schemas in `contracts/`. Never write code that reads another component's internals.
- JSON schema files in `contracts/` are stubs (contain only `"type": "object"`) — you must infer the required fields from `contracts/sample-report.json`, not the schemas.
- Files under `contracts/` define shared interfaces between all EchoCode components. Field names and required structure must not be silently renamed, removed, or changed — any modification must be coordinated across every component that consumes that contract. Once the schema files are populated they become the authoritative machine-readable contracts. `contracts/sample-report.json` remains illustrative sample data and is not a contract file.
- Test files belong under `verification/tests/` (not co-located with source). The runner lives in `verification/runner/`.
- Use `round(amount * 100)` for cent conversion — `int()` truncation is the *intentional defect* the demo is designed to exhibit; never use it in correct code.
- The demo must not connect to any real payment service — no real payment APIs, credentials, accounts, or production-like endpoints. The demonstration must be completely local and self-contained; all payment behaviour is simulated with synthetic data only.
- `runs/` directory (generated local run output) is git-ignored and must not be created in `artifacts/`.
- `artifacts/example-run/` is for a small sanitized real run added later — do not populate it with synthetic data.
- `memory/` stores verified reusable failure records — only write here after a finding is confirmed (not candidate).
