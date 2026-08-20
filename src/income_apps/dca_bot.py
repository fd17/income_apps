"""Dollar-cost-averaging (DCA) paper-trading bot.

A minimal but real "income app": it repeatedly invests a fixed cash budget
into an asset at the live market price using Kraken paper trading (simulated
funds, live prices, no API credentials required). It then reports the average
entry price and profit/loss.

The core accounting is pure and unit-tested; all I/O goes through
``KrakenClient`` so the strategy can run against a fake in tests.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import asdict, dataclass

from .kraken_client import KrakenClient, KrakenError


@dataclass(frozen=True)
class Fill:
    """A single executed paper buy."""

    pair: str
    price: float
    volume: float
    cost: float
    fee: float


@dataclass(frozen=True)
class DcaSummary:
    """Aggregate result of a DCA run."""

    pair: str
    rounds: int
    total_cost: float
    total_fee: float
    total_volume: float
    average_price: float


def volume_for_budget(budget_usd: float, price: float, precision: int = 8) -> float:
    """Return the asset volume purchasable with ``budget_usd`` at ``price``.

    Volume is truncated (not rounded up) to ``precision`` decimals so a buy
    never exceeds the intended budget.
    """
    if budget_usd <= 0:
        raise ValueError("budget must be positive")
    if price <= 0:
        raise ValueError("price must be positive")
    raw = budget_usd / price
    factor = 10**precision
    return int(raw * factor) / factor


def summarize(pair: str, fills: list[Fill]) -> DcaSummary:
    """Aggregate a list of fills into a DCA summary."""
    total_cost = sum(f.cost for f in fills)
    total_fee = sum(f.fee for f in fills)
    total_volume = sum(f.volume for f in fills)
    average_price = (total_cost / total_volume) if total_volume else 0.0
    return DcaSummary(
        pair=pair,
        rounds=len(fills),
        total_cost=round(total_cost, 8),
        total_fee=round(total_fee, 8),
        total_volume=round(total_volume, 8),
        average_price=round(average_price, 8),
    )


def _ensure_workspace(client: KrakenClient, balance: float) -> None:
    """Create the paper workspace, tolerating one that already exists."""
    try:
        client.paper_init(balance)
    except KrakenError as exc:
        if "already exists" not in str(exc):
            raise


def _fill_from_response(pair: str, resp: dict) -> Fill:
    """Build a Fill from a `kraken paper buy` JSON response."""
    return Fill(
        pair=pair,
        price=float(resp["price"]),
        volume=float(resp["volume"]),
        cost=float(resp["cost"]),
        fee=float(resp["fee"]),
    )


def run_dca(
    client: KrakenClient,
    pair: str,
    budget: float,
    rounds: int,
    interval: float = 0.0,
    starting_balance: float = 10_000.0,
    reset: bool = True,
    on_event=None,
) -> tuple[DcaSummary, dict]:
    """Run ``rounds`` DCA buys of ``budget`` each against paper trading.

    Returns the aggregate summary and the final paper-status payload.
    ``on_event`` is an optional callback receiving structured progress dicts.
    """

    def emit(event: dict) -> None:
        if on_event is not None:
            on_event(event)

    _ensure_workspace(client, starting_balance)
    if reset:
        client.paper_reset()

    fills: list[Fill] = []
    for i in range(1, rounds + 1):
        price = client.last_price(pair)
        volume = volume_for_budget(budget, price)
        resp = client.paper_buy(pair, volume)
        fill = _fill_from_response(pair, resp)
        fills.append(fill)
        emit(
            {
                "event": "fill",
                "round": i,
                "pair": pair,
                "price": fill.price,
                "volume": fill.volume,
                "cost": fill.cost,
                "fee": fill.fee,
            }
        )
        if interval > 0 and i < rounds:
            time.sleep(interval)

    summary = summarize(pair, fills)
    status = client.paper_status()
    emit({"event": "summary", **asdict(summary)})
    return summary, status


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="income-apps-dca",
        description="Dollar-cost-averaging paper-trading bot (Kraken).",
    )
    parser.add_argument("--pair", default="BTCUSD", help="trading pair (default: BTCUSD)")
    parser.add_argument(
        "--budget", type=float, default=100.0, help="cash to invest per round (default: 100)"
    )
    parser.add_argument(
        "--rounds", type=int, default=3, help="number of DCA buys (default: 3)"
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=0.0,
        help="seconds to wait between rounds (default: 0)",
    )
    parser.add_argument(
        "--starting-balance",
        type=float,
        default=10_000.0,
        help="paper workspace starting balance (default: 10000)",
    )
    parser.add_argument(
        "--no-reset",
        action="store_true",
        help="do not reset the paper workspace before running",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    client = KrakenClient()

    if not client.is_available():
        print(
            "error: 'kraken' CLI not found on PATH. Run scripts/install_kraken_cli.sh.",
            file=sys.stderr,
        )
        return 1

    def on_event(event: dict) -> None:
        print(json.dumps(event))

    try:
        print(f"# kraken: {client.version()}", file=sys.stderr)
        summary, status = run_dca(
            client,
            pair=args.pair,
            budget=args.budget,
            rounds=args.rounds,
            interval=args.interval,
            starting_balance=args.starting_balance,
            reset=not args.no_reset,
            on_event=on_event,
        )
    except KrakenError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    print(
        json.dumps(
            {
                "event": "result",
                "pair": summary.pair,
                "rounds": summary.rounds,
                "invested_usd": summary.total_cost,
                "fees_usd": summary.total_fee,
                "units": summary.total_volume,
                "average_price": summary.average_price,
                "current_value": status.get("current_value"),
                "unrealized_pnl": status.get("unrealized_pnl"),
                "unrealized_pnl_pct": status.get("unrealized_pnl_pct"),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
