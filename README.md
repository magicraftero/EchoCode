# EchoCode

> **Current status: shared project foundation only.**
> No application code has been implemented yet. This repository contains only
> the directory structure, shared contracts, and workflow documentation agreed
> upon by the team before implementation begins.

EchoCode is an IBM Bob–assisted investigation pipeline. It uses incident
evidence and historical fixes to help Bob reproduce a software defect,
investigate related code, propose evidence-backed findings, verify those
findings with behavioral tests, and produce a structured investigation report.

---

## Prerequisites

Before you begin, make sure the following are installed on your machine:

| Requirement | Version | Notes |
|---|---|---|
| [Git](https://git-scm.com/) | any recent | for cloning the repository |
| [Python](https://www.python.org/downloads/) | 3.10 or later | the demo application is Python |
| [IBM Bob](https://www.ibm.com/products/bob) | latest | the AI assistant used throughout |

No other services or credentials are needed at this stage. The project uses
synthetic demonstration data and does not connect to any real payment service,
database, or external API.

---

## Clone the repository

```bash
git clone <repository-url>
cd EchoCode
```

Replace `<repository-url>` with the actual URL shown on the repository page.

---

## Open the project in IBM Bob

1. Open **IBM Bob** on your machine.
2. Choose **Open Folder** (or equivalent) and select the `EchoCode` directory
   you just cloned.
3. Bob will load the workspace and you can begin working with the project.

---

## Set up a Python virtual environment

It is good practice to keep project dependencies isolated. Create a virtual
environment inside the project directory:

```bash
# Create the virtual environment (only needed once)
python -m venv .venv
```

Activate it before working:

```bash
# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate
```

Your terminal prompt will change to show `(.venv)` when the environment is
active.

> **Note:** `.venv` is listed in `.gitignore` and will not be committed.

---

## Installing dependencies

No `requirements.txt` exists yet because no application code has been written.
Once team members add their components, a `requirements.txt` (or per-component
requirements files) will be added to the repository. When that happens, install
dependencies with:

```bash
pip install -r requirements.txt
```

Do not run this command yet — the file does not exist.

---

## Environment variables

Copy the example environment file and fill in your own values:

```bash
cp .env.example .env   # macOS / Linux
copy .env.example .env  # Windows
```

Then edit `.env` with a text editor and replace placeholder values with your
own. **Never commit `.env`** — it is already listed in `.gitignore`.

> No real credentials are required at this stage. The `.env.example` file will
> be populated as the team adds components that need configuration.

---

## Repository layout and ownership

```text
EchoCode/
  README.md
  SECURITY.MD                     # Credential and security guidelines
  contracts/                      # Shared; Senthuran coordinates
    failure-signature.schema.json
    candidate-findings.schema.json
    report.schema.json
    sample-report.json            # Illustrative sample — not real data
  workflow/                       # Shared orchestration instructions
    project-brief.md
    coordinator-prompt.md
    agent-prompts/
  demo/                           # Arindam — demo application and historical evidence
    generator/
    evidence-templates/
  investigation/                  # Sughra — incident and historical investigation
    prompts/
    evidence_tools/
  analysis/                       # Abdulwahid — current-code analysis and proposed fixes
    prompts/
    candidate_tools/
  verification/                   # Joshua — tests and verification
    tests/
    runner/
    report_builder/
  dashboard/                      # Senthuran — report viewer and integration
  memory/                         # Verified reusable failure records
  artifacts/example-run/          # Small sanitized real run (added later)
  runs/                           # Generated local runs; ignored by Git
```

---

## Security

- Keep all secrets out of source control (see `.gitignore` and `.bobignore`).
- Read `SECURITY.MD` for the full credential management guidelines before
  making your first commit.
- Never share credentials in AI assistant prompts.
