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

## Diary

### 2026-04-01

- Copied v4 into v5 and kept v4 untouched.
- Added a layout switch so the app can show either the existing cards/table layout or the new T-chain layout.
- Added a stream switch so the app can use either book ticker or mark price updates.
- Kept the default visual layout on T, kept live as the default data source, and added an automatic fallback to live (sim) when live fails.
- For the Part 2 algorithm, I kept the O(N) approach and did not add extra tradeoff notes beyond the implementation choice.
- The T layout uses a mirrored option-chain table so the strike sits in the middle once, closer to a typical exchange chain view.