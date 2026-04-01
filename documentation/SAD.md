# Darley v5 Software Architecture Document

> Scope: v5 only. This document describes the current React 19 + Vite application in [v5](../v5) and not the earlier v1/v3/v4 implementations.

## Purpose

Darley v5 is a browser-based options viewer for one underlying asset at a time. It loads Binance options metadata, chooses one expiry and the nearest CALL/PUT strikes around the current index price, then keeps those rows updated from a live or simulated market data stream.

The app supports two visual layouts:

- a classic two-card layout with separate CALL and PUT tables
- a mirrored T layout with the strike centered once

It also supports three data modes:

- live
- live-simulated
- mock

And it can switch between two stream types:

- book ticker
- mark price

## What the software does

The user opens the app, picks an underlying and expiry, then watches bid/ask quotes update in real time. The current view model always contains the selected CALL, the selected PUT, the full instrument list for the chosen expiry, the current index price, and the current connection state.

The app is designed so the same data model can be rendered in different ways without changing the selection logic or the stream transport.

## Architectural Style

The current codebase uses a layered single-page app structure:

- Bootstrap layer: [index.html](../v5/index.html), [main.jsx](../v5/src/main.jsx), [vite.config.js](../v5/vite.config.js)
- Orchestration layer: [App.jsx](../v5/src/App.jsx), [appConfig.js](../v5/src/appConfig.js)
- State layer: [useAppState.js](../v5/src/hooks/useAppState.js), [useQuoteBatcher.js](../v5/src/hooks/useQuoteBatcher.js), [useOptionStream.js](../v5/src/hooks/useOptionStream.js), [useFormatters.js](../v5/src/hooks/useFormatters.js)
- Domain layer: [datePolicy.js](../v5/src/domain/datePolicy.js), [optionSymbol.js](../v5/src/domain/optionSymbol.js), [selectNearestOptions.js](../v5/src/domain/selectNearestOptions.js)
- Use-case layer: [loadInitialOverview.js](../v5/src/application/useCases/loadInitialOverview.js)
- Service layer: [httpClient.js](../v5/src/services/httpClient.js), [marketDataClient.js](../v5/src/services/marketDataClient.js), [snapshotClient.js](../v5/src/services/snapshotClient.js), [optionStreamClient.js](../v5/src/services/optionStreamClient.js), [normalizers.js](../v5/src/services/normalizers.js), [simulatedLiveData.js](../v5/src/services/simulatedLiveData.js)
- Presentation layer: [src/components](../v5/src/components), [styles/app.css](../v5/src/styles/app.css)

The key architectural choices are:

- query parameters are the source of truth for mode, layout, stream type, snapshots, and underlying
- the app reloads on those changes instead of trying to partially mutate the tree in place
- state is managed with a dedicated React hook instead of an external store
- high-frequency quote updates are batched with `requestAnimationFrame`
- stream callbacks use React 19 `useEffectEvent` so re-renders do not force reconnects
- the same normalized quote shape is used for mock, simulated, and live data
- mobile presentation is handled with CSS plus a small viewport check in the T table

## High-Level Runtime Model

1. The browser loads the static shell from [index.html](../v5/index.html).
2. [main.jsx](../v5/src/main.jsx) mounts [App.jsx](../v5/src/App.jsx).
3. [App.jsx](../v5/src/App.jsx) reads [appConfig.js](../v5/src/appConfig.js) and builds the service clients.
4. [useAppState.js](../v5/src/hooks/useAppState.js) creates the current state snapshot and the action callbacks.
5. [loadInitialOverview.js](../v5/src/application/useCases/loadInitialOverview.js) fetches the current index price and exchange metadata.
6. [selectNearestOptions.js](../v5/src/domain/selectNearestOptions.js) picks the target expiry and the nearest CALL and PUT around the index price.
7. [Layout.jsx](../v5/src/components/Layout.jsx) renders the current view as cards or as a T chain.
8. [useOptionStream.js](../v5/src/hooks/useOptionStream.js) connects the chosen stream and keeps the current rows updated.
9. [useQuoteBatcher.js](../v5/src/hooks/useQuoteBatcher.js) groups quote bursts into frame-sized batches.
10. [useAppState.js](../v5/src/hooks/useAppState.js) applies those batches to the current instrument map and exposes the next view model.

## Data Flow Diagrams

The diagrams below are stored as separate Mermaid source files so the markdown
document stays readable and the Mermaid plugin can preview each flow directly.

- [Boot and overview selection](SAD-boot.mmd)
- [Stream connection, normalization, and batching](SAD-stream.mmd)
- [User controls and layout switching](SAD-controls.mmd)

Each file contains the same activity-style flowchart that was previously embedded
here.

## Module Breakdown

### Bootstrap and orchestration

- [index.html](../v5/index.html) is the static shell and only provides the root element.
- [main.jsx](../v5/src/main.jsx) mounts the React tree.
- [App.jsx](../v5/src/App.jsx) is the top-level coordinator.
- [appConfig.js](../v5/src/appConfig.js) parses the query string and defines the defaults.
- [vite.config.js](../v5/vite.config.js) sets the base path and production build target.

### State and runtime hooks

- [useAppState.js](../v5/src/hooks/useAppState.js) keeps the current snapshot, instrument map, and derived view model.
- [useQuoteBatcher.js](../v5/src/hooks/useQuoteBatcher.js) buffers incoming quotes until the next animation frame.
- [useOptionStream.js](../v5/src/hooks/useOptionStream.js) owns the active stream lifecycle and uses `useEffectEvent` for stable callbacks.
- [useFormatters.js](../v5/src/hooks/useFormatters.js) memoizes the locale-specific formatters used across the UI.

### Domain logic

- [datePolicy.js](../v5/src/domain/datePolicy.js) contains the expiry policy helpers.
- [optionSymbol.js](../v5/src/domain/optionSymbol.js) parses Binance option symbols into base, expiry, strike, and side parts.
- [selectNearestOptions.js](../v5/src/domain/selectNearestOptions.js) selects the target expiry, collects all trading instruments for that expiry, and picks the nearest CALL and PUT to the current index price.

The expiry policy is anchored to Friday 08:00 UTC so it lines up with Binance option expiry timestamps rather than the local machine timezone.

The selection logic is intentionally pure. It receives data and returns data, which keeps the algorithm easy to reason about and test.

### Use cases

- [loadInitialOverview.js](../v5/src/application/useCases/loadInitialOverview.js) combines index and exchange metadata, then calls the domain selector.

### Services

- [httpClient.js](../v5/src/services/httpClient.js) routes REST requests through the configured proxy.
- [marketDataClient.js](../v5/src/services/marketDataClient.js) chooses between mock, live-simulated, and live REST calls.
- [snapshotClient.js](../v5/src/services/snapshotClient.js) pre-fills bid and ask data before the stream arrives.
- [optionStreamClient.js](../v5/src/services/optionStreamClient.js) opens the mock, simulated, or live quote stream.
- [normalizers.js](../v5/src/services/normalizers.js) converts mark price and book ticker payloads into one common quote shape.
- [simulatedLiveData.js](../v5/src/services/simulatedLiveData.js) generates deterministic synthetic index, exchange, depth, and stream data.

### Presentation components

The UI is split into small components with single responsibilities:

- [Layout.jsx](../v5/src/components/Layout.jsx) decides whether the page uses cards or the T chain.
- [Topbar.jsx](../v5/src/components/Header/Topbar.jsx) renders the brand and the desktop control group.
- [TopbarActions.jsx](../v5/src/components/Header/TopbarActions.jsx) is the shared control cluster used in the header and the mobile footer.
- [ControlBar.jsx](../v5/src/components/Header/ControlBar.jsx) renders the underlying and expiry selectors.
- [SummaryCards.jsx](../v5/src/components/Header/SummaryCards.jsx) shows the index price, underlying, and target expiry.
- [SelectionCards.jsx](../v5/src/components/Selection/SelectionCards.jsx) shows the selected CALL and PUT details.
- [MessageBanner.jsx](../v5/src/components/Status/MessageBanner.jsx) shows fallback and error notices.
- [StatusBar.jsx](../v5/src/components/Status/StatusBar.jsx) shows connection status and, on mobile, the relocated controls.
- [ModeSwitch.jsx](../v5/src/components/ModeSwitch.jsx) toggles live, live-simulated, and mock.
- [LayoutModeSwitch.jsx](../v5/src/components/LayoutModeSwitch.jsx) toggles cards and T.
- [StreamModeSwitch.jsx](../v5/src/components/StreamModeSwitch.jsx) toggles book ticker and mark price.
- [SnapshotToggle.jsx](../v5/src/components/SnapshotToggle.jsx) enables or disables snapshot prefill.
- [InstrumentTable.jsx](../v5/src/components/Tables/InstrumentTable.jsx) renders the cards layout table.
- [OptionChainTable.jsx](../v5/src/components/Tables/OptionChainTable.jsx) renders the T layout table and contains the mobile-aware chain markup.
- [TableRow.jsx](../v5/src/components/Tables/TableRow.jsx) renders a single cards-layout row.
- [IndexMarkerRow.jsx](../v5/src/components/Tables/IndexMarkerRow.jsx) inserts the index price marker between strikes.

### Shared utilities

- [formatters.js](../v5/src/formatters.js) contains locale-aware currency, quantity, and date formatters.
- [styles/app.css](../v5/src/styles/app.css) contains the full responsive visual system.

## Architectural Choices and Tradeoffs

### URL-driven state

The app uses query parameters instead of a routing library or local state for mode, layout, stream type, and snapshots. This keeps the controls explicit and makes the current configuration visible in the address bar. The tradeoff is that switching a mode causes a full page reload, but that is acceptable here because the app needs a clean re-bootstrap anyway.

### Hook-based state instead of a store

The current v5 runtime uses [useAppState.js](../v5/src/hooks/useAppState.js) rather than Redux or another global store. The state surface is small enough that a custom hook is simpler and easier to follow. The hook keeps a `stateRef` so quote batches can update the current instrument map without stale closures.

### Shared normalized quote model

`normalizers.js` converts mark price and book ticker payloads into the same quote shape. That means the rest of the app does not branch on stream-specific payloads. The display layer only cares about best bid, best ask, quantities, symbol, expiry key, and index price.

### Snapshot prefill plus stream updates

The snapshot client is optional, but it should not fan out across the full options chain. The Binance options docs expose per-symbol depth snapshots and per-symbol streams, and I did not find a bulk depth snapshot endpoint that can warm every row in one request. Prefilling the full chain therefore multiplies proxy calls and can exhaust quota.

The safer pattern is to snapshot only the selected call/put pair or a small ATM window, then let the websocket stream fill the rest of the table. If a single-call warm start is required, `GET /eapi/v1/mark` is the coarse alternative, but it does not provide bid/ask depth.

The bookTicker websocket pattern from the Binance docs is still useful here because multiple `<symbol>@bookTicker` streams can share one connection. That helps the websocket side of the design, and the current stream client already multiplexes symbols in one socket. It does not, by itself, remove the REST snapshot fan-out problem.

### React 19 stream handling

`useOptionStream.js` uses `useEffectEvent` so the stream callbacks stay stable while the parent component re-renders. This avoids unnecessary reconnect churn.

### Frame-based quote batching

`useQuoteBatcher.js` groups quote bursts with `requestAnimationFrame`. That keeps the UI from trying to re-render for every individual event when the stream is busy.

### Mobile-first layout choices

The T layout has extra mobile-specific handling in [OptionChainTable.jsx](../v5/src/components/Tables/OptionChainTable.jsx) and in [styles/app.css](../v5/src/styles/app.css):

- the action switches move into the bottom status area on narrow screens
- the selection cards are hidden on phones
- the T table collapses to a smaller grid so the visible cells stay readable
- the symbol columns are hidden on mobile
- the strike column stays visually dominant
- the mobile cells use tighter padding

## Removed Dead Code

The old compatibility layer under `src/application` and `src/context` was removed in this cleanup. The current v5 runtime uses only the hook-based path in [App.jsx](../v5/src/App.jsx) and [useAppState.js](../v5/src/hooks/useAppState.js).

That keeps the codebase smaller and avoids carrying parallel abstractions that were no longer part of the bootstrap path.

## Build and Deployment

The app is set up as a static frontend:

- [index.html](../v5/index.html) contains only the root element and the module entry point.
- [vite.config.js](../v5/vite.config.js) configures a relative base path and builds to `dist`.
- `npm run build` produces static assets that can be served from a static host.
- `npm run preview` is the local check for the production bundle.

Because the app is front-end only, the only runtime dependencies are React and ReactDOM. Vite and the React plugin stay in devDependencies.

## Summary

Darley v5 is a small but layered options viewer. Its main strength is that the data model is consistent across modes and streams, while the presentation can switch between a dense card layout and a more exchange-like T layout. The code stays readable because the selection algorithm is pure, the stream payloads are normalized early, and the UI is split into focused components.
