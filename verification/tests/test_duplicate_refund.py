"""
===========================================================================
EchoCode Verification — test_duplicate_refund.py
===========================================================================
Behavioral regression test for CF-001:
  "Unguarded Durable Write in Refund Processor —
   Retry May Produce Duplicate Refund Record"

Business invariant under test
------------------------------
One logical refund, identified by a unique refund_reference, must produce
exactly ONE durable record in refund_records regardless of how many times
the same refund_reference is submitted.  A client retry or message-queue
redelivery (same refund_reference, same payload) must NOT create a second
row.

Current implementation status
------------------------------
process_refund() performs a bare INSERT with no prior-existence check and
refund_records has no UNIQUE constraint on refund_reference.
This test is therefore expected to FAIL against the current code.

Expected result:  refund_records contains 1 entry
Actual result:    refund_records contains 2 entries  ← CF-001 confirmed

Run from the project root:
    python -m pytest verification/tests/test_duplicate_refund.py -v
===========================================================================
"""

import os
import sys

# ---------------------------------------------------------------------------
# Make demo/current/refund_processor importable from the project root.
# Mirrors the same path-insertion pattern used in demo/current/tests/.
# ---------------------------------------------------------------------------
sys.path.insert(
    0, os.path.join(os.path.dirname(__file__), "..", "..", "demo", "current")
)

import refund_processor


# ---------------------------------------------------------------------------
# Fixture — fresh in-memory SQLite database for this test.
# Uses refund_processor.initialise() exactly as the proposed test in
# analysis/candidate-findings.json specifies.
# ---------------------------------------------------------------------------
import pytest


@pytest.fixture(autouse=True)
def clean_refund_store():
    """Reset the refund store to a clean in-memory database before the test."""
    refund_processor.initialise(db_path=":memory:")
    yield


# ---------------------------------------------------------------------------
# Regression test — CF-001
# ---------------------------------------------------------------------------
REFUND_REFERENCE = "REF-RETRY-001"
ACCOUNT_ID       = "ACC-TEST"
AMOUNT           = 19.99


def test_retry_with_same_refund_reference_does_not_create_duplicate_record():
    """
    Scenario
    --------
    1. Clean refund store (guaranteed by clean_refund_store fixture).
    2. Submit one refund — refund_reference='REF-RETRY-001'.
    3. Simulate a retry / message-queue redelivery: submit the SAME logical
       refund again with the SAME refund_reference.
    4. Retrieve durable refund records.
    5. Assert the business invariant: exactly ONE record exists.

    This test is expected to FAIL against the current implementation because
    process_refund() executes a bare INSERT with no deduplication guard and
    the table schema carries no UNIQUE constraint on refund_reference.

    If the assertion fails with count=2, CF-001 is behaviorally reproduced.
    """
    # Step 1 — store is empty (guaranteed by fixture)
    assert refund_processor.get_refunds() == [], (
        "Pre-condition: refund store must be empty before the test"
    )

    # Step 2 — original submission
    refund_processor.process_refund(REFUND_REFERENCE, ACCOUNT_ID, AMOUNT)

    # Step 3 — retry / redelivery: identical refund_reference resubmitted
    refund_processor.process_refund(REFUND_REFERENCE, ACCOUNT_ID, AMOUNT)

    # Step 4 — retrieve all durable records
    records = refund_processor.get_refunds()

    # Step 5 — assert idempotency invariant
    assert len(records) == 1, (
        f"CF-001 behaviorally reproduced: expected 1 refund record after a "
        f"retry with refund_reference={REFUND_REFERENCE!r}, "
        f"got {len(records)}. "
        f"The retry was not deduplicated — one logical refund produced "
        f"{len(records)} durable records."
    )
