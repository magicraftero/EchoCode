# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Status

**No application code exists yet.** The repository contains only directory scaffolding, shared contracts (`contracts/`), and workflow documentation (`workflow/`). All component directories (`demo/`, `investigation/`, `analysis/`, `verification/`, `dashboard/`, `memory/`) contain only `.gitkeep` files.

## Stack

- **Language**: Python (demo application and behavioral tests)
- **Test framework**: pytest (in `verification/`)
- **No package manager or build tooling exists yet** — `requirements.txt` has not been created

## Commands

Once implemented (none available yet):

```bash
# Python virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # Windows PowerShell
source .venv/bin/activate       # macOS / Linux

# Install deps (file does not exist yet)
pip install -r requirements.txt

# Run all tests (once written)
pytest verification/tests/

# Run a single test
pytest verification/tests/test_<name>.py::test_<function>
```

## Architecture

Five-stage pipeline — each stage hands off a JSON file validated against a schema in `contracts/`:

```
demo/ → investigation/ → analysis/ → verification/ → dashboard/
```

- **Component isolation**: components must only read agreed contract files, never each other's internal files.
- **JSON schemas**: `contracts/failure-signature.schema.json`, `contracts/candidate-findings.schema.json`, `contracts/report.schema.json` (all stubs — not yet fully defined).
- **Sample report**: `contracts/sample-report.json` shows the intended report structure including required fields: `run_id`, `analyzed_commit`, `timestamp`, `pipeline_version`, `findings`, `evidence`, `verification_results`, `limitations`.

## Critical Constraints

- A finding must **not** be marked `"confirmed"` until reproduced by the demo app **and** supported by a passing pytest test. Use `"candidate"` until then.
- Only **actual** command/test output goes into reports — results must never be invented.
- The dashboard is **read-only** — it never modifies report data.
- No authentication is implemented anywhere in the project (by design).
- No automatic code-fix merging — EchoCode proposes fixes only; humans apply them.

## Security

- **Never** hardcode credentials or API keys — use `os.getenv('VAR')` with `python-dotenv`.
- `.bobignore` blocks Bob from logging credential patterns — do not modify or remove it.
- `.env` is git-ignored; never commit it. Copy `.env.example` → `.env` (file not yet created).
- Never paste real credentials into AI assistant prompts (they are logged in session history).

## Code Style (Python — project-wide convention)

- All demonstration data must be **synthetic** — no real customer data, PII, or payment details.
- The demo must not connect to any real payment service. Do not use real payment APIs, credentials, accounts, or production-like endpoints. The demonstration must be completely local and self-contained.
- Use `round(amount * 100)` for currency cent conversion (not `int()`), per the known defect pattern the project is built around.
- Load environment variables via `python-dotenv`'s `load_dotenv()` at module entry.
