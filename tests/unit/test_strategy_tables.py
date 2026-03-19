"""
Cross-validation: verify JS basic strategy tables match the published
6-deck, H17, DAS basic strategy reference.

This Python file is the authoritative reference. If JS tables diverge
from these, the JS is wrong.
"""

import json
import subprocess
import pathlib
import pytest

PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent

# ── Reference tables (6-deck, H17, DAS) ──────────────────────────────
# Actions: H=Hit, S=Stand, D=Double, P=Split
# Dealer columns: 2,3,4,5,6,7,8,9,10,A

DEALER_COLS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "A"]

HARD_REFERENCE = {
    5:  "H H H H H H H H H H",
    6:  "H H H H H H H H H H",
    7:  "H H H H H H H H H H",
    8:  "H H H H H H H H H H",
    9:  "H D D D D H H H H H",
    10: "D D D D D D D D H H",
    11: "D D D D D D D D D D",
    12: "H H S S S H H H H H",
    13: "S S S S S H H H H H",
    14: "S S S S S H H H H H",
    15: "S S S S S H H H H H",
    16: "S S S S S H H H H H",
    17: "S S S S S S S S S S",
}

SOFT_REFERENCE = {
    2: "H H H D D H H H H H",  # A,2
    3: "H H H D D H H H H H",  # A,3
    4: "H H D D D H H H H H",  # A,4
    5: "H H D D D H H H H H",  # A,5
    6: "H D D D D H H H H H",  # A,6
    7: "D D D D D S S H H H",  # A,7 - Ds = Double if allowed else Stand
    8: "S S S S D S S S S S",  # A,8
    9: "S S S S S S S S S S",  # A,9
}

PAIR_REFERENCE = {
    "2":  "P P P P P P H H H H",
    "3":  "P P P P P P H H H H",
    "4":  "H H H P P H H H H H",
    "5":  "D D D D D D D D H H",
    "6":  "P P P P P H H H H H",
    "7":  "P P P P P P H H H H",
    "8":  "P P P P P P P P P P",
    "9":  "P P P P P S P P S S",
    "10": "S S S S S S S S S S",
    "A":  "P P P P P P P P P P",
}


def _extract_js_table(table_name: str) -> dict:
    """Run a small Node script to dump a JS strategy table as JSON."""
    script = f"""
    const {{ Strategy }} = require('{PROJECT_ROOT}/static/js/strategy.js');
    console.log(JSON.stringify(Strategy.{table_name}));
    """
    result = subprocess.run(
        ["node", "-e", script],
        capture_output=True, text=True, timeout=10,
    )
    assert result.returncode == 0, f"Node failed: {result.stderr}"
    return json.loads(result.stdout)


@pytest.fixture(scope="module")
def js_hard():
    return _extract_js_table("HARD")


@pytest.fixture(scope="module")
def js_soft():
    return _extract_js_table("SOFT")


@pytest.fixture(scope="module")
def js_pairs():
    return _extract_js_table("PAIRS")


class TestHardTotals:
    def test_all_hard_rows_match(self, js_hard):
        for total, ref_str in HARD_REFERENCE.items():
            expected = ref_str.split()
            for i, dealer in enumerate(DEALER_COLS):
                js_val = js_hard[str(total)][dealer]
                assert js_val == expected[i], (
                    f"Hard {total} vs {dealer}: JS={js_val}, expected={expected[i]}"
                )


class TestSoftTotals:
    def test_all_soft_rows_match(self, js_soft):
        for key, ref_str in SOFT_REFERENCE.items():
            expected = ref_str.split()
            for i, dealer in enumerate(DEALER_COLS):
                js_val = js_soft[str(key)][dealer]
                assert js_val == expected[i], (
                    f"Soft A,{key} vs {dealer}: JS={js_val}, expected={expected[i]}"
                )


class TestPairSplits:
    def test_all_pair_rows_match(self, js_pairs):
        for rank, ref_str in PAIR_REFERENCE.items():
            expected = ref_str.split()
            for i, dealer in enumerate(DEALER_COLS):
                js_val = js_pairs[rank][dealer]
                assert js_val == expected[i], (
                    f"Pair {rank},{rank} vs {dealer}: JS={js_val}, expected={expected[i]}"
                )


class TestCompleteness:
    def test_hard_table_has_all_totals(self, js_hard):
        for total in range(5, 18):
            assert str(total) in js_hard, f"Missing hard total {total}"

    def test_soft_table_has_all_values(self, js_soft):
        for v in range(2, 10):
            assert str(v) in js_soft, f"Missing soft key {v}"

    def test_pairs_table_has_all_ranks(self, js_pairs):
        for rank in ["2", "3", "4", "5", "6", "7", "8", "9", "10", "A"]:
            assert rank in js_pairs, f"Missing pair rank {rank}"

    def test_every_cell_is_valid_action(self, js_hard, js_soft, js_pairs):
        valid = {"H", "S", "D", "P"}
        for table in [js_hard, js_soft, js_pairs]:
            for row_key, row in table.items():
                for dealer, action in row.items():
                    assert action in valid, (
                        f"Invalid action '{action}' at [{row_key}][{dealer}]"
                    )
