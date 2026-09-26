"""
Synthetic refund processing component.

Processes refund requests and stores the results in a local SQLite database.
"""

import sqlite3
import datetime
from typing import Optional


_DB_PATH = ":memory:"
_connection: Optional[sqlite3.Connection] = None


def _get_connection() -> sqlite3.Connection:
    """Return the active database connection."""
    global _connection
    if _connection is None:
        _connection = sqlite3.connect(_DB_PATH, check_same_thread=False)
        _connection.row_factory = sqlite3.Row
    return _connection


def initialise(db_path: str = ":memory:") -> None:
    """
    Initialise (or reset) the refund store.

    Parameters
    ----------
    db_path:
        Path to the SQLite database file.  Defaults to an in-memory database
        suitable for testing.
    """
    global _DB_PATH, _connection

    if _connection is not None:
        _connection.close()
        _connection = None

    _DB_PATH = db_path
    conn = _get_connection()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS refund_records (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            refund_reference TEXT    NOT NULL,
            account_id       TEXT    NOT NULL,
            amount_cents     INTEGER NOT NULL,
            processed_at     TEXT    NOT NULL
        )
        """
    )
    conn.commit()


def process_refund(
    refund_reference: str,
    account_id: str,
    amount: float,
) -> dict:
    """
    Process a refund and persist it to the refund store.

    Parameters
    ----------
    refund_reference:
        Caller-supplied identifier for this refund request.
    account_id:
        The account to credit.
    amount:
        Refund amount in dollars (converted to cents for storage).

    Returns
    -------
    dict
        The stored refund record.
    """
    conn = _get_connection()
    amount_cents = round(amount * 100)
    processed_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

    cursor = conn.execute(
        """
        INSERT INTO refund_records (refund_reference, account_id, amount_cents, processed_at)
        VALUES (?, ?, ?, ?)
        """,
        (refund_reference, account_id, amount_cents, processed_at),
    )
    conn.commit()

    row = conn.execute(
        "SELECT * FROM refund_records WHERE id = ?",
        (cursor.lastrowid,),
    ).fetchone()

    return dict(row)


def get_refunds(account_id: Optional[str] = None) -> list:
    """
    Retrieve stored refund records.

    Parameters
    ----------
    account_id:
        When provided, filter results to the given account.

    Returns
    -------
    list of dict
        All matching refund records ordered by processed_at.
    """
    conn = _get_connection()

    if account_id is not None:
        rows = conn.execute(
            "SELECT * FROM refund_records WHERE account_id = ? ORDER BY processed_at",
            (account_id,),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM refund_records ORDER BY processed_at"
        ).fetchall()

    return [dict(r) for r in rows]
