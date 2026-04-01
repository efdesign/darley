# Darley v5

## Run

From the `v5` folder:

```bash
npm install
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

## Switches

- Layout: `?layout=t` or `?layout=cards` (default: `t`)
- Stream: `?stream=bookTicker` or `?stream=markPrice`
- Underlying: `?underlying=BTCUSDT` and similar Binance option underlyings
- Live is the default mode; if the live service fails, the app falls back to live (sim) and shows a notice.

## References

These are the Binance sources used to ground the expiry and market-data behavior:

Binance Options contracts generally use an 08:00 UTC expiry clock; the exact expiry date still comes from each symbol's `expiryDate` in exchangeInfo.

- [Exchange Information](https://developers.binance.com/docs/derivatives/options-trading/market-data/Exchange-Information) - option symbols, expiryDate, status, and strikePrice.
- [Symbol Price Ticker](https://developers.binance.com/docs/derivatives/options-trading/market-data/Symbol-Price-Ticker) - underlying index price feed.
- [WebSocket Streams for Binance](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams) - combined stream subscriptions and symbol multiplexing behavior.
- [Binance Options Will Launch Additional BNBUSDT Daily Options](https://www.binance.com/en/support/announcement/detail/175fddea47fd4a99b89216a2b77c77c8) - example Binance announcement that states the expiry time is 08:00 UTC.

## Diary

### 2026-04-01

- Copied v4 into v5 and kept v4 untouched.
- Added a layout switch so the app can show either the existing cards/table layout or the new T-chain layout.
- Added a stream switch so the app can use either book ticker or mark price updates.
- Kept the default visual layout on T, kept live as the default data source, and added an automatic fallback to live (sim) when live fails.
- For the Part 2 algorithm, I kept the O(N) approach and did not add extra tradeoff notes beyond the implementation choice.
- The T layout uses a mirrored option-chain table so the strike sits in the middle once, closer to a typical exchange chain view.
- Refined the mobile T layout so the action switches move into the bottom status area, the chain rows use the available width more evenly, and the visible cells keep tighter padding to avoid overlap.
- Removed the unused legacy compatibility layer from v5 (`AppState`, `AppContext`, and `applyMarkPriceBatch`) and kept the runtime on the hook-based path only.
- Aligned the expiry selector to UTC Friday 08:00 so the next-expiry choice matches Binance option timestamps instead of the local timezone.
- Added external Binance references to the README for the expiry and market-data sources used by the app.