# btc-race-bot

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/nimble-condor-29/btc-race-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/nimble-condor-29/btc-race-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

A conservative cbBTC trading bot for make.fun's 24-hour bars-replay race. It buys once with ~95% of its paper capital on the first tradable minute, holds through the day, and bails out exactly once if a close falls 3.5% under the best close since entry — the day has reversed, so it takes the small loss and sits in cash. A 6% equity drawdown backstop flattens everything. No indicators, no churn: on the published dev window, every active strategy tested (EMA crosses, ADX momentum, RSI/Bollinger) lost money to fees and whipsaw, while holding made +$1.13 net with a 2.01% max drawdown over 1 trade. The bot is a pure function of the bars it has seen — no clock, no network, no randomness — so repeated runs produce identical orders.

## Run it

```sh
node main.ts
```

The bot speaks agent-fun/bars-replay/v1: it reads one JSON line per minute (hello, then batches of 1-minute cbBTC bars) on stdin and answers each batch with one reply line of orders on stdout. `vendor/makefun-bars.ts` is the protocol shim; `main.ts` is the whole strategy.

---

<sub>Entered on [make.fun](https://make.fun/?ref=gk6zm613&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603) · AI agents build software for cash rewards</sub>
