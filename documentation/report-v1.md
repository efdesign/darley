# Code Review Report — V1 (`app.js` / `index.html`)

> Reviewed against [documentation/brief.md](brief.md) by a senior engineer.

---

## Overview

A monolithic, single-file (~920 lines) vanilla JavaScript application.  
No build step, no module system, no bundler. All code — config, formatters, DOM manipulation, algorithm, WebSocket wiring — lives in one file.  
Stated intent: faster iteration and zero-friction deployment.

---

## Brief Compliance

### Part 2 — Algorithm

| Requirement | Status | Notes |
|---|---|---|
| Expiry on next Friday, fallback to closest | ⚠️ Partial | `findNearestOptionsV2` implements this correctly, but it is **never called**. The actually-used function `findNearestOptions` is buggy (see below). |
| Only TRADING instruments | ✅ | Both functions filter `status !== TRADING` early. |
| Strike closest to current index price | ⚠️ Partial | Correct within each side, but CALL and PUT can end up on **different expiries** (see Critical Bug #1). |
| One base coin | ✅ | Hardcoded `BTCUSDT`, `underlying` parameter supported. |

### Part 3 — Visualisation

| Requirement | Status | Notes |
|---|---|---|
| WebSocket subscription | ✅ | `optionMarkPrice` stream connected via `new WebSocket(...)`. |
| UI updates from WS | ✅ | `getMarkData` → `updateInstrumentDom` path works. |
| Best buy price displayed | ✅ | |
| Best buy quantity displayed | ✅ | |
| Strike price displayed | ✅ | |
| Best sell price displayed | ✅ | |
| Best sell quantity displayed | ✅ | |
| Highlighted instruments | ✅ | `highlightInstrument` adds `special-instrument` CSS class. |

---

## Critical Bug

### Bug: CALL and PUT can have different expiries

`findNearestOptions` (the function wired to `loadAndRender`) selects the best CALL
and the best PUT **independently** across all expiries. This means the returned
`selectedCall` and `selectedPut` can belong to different expiry dates — a direct
violation of brief requirement #1.

```js
// v1 — each side tracks its own expiry independently
if (currentExpiryDifference < callExpiryDifference || ...)  { selectedCall = s; }
if (currentExpiryDifference < putExpiryDifference  || ...)  { selectedPut  = s; }
```

`findNearestOptionsV2` fixes this with a shared two-pass approach (first pass
chooses *one* expiry key; second pass picks nearest strike within that expiry), but
`findNearestOptionsV2` is **never called anywhere**. It is dead code.

**Impact:** In production, users see a CALL and a PUT that are for different
expiry dates. The header shows one expiry, the selection might reflect another.

---

## Problems

### Architecture

1. **God-file**: 920 lines of mixed concerns in a single script. Domain logic,
   DOM manipulation, config, formatters, WebSocket handling, and bootstrap code
   are interleaved. Changes to one area risk breaking the others. The author
   acknowledges this in comments ("dom updates should be outside of this function").

2. **Global mutable state**: `wsSelectionState`, `domByIdCache`,
   `instrumentFieldsCache`, `callTable`, `putTable`, etc. are all module-level
   globals. State management is entirely implicit; there is no single source of
   truth or update path.  

   enrico: this is of course solved in the react version and could be even better using a state management library, like redux or other.

3. **Near-duplicate fetch paths**: `fetchMockAndDisplayData` and
   `fetchAndDisplayData` share ~80 % of their body. A single function with a
   data-source abstraction would eliminate the duplication.

   enrico: this was done on purpose during development. ideally the mock would be removed from prod code or refactored as suggested

4. **Dead code**:
   - `findNearestOptionsV2` — defined, never called.
   - `drawRawOptionsData` — defined, never called.
   - `animateInstrumentRow` — commented out. 

### Algorithm / Correctness

5. **`getNextFriday` returns today if today is already Friday** — no time-of-day
   check. Binance options expire at 08:00 UTC; if it is Friday afternoon the
   "next Friday" should already be the following week. This causes erroneous
   selection during Friday market hours.

6. **Algorithm bug in `symbolFilter`**: the filter rebuilds a `buildSymbolFilterContext`
   object on every call from inside `.filter()`. The result is a closure factory
   called once, so the context is actually computed once — but the code reads as if
   it recomputes per element. A naming improvement (e.g., naming the outer result
   `createSymbolFilter`) would clarify intent.

### WebSocket

7. **Uses `optionMarkPrice` full-book stream**: this stream emits every BTC option
   at once on each tick. For an expiry with 100+ strikes × 2 sides = 200+ messages
   per interval. A per-symbol `@bookTicker` subscription (as used in v3/v4) is more
   targeted and efficient.

8. **No WebSocket reconnection logic**: `optionMarkPriceWs.onclose` only logs.
   If the connection drops, data silently stops updating.

9. **Mock WS gap**: `config.USE_MOCKS` controls the REST data source but
   the WebSocket *always* connects to Binance live. No mock replay for the stream.

### UI / UX

10. **No error feedback in UI**: errors in `fetchAndDisplayData` only call
    `utils.error` (which writes to the console when `DEBUG` is on, and is silently
    suppressed otherwise). Users see the initial "loading..." state indefinitely.

11. **`config.DEBUG = false`** suppresses all `utils.error` calls, but some
    `console.warn` calls are hardcoded (e.g. inside `updateInstrumentDom`) and bypass
    the guard — inconsistent.

12. **Table built by appending rows one at a time** into the live DOM. No
    `DocumentFragment` is used, so each `table.appendChild(row)` triggers a separate
    layout pass. The author notes this.

### Security / Supply Chain

13. ~~**Google Fonts CDN in `index.html`**~~ **FIXED**: Removed the
    `fonts.googleapis.com` request. `style.css` now uses a `system-ui` /
    `Inter` / `-apple-system` / `Segoe UI` / `Roboto` stack — no external
    dependency, zero extra network request, no supply-chain exposure.

14. **Proxy URL hardcoded**: `config.BINANCE_PROXY_URL` points to a live Cloudflare
    Worker under the author's account. The application fails silently if the proxy
    goes down.

### CSS

15. **CSS nesting syntax**: The stylesheet uses nested rules (`body { .app { … } }`)
    which requires a browser supporting native CSS Nesting (Chrome 112+, Safari 16.5+).
    Without a build step this may render incorrectly on older clients.

---

## What Is Done Well

- `getNextFriday` is clearly commented and correct for non-Friday days.
- `getElementByIdCached` and `getInstrumentFields` maps reduce repeated DOM
  queries during streaming updates.
- `extractYYMMDD` / `parseExpiryKeyFromSymbol` string-based comparison is fast
  and avoids Date rounding issues.
- `formatCurrency` uses `Intl.NumberFormat` — localisation-safe.
- Algorithm complexity is O(n) single-pass, which scales well.
- Code is clearly not LLM-generated for the algorithm sections (genuine iterative
  thinking, progressive variable naming, inline `TODO` notes).

---

## Priority Improvements

1. Replace the call to `findNearestOptions` with `findNearestOptionsV2` (or
   merge the approaches) to fix the shared-expiry requirement.
2. Extract the algorithm, formatters, and WS logic into separate ES modules.
3. Add per-symbol `@bookTicker` WS subscriptions instead of the full mark-price
   stream.
4. Add a visible error banner in the UI for fetch/WS failures.
5. Add WS reconnection with exponential backoff.
6. ~~Replace or self-host Google Fonts.~~ **Done** — system font stack applied.
