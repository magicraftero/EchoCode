"""
===========================================================================
EchoCode Verification — test_duplicate_operation.py
===========================================================================
Behavioral regression test for the duplicate-operation defect.

Business invariant under test
------------------------------
One logical payment operation, identified by a unique operation_id, must
produce exactly ONE durable ledger entry regardless of how many times it
is submitted.  A client retry after a timeout (same operation_id, same
payload) must NOT create a second row.

Current implementation status
------------------------------
process_payment() performs a bare INSERT with no duplicate check.
This test is expected to FAIL until the defect is fixed.

Expected result:  ledger contains 1 entry
Actual result:    ledger contains 2 entries  ← defect confirmed

Run from the project root:
    python -m pytest verification/tests/test_duplicate_operation.py -v
===========================================================================
"""

import os
import sys
import pytest

# ---------------------------------------------------------------------------
# Make demo/generator/payment_processor importable from the project root.
# Mirrors the same path-insertion pattern used in demo/tests/.
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "demo", "generator"))

import payment_processor as pp


# ---------------------------------------------------------------------------
# Fixture — isolated, fresh SQLite database for every test.
# Mirrors the fixture in demo/tests/test_payment_processor.py so that this
# test never shares state with Arindam's tests or with other runs.
# ---------------------------------------------------------------------------
@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    """Point this test at its own temporary SQLite file."""
    db_file = str(tmp_path / "verification_payments.db")
    monkeypatch.setattr(pp, "DB_PATH", db_file)
    pp.reset_db()
    yield


# ---------------------------------------------------------------------------
# Regression test
# ---------------------------------------------------------------------------
OPERATION_ID = "pay-retry-001"
ACCOUNT_ID   = "acct-verification-01"
AMOUNT       = 19.99


def test_retry_with_same_operation_id_does_not_create_duplicate_ledger_entry():
    """
    Scenario
    --------
    1. Clean ledger (guaranteed by isolated_db fixture).
    2. Process one logical payment — operation_id='pay-retry-001'.
    3. Simulate a client retry after a timeout: resend the SAME logical
       operation with the SAME operation_id.
    4. Assert the ledger contains exactly 1 entry.

    This test is expected to FAIL against the current implementation because
    process_payment() does not guard against duplicate operation_ids.
    """
    # Step 1 — ledger is empty (guaranteed by fixture)
    assert pp.get_ledger() == [], "Pre-condition: ledger must be empty before the test"

    # Step 2 — original request
    pp.process_payment(OPERATION_ID, ACCOUNT_ID, AMOUNT)

    # Step 3 — client retry: network timed out, client resubmits with same
    #           operation_id (idempotency key)
    pp.process_payment(OPERATION_ID, ACCOUNT_ID, AMOUNT)

    # Step 4 — assert idempotency: one logical operation → one ledger entry
    ledger = pp.get_ledger()
    assert len(ledger) == 1, (
        f"Duplicate-operation defect: expected 1 ledger entry after a retry "
        f"with operation_id={OPERATION_ID!r}, got {len(ledger)}. "
        f"The retry was not deduplicated."
    )
