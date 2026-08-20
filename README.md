# income_apps

Repo for income generating apps built on the [Kraken CLI](https://github.com/krakenfx/kraken-cli).

The first app is a **dollar-cost-averaging (DCA) paper-trading bot**: it invests a
fixed cash amount into an asset at the live market price on a schedule, using
Kraken *paper trading* (simulated funds, live prices, no API credentials
required), and reports the average entry price and profit/loss.

## Requirements

- Python 3.10+
- The `kraken` CLI (installed by `scripts/install_kraken_cli.sh`)

## Setup

```bash
# Install a pinned, checksum-verified Kraken CLI onto ~/.local/bin
bash scripts/install_kraken_cli.sh

# Install dev tooling and the package (editable)
pip3 install --user -r requirements-dev.txt
pip3 install --user -e .
```

In Cloud Agents this is handled automatically by `.cursor/environment.json`.

## Run the DCA bot

```bash
# Via the installed console script
income-apps-dca --pair BTCUSD --budget 100 --rounds 3

# Or as a module
python3 -m income_apps.dca_bot --pair ETHUSD --budget 50 --rounds 3
```

Options: `--pair`, `--budget` (cash per round), `--rounds`, `--interval`
(seconds between rounds), `--starting-balance`, `--no-reset`.

Output is JSON lines: one `fill` event per round, then a `summary` and a final
`result` with invested amount, units accumulated, average price, and P&L.

Paper trading needs no credentials. Live trading is an explicit opt-in and is
out of scope for this starter app — see the Kraken skills for the safety
checklist before ever pointing an agent at real funds.

## Develop

```bash
ruff check .   # lint
pytest         # tests (hermetic; no network or kraken binary required)
```

## Layout

```
src/income_apps/
  kraken_client.py   # thin wrapper around the `kraken` CLI JSON contract
  dca_bot.py         # DCA strategy: pure accounting + orchestration + CLI
tests/               # hermetic unit tests using an in-memory fake client
scripts/
  install_kraken_cli.sh   # pinned, checksum-verified CLI installer
```
