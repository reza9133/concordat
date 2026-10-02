"""
Plain pytest checks (no GenVM SDK, no Studio) for the generated contracts.

They guard the one failure mode the embedding approach introduces: someone
edits a contract or template and forgets to run scripts/build.py, so the
hall or a case keeps deploying a stale child forever.

    pytest tests/test_build_in_sync.py -v
"""

import base64
import re
from pathlib import Path

import build  # scripts/build.py, put on sys.path by conftest.py

ROOT = Path(__file__).resolve().parent.parent
CONTRACTS = ROOT / "contracts"
HEADER = '# { "Depends": "py-genlayer:'


def _embedded(source: str, name: str) -> str:
    """Decode the base64 constant embedded for `name` back to source text."""
    var = "_%s_B64" % name.upper()
    match = re.search(r"%s = \(\n(.*?)\n\)\n" % var, source, re.DOTALL)
    assert match, "no embedded %s block found" % name
    encoded = "".join(re.findall(r'"([A-Za-z0-9+/=]+)"', match.group(1)))
    return base64.b64decode(encoded).decode("utf-8")


def test_generated_files_are_up_to_date():
    for path, expected in build.build_all().items():
        actual = path.read_text(encoding="utf-8")
        assert actual == expected, (
            "%s is stale. Run: python3 scripts/build.py" % path.relative_to(ROOT)
        )


def test_case_embeds_the_exact_appeal_source():
    case_source = (CONTRACTS / "concordat_case.py").read_text(encoding="utf-8")
    appeal_source = (CONTRACTS / "concordat_appeal.py").read_text(encoding="utf-8")
    assert _embedded(case_source, "appeal") == appeal_source


def test_hall_embeds_the_exact_case_source():
    hall_source = (CONTRACTS / "concordat_hall.py").read_text(encoding="utf-8")
    case_source = (CONTRACTS / "concordat_case.py").read_text(encoding="utf-8")
    assert _embedded(hall_source, "case") == case_source


def test_every_deployed_source_starts_with_the_genvm_version_comment():
    # gl.deploy_contract requires the version comment as the literal first line.
    hall_source = (CONTRACTS / "concordat_hall.py").read_text(encoding="utf-8")
    case_source = _embedded(hall_source, "case")
    appeal_source = _embedded(case_source, "appeal")
    for source in (hall_source, case_source, appeal_source):
        assert source.startswith(HEADER)


def test_no_non_english_characters_in_project_files():
    # The project is English-only: contracts, tests, scripts, README.
    for path in list(ROOT.rglob("*.py")) + [ROOT / "README.md"]:
        if "__pycache__" in path.parts or ".pytest_cache" in path.parts:
            continue
        text = path.read_text(encoding="utf-8")
        bad = sorted({ch for ch in text if ord(ch) > 0x2FF and ch not in "\u2014\u2013\u2192\u2190\u2022"})
        assert not bad, "%s contains non-English characters: %r" % (path.relative_to(ROOT), bad)
