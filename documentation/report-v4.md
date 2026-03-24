# Code Review Report — V4 (React 19 + Vite)

> Reviewed against [documentation/brief.md](brief.md) by a senior engineer.

---

## Overview

A React 19 + Vite application built from the same domain and normalizer logic
carried forward from v3. The architecture maps onto React conventions: the
equivalent of v3's `AppState` + `InstrumentTableView` becomes `useAppState` +
`InstrumentTable` with `memo(TableRow)`.

Key additions over v3:
- `simulateLive` mode with oscillating synthetic data for 6 underlyings (BTC, ETH,
  BNB, SOL, XRP, DOGE).
- Three-state mode switch: `mock` / `live-simulated` / `live`.
- `useEffectEvent` for WS callbacks (React 19 idiomatic pattern).
- `useQuoteBatcher` with `requestAnimationFrame` coalescing.
- `memo(TableRow)` for granular re-render avoidance.

---

## Brief Compliance

### Part 2 — Algorithm

| Requirement | Status | Notes |
|---|---|---|
| Expiry on next Friday, fallback to closest | ✅ | Same `selectNearestOptions` as v3. |
| Both sides share one expiry | ✅ | Two-pass shared expiry key. |
| Only TRADING instruments | ✅ | |
| Strike closest to index | ✅ | |
| User-selectable underlying | ✅ | URL param + selector (BTC/ETH/BNB/SOL/XRP/DOGE in simulated mode). |

### Part 3 — Visualisation

| Requirement | Status | Notes |
|---|---|---|
| WebSocket subscription | ✅ | Per-symbol `@bookTicker`; or interval-based in simulated/mock modes. |
| UI updates from WS | ✅ | `useQuoteBatcher` → `rAF` → `applyQuoteBatch` → React render. |
| All 5 required fields | ✅ | `TableRow` renders bid price/qty, ask price/qty, strike. |
| Highlighted instruments | ✅ | `is-selected` prop on `TableRow`. |
| Row flash on update | ✅ | `is-updated` prop, cleared after 450 ms. |
| Index price marker | ✅ | `IndexMarkerRow` placed between strikes. |
| Underlying + expiry selectors | ✅ | `ControlBar` with `<select>`. |
| Error feedback | ✅ | `MessageBanner` renders `viewModel.errorMessage`. |
| Snapshot pre-fill | ✅ | `snapshotClient.fetchQuotes` before first WS batch. |

---

## Problems

### React State Management

1. **`updatedSymbols` in React state causes unnecessary re-renders across the tree**:

   ```js
   // App.jsx
   const [updatedSymbols, setUpdatedSymbols] = useState(new Set());
   ```

   Every quote batch calls `setUpdatedSymbols(new Set(updated))`, which triggers a
   React re-render of `App`. Props cascade down to `Layout` → `InstrumentTable` ×2
   → every `TableRow`. `TableRow` is `memo`'d and only re-renders when its specific
   symbol is in `updatedSymbols`, but `App`, `Layout`, `InstrumentTable`, and
   `IndexMarkerRow` still render on every tick.

   At 200 ms update intervals across a full BTC expiry this produces high-frequency
   re-renders of the component tree. The v3 approach (direct `classList.toggle` on a
   cached DOM ref) is more efficient for this specific concern.

   Mitigation: move flash state to a `useRef` and apply the class via a direct
   `element.classList.toggle` in the `useQuoteBatcher` flush callback, bypassing
   React's render cycle for the animation only.

2. **`stateRef` workaround for stale closures in `useAppState`**:

   ```js
   const stateRef = useRef(state);
   useEffect(() => { stateRef.current = state; }, [state]);
   ```

   `applyQuoteBatch` reads `stateRef.current` to avoid capturing a stale
   `instrumentMap`. This pattern works but is a symptom of holding complex mutable
   data (`Map`) inside React state. A `useReducer` dispatch approach — where the
   reducer always receives the current state — would remove the need for the ref
   and make the update logic easier to follow.

3. **Effect dependency chain: `actions` → `applyOverview` → `useEffect`**:

   ```js
   // App.jsx
   const applyOverview = useCallback((overview) => { ... }, [actions]);

   useEffect(() => { ... }, [state.mode, state.underlying, marketDataClient, applyOverview, actions]);
   ```

   `actions` is an object of stable `useCallback`s, so in practice `applyOverview`
   is stable. But if any `useCallback` in `actions` were re-created (e.g. due to
   a lint rule change or future edit), the effect would re-fire and trigger a
   new load. Destructuring only the specific action needed (`actions.setLoading`,
   etc.) would make the dependency surface explicit.

### WebSocket

4. **`symbols.join("|")` as effect dependency**:

   ```js
   // useOptionStream.js
   }, [mode, fixtureUrl, refreshMs, snapshotClient, simulateLive, symbols.join("|")]);
   ```

   This correctly invalidates the effect when the symbol list changes, but the
   join relies on a stable sort order. `selectNearestOptions` does sort `instrumentsForExpiry`
   before returning, so this is safe — but the behaviour is fragile if the sort
   contract is ever weakened. Passing a stable `symbolsKey` derived from sorted
   symbols (or a hash) and documenting the contract would be safer.

5. **No WebSocket reconnection**: same issue as v3. `onclose` fires, state
   transitions to `"closed"`, and no reconnect is attempted.

6. **`simulateLive` is the default mode for "live"**:

   ```js
   // appConfig.js
   const simulateLive = mode === "live" && searchParams.get("simulate") !== "0";
   ```

   A user opening the page without query params gets live mode + synthetic data.
   To see real market data they must know to pass `?simulate=0`. The intent is
   likely a demo-safe default, but it is easy to be confused about whether the
   numbers are real.

### Supply Chain / Dependencies

7. **React + Vite add a build step and an npm dependency tree**: the brief asks to
   "minimize the usage of dependencies where possible and reasonable" and to explain
   decisions. React is a reasonable choice for state management and component
   reusability, but the justification should be explicit. The dependency surface
   is:

   ```
   react@19, react-dom@19, vite@6, @vitejs/plugin-react@5
   ```

   This is minimal for a React app. The concern is mostly `vite` +
   `@vitejs/plugin-react` which pull in Rollup, esbuild, etc. at build time.
   These are dev-only, so they do not affect the runtime bundle.

8. ~~**Google Fonts CDN in `index.html`**~~ **FIXED**: Removed the
   `fonts.googleapis.com` request. `src/styles/app.css` and `index.html` now
   use the same `system-ui` / `Inter` / `-apple-system` / `Segoe UI` / `Roboto`
   stack as v1 — no external dependency, zero extra network request.

### Algorithm / Correctness

9. **`getNextFriday` returns today on Fridays with no time guard**: inherited from
   v3/v1 — same fix applies (check UTC hour and add 7 days when already past
   expiry time on Friday).

   enrico: i did not think about this at all. and discovered quite late via this review.
   if i had time i would fix it.

### Minor

10. **`snapshotClient.fetchQuotes` errors silently ignored** (`catch(() => { })`):
    same as v3 — users see empty cells without explanation.

11. **`clearUpdatedTimeoutRef.current` not cancelled in cleanup**: the `useEffect`
    in `App.jsx` that loads overview data returns a cleanup that sets `canceled =
    true` but does not cancel `clearUpdatedTimeoutRef`. If `App` unmounts during a
    flash timeout the timeout callback would call `setUpdatedSymbols` on an
    unmounted component. In React 19 this is no longer an error (React handles it
    gracefully), but it is a minor cleanup gap.

---

## What Is Done Well

- **`useEffectEvent` for WS callbacks**: `onBatch`, `onStateChange`, and `onError`
  are wrapped with `useEffectEvent`, which is exactly the React 19 idiom for
  callbacks passed to a persistent effect. This prevents the stream from
  disconnecting and reconnecting when the parent component re-renders — a common
  and subtle bug in older React patterns.

- **`memo(TableRow)`**: each table row is pure; wrapping it with `memo` ensures
  only rows whose symbol is in `updatedSymbols` re-render during WS updates.

- **`useQuoteBatcher` with `requestAnimationFrame`**: quote arrays accumulate
  between frames and are flushed once per `rAF` callback. This matches what v3's
  `createQuoteRenderScheduler` did, translated cleanly to a React hook.

- **`simulatedLiveData.js`**: oscillating synthetic prices with per-underlying
  profiles is a thoughtful developer tool. It means the app can be demonstrated
  without a live exchange connection, and it exercises the rendering pipeline in
  a realistic way.

- **Three-state mode switch**: distinguishing `mock` (static fixture), `live-simulated`
  (synthetic oscillation), and `live` (real API) is a good separation for
  development, demo, and production use.

- **Stale-load guard (`loadSerialRef`)** and `canceled` flag: async race conditions
  on underlying/mode changes are correctly handled.

- **`forceExpiryKey` fast path**: expiry changes re-use cached exchange data, no
  network round-trip.

- **Component decomposition**: `Layout`, `Topbar`, `ControlBar`, `SummaryCards`,
  `SelectionCards`, `InstrumentTable`, `TableRow`, `IndexMarkerRow`, `StatusBar`,
  `MessageBanner` — each has a single, clear responsibility. Props flow is
  explicit.

- **Domain purity maintained**: `selectNearestOptions`, `datePolicy.js`,
  `optionSymbol.js` are identical to v3 and have zero React/DOM imports.

---

## Priority Improvements

1. Move `updatedSymbols` flash state out of React state and manage it via a `ref`
   + direct DOM class toggle to remove per-tick re-renders of the container tree.
2. Convert `useAppState` to `useReducer` to eliminate the `stateRef` workaround.
3. Fix `getNextFriday` for Friday time-of-day edge case.
4. Add WS reconnection with exponential backoff.
5. Surface snapshot fetch errors in `MessageBanner` instead of silently ignoring
   them.
6. Clarify `simulateLive` default in the UI (e.g. label the mode button "Live
   (Simulated)" and require an explicit opt-in for real data).
