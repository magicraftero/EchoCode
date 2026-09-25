# EchoCode — Project Brief

Shared orchestration brief for all EchoCode agents and team members.

---

## What is EchoCode?

EchoCode is an IBM Bob–assisted software investigation pipeline. Given a
reported incident and a target codebase, EchoCode guides Bob through a
structured sequence of steps:

1. **Reproduce** the defect using a controlled demonstration application.
2. **Investigate** related code, logs, and historical fixes.
3. **Propose** evidence-backed candidate findings.
4. **Verify** those findings using behavioral tests.
5. **Produce** a structured investigation report for human review.

EchoCode is designed for use in a hackathon context with synthetic data. It
does not connect to real payment services, production databases, or live
systems.

---

## High-level workflow

```
Demo
  └─ Arindam provides a Python demonstration application and historical
     evidence templates. The demo reproduces a specific class of defect
     using synthetic data so that Bob can observe the failure directly.

Investigation
  └─ Sughra's prompts and tools guide Bob to investigate the incident
     report, examine relevant source files, and surface historical fixes
     that match the failure signature.

Analysis
  └─ Abdulwahid's prompts and tools guide Bob to analyse the current
     codebase, compare it against the historical evidence, and produce
     a set of candidate findings with supporting evidence.

Verification
  └─ Joshua's pytest behavioral tests are run against the demo
     application. Test results confirm or fail to confirm each
     candidate finding. No test results are invented — only actual
     outputs are recorded.

Report
  └─ The verification component assembles a structured JSON report
     (matching contracts/report.schema.json) that captures the run ID,
     analyzed commit, findings, evidence, verification results, and
     any limitations.

Dashboard
  └─ Senthuran's report viewer reads the JSON report and presents it
     in a simple, human-readable format.
```

---

## Component ownership

| Component | Directory | Owner | Responsibility |
|---|---|---|---|
| Demo application | `demo/` | Arindam | Python demo app and historical evidence |
| Investigation | `investigation/` | Sughra | Incident and historical investigation |
| Analysis | `analysis/` | Abdulwahid | Current-code analysis and proposed fixes |
| Verification | `verification/` | Joshua | Behavioral tests and verification runner |
| Dashboard | `dashboard/` | Senthuran | Report viewer and pipeline integration |

Shared contracts (schemas, sample report, this brief) are coordinated by
Senthuran under `contracts/` and `workflow/`.

---

## Design constraints

The following constraints apply to the entire project. All team members must
respect them.

### Data and demonstration
- The demonstration application is written in **Python**.
- All demonstration data is **synthetic** — no real customer data, payment
  details, or personally identifiable information is used anywhere.
- No real payment services are integrated or simulated as live.

### Testing
- Behavioral tests use **pytest**.
- Only **actual command and test outputs** are recorded in reports. Results
  must never be invented or assumed.
- A finding must not be labelled a **confirmed defect** until it has been
  successfully reproduced by the demonstration application and supported by
  a passing verification test.

### Component handoffs
- Components exchange data using **JSON files** whose structure is defined by
  the schemas in `contracts/`.
- No component should read another component's internal files directly —
  only the agreed contract files.

### Report
- The final report is a **structured JSON file** validated against
  `contracts/report.schema.json`.
- The report must include: run ID, analyzed commit, findings, evidence,
  verification results, and limitations.

### Security and simplicity
- **No authentication** is implemented in the demo or dashboard.
- **No automatic code merging** — EchoCode proposes fixes; a human decides
  whether to apply them.
- The simple report viewer is read-only; it does not modify any data.

---

## What is not in scope

- Real payment processing or financial transactions
- Production database access
- Automated deployment or CI/CD integration
- Any form of user authentication or authorisation
- Automatic application of proposed code fixes
