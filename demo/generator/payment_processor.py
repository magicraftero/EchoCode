"""
===========================================================================
EchoCode Demo — payment_processor.py
===========================================================================
SYNTHETIC DEMONSTRATION CODE — NOT FOR PRODUCTION USE
- All data is fictional.
- No real payment service is contacted.
===========================================================================
"""

import sqlite3
import os
import tempfile

# ---------------------------------------------------------------------------
# Database location — a temporary file so each fresh demo run starts clean.
# Override by setting the ECHOCODE_DB environment variable.
# ---------------------------------------------------------------------------
_DEFAULT_DB = os.path.join(tempfile.gettempdir(), "echocode_demo_payments.db")
DB_PATH = os.getenv("ECHOCODE_DB", _DEFAULT_DB)


def _connect() -> sqlite3.Connection:
    """Return a connection to the demo SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create the ledger table if it does not already exist."""
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS ledger (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                operation_id TEXT    NOT NULL,
                account_id   TEXT    NOT NULL,
                amount_cents INTEGER NOT NULL,
                recorded_at  TEXT    NOT NULL DEFAULT (datetime('now'))
            )
            """
        )


def reset_db() -> None:
    """
    Drop and recreate the ledger table.
    Use this to return the demo to a known-empty state between runs.
    """
    with _connect() as conn:
        conn.execute("DROP TABLE IF EXISTS ledger")
    init_db()
    print("[reset] Ledger cleared.")


def process_payment(operation_id: str, account_id: str, amount: float) -> dict:
    """
    Record a payment in the ledger and return the inserted row.

    Parameters
    ----------
    operation_id : str   Caller-supplied key for this operation (e.g. "pay-001").
    account_id   : str   Account being charged (e.g. "acct-42").
    amount       : float Charge amount in dollars (e.g. 9.99).
    """
    init_db()
    amount_cents = round(amount * 100)

    with _connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO ledger (operation_id, account_id, amount_cents)
            VALUES (?, ?, ?)
            """,
            (operation_id, account_id, amount_cents),
        )
        row_id = cursor.lastrowid

    return {
        "row_id": row_id,
        "operation_id": operation_id,
        "account_id": account_id,
        "amount_cents": amount_cents,
    }


def get_ledger() -> list[dict]:
    """Return all rows currently in the ledger as a list of dicts."""
    init_db()
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM ledger ORDER BY id"
        ).fetchall()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Demo runner
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("=" * 60)
    print("EchoCode Demo — payment processor")
    print("SYNTHETIC DATA — no real payment service is used")
    print("=" * 60)

    reset_db()

    print("\n[step 1] First call  — operation_id='pay-001', $19.99")
    r1 = process_payment("pay-001", "acct-42", 19.99)
    print(f"         inserted row {r1['row_id']} → {r1['amount_cents']} cents")

    print("\n[step 2] Second call — same operation_id='pay-001', $19.99")
    r2 = process_payment("pay-001", "acct-42", 19.99)
    print(f"         inserted row {r2['row_id']} → {r2['amount_cents']} cents")

    ledger = get_ledger()
    print(f"\n[result] Ledger contains {len(ledger)} row(s)")
    for row in ledger:
        print(f"         {row}")
    print("=" * 60)
