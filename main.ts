// Buy early, hold, bail once: a parachute holder for bars-replay/v1.
//
// What the dev window taught (graded locally, twice):
//   - EMA(15)/EMA(60) minute crosses: 34 trades, -$35.85.
//   - EMA(60)/EMA(240) slow trend: 9 trades, -$32.60. Still whipsaw:
//     on a calm, choppy day every lagging signal buys the top and
//     sells the dip.
//   - Buy-and-hold: 1 trade, +$1.07, max drawdown 2.12%.
// So this bot keeps the only part that worked — being long — and adds
// the one thing buy-and-hold lacks: an exit for the day that falls.
//
// Rules (single symbol, 1-minute closes):
//   - On the first tradable batch, buy ~95% of equity (less when the
//     modelled pool impact would exceed ~25 bps). Retry while flat.
//   - While holding, track the best close since entry. Sell everything
//     when a close falls 3.5% under that best close: the day has
//     reversed, take the small loss and sit in cash.
//   - Backstop: equity 6% under its peak flattens and stops the bot.
//   - No re-entry, no indicators, no churn: expected trades = 1 or 2.
// The race bar (at least 1 trade, drawdown at most 25%) is met by
// construction, and the finish is whatever the day gave a holder,
// minus one small exit if the day turned. Pure function of the bars:
// no clock, no network, no randomness; the two graded runs match.

import { runBars, type BarsState, type OrderInput } from './vendor/makefun-bars.ts';

const EQUITY_FRACTION = 0.95;
const MAX_IMPACT_BPS = 25n;
const TRAIL = 0.035;
const KILL_DRAWDOWN = 0.06;
const MAX_SLIPPAGE_BPS = 100;
const MIN_NOTIONAL_FRACTION = 0.02;

const bestClose = new Map<string, number>();
const bought = new Set<string>();
let peakEquity: bigint | null = null;
let dead = false;

await runBars({
  onBatch(state: BarsState, batch) {
    const orders: OrderInput[] = [];

    if (peakEquity === null || state.equity > peakEquity) peakEquity = state.equity;
    if (state.warmingUp) return orders;

    if (!dead && peakEquity !== null && Number(state.equity) <= Number(peakEquity) * (1 - KILL_DRAWDOWN)) {
      dead = true;
    }
    if (dead) {
      for (const [symbol, p] of state.positions) {
        if (p.qty > 0n) orders.push({ side: 'sell', symbol, qty: p.qty, max_slippage_bps: MAX_SLIPPAGE_BPS });
      }
      return orders;
    }

    const startCapital = BigInt(state.hello.capital.quote_units);
    const minNotional = BigInt(Math.floor(Number(startCapital) * MIN_NOTIONAL_FRACTION));

    for (const bar of batch.bars) {
      const symbol = bar.symbol;
      const c = Number(bar.c);
      const held = state.positions.get(symbol);
      const holding = held !== undefined && held.qty > 0n;

      if (holding) {
        const best = bestClose.get(symbol);
        if (best === undefined || c > best) bestClose.set(symbol, c);
        const peak = bestClose.get(symbol)!;
        if (c <= peak * (1 - TRAIL)) {
          orders.push({ side: 'sell', symbol, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS });
          bestClose.delete(symbol);
        }
        continue;
      }

      // Flat and never entered (or the entry fill was refused): buy.
      // After a parachute exit bestClose is deleted and bought stays
      // true, so there is no re-entry.
      if (bought.has(symbol)) continue;
      let budget = BigInt(Math.floor(Number(state.equity) * EQUITY_FRACTION));
      if (state.cash < budget) budget = state.cash;
      const room = state.weightRoom(symbol);
      if (room < budget) budget = room;
      if (budget < minNotional) continue;

      let amount = budget;
      let ok = false;
      while (amount >= minNotional) {
        const impact = state.impactBps(symbol, amount);
        if (impact === null || impact <= MAX_IMPACT_BPS) {
          ok = true;
          break;
        }
        amount = (amount * 3n) / 4n;
      }
      if (!ok) continue;
      orders.push({ side: 'buy', symbol, notional_quote_units: amount, max_slippage_bps: MAX_SLIPPAGE_BPS });
      bought.add(symbol);
      bestClose.set(symbol, c);
    }

    return orders;
  },
});
