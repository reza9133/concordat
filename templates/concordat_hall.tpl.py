# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

"""
ConcordatHall - the main contract of the Concordat network. Deploy it once.

    ConcordatHall --file_case()--> deploys ConcordatCase
    ConcordatCase --appeal()-----> deploys ConcordatAppeal
    ConcordatCase --report_final-> ConcordatHall   (internal message)

The hall owns the community rulebook and every member's standing. It is a
factory: the only way a case can exist is file_case(), which deploys the
case itself and records its address. That makes report_final() safe:
"is the sender one of the cases I deployed?" is a real authentication,
because nothing outside this contract can ever add an address to that map.

Standing model:
    points        sum of the severities of violations upheld against a member
    probation     points >= probation_points
    suspended     points >= suspension_points   (cannot file cases)
    dismissed     complaints of yours that ended with "no violation";
                  reaching max_dismissed_complaints locks you out of filing

This file is GENERATED from templates/concordat_hall.tpl.py by
scripts/build.py. The full source of contracts/concordat_case.py (which
itself embeds the appeal contract) is embedded below as base64, so this
single file deploys correctly on its own. Do not edit the embedded block
by hand; edit the case or appeal contract and re-run the build.
"""

from genlayer import *
from dataclasses import dataclass
import base64
import typing

# @@BEGIN_EMBED case@@
_CASE_B64 = ""
# @@END_EMBED case@@


def _addr(value) -> Address:
    if isinstance(value, Address):
        return value
    return Address(value)


def _require_http_url(url: str, what: str) -> None:
    if not (url.startswith("https://") or url.startswith("http://")):
        raise gl.vm.UserError(f"[EXPECTED] {what} must be an http(s) URL")


@allow_storage
@dataclass
class Rule:
    title: str
    text: str
    active: bool


@allow_storage
@dataclass
class Standing:
    points: u32
    upheld_against: u32
    dismissed_filed: u32
    cases_filed: u32


@allow_storage
@dataclass
class CaseRecord:
    complainant: Address
    accused: Address
    rule_number: u32
    status: str  # "pending" | "upheld" | "dismissed"
    severity: u8


class ConcordatHall(gl.Contract):
    owner: Address
    community: str
    probation_points: u32
    suspension_points: u32
    max_dismissed_complaints: u32
    defense_window_seconds: u32
    appeal_window_seconds: u32

    rules: TreeMap[u32, Rule]
    rule_count: u32
    standings: TreeMap[Address, Standing]
    cases: TreeMap[Address, CaseRecord]
    case_addresses: DynArray[Address]
    case_count: u32

    def __init__(
        self,
        community: str,
        probation_points: int,
        suspension_points: int,
        max_dismissed_complaints: int,
        defense_window_seconds: int,
        appeal_window_seconds: int,
    ):
        if probation_points < 1 or suspension_points <= probation_points:
            raise gl.vm.UserError(
                "[EXPECTED] need 1 <= probation_points < suspension_points"
            )
        if max_dismissed_complaints < 1:
            raise gl.vm.UserError("[EXPECTED] max_dismissed_complaints must be at least 1")

        self.owner = gl.message.sender_address
        self.community = community
        self.probation_points = u32(probation_points)
        self.suspension_points = u32(suspension_points)
        self.max_dismissed_complaints = u32(max_dismissed_complaints)
        self.defense_window_seconds = u32(defense_window_seconds)
        self.appeal_window_seconds = u32(appeal_window_seconds)
        self.rule_count = u32(0)
        self.case_count = u32(0)

    # ------------------------------------------------------------------
    # Rulebook (owner only)
    # ------------------------------------------------------------------
    @gl.public.write
    def add_rule(self, title: str, text: str) -> int:
        self._only_owner()
        if title == "" or text == "":
            raise gl.vm.UserError("[EXPECTED] a rule needs a title and a text")
        self.rule_count = u32(self.rule_count + 1)
        number = u32(self.rule_count)
        self.rules[number] = Rule(title=title, text=text, active=True)
        return int(number)

    @gl.public.write
    def retire_rule(self, rule_number: int) -> None:
        self._only_owner()
        number = u32(rule_number)
        if number not in self.rules:
            raise gl.vm.UserError("[EXPECTED] no such rule")
        rule = self.rules[number]
        rule.active = False

    @gl.public.write
    def forgive_points(self, member: str, points: int) -> None:
        """Amnesty: lower a member's points, never below zero."""
        self._only_owner()
        if points < 0:
            raise gl.vm.UserError("[EXPECTED] points to forgive must not be negative")
        standing = self._standing(_addr(member))
        current = int(standing.points)
        standing.points = u32(current - points if current > points else 0)

    def _only_owner(self) -> None:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError("[EXPECTED] only the hall owner may do this")

    # ------------------------------------------------------------------
    # Factory entry point: the ONLY way a case comes into existence.
    # ------------------------------------------------------------------
    @gl.public.write
    def file_case(self, accused: str, rule_number: int, complaint_url: str) -> str:
        complainant = gl.message.sender_address
        accused_address = _addr(accused)
        number = u32(rule_number)

        if number not in self.rules:
            raise gl.vm.UserError("[EXPECTED] no such rule")
        rule = self.rules[number]
        if not rule.active:
            raise gl.vm.UserError("[EXPECTED] this rule has been retired")
        if accused_address == complainant:
            raise gl.vm.UserError("[EXPECTED] you cannot file a case against yourself")
        _require_http_url(complaint_url, "the complaint")
        if not self._can_file(complainant):
            raise gl.vm.UserError(
                "[EXPECTED] you cannot file cases right now (suspended, or too many "
                "dismissed complaints)"
            )

        self.case_count = u32(self.case_count + 1)
        salt_nonce = u256(self.case_count)

        # on="accepted" so the case is usable right away. The case holds no
        # funds, and the hall only trusts its report after finalization.
        case_address = gl.deploy_contract(
            code=base64.b64decode(_CASE_B64),
            args=[
                complainant.as_hex,
                accused_address.as_hex,
                int(number),
                rule.title,
                rule.text,
                complaint_url,
                int(self.defense_window_seconds),
                int(self.appeal_window_seconds),
            ],
            salt_nonce=salt_nonce,
            on="accepted",
        )

        # We deployed this address ourselves, so recording it here is what
        # makes report_final's membership check an authentication.
        self.cases[case_address] = CaseRecord(
            complainant=complainant,
            accused=accused_address,
            rule_number=number,
            status="pending",
            severity=u8(0),
        )
        self.case_addresses.append(case_address)

        standing = self._standing(complainant)
        standing.cases_filed = u32(standing.cases_filed + 1)
        self._standing(accused_address)  # make sure the accused has a record

        return case_address.as_hex

    # ------------------------------------------------------------------
    # Called (as an internal message) by a case once its outcome is final.
    # ------------------------------------------------------------------
    @gl.public.write
    def report_final(self, violation: bool, severity: int) -> None:
        case_address = gl.message.sender_address
        if case_address not in self.cases:
            raise gl.vm.UserError("[EXPECTED] unknown case reporting an outcome")
        record = self.cases[case_address]
        if record.status != "pending":
            raise gl.vm.UserError("[EXPECTED] this case has already been settled")

        if violation:
            points = max(1, min(3, int(severity)))
            record.status = "upheld"
            record.severity = u8(points)
            accused = self._standing(record.accused)
            accused.points = u32(accused.points + points)
            accused.upheld_against = u32(accused.upheld_against + 1)
        else:
            record.status = "dismissed"
            record.severity = u8(0)
            complainant = self._standing(record.complainant)
            complainant.dismissed_filed = u32(complainant.dismissed_filed + 1)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _standing(self, member: Address) -> Standing:
        if member not in self.standings:
            self.standings[member] = Standing(
                points=u32(0),
                upheld_against=u32(0),
                dismissed_filed=u32(0),
                cases_filed=u32(0),
            )
        return self.standings[member]

    def _label(self, points: int) -> str:
        if points >= self.suspension_points:
            return "suspended"
        if points >= self.probation_points:
            return "probation"
        return "good_standing"

    def _can_file(self, member: Address) -> bool:
        if member not in self.standings:
            return True
        standing = self.standings[member]
        if self._label(int(standing.points)) == "suspended":
            return False
        return standing.dismissed_filed < self.max_dismissed_complaints

    # ------------------------------------------------------------------
    # Read methods
    # ------------------------------------------------------------------
    @gl.public.view
    def get_config(self) -> dict[str, typing.Any]:
        return {
            "owner": self.owner.as_hex,
            "community": self.community,
            "probation_points": self.probation_points,
            "suspension_points": self.suspension_points,
            "max_dismissed_complaints": self.max_dismissed_complaints,
            "defense_window_seconds": self.defense_window_seconds,
            "appeal_window_seconds": self.appeal_window_seconds,
            "rule_count": self.rule_count,
            "case_count": self.case_count,
        }

    @gl.public.view
    def get_rules(self) -> list[dict[str, typing.Any]]:
        result = []
        for number in range(1, int(self.rule_count) + 1):
            rule = self.rules[u32(number)]
            result.append(
                {
                    "number": number,
                    "title": rule.title,
                    "text": rule.text,
                    "active": rule.active,
                }
            )
        return result

    @gl.public.view
    def get_standing(self, member: str) -> dict[str, typing.Any]:
        address = _addr(member)
        if address not in self.standings:
            return {
                "points": 0,
                "upheld_against": 0,
                "dismissed_filed": 0,
                "cases_filed": 0,
                "label": "good_standing",
                "can_file": True,
            }
        standing = self.standings[address]
        return {
            "points": standing.points,
            "upheld_against": standing.upheld_against,
            "dismissed_filed": standing.dismissed_filed,
            "cases_filed": standing.cases_filed,
            "label": self._label(int(standing.points)),
            "can_file": self._can_file(address),
        }

    @gl.public.view
    def get_case(self, case_address: str) -> dict[str, typing.Any]:
        address = _addr(case_address)
        if address not in self.cases:
            raise gl.vm.UserError("[EXPECTED] no case registered for this address")
        record = self.cases[address]
        return {
            "complainant": record.complainant.as_hex,
            "accused": record.accused.as_hex,
            "rule_number": record.rule_number,
            "status": record.status,
            "severity": record.severity,
        }

    @gl.public.view
    def get_cases(self, offset: int, limit: int) -> list[str]:
        if offset < 0 or limit < 0:
            raise gl.vm.UserError("[EXPECTED] offset and limit must not be negative")
        total = len(self.case_addresses)
        end = min(total, offset + limit)
        return [self.case_addresses[i].as_hex for i in range(offset, end)]

    @gl.public.view
    def get_case_count(self) -> int:
        return self.case_count
