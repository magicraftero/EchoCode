"""
Normal-operation tests for the synthetic refund processor.
"""

import sys
import os

# Allow importing from the parent directory (demo/current/)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
import refund_processor


@pytest.fixture(autouse=True)
def fresh_store():
    """Reset the refund store to a clean in-memory database before each test."""
    refund_processor.initialise(db_path=":memory:")
    yield


class TestSingleRefund:
    def test_one_refund_creates_one_record(self):
        """Submitting a single refund produces exactly one stored record."""
        refund_processor.process_refund(
            refund_reference="REF-001",
            account_id="ACC-100",
            amount=25.00,
        )
        records = refund_processor.get_refunds()
        assert len(records) == 1

    def test_returned_data_matches_stored_record(self):
        """The dict returned by process_refund matches the persisted record."""
        result = refund_processor.process_refund(
            refund_reference="REF-002",
            account_id="ACC-200",
            amount=10.50,
        )
        records = refund_processor.get_refunds()
        assert len(records) == 1
        stored = records[0]

        assert result["refund_reference"] == stored["refund_reference"] == "REF-002"
        assert result["account_id"] == stored["account_id"] == "ACC-200"
        assert result["amount_cents"] == stored["amount_cents"] == 1050
        assert result["processed_at"] == stored["processed_at"]


class TestTwoDifferentRefunds:
    def test_two_different_references_create_two_records(self):
        """Two refund requests with distinct references both persist."""
        refund_processor.process_refund(
            refund_reference="REF-A",
            account_id="ACC-300",
            amount=5.00,
        )
        refund_processor.process_refund(
            refund_reference="REF-B",
            account_id="ACC-300",
            amount=7.50,
        )
        records = refund_processor.get_refunds(account_id="ACC-300")
        assert len(records) == 2

    def test_two_different_references_stored_independently(self):
        """Each of the two records carries its own reference and amount."""
        refund_processor.process_refund(
            refund_reference="REF-X",
            account_id="ACC-400",
            amount=12.00,
        )
        refund_processor.process_refund(
            refund_reference="REF-Y",
            account_id="ACC-400",
            amount=3.75,
        )
        records = refund_processor.get_refunds(account_id="ACC-400")
        refs = {r["refund_reference"] for r in records}
        assert refs == {"REF-X", "REF-Y"}

        amounts = {r["refund_reference"]: r["amount_cents"] for r in records}
        assert amounts["REF-X"] == 1200
        assert amounts["REF-Y"] == 375


class TestReset:
    def test_reset_clears_stored_refunds(self):
        """initialise() wipes all existing refund records."""
        refund_processor.process_refund(
            refund_reference="REF-CLEAR",
            account_id="ACC-500",
            amount=50.00,
        )
        # Confirm record exists before reset
        assert len(refund_processor.get_refunds()) == 1

        # Re-initialise to clear the store
        refund_processor.initialise(db_path=":memory:")

        assert refund_processor.get_refunds() == []
