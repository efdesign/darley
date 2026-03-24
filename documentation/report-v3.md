# Code Review Report — V3 (Vanilla JS, Modular ESM)

> Reviewed against [documentation/brief.md](brief.md) by a senior engineer.

---

## Overview

A full rewrite into layered ES modules with no build step. The architecture
follows a recognisable Domain-Driven Design split:

```
domain/          — pure algorithms (selectNearestOptions, datePolicy, optionSymbol)
application/     — use-cases (loadInitialOverview, applyMarkPriceBatch), AppState
infrastructure/  — REST/WS clients, normalizers, proxy
presentation/    — views, formatters, DOM helpers
app/             — bootstrap (config, main)
```

No framework, no bundler, no npm. Served as plain modules via a local HTTP server
or the browser's native ESM import pipeline.

---

## Brief Compliance

### Part 2 — Algorithm

| Requirement | Status | Notes |
|---|---|---|
| Expiry on next Friday, fallback to closest | ✅ | `selectNearestOptions` — shared two-pass: pick expiry first, then strike. |
| Both CALL and PUT share the same expiry | ✅ | `chosenExpiryKey` is fixed before the second pass. |
| Only TRADING instruments | ✅ | Filtered in the first pass. |
| Strike closest to index | ✅ | `Math.abs(strikePrice - indexPrice)` minimised per side. |
| One base coin, user-selectable | ✅ | URL param `?underlying=ETHUSDT`; selector populated from live data. |

### Part 3 — Visualisation

| Requirement | Status | Notes |
|---|---|---|
| WebSocket subscription | ✅ | `BinanceOptionBookTickerStream` — per-symbol `@bookTicker`. |
| UI updates from WS | ✅ | Batched through `createQuoteRenderScheduler` → `rAF`. |
| Best buy price | ✅ | |
| Best buy quantity | ✅ | |
| Strike price | ✅ | |
| Best sell price | ✅ | |
| Best sell quantity | ✅ | |
| Highlighted instruments | ✅ | `is-selected` CSS class on selected CALL/PUT rows. |
| Index price marker in table | ✅ | `createIndexMarkerRow` inserted between strikes. |
| Underlying selector | ✅ | Populated from exchange info; change triggers full reload. |
| Expiry selector | ✅ | Populated from exchange info; change uses cached data (no re-fetch). |
| Mock / live mode toggle | ✅ | URL-param-based, full page reload per transition. |
| Snapshot (REST quotes on connect) | ✅ | `BinanceOptionQuoteSnapshotClient` pre-fills bids/asks before WS updates arrive. |

---

## Problems

### Dead Code

1. **`BinanceOptionMarkPriceStream`** is a fully implemented class that normalizes
   the `@optionMarkPrice` bulk stream. It is never imported or used in `main.js`.
   `main.js` uses `BinanceOptionBookTickerStream` exclusively. The class adds
   confusion about which stream is active and what data shape is expected.

### Algorithm / Correctness

2. **`getNextFriday` returns today on Fridays with no time-of-day guard**:
   Binance options expire at 08:00 UTC. On Friday afternoon UTC the "next Friday"
   should be the *following* Friday, but `(5 - 5 + 7) % 7 === 0` returns today.
   This causes the algorithm to target an already-expired expiry during Friday
   market hours (08:00–midnight UTC).

   ```js
   // datePolicy.js — diff=0 when day===5, so "next Friday" = today
   const diff = (friday - day + 7) % 7;
   date.setDate(date.getDate() + diff);
   ```

   Fix: add a time-of-day check, e.g. if `diff === 0 && utcHour >= 8` then add 7.

   enrico: this is a definite must if I have time. did not think of it.

### WebSocket

3. **No WebSocket reconnection**: `BinanceOptionBookTickerStream.socket.onclose`
   transitions state to `"closed"` but does not attempt to reconnect. If the
   connection drops mid-session, the table silently freezes.

4. **Large stream URL**: the streams parameter is built by joining every symbol in
   the current expiry (`symbol.toLowerCase()@bookTicker`). For a BTC expiry with
   ~200 strikes × 2 sides = 400 subscriptions, the resulting URL can approach or
   exceed browser URL length limits (~2 000 characters for some WebSocket
   implementations). Chunking subscriptions or using a combinator stream would
   mitigate this.

### Error Handling

5. **Snapshot errors silently ignored**: in `main.js` the snapshot promise chain has
   `.catch(() => { })`. A failed snapshot means the table shows no bid/ask data until
   the first WS batch. The user sees empty cells with no indication why.

6. **`ProxyHttpClient` exposes raw HTTP errors only**: status codes and network
   errors propagate as `Error("HTTP error 403")`, which are surfaced in the
   `StatusView` error banner. This is acceptable but could expose proxy internals;
   response body sanitisation before display is preferable.

### Mode Switching

7. **Full page reload on mode change**: `navigateToMode` and `navigateToSnapshots`
   both redirect via `window.location.href`. This discards the in-memory
   `cachedExchangeInfoData` and forces a new REST round-trip. By design (URL-driven
   state) but worth noting: switching mode during a slow network causes a visible
   loading gap every time.

### Supply Chain

8. **Google Fonts CDN in `index.html`**: The brief explicitly calls out supply-chain
   attacks as a concern. Loading `Space Grotesk` and `IBM Plex Sans` from
   `fonts.googleapis.com` on page load creates two external dependencies. System
   font fallbacks (`"Segoe UI", sans-serif`) are already declared and would work.
   Self-hosting the WOFF2 files is the safe alternative.

   enrico: i accepted this risk, removed in v1 also makes metrics faster.

### Minor

9. **`appConfig.streamRefreshMs`** controls the mock replay interval but has no
   effect on the live WebSocket. The name is slightly misleading.

10. **No TypeScript**: mentioned as desirable in v1 comments. Given the plain
    module structure, types could be added via JSDoc `@typedef` without any build
    step.

---

## What Is Done Well

- **Clear layered architecture**: domain logic has zero DOM or network imports.
  `selectNearestOptions` is a pure function that receives data and returns data.
  This makes the algorithm trivially testable in isolation.

- **Shared-expiry algorithm**: both CALL and PUT use `chosenExpiryKey` determined
  in the first pass. Fully compliant with brief requirement #1.

- **`extractAvailableData` + selectors**: the underlying and expiry dropdowns are
  populated from live exchange data, not hardcoded. The user can explore any
  available coin and date without a code change.

- **`requestAnimationFrame` scheduler**: quote updates are coalesced into a single
  `rAF` callback so that rapid WS batches do not each trigger separate DOM mutations.

- **Row-level `patch()` vs full `render()`**: `InstrumentTableView.patch` only
  updates cells for symbols that received new data, and triggers `flashRow` with
  proper timeout cleanup. Full `render()` is called only when the index price
  crosses a row boundary (marker row repositioning). Efficient.

- **Stale-load guard (`loadSerial`)**: concurrent loads are discarded correctly,
  preventing a slow underlying load from overwriting a faster subsequent one.

- **`forceExpiryKey` fast path**: changing the expiry selector does not re-fetch
  exchange info. It re-runs `selectNearestOptions` with cached data and reconnects
  the stream — a good UX optimisation.

- **Normalizer separation**: `normalizeBookTickerMessage` and
  `normalizeMarkPriceMessage` are isolated in `infrastructure/normalizers/` and have
  no knowledge of domain or presentation. Swapping data sources requires editing
  only the normalizer.

- **No runtime dependencies**: zero npm packages, zero CDN scripts for app logic.
  The brief's supply-chain concern is well respected.

---

## Priority Improvements

1. Remove `BinanceOptionMarkPriceStream` or rename/re-integrate it clearly.
2. Fix `getNextFriday` to check UTC time-of-day on Fridays.
3. Add WS reconnection (exponential backoff via `setTimeout`).
4. Chunk per-symbol WS subscriptions or cap at a safe URL length.
5. Surface snapshot errors in the status view instead of swallowing them.
6. Self-host fonts or drop the Google Fonts import.
