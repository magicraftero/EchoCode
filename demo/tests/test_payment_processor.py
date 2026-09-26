"""
===========================================================================
EchoCode Demo — test_payment_processor.py
===========================================================================
Normal-operation tests for demo/generator/payment_processor.py.

Run with:
    python3 -m pytest demo/tests/test_payment_processor.py -v
===========================================================================
"""

import os
import sys
import pytest

# Make the demo module importable from the project root.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "generator"))

import payment_processor as pp


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    """Point every test at its own fresh SQLite file so tests never share state."""
    db_file = str(tmp_path / "test_payments.db")
    monkeypatch.setattr(pp, "DB_PATH", db_file)
    pp.reset_db()
    yield


# ---------------------------------------------------------------------------
# Normal-operation tests
# ---------------------------------------------------------------------------

def test_single_payment_is_recorded():
    """A single process_payment call writes exactly one row to the ledger."""
    pp.process_payment("pay-001", "acct-10", 10.00)
    ledger = pp.get_ledger()
    assert len(ledger) == 1
    assert ledger[0]["operation_id"] == "pay-001"
    assert ledger[0]["account_id"] == "acct-10"
    assert ledger[0]["amount_cents"] == 1000


def test_two_different_operations_both_recorded():
    """Two calls with distinct operation_ids each produce one row."""
    pp.process_payment("pay-002", "acct-20", 5.00)
    pp.process_payment("pay-003", "acct-20", 7.50)
    ledger = pp.get_ledger()
    assert len(ledger) == 2
    ids = {r["operation_id"] for r in ledger}
    assert ids == {"pay-002", "pay-003"}


def test_reset_clears_ledger():
    """reset_db() leaves the ledger empty."""
    pp.process_payment("pay-004", "acct-30", 1.00)
    assert len(pp.get_ledger()) == 1
    pp.reset_db()
    assert len(pp.get_ledger()) == 0


def test_returned_dict_matches_ledger():
    """process_payment return value is consistent with what is stored."""
    result = pp.process_payment("pay-005", "acct-40", 25.50)
    assert result["operation_id"] == "pay-005"
    assert result["account_id"] == "acct-40"
    assert result["amount_cents"] == 2550
    row = pp.get_ledger()[0]
    assert row["amount_cents"] == result["amount_cents"]
    assert row["id"] == result["row_id"]
