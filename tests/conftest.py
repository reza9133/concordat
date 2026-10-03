"""
Shared helpers for the Concordat tests.

The direct-mode tests run the contracts in-process (no Studio, no Docker).
Cross-contract calls are not executed by the direct runner, so these helpers
record every deploy and every internal message a contract emits. Tests then
assert on those recorded requests and drive the receiving contract by hand,
using `direct_vm.prank(...)` to play the role of the sender the protocol
would have supplied.
"""

import hashlib
import json
import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
CONTRACTS = ROOT / "contracts"
sys.path.insert(0, str(ROOT / "scripts"))

# Optional: pin the GenVM SDK release used by the direct runner. Leave it
# unset to let gltest pick its default.
SDK_VERSION = os.environ.get("CONCORDAT_SDK_VERSION") or None

FIRST_WINDOW = 3600  # defense / appeal windows used by the fixtures (seconds)
T0 = "2026-03-01T12:00:00Z"


def digest(text: str) -> str:
    """The whitespace-insensitive page digest the contracts pin evidence with."""
    return hashlib.sha256(" ".join(text.split()).encode("utf-8")).hexdigest()


def to_hex(raw) -> str:
    """Lower-case 0x-hex for an Address, a hex string or raw bytes."""
    if isinstance(raw, str):
        return raw.lower()
    if hasattr(raw, "as_hex"):
        return raw.as_hex.lower()
    return "0x" + bytes(raw).hex()


def from_hex(value: str) -> bytes:
    return bytes.fromhex(value[2:])


class Recorder:
    """Records DeployContract and PostMessage requests seen by the VM."""

    def __init__(self, vm):
        self.vm = vm
        self.requests = []
        vm._gl_call_hook = self._hook

    def _hook(self, vm, request):
        self.requests.append(request)
        return None

    def deploys(self):
        return [r["DeployContract"] for r in self.requests if "DeployContract" in r]

    def messages(self):
        return [r["PostMessage"] for r in self.requests if "PostMessage" in r]

    def clear(self):
        self.requests.clear()


@pytest.fixture
def recorder(direct_vm):
    return Recorder(direct_vm)


@pytest.fixture
def deploy(direct_deploy):
    """direct_deploy with the optional SDK pin applied."""

    def _deploy(path, *args, **kwargs):
        if SDK_VERSION:
            kwargs.setdefault("sdk_version", SDK_VERSION)
        return direct_deploy(str(path), *args, **kwargs)

    return _deploy


@pytest.fixture
def clock(direct_vm):
    direct_vm.warp(T0)
    return direct_vm


def llm_json(**fields) -> str:
    return json.dumps(fields)


def page_digest(text: str) -> str:
    """Mirror of the contracts' whitespace-insensitive page hash."""
    import hashlib

    return hashlib.sha256(" ".join(text.split()).encode("utf-8")).hexdigest()
