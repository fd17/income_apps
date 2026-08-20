"""Tests for the DCA bot.

These are hermetic: the strategy runs against an in-memory fake that mimics
the Kraken CLI's paper-trading behaviour, so no network or `kraken` binary is
required.
"""

from __future__ import annotations

import pytest

from income_apps.dca_bot import (
    DcaSummary,
    Fill,
    run_dca,
    summarize,
    volume_for_budget,
)


def test_volume_for_budget_truncates_to_precision():
    # 100 / 30000 = 0.00333333... -> truncated to 8 decimals
    assert volume_for_budget(100, 30_000) == 0.00333333


def test_volume_for_budget_never_exceeds_budget():
    price = 71755.8
    volume = volume_for_budget(100, price)
    assert volume * price <= 100


@pytest.mark.parametrize("budget,price", [(0, 100), (-5, 100), (100, 0), (100, -1)])
def test_volume_for_budget_rejects_non_positive(budget, price):
    with pytest.raises(ValueError):
        volume_for_budget(budget, price)


def test_summarize_computes_average_price():
    fills = [
        Fill(pair="BTCUSD", price=100.0, volume=1.0, cost=100.0, fee=0.26),
        Fill(pair="BTCUSD", price=200.0, volume=1.0, cost=200.0, fee=0.52),
    ]
    summary = summarize("BTCUSD", fills)
    assert summary == DcaSummary(
        pair="BTCUSD",
        rounds=2,
        total_cost=300.0,
        total_fee=0.78,
        total_volume=2.0,
        average_price=150.0,
    )


def test_summarize_handles_empty():
    summary = summarize("BTCUSD", [])
    assert summary.rounds == 0
    assert summary.average_price == 0.0


class FakeKrakenClient:
    """In-memory stand-in that mimics `kraken paper` semantics."""

    FEE_RATE = 0.0026

    def __init__(self, prices: list[float]):
        self._prices = list(prices)
        self._i = 0
        self.balance = 0.0
        self.units = 0.0
        self.spent = 0.0
        self.calls: list[str] = []

    def paper_init(self, balance, currency="USD"):
        self.calls.append("init")
        self.balance = balance
        return {"capital": str(balance), "mode": "paper"}

    def paper_reset(self):
        self.calls.append("reset")
        self.units = 0.0
        self.spent = 0.0
        return {"mode": "paper"}

    def last_price(self, pair):
        price = self._prices[self._i]
        self._i += 1
        return price

    def paper_buy(self, pair, volume):
        price = self._prices[self._i - 1]
        cost = price * volume
        fee = cost * self.FEE_RATE
        self.units += volume
        self.spent += cost + fee
        return {
            "price": price,
            "volume": volume,
            "cost": cost,
            "fee": fee,
            "side": "buy",
            "pair": pair,
        }

    def paper_status(self):
        current_value = self.units * self._prices[self._i - 1]
        pnl = current_value - self.spent
        return {
            "current_value": current_value,
            "unrealized_pnl": pnl,
            "unrealized_pnl_pct": (pnl / self.spent * 100) if self.spent else 0.0,
        }


def test_run_dca_executes_all_rounds():
    client = FakeKrakenClient(prices=[100.0, 110.0, 90.0])
    events: list[dict] = []
    summary, status = run_dca(
        client,
        pair="BTCUSD",
        budget=100,
        rounds=3,
        on_event=events.append,
    )

    assert summary.rounds == 3
    assert "init" in client.calls and "reset" in client.calls
    # Three fills + one summary event emitted.
    assert [e["event"] for e in events] == ["fill", "fill", "fill", "summary"]
    # DCA buys more units when the price is lower.
    assert summary.total_volume == pytest.approx(
        volume_for_budget(100, 100)
        + volume_for_budget(100, 110)
        + volume_for_budget(100, 90)
    )
    assert "current_value" in status


def test_run_dca_respects_no_reset():
    client = FakeKrakenClient(prices=[100.0])
    run_dca(client, pair="BTCUSD", budget=50, rounds=1, reset=False)
    assert "reset" not in client.calls
