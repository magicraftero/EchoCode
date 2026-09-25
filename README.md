# EchoCode

This repository is organized by shared contracts/orchestration and team-owned execution areas.

## Repository layout and ownership

```text
echocode/
  README.md
  contracts/                  # Shared; Senthuran coordinates
    failure-signature.schema.json
    candidate-findings.schema.json
    report.schema.json
    sample-report.json
  workflow/                   # Shared orchestration instructions
    project-brief.md
    coordinator-prompt.md
    agent-prompts/
  demo/                       # Arindam
    generator/
    evidence-templates/
  investigation/              # Sughra
    prompts/
    evidence_tools/
  analysis/                   # Abdulwahid
    prompts/
    candidate_tools/
  verification/               # Joshua
    tests/
    runner/
    report_builder/
  dashboard/                  # Senthuran
  memory/                     # Verified reusable failure records
  artifacts/example-run/      # Small sanitized real run
  runs/                       # Generated local runs; ignored by Git
```

## Security reminder

- Keep secrets out of source control (see `.gitignore` and `.bobignore`)
- Use `.env.example` as the template for local environment configuration
