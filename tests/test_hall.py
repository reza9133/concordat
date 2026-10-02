"""ConcordatHall: rulebook, factory, authentication and standing model."""

import pytest

from conftest import CONTRACTS, FIRST_WINDOW, from_hex, to_hex

COMPLAINT = "https://example.org/complaint"


@pytest.fixture
def hall(deploy, direct_vm, direct_owner, clock):
    direct_vm.sender = direct_owner
    contract = deploy(
        CONTRACTS / "concordat_hall.py",
        "Test Hall",
        3,  # probation at 3 points
        6,  # suspension at 6 points
        2,  # lockout after 2 dismissed complaints
        FIRST_WINDOW,
        FIRST_WINDOW,
    )
    contract.add_rule("No spam", "Do not post unsolicited promotions.")
    contract.add_rule("No harassment", "Do not target members with abuse.")
    return contract


def _file(hall, direct_vm, complainant, accused, rule=1):
    direct_vm.sender = complainant
    return hall.file_case(to_hex(accused), rule, COMPLAINT)


def _settle(hall, direct_vm, case_address, violation, severity):
    """Play the role of the deployed case delivering its final outcome."""
    with direct_vm.prank(from_hex(case_address)):
        hall.report_final(violation, severity)


# The direct runner can load a failing constructor only once per test, so
# each bad-constructor scenario lives in its own test.
def test_constructor_rejects_inverted_thresholds(deploy, direct_vm):
    with direct_vm.expect_revert("probation_points"):
        deploy(CONTRACTS / "concordat_hall.py", "Bad", 5, 5, 2, 60, 60)


def test_constructor_rejects_a_zero_lockout(deploy, direct_vm):
    with direct_vm.expect_revert("max_dismissed_complaints"):
        deploy(CONTRACTS / "concordat_hall.py", "Bad", 1, 2, 0, 60, 60)


def test_rulebook_management_is_owner_only(hall, direct_vm, direct_alice, direct_owner):
    rules = hall.get_rules()
    assert [r["number"] for r in rules] == [1, 2]
    assert rules[0]["title"] == "No spam" and rules[0]["active"] is True

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("only the hall owner"):
        hall.add_rule("Sneaky", "text")
    with direct_vm.expect_revert("only the hall owner"):
        hall.retire_rule(1)

    direct_vm.sender = direct_owner
    hall.retire_rule(1)
    assert hall.get_rules()[0]["active"] is False
    assert hall.get_config()["rule_count"] == 2


def test_file_case_deploys_the_embedded_case_and_records_it(
    hall, direct_vm, direct_alice, direct_bob, recorder
):
    case_address = _file(hall, direct_vm, direct_alice, direct_bob)

    (deployed,) = recorder.deploys()
    assert deployed["code"] == (CONTRACTS / "concordat_case.py").read_bytes()
    args = deployed["calldata"]["args"]
    assert args[0].lower() == to_hex(direct_alice)
    assert args[1].lower() == to_hex(direct_bob)
    assert args[2:6] == [1, "No spam", "Do not post unsolicited promotions.", COMPLAINT]
    assert args[6:] == [FIRST_WINDOW, FIRST_WINDOW]

    assert hall.get_case_count() == 1
    assert hall.get_cases(0, 10) == [case_address]
    record = hall.get_case(case_address)
    assert record["status"] == "pending" and record["rule_number"] == 1
    assert hall.get_standing(to_hex(direct_alice))["cases_filed"] == 1


def test_file_case_uses_a_fresh_salt_per_case(hall, direct_vm, direct_alice, direct_bob, recorder):
    first = _file(hall, direct_vm, direct_alice, direct_bob)
    second = _file(hall, direct_vm, direct_alice, direct_bob)
    assert first != second
    salts = [d["salt_nonce"] for d in recorder.deploys()]
    assert salts == [1, 2]


def test_file_case_rejections(hall, direct_vm, direct_alice, direct_bob, direct_owner):
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("no such rule"):
        hall.file_case(to_hex(direct_bob), 99, COMPLAINT)
    with direct_vm.expect_revert("against yourself"):
        hall.file_case(to_hex(direct_alice), 1, COMPLAINT)
    with direct_vm.expect_revert("http(s) URL"):
        hall.file_case(to_hex(direct_bob), 1, "not-a-url")

    direct_vm.sender = direct_owner
    hall.retire_rule(2)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("retired"):
        hall.file_case(to_hex(direct_bob), 2, COMPLAINT)
    assert hall.get_case_count() == 0


def test_report_final_rejects_callers_the_hall_did_not_deploy(
    hall, direct_vm, direct_alice, direct_bob, direct_charlie
):
    # An ordinary account, and a contract the hall never deployed, look the
    # same to the hall: neither is a key in its case registry.
    _file(hall, direct_vm, direct_alice, direct_bob)
    for stranger in (direct_alice, direct_bob, direct_charlie):
        with direct_vm.prank(stranger):
            with direct_vm.expect_revert("unknown case"):
                hall.report_final(True, 3)
    assert hall.get_standing(to_hex(direct_bob))["points"] == 0


def test_upheld_cases_move_a_member_through_the_standing_ladder(
    hall, direct_vm, direct_alice, direct_bob, direct_owner
):
    bob = to_hex(direct_bob)
    steps = [(2, "good_standing"), (1, "probation"), (3, "suspended")]
    total = 0
    for severity, label in steps:
        case = _file(hall, direct_vm, direct_alice, direct_bob)
        _settle(hall, direct_vm, case, True, severity)
        total += severity
        standing = hall.get_standing(bob)
        assert standing["points"] == total
        assert standing["label"] == label
    assert standing["upheld_against"] == 3
    assert standing["can_file"] is False

    # A suspended member cannot file cases...
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("cannot file cases"):
        hall.file_case(to_hex(direct_alice), 1, COMPLAINT)

    # ...until the owner grants amnesty (never below zero).
    direct_vm.sender = direct_owner
    hall.forgive_points(bob, 4)
    assert hall.get_standing(bob)["points"] == 2  # 6 - 4
    hall.forgive_points(bob, 100)
    standing = hall.get_standing(bob)
    assert standing["points"] == 0 and standing["label"] == "good_standing"
    assert standing["can_file"] is True


def test_dismissed_complaints_lock_the_complainant_out(
    hall, direct_vm, direct_alice, direct_bob
):
    alice = to_hex(direct_alice)
    for _ in range(2):
        case = _file(hall, direct_vm, direct_alice, direct_bob)
        _settle(hall, direct_vm, case, False, 0)
        assert hall.get_case(case)["status"] == "dismissed"

    standing = hall.get_standing(alice)
    assert standing["dismissed_filed"] == 2
    assert standing["can_file"] is False
    assert hall.get_standing(to_hex(direct_bob))["points"] == 0

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("cannot file cases"):
        hall.file_case(to_hex(direct_bob), 1, COMPLAINT)


def test_a_case_can_only_be_settled_once(hall, direct_vm, direct_alice, direct_bob):
    case = _file(hall, direct_vm, direct_alice, direct_bob)
    _settle(hall, direct_vm, case, True, 2)
    with direct_vm.prank(from_hex(case)):
        with direct_vm.expect_revert("already been settled"):
            hall.report_final(True, 2)
    assert hall.get_standing(to_hex(direct_bob))["points"] == 2


def test_severity_is_clamped_when_a_violation_is_reported(
    hall, direct_vm, direct_alice, direct_bob
):
    case = _file(hall, direct_vm, direct_alice, direct_bob)
    _settle(hall, direct_vm, case, True, 99)
    assert hall.get_case(case)["severity"] == 3
    assert hall.get_standing(to_hex(direct_bob))["points"] == 3


def test_forgive_points_and_get_cases_reject_negative_numbers(deploy, direct_vm, direct_owner, direct_alice):
    direct_vm.sender = direct_owner
    hall = deploy(CONTRACTS / "concordat_hall.py", "H", 3, 6, 2, 300, 300)
    with direct_vm.expect_revert("must not be negative"):
        hall.forgive_points(to_hex(direct_alice), -5)
    assert hall.get_standing(to_hex(direct_alice))["points"] == 0
    with direct_vm.expect_revert("must not be negative"):
        hall.get_cases(-1, 5)
