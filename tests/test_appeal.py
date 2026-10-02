"""ConcordatAppeal: deference review and delivery back to the case."""

import pytest

from conftest import CONTRACTS, llm_json, to_hex

COMPLAINT = "https://example.org/complaint"
DEFENSE = "https://example.org/defense"
GROUNDS = "https://example.org/grounds"


@pytest.fixture
def appeal(deploy, direct_vm, clock, direct_bob, direct_charlie):
    """bob appeals a first ruling that found a severity-2 violation; charlie plays the case."""
    direct_vm.sender = direct_charlie
    return deploy(
        CONTRACTS / "concordat_appeal.py",
        to_hex(direct_bob),
        1,
        "No spam",
        "Do not post unsolicited promotions.",
        COMPLAINT,
        DEFENSE,
        GROUNDS,
        True,
        2,
        "the post was an advertisement",
    )


def _mock(direct_vm, **verdict):
    direct_vm.mock_web(r"example\.org/complaint", {"status": 200, "body": "Bob posted ads."})
    direct_vm.mock_web(r"example\.org/defense", {"status": 200, "body": "One post only."})
    direct_vm.mock_web(r"example\.org/grounds", {"status": 200, "body": "It was a reply."})
    direct_vm.mock_llm(r"appeal reviewer", llm_json(**verdict))


def test_the_parent_case_is_the_deployer(appeal, direct_charlie, direct_bob):
    status = appeal.get_status()
    assert status["case"].lower() == to_hex(direct_charlie)
    assert status["appellant"].lower() == to_hex(direct_bob)
    assert status["status"] == "pending"


def test_a_sound_first_ruling_is_upheld_as_is(appeal, direct_vm, direct_charlie, recorder):
    # The LLM tries to smuggle in a different verdict; with "sound" set, the
    # contract pins the outcome to the first ruling anyway.
    _mock(direct_vm, first_ruling_sound=True, violation=False, severity=0,
          summary="stands", reasoning="no clear mistake")
    appeal.review()

    status = appeal.get_status()
    assert status["status"] == "decided" and status["first_ruling_sound"] is True
    assert status["violation"] is True and status["severity"] == 2

    (message,) = recorder.messages()
    assert str(message["address"]).lower() == to_hex(direct_charlie)  # the case
    assert message["calldata"]["method"] == "receive_appeal_result"
    assert message["calldata"]["args"][:2] == [True, 2]
    assert message["on"] == "finalized"


def test_an_overturned_ruling_delivers_the_new_verdict(appeal, direct_vm, recorder):
    _mock(direct_vm, first_ruling_sound=False, violation=False, severity=3,
          summary="reply, not an ad", reasoning="the grounds show it was a reply")
    appeal.review()

    status = appeal.get_status()
    assert status["first_ruling_sound"] is False
    assert status["violation"] is False and status["severity"] == 0

    (message,) = recorder.messages()
    assert message["calldata"]["args"][:3] == [False, 0, "reply, not an ad"]


def test_an_overturned_violation_never_has_severity_zero(appeal, direct_vm):
    _mock(direct_vm, first_ruling_sound=False, violation=True, severity=0,
          summary="s", reasoning="r")
    appeal.review()
    status = appeal.get_status()
    assert status["violation"] is True and status["severity"] == 1


def test_review_can_only_run_once(appeal, direct_vm):
    _mock(direct_vm, first_ruling_sound=True, summary="s", reasoning="r")
    appeal.review()
    with direct_vm.expect_revert("already been decided"):
        appeal.review()


def test_a_malformed_llm_answer_is_rejected_and_nothing_is_sent(appeal, direct_vm, recorder):
    _mock(direct_vm, nonsense=True)
    with direct_vm.expect_revert("malformed decision"):
        appeal.review()
    assert appeal.get_status()["status"] == "pending"
    assert recorder.messages() == []


def test_unreachable_grounds_cannot_freeze_the_case(appeal, direct_vm, recorder):
    # Mocks are matched in registration order, so register the failing page first.
    direct_vm.mock_web(r"example\.org/grounds", {"status": 404, "body": "gone"})
    _mock(direct_vm, first_ruling_sound=False, violation=False, severity=0,
          summary="s", reasoning="r")
    appeal.review()  # no revert: the first ruling simply stands
    status = appeal.get_status()
    assert status["status"] == "decided" and status["first_ruling_sound"] is True
    assert status["violation"] is True and status["severity"] == 2
    (message,) = recorder.messages()
    assert message["calldata"]["args"][:2] == [True, 2]


def test_an_unreachable_complaint_page_is_still_rejected(appeal, direct_vm):
    direct_vm.mock_web(r"example\.org/complaint", {"status": 503, "body": "down"})
    _mock(direct_vm, first_ruling_sound=True, summary="s", reasoning="r")
    with direct_vm.expect_revert("HTTP 503"):
        appeal.review()
    assert appeal.get_status()["status"] == "pending"


def test_validators_compare_the_deference_call_not_the_wording(appeal, direct_vm):
    _mock(direct_vm, first_ruling_sound=False, violation=False, severity=0,
          summary="one wording", reasoning="one reason")
    appeal.review()

    # A validator that words things differently but reaches the same call agrees.
    direct_vm.clear_mocks()
    _mock(direct_vm, first_ruling_sound=False, violation=False, severity=0,
          summary="totally different words", reasoning="another reason")
    assert direct_vm.run_validator() is True

    # A validator that would have deferred to the first ruling disagrees.
    direct_vm.clear_mocks()
    _mock(direct_vm, first_ruling_sound=True, summary="s", reasoning="r")
    assert direct_vm.run_validator() is False

    # A validator that overturns but finds a violation disagrees on the outcome.
    direct_vm.clear_mocks()
    _mock(direct_vm, first_ruling_sound=False, violation=True, severity=2,
          summary="s", reasoning="r")
    assert direct_vm.run_validator() is False
