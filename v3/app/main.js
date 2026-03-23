/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { appConfig } from "./config.js";
import { AppState } from "../application/AppState.js";
import { applyMarkPriceBatch } from "../application/useCases/applyMarkPriceBatch.js";
import { loadInitialOverview } from "../application/useCases/loadInitialOverview.js";
import { BinanceMarketDataClient } from "../infrastructure/clients/BinanceMarketDataClient.js";
import { BinanceOptionBookTickerStream } from "../infrastructure/clients/BinanceOptionBookTickerStream.js";
import { BinanceOptionQuoteSnapshotClient } from "../infrastructure/clients/BinanceOptionQuoteSnapshotClient.js";
import { MockMarketDataClient } from "../infrastructure/clients/MockMarketDataClient.js";
import { MockOptionMarkPriceStream } from "../infrastructure/clients/MockOptionMarkPriceStream.js";
import { ProxyHttpClient } from "../infrastructure/clients/ProxyHttpClient.js";
import { extractAvailableData, selectNearestOptions } from "../domain/selectNearestOptions.js";
import { getRootElements } from "../presentation/dom/getRootElements.js";
import { createFormatters } from "../presentation/formatters.js";
import { HeaderView } from "../presentation/views/HeaderView.js";
import { InstrumentTableView } from "../presentation/views/InstrumentTableView.js";
import { SelectionView } from "../presentation/views/SelectionView.js";
import { StatusView } from "../presentation/views/StatusView.js";

function createMarketDataClient(httpClient) {
    if (appConfig.mode === "mock") {
        return new MockMarketDataClient({
            indexUrl: appConfig.mockIndexUrl,
            exchangeInfoUrl: appConfig.mockExchangeInfoUrl,
        });
    }

    return new BinanceMarketDataClient({
        httpClient,
        indexBaseUrl: appConfig.indexBaseUrl,
        exchangeInfoUrl: appConfig.exchangeInfoUrl,
    });
}

function createSnapshotClient(httpClient) {
    if (appConfig.mode === "mock" || !appConfig.enableLiveSnapshots) {
        return null;
    }

    return new BinanceOptionQuoteSnapshotClient({
        httpClient,
        baseUrl: appConfig.snapshotBaseUrl,
    });
}

function createStreamClient(symbols) {
    if (appConfig.mode === "mock") {
        return new MockOptionMarkPriceStream({
            fixtureUrl: appConfig.mockMarkPriceUrl,
            refreshMs: appConfig.streamRefreshMs,
        });
    }

    return new BinanceOptionBookTickerStream({ symbols });
}

function navigateToMode(nextMode) {
    const url = new URL(window.location.href);
    url.searchParams.set("mode", nextMode);
    window.location.href = url.toString();
}

function navigateToSnapshots(enabled) {
    const url = new URL(window.location.href);
    if (enabled) {
        url.searchParams.set("snapshots", "1");
    } else {
        url.searchParams.delete("snapshots");
    }
    window.location.href = url.toString();
}

function syncModeSwitch(elements, activeMode) {
    const mapping = [
        [elements.modeLiveButton, "live"],
        [elements.modeMockButton, "mock"],
    ];

    for (const [button, mode] of mapping) {
        const isActive = mode === activeMode;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    }
}

function attachModeSwitch(elements) {
    syncModeSwitch(elements, appConfig.mode);

    elements.modeLiveButton.addEventListener("click", () => {
        if (appConfig.mode !== "live") {
            navigateToMode("live");
        }
    });

    elements.modeMockButton.addEventListener("click", () => {
        if (appConfig.mode !== "mock") {
            navigateToMode("mock");
        }
    });
}

function syncSnapshotSwitch(elements, enabled) {
    elements.snapshotToggleButton.classList.toggle("is-active", enabled);
    elements.snapshotToggleButton.setAttribute("aria-pressed", String(enabled));
    elements.snapshotToggleButton.textContent = enabled ? "Snapshot: On" : "Snapshot: Off";
}

function attachSnapshotSwitch(elements) {
    syncSnapshotSwitch(elements, appConfig.enableLiveSnapshots);

    elements.snapshotToggleButton.addEventListener("click", () => {
        navigateToSnapshots(!appConfig.enableLiveSnapshots);
    });
}

function createRenderer(elements, formatters) {
    const statusView = new StatusView(elements);
    const headerView = new HeaderView(elements, formatters);
    const selectionView = new SelectionView(elements, formatters);
    const tableView = new InstrumentTableView(elements, formatters);

    return {
        render(viewModel) {
            syncModeSwitch(elements, viewModel.mode);
            statusView.render(viewModel);
            headerView.render(viewModel);
            selectionView.render(viewModel);
            tableView.render(viewModel);
        },
        patchQuotes(viewModel, updatedSymbols) {
            syncModeSwitch(elements, viewModel.mode);
            headerView.render(viewModel);
            selectionView.render(viewModel);
            tableView.patch(viewModel, updatedSymbols);
        },
    };
}

function createQuoteRenderScheduler(renderer) {
    let scheduled = false;
    let pendingViewModel = null;
    const pendingSymbols = new Set();

    return {
        queue(viewModel, updatedSymbols) {
            pendingViewModel = viewModel;
            for (const symbol of updatedSymbols) {
                pendingSymbols.add(symbol);
            }

            if (scheduled) {
                return;
            }

            scheduled = true;
            requestAnimationFrame(() => {
                scheduled = false;
                const symbols = [...pendingSymbols];
                pendingSymbols.clear();
                renderer.patchQuotes(pendingViewModel, symbols);
            });
        },
    };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function populateSelect(selectEl, options, currentValue) {
    const newKey = options.map((o) => o.value).join(",");
    if (selectEl.dataset.populatedKey !== newKey) {
        selectEl.innerHTML = "";
        for (const { value, label } of options) {
            const opt = document.createElement("option");
            opt.value = value;
            opt.textContent = label;
            selectEl.appendChild(opt);
        }
        selectEl.dataset.populatedKey = newKey;
    }
    selectEl.value = currentValue ?? "";
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function bootstrap() {
    const elements = getRootElements();
    const formatters = createFormatters(appConfig.locale);
    attachModeSwitch(elements);
    attachSnapshotSwitch(elements);

    const appState = new AppState({
        mode: appConfig.mode,
        underlying: appConfig.underlying,
    });
    const renderer = createRenderer(elements, formatters);
    const quoteScheduler = createQuoteRenderScheduler(renderer);
    const httpClient = new ProxyHttpClient(appConfig.proxyUrl);
    const marketDataClient = createMarketDataClient(httpClient);
    const snapshotClient = createSnapshotClient(httpClient);

    // Session-level cache so expiry changes don't re-fetch heavy exchange info.
    let cachedExchangeInfoData = null;
    let currentUnderlying = appConfig.underlying;
    let currentExpiryKey = null;
    let activeStreamClient = null;
    let loadSerial = 0; // stale-load guard

    // -----------------------------------------------------------------------
    // Stream management
    // -----------------------------------------------------------------------

    function connectStream(overview) {
        if (activeStreamClient) {
            activeStreamClient.disconnect();
            activeStreamClient = null;
        }

        const symbols = overview.instrumentsForExpiry.map((row) => row.symbol);
        const streamClient = createStreamClient(symbols);
        activeStreamClient = streamClient;

        if (snapshotClient && symbols.length > 0) {
            snapshotClient
                .fetchQuotes(symbols)
                .then((snapshotQuotes) => {
                    if (activeStreamClient !== streamClient) return;
                    const result = applyMarkPriceBatch({ appState, quotes: snapshotQuotes });
                    renderer.render(result.viewModel);
                })
                .catch(() => { });
        }

        appState.setConnectionState("connecting");
        renderer.render(appState.getViewModel());

        streamClient.connect({
            onBatch(quotes) {
                if (activeStreamClient !== streamClient) return;
                const result = applyMarkPriceBatch({ appState, quotes });
                quoteScheduler.queue(result.viewModel, result.updatedSymbols);
            },
            onStateChange(connectionState) {
                if (activeStreamClient !== streamClient) return;
                appState.setConnectionState(connectionState);
                renderer.render(appState.getViewModel());
            },
            onError(error) {
                if (activeStreamClient !== streamClient) return;
                appState.setError(error.message);
                renderer.render(appState.getViewModel());
            },
        });
    }

    // -----------------------------------------------------------------------
    // Overview application (shared by full load and re-selections)
    // -----------------------------------------------------------------------

    function applyOverview(overview) {
        const { availableUnderlyings, availableExpiries } = extractAvailableData({
            optionSymbols: cachedExchangeInfoData?.optionSymbols ?? [],
            underlying: overview.underlying,
        });

        currentUnderlying = overview.underlying;
        currentExpiryKey = overview.targetExpiryKey;

        appState.replaceOverview(overview);
        appState.setReady();

        populateSelect(
            elements.underlyingSelect,
            availableUnderlyings.map((u) => ({ value: u, label: u })),
            overview.underlying,
        );
        populateSelect(
            elements.expirySelect,
            availableExpiries.map((e) => ({ value: e.key, label: formatters.formatDate(e.timestamp) })),
            overview.targetExpiryKey,
        );

        renderer.render(appState.getViewModel());
    }

    // -----------------------------------------------------------------------
    // Full load — fetches exchange info + index, then applies
    // -----------------------------------------------------------------------

    async function loadUnderlyingAndConnect(underlying) {
        const thisSerial = ++loadSerial;
        appState.setLoading();
        renderer.render(appState.getViewModel());

        const result = await loadInitialOverview({
            marketDataClient,
            underlying,
            nowTimestamp: Date.now(),
        });
        if (thisSerial !== loadSerial) return;

        cachedExchangeInfoData = result.rawExchangeInfoData;
        applyOverview(result);
        connectStream(result);
    }

    // -----------------------------------------------------------------------
    // Expiry re-selection — no network call, uses cached state
    // -----------------------------------------------------------------------

    function reSelectExpiryAndConnect(expiryKey) {
        if (!cachedExchangeInfoData) return;
        ++loadSerial; // invalidate any in-flight snapshot

        const overview = selectNearestOptions({
            indexPrice: appState.snapshot.indexPrice,
            optionSymbols: cachedExchangeInfoData.optionSymbols ?? [],
            underlying: currentUnderlying,
            nowTimestamp: Date.now(),
            forceExpiryKey: expiryKey,
        });

        applyOverview(overview);
        connectStream(overview);
    }

    // -----------------------------------------------------------------------
    // Selector wiring
    // -----------------------------------------------------------------------

    elements.underlyingSelect.addEventListener("change", (event) => {
        const newUnderlying = event.target.value;
        if (newUnderlying && newUnderlying !== currentUnderlying) {
            loadUnderlyingAndConnect(newUnderlying).catch((err) => {
                appState.setError(err.message);
                renderer.render(appState.getViewModel());
            });
        }
    });

    elements.expirySelect.addEventListener("change", (event) => {
        const newExpiryKey = event.target.value;
        if (newExpiryKey && newExpiryKey !== currentExpiryKey) {
            reSelectExpiryAndConnect(newExpiryKey);
        }
    });

    window.addEventListener("beforeunload", () => {
        if (activeStreamClient) activeStreamClient.disconnect();
    });

    // -----------------------------------------------------------------------
    // Initial load
    // -----------------------------------------------------------------------

    appState.setLoading();
    renderer.render(appState.getViewModel());

    try {
        await loadUnderlyingAndConnect(appConfig.underlying);
    } catch (error) {
        appState.setError(error.message);
        renderer.render(appState.getViewModel());
    }
}

bootstrap();

