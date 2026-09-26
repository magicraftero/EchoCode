# EchoCode Demo — Payment Processor

> **SYNTHETIC DEMONSTRATION CODE — NOT FOR PRODUCTION USE.**
> All data is fictional. No real payment service is contacted.

This tiny app records payment operations in a local SQLite database.
It intentionally contains a **duplicate-operation defect**: calling
`process_payment` twice with the same `operation_id` silently inserts
two ledger rows instead of rejecting the repeat.

EchoCode is built to find exactly this kind of defect automatically.

---

## What's in here

| File | Purpose |
|---|---|
| `demo/generator/payment_processor.py` | Payment function, reset helper, demo runner |
| `verification/tests/test_payment_processor.py` | Normal-operation pytest tests |

---

## Prerequisites

You need **Python 3.10 or later**. Check with:

```bash
python3 --version   # macOS / Linux
python --version    # Windows
```

No extra packages are required — only the Python standard library (`sqlite3`,
`os`, `tempfile`) is used.

---

## Step 1 — Set up a virtual environment (recommended)

```bash
# Create the environment (do this once)
python -m venv .venv

# Activate it — macOS / Linux
source .venv/bin/activate

# Activate it — Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

---

## Step 2 — Run the duplicate-operation demonstration

From the **project root** (`EchoCode/`):

```bash
python3 demo/generator/payment_processor.py   # macOS / Linux
python  demo/generator/payment_processor.py   # Windows
```

Expected output:

```
============================================================
EchoCode Demo — duplicate operation demonstration
SYNTHETIC DATA — no real payment service is used
============================================================

[step 1] First call  — operation_id='pay-001', $19.99
         inserted row 1 → 1999 cents

[step 2] Second call — SAME operation_id='pay-001', $19.99
         inserted row 2 → 1999 cents

[result] Ledger contains 2 row(s) — expected 1, got 2
         {'id': 1, 'operation_id': 'pay-001', ...}
         {'id': 2, 'operation_id': 'pay-001', ...}

[conclusion] Duplicate operation_id was not rejected → double-charge defect confirmed.
============================================================
```

The ledger file is written to your system's temp directory
(e.g. `/tmp/echocode_demo_payments.db` on macOS/Linux).

---

## Step 3 — Reset the database

To wipe the ledger and start fresh, call `reset_db()` from Python:

```bash
python - <<'EOF'
import sys; sys.path.insert(0, "demo/generator")
import payment_processor as pp
pp.reset_db()
print("Done — ledger is empty.")
EOF
```

Or simply delete the database file:

```bash
rm /tmp/echocode_demo_payments.db        # macOS / Linux
del %TEMP%\echocode_demo_payments.db     # Windows Command Prompt
```

---

## Step 4 — Run the normal-operation tests

First install pytest (once, with your virtual environment active):

```bash
pip install pytest          # Windows
pip3 install pytest         # macOS / Linux (if needed)
```

Then run from the **project root**:

```bash
python3 -m pytest demo/tests/test_payment_processor.py -v   # macOS / Linux
python  -m pytest demo/tests/test_payment_processor.py -v   # Windows
```

All four tests should pass — they cover correct behaviour (single insert,
two distinct operations, reset, return value).

---

## Changing the database path

Set the `ECHOCODE_DB` environment variable to use a custom file location:

```bash
ECHOCODE_DB=/tmp/my_demo.db python demo/generator/payment_processor.py
```

---

## What the intentional defect is

`process_payment` does not check whether an `operation_id` already exists
before inserting. A real payment processor would reject a duplicate
`operation_id` (idempotency key) to prevent double charges.

**Do not fix this defect here.** EchoCode's pipeline is designed to detect,
analyse, and report it — fixing it prematurely would remove the demonstration
target.
