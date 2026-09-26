# Refund Processor — Synthetic Demo

This component is a **fully synthetic** refund-processing module that stores
refund records in a local SQLite database.  It exists only for demonstration
purposes and does **not** connect to any real payment service, financial API,
or external system.  All data is generated locally.

---

## Component overview

| Item | Detail |
|------|--------|
| Source | `refund_processor.py` |
| Storage | SQLite (in-memory by default, file-backed when configured) |
| Language | Python 3 |
| Dependencies | standard library only (`sqlite3`, `datetime`) |

### Public API

| Function | Description |
|----------|-------------|
| `initialise(db_path=":memory:")` | Set up (or reset) the refund store |
| `process_refund(refund_reference, account_id, amount)` | Submit a refund and persist the record |
| `get_refunds(account_id=None)` | Retrieve stored refund records, optionally filtered by account |

---

## Running the component

No third-party packages are required.  The module uses only the Python
standard library.

```bash
# From the repository root — activate your virtual environment first if you
# have one, then start a Python session:
python - <<'EOF'
import demo.current.refund_processor as rp

rp.initialise()
record = rp.process_refund("REF-001", "ACC-100", 42.00)
print(record)
print(rp.get_refunds())
EOF
```

Or import it directly from the `demo/current/` directory:

```bash
cd demo/current
python -c "
import refund_processor as rp
rp.initialise()
print(rp.process_refund('REF-001', 'ACC-100', 42.00))
"
```

---

## Running the tests

Tests live in `demo/current/tests/` and use **pytest**.

```bash
# From the repository root:
pytest demo/current/tests/test_refund_processor.py -v
```

Or from the `demo/current/` directory:

```bash
cd demo/current
pytest tests/test_refund_processor.py -v
```

All tests use an in-memory SQLite database and leave no files on disk.

---

## Test coverage

The normal-operation test suite covers:

- A single refund creates exactly one stored record
- The data returned by `process_refund` matches the persisted record
- Two refund requests with different references each produce their own record
- Records for different references are stored independently with correct values
- `initialise()` clears all previously stored refunds
