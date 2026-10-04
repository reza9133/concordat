"""Regressions: dead links must never freeze a case or a penalty."""

from conftest import FIRST_WINDOW, from_hex, llm_json, to_hex
from test_case import COMPLAINT, DEFENSE, GROUNDS, _at, _rule, case  # noqa: F401


def test_dead_defense_url_does_not_block_the_ruling(case, direct_vm, direct_bob, direct_alice):
    direct_vm.sender = direct_bob
    case.submit_defense(DEFENSE)
    direct_vm.mock_web(r"example\.org/defense", {"status": 404, "body": "nope"})
    direct_vm.mock_web(r"example\.org/complaint", {"status": 200, "body": "Bob posted ads."})
    direct_vm.mock_llm(r"could not be retrieved", llm_json(violation=True, severity=2, summary="s", reasoning="r"))
    direct_vm.sender = direct_alice
    case.request_ruling()
    status = case.get_status()
    assert status["status"] == "ruled" and status["first_violation"] is True


def test_dead_defense_is_treated_as_no_defense_in_the_prompt(case, direct_vm, direct_bob, direct_alice):
    direct_vm.sender = direct_bob
    case.submit_defense(DEFENSE)
    direct_vm.mock_web(r"example\.org/defense", {"status": 404, "body": "nope"})
    direct_vm.mock_web(r"example\.org/complaint", {"status": 200, "body": "Bob posted ads."})
    # Only matches if the prompt carries the "could not be retrieved" note.
    direct_vm.strict_mocks = False
    direct_vm.mock_llm(r"treat it as no defense", llm_json(violation=False, severity=0, summary="s", reasoning="r"))
    direct_vm.sender = direct_alice
    case.request_ruling()
    assert case.get_status()["first_violation"] is False


def _appealed(case, direct_vm, direct_alice, direct_bob, recorder):
    _at(direct_vm, FIRST_WINDOW)
    _rule(case, direct_vm, direct_alice, violation=True, severity=3, summary="s", reasoning="r")
    direct_vm.sender = direct_bob
    case.appeal(GROUNDS)
    assert case.get_status()["status"] == "under_appeal"


def test_abandon_appeal_waits_for_the_review_window(case, direct_vm, direct_alice, direct_bob, recorder):
    _appealed(case, direct_vm, direct_alice, direct_bob, recorder)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("review window is still open"):
        case.abandon_appeal()
    assert case.get_status()["status"] == "under_appeal"


def test_abandoned_appeal_closes_with_the_first_ruling(case, direct_vm, direct_alice, direct_bob, direct_charlie, recorder):
    _appealed(case, direct_vm, direct_alice, direct_bob, recorder)
    recorder.clear()
    _at(direct_vm, 2 * FIRST_WINDOW)  # appealed at +FIRST_WINDOW, window = FIRST_WINDOW
    direct_vm.sender = direct_alice
    case.abandon_appeal()
    status = case.get_status()
    assert status["status"] == "final"
    assert status["decided_by"] == "first_instance_appeal_abandoned"
    assert status["final_violation"] is True and status["final_severity"] == 3
    (message,) = recorder.messages()
    assert str(message["address"]).lower() == to_hex(direct_charlie)  # the hall
    assert message["calldata"]["method"] == "report_final"
    assert message["calldata"]["args"] == [True, 3]
    assert message["on"] == "finalized"


def test_a_late_appeal_result_is_rejected_after_abandonment(case, direct_vm, direct_alice, direct_bob, recorder):
    _appealed(case, direct_vm, direct_alice, direct_bob, recorder)
    appeal_address = case.get_status()["appeal_contract"]
    _at(direct_vm, 2 * FIRST_WINDOW)
    direct_vm.sender = direct_alice
    case.abandon_appeal()
    with direct_vm.prank(from_hex(appeal_address)):
        with direct_vm.expect_revert("no appeal is pending"):
            case.receive_appeal_result(False, 0, "s", "r")


def test_abandon_appeal_needs_an_appeal(case, direct_vm, direct_alice):
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("no appeal is pending"):
        case.abandon_appeal()


def test_percent_encoded_host_is_rejected(case, direct_vm, direct_bob):
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("percent-encode"):
        case.submit_defense("http://127.0.0.%31/x")
