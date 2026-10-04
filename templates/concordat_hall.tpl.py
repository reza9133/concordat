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
import hashlib
import ipaddress
import re
import typing
from urllib.parse import urlsplit

ERR_EXPECTED = "[EXPECTED]"

MIN_WINDOW_SECONDS = 60
MAX_WINDOW_SECONDS = 365 * 24 * 3600
MAX_POINTS = 1_000_000
MAX_LOCKOUT = 10_000

# @@BEGIN_EMBED case@@
_CASE_B64 = ""
# @@END_EMBED case@@


def _addr(value) -> Address:
    if isinstance(value, Address):
        return value
    return Address(value)


MAX_URL_CHARS = 1000
_LOCAL_SUFFIXES = (
    ".localhost", ".local", ".internal", ".lan", ".home.arpa", ".localdomain",
    ".corp", ".intranet", ".private", ".test", ".invalid",
)
# Public wildcard-DNS services resolve a name such as 127.0.0.1.nip.io to the
# address written inside it, which would smuggle a private IP past a name check.
_WILDCARD_DNS = (
    "nip.io", "sslip.io", "xip.io", "traefik.me", "localtest.me", "lvh.me",
    "vcap.me", "lacolhost.com", "1u.ms",
)
# A dashed IPv4 only counts when it forms a whole label (optionally behind the
# ip-/ec2- prefixes cloud providers use), e.g. 10-0-0-1.example.org or
# ec2-10-0-0-1.compute.example.com. A label that merely CONTAINS four numbers,
# such as my-1-2-3-4-app.vercel.app, is an ordinary name.
_DASHED_IPV4_LABEL_RE = re.compile(r"^(?:ip-|ec2-)?([0-9]{1,3})-([0-9]{1,3})-([0-9]{1,3})-([0-9]{1,3})$")


def _encodes_ipv4(labels) -> bool:
    """True when a hostname spells an IPv4 address (dotted, or as one dashed label)."""

    def octet(label: str) -> bool:
        return label.isascii() and label.isdigit() and len(label) <= 3 and int(label) <= 255

    for i in range(len(labels) - 3):  # four consecutive numeric labels: 1.2.3.4.example.org
        if all(octet(label) for label in labels[i : i + 4]):
            return True
    for label in labels:
        match = _DASHED_IPV4_LABEL_RE.match(label)
        if match and all(int(part) <= 255 for part in match.groups()):
            return True
    return False


_HEX_LABEL_RE = re.compile(r"^0x[0-9a-f]+$")


def _require_http_url(url: str, what: str) -> None:
    """
    Accept only public-looking http(s) URLs that name a domain on a standard
    port. This is a first filter, not a guarantee: a contract cannot resolve
    DNS, so the validators' web module remains the final authority on what may
    be fetched.
    """
    if not isinstance(url, str) or len(url) > MAX_URL_CHARS:
        raise gl.vm.UserError(f"{ERR_EXPECTED} {what} must be an http(s) URL of at most {MAX_URL_CHARS} characters")
    if any(ord(ch) <= 32 or ord(ch) == 127 or ch == "\\" for ch in url):
        raise gl.vm.UserError(f"{ERR_EXPECTED} {what} must not contain spaces, control characters or backslashes")
    try:
        parts = urlsplit(url)
        port = parts.port
    except ValueError:
        raise gl.vm.UserError(f"{ERR_EXPECTED} {what} is not a valid http(s) URL")
    host = (parts.hostname or "").lower().rstrip(".")
    if parts.scheme not in ("http", "https") or host == "":
        raise gl.vm.UserError(f"{ERR_EXPECTED} {what} must be an http(s) URL")
    if "%" in host:
        # A percent-escaped host such as 127.0.0.%31 may be decoded by the
        # fetcher into an address this filter would have refused.
        raise gl.vm.UserError(f"{ERR_EXPECTED} {what} must not percent-encode its host name")
    if parts.username is not None or parts.password is not None:
        raise gl.vm.UserError(f"{ERR_EXPECTED} {what} must not contain credentials")
    if port not in (None, 80, 443):
        raise gl.vm.UserError(f"{ERR_EXPECTED} {what} must use the default http(s) port")
    is_ip = ":" in host  # IPv6 literals, with or without a zone id
    if not is_ip:
        try:
            ipaddress.ip_address(host)
            is_ip = True
        except ValueError:
            pass
    labels = host.split(".")
    tld = labels[-1]
    if tld.isdigit() or any(_HEX_LABEL_RE.match(label) for label in labels):
        is_ip = True  # dotted/hex shorthand such as 127.1 or 0x7f.1
    if is_ip:
        raise gl.vm.UserError(f"{ERR_EXPECTED} {what} must use a domain name, not an IP address")
    if _encodes_ipv4(labels) or any(
        host == suffix or host.endswith("." + suffix) for suffix in _WILDCARD_DNS
    ):
        raise gl.vm.UserError(f"{ERR_EXPECTED} {what} must not use a name that encodes an IP address")
    if host == "localhost" or "." not in host or host.endswith(_LOCAL_SUFFIXES):
        raise gl.vm.UserError(f"{ERR_EXPECTED} {what} must point at a public website")


def _salt(*parts) -> u256:
    """Deterministic, collision-resistant CREATE2-style salt for a child contract."""
    digest = hashlib.sha256("|".join(str(p) for p in parts).encode("utf-8")).digest()
    return u256(int.from_bytes(digest, "big"))


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
    withdrawn_filed: u32  # cases that ended with no verdict (withdrawn or expired)
    cases_filed: u32
    open_filed: u32  # complaints filed by this member that are not settled yet


@allow_storage
@dataclass
class CaseRecord:
    complainant: Address
    accused: Address
    rule_number: u32
    status: str  # "pending" | "upheld" | "dismissed" | "withdrawn"
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
        if community.strip() == "" or len(community) > 100:
            raise gl.vm.UserError("[EXPECTED] community needs a name of at most 100 characters")
        if probation_points < 1 or suspension_points <= probation_points:
            raise gl.vm.UserError(
                "[EXPECTED] need 1 <= probation_points < suspension_points"
            )
        if suspension_points > MAX_POINTS:
            raise gl.vm.UserError("[EXPECTED] suspension_points is unreasonably large")
        if max_dismissed_complaints < 1 or max_dismissed_complaints > MAX_LOCKOUT:
            raise gl.vm.UserError(
                "[EXPECTED] max_dismissed_complaints must be between 1 and %d" % MAX_LOCKOUT
            )
        for label, seconds in (
            ("defense_window_seconds", defense_window_seconds),
            ("appeal_window_seconds", appeal_window_seconds),
        ):
            if seconds < MIN_WINDOW_SECONDS or seconds > MAX_WINDOW_SECONDS:
                raise gl.vm.UserError(
                    "[EXPECTED] %s must be between %d and %d seconds"
                    % (label, MIN_WINDOW_SECONDS, MAX_WINDOW_SECONDS)
                )

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

    @gl.public.write
    def forgive_dismissals(self, member: str, count: int) -> None:
        """
        Amnesty for the filing lockout: lower a member's dismissed-complaint
        count, never below zero. (forgive_points only touches suspension.)
        """
        self._only_owner()
        if count < 0:
            raise gl.vm.UserError("[EXPECTED] dismissals to forgive must not be negative")
        standing = self._standing(_addr(member))
        current = int(standing.dismissed_filed)
        standing.dismissed_filed = u32(current - count if current > count else 0)
        # Withdrawals count towards the same lockout, so amnesty lifts them too.
        left = count - current if count > current else 0
        withdrawn = int(standing.withdrawn_filed)
        standing.withdrawn_filed = u32(withdrawn - left if withdrawn > left else 0)

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
        # Dismissals only count once a case settles, so unsettled complaints
        # are capped by the same number. Without this one member could open a
        # swarm of cases before the first one is ever dismissed.
        if self._open_cases(complainant) >= self.max_dismissed_complaints:
            raise gl.vm.UserError(
                "[EXPECTED] you already have the maximum number of unsettled cases; "
                "wait for one to settle before filing another"
            )

        self.case_count = u32(self.case_count + 1)
        # Derived from the case's own parameters as well as the counter, so a
        # re-executed filing can never land on an address that already holds a
        # differently-configured case.
        salt_nonce = _salt(
            "case",
            int(self.case_count),
            complainant.as_hex,
            accused_address.as_hex,
            int(number),
            complaint_url,
        )

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
        standing.open_filed = u32(standing.open_filed + 1)
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

        # The complainant's case is no longer unsettled, whatever the outcome.
        filer = self._standing(record.complainant)
        if filer.open_filed > 0:
            filer.open_filed = u32(filer.open_filed - 1)

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
    # Called (as an internal message) by a case that ended with NO verdict:
    # the complainant withdrew it, or it expired unruled. It only frees the
    # complainant's unsettled-case slot; no points or dismissals change hands.
    # ------------------------------------------------------------------
    @gl.public.write
    def report_withdrawn(self) -> None:
        case_address = gl.message.sender_address
        if case_address not in self.cases:
            raise gl.vm.UserError("[EXPECTED] unknown case reporting an outcome")
        record = self.cases[case_address]
        if record.status != "pending":
            raise gl.vm.UserError("[EXPECTED] this case has already been settled")

        filer = self._standing(record.complainant)
        if filer.open_filed > 0:
            filer.open_filed = u32(filer.open_filed - 1)
        # No points and no dismissal, but the filing is remembered: otherwise a
        # member could file and withdraw forever (each round deploys a case).
        filer.withdrawn_filed = u32(filer.withdrawn_filed + 1)
        record.status = "withdrawn"
        record.severity = u8(0)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _standing(self, member: Address) -> Standing:
        if member not in self.standings:
            self.standings[member] = Standing(
                points=u32(0),
                upheld_against=u32(0),
                dismissed_filed=u32(0),
                withdrawn_filed=u32(0),
                cases_filed=u32(0),
                open_filed=u32(0),
            )
        return self.standings[member]

    def _label(self, points: int) -> str:
        if points >= self.suspension_points:
            return "suspended"
        if points >= self.probation_points:
            return "probation"
        return "good_standing"

    def _open_cases(self, member: Address) -> int:
        if member not in self.standings:
            return 0
        return int(self.standings[member].open_filed)

    def _can_file(self, member: Address) -> bool:
        if member not in self.standings:
            return True
        standing = self.standings[member]
        if self._label(int(standing.points)) == "suspended":
            return False
        strikes = int(standing.dismissed_filed) + int(standing.withdrawn_filed)
        return strikes < self.max_dismissed_complaints

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
                "withdrawn_filed": 0,
                "cases_filed": 0,
                "open_filed": 0,
                "label": "good_standing",
                "can_file": True,
            }
        standing = self.standings[address]
        return {
            "points": standing.points,
            "upheld_against": standing.upheld_against,
            "dismissed_filed": standing.dismissed_filed,
            "withdrawn_filed": standing.withdrawn_filed,
            "cases_filed": standing.cases_filed,
            "open_filed": standing.open_filed,
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
