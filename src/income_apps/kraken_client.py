"""Thin wrapper around the Kraken CLI (`kraken`).

Follows the invocation contract documented by the Kraken skills:

    kraken <command> [args...] -o json

- Only stdout is parsed (as JSON); stderr is treated as diagnostics.
- Exit code 0 means success; a non-zero exit carries a JSON error envelope
  on stdout.

The wrapper keeps all subprocess/JSON handling in one place so that the
application logic can stay pure and easily testable.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from typing import Any


class KrakenError(RuntimeError):
    """Raised when a `kraken` invocation fails or returns an error envelope."""


class KrakenClient:
    """Runs Kraken CLI commands and returns parsed JSON."""

    def __init__(self, binary: str = "kraken", timeout: float = 30.0) -> None:
        self.binary = binary
        self.timeout = timeout

    def _run(self, args: list[str]) -> Any:
        cmd = [self.binary, *args, "-o", "json"]
        try:
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=self.timeout,
            )
        except FileNotFoundError as exc:
            raise KrakenError(
                f"'{self.binary}' not found on PATH. Run scripts/install_kraken_cli.sh."
            ) from exc
        except subprocess.TimeoutExpired as exc:
            raise KrakenError(f"kraken command timed out: {' '.join(cmd)}") from exc

        stdout = proc.stdout.strip()
        if not stdout:
            if proc.returncode != 0:
                raise KrakenError(
                    f"kraken exited {proc.returncode} with no output: {proc.stderr.strip()}"
                )
            return None

        try:
            payload = json.loads(stdout)
        except json.JSONDecodeError as exc:
            raise KrakenError(f"could not parse kraken output as JSON: {stdout!r}") from exc

        if isinstance(payload, dict) and payload.get("error"):
            raise KrakenError(f"kraken error: {payload}")
        if proc.returncode != 0:
            raise KrakenError(f"kraken exited {proc.returncode}: {payload}")
        return payload

    def version(self) -> str:
        """Return the installed CLI version string (does not use JSON output)."""
        proc = subprocess.run(
            [self.binary, "--version"],
            capture_output=True,
            text=True,
            timeout=self.timeout,
        )
        return proc.stdout.strip()

    def is_available(self) -> bool:
        return shutil.which(self.binary) is not None

    def ticker(self, pair: str) -> dict[str, Any]:
        """Return live ticker data for a pair (public market data, no auth)."""
        return self._run(["ticker", pair])

    def last_price(self, pair: str) -> float:
        """Return the most recent trade price for a pair."""
        data = self.ticker(pair)
        # The ticker maps Kraken's canonical pair name to a data object.
        entry = next(iter(data.values()))
        return float(entry["last_price"])

    def paper_init(self, balance: float, currency: str = "USD") -> dict[str, Any]:
        return self._run(["paper", "init", "--balance", str(balance)])

    def paper_reset(self) -> dict[str, Any]:
        return self._run(["paper", "reset", "--yes"])

    def paper_buy(self, pair: str, volume: float) -> dict[str, Any]:
        return self._run(["paper", "buy", pair, str(volume), "--yes"])

    def paper_status(self) -> dict[str, Any]:
        return self._run(["paper", "status"])
