/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { appConfig } from "./appConfig.js";
import { loadInitialOverview } from "./application/useCases/loadInitialOverview.js";
import { extractAvailableData, selectNearestOptions } from "./domain/selectNearestOptions.js";
import { useAppState } from "./hooks/useAppState.js";
import { useFormatters } from "./hooks/useFormatters.js";
import { useOptionStream } from "./hooks/useOptionStream.js";
import { useQuoteBatcher } from "./hooks/useQuoteBatcher.js";
import { createHttpClient } from "./services/httpClient.js";
import { createMarketDataClient } from "./services/marketDataClient.js";
import { createSnapshotClient } from "./services/snapshotClient.js";
import { Layout } from "./components/Layout.jsx";

const LIVE_FALLBACK_MESSAGE_KEY = "darley-v5-live-fallback-message";

function navigateToMode(nextMode) {
  const url = new URL(window.location.href);
  if (nextMode === "mock") {
    url.searchParams.set("mode", "mock");
    url.searchParams.delete("simulate");
  } else if (nextMode === "live-simulated") {
    url.searchParams.set("mode", "live");
    url.searchParams.set("simulate", "1");
  } else {
    // "live" = real API
    url.searchParams.set("mode", "live");
    url.searchParams.delete("simulate");
  }
  window.location.href = url.toString();
}

function storeLiveFallbackMessage(message) {
  sessionStorage.setItem(LIVE_FALLBACK_MESSAGE_KEY, message);
}

function consumeLiveFallbackMessage() {
  const message = sessionStorage.getItem(LIVE_FALLBACK_MESSAGE_KEY);
  if (message) {
    sessionStorage.removeItem(LIVE_FALLBACK_MESSAGE_KEY);
  }
  return message;
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

function navigateToLayout(nextLayoutMode) {
  const url = new URL(window.location.href);
  url.searchParams.set("layout", nextLayoutMode);
  window.location.href = url.toString();
}

function navigateToStreamType(nextStreamType) {
  const url = new URL(window.location.href);
  url.searchParams.set("stream", nextStreamType);
  window.location.href = url.toString();
}

export function App() {
  const { state, viewModel, actions } = useAppState({
    mode: appConfig.mode,
    underlying: appConfig.underlying,
  });
  const formatters = useFormatters(appConfig.locale);
  const startupMessage = useState(() => consumeLiveFallbackMessage())[0];

  const [updatedSymbols, setUpdatedSymbols] = useState(new Set());
  const clearUpdatedTimeoutRef = useRef(null);
  const cachedExchangeInfoRef = useRef(null);
  const loadSerialRef = useRef(0);

  const httpClient = useMemo(() => createHttpClient(appConfig.proxyUrl), []);

  const marketDataClient = useMemo(() => {
    return createMarketDataClient({ ...appConfig, mode: state.mode }, httpClient);
  }, [httpClient, state.mode]);

  const snapshotClient = useMemo(() => {
    if (state.mode === "mock" || !appConfig.enableLiveSnapshots) {
      return null;
    }

    return createSnapshotClient({
      httpClient,
      baseUrl: appConfig.snapshotBaseUrl,
      simulateLive: appConfig.simulateLive,
    });
  }, [httpClient, state.mode]);

  const applyOverview = useCallback(
    (overview) => {
      const { availableUnderlyings, availableExpiries } = extractAvailableData({
        optionSymbols: cachedExchangeInfoRef.current?.optionSymbols ?? [],
        underlying: overview.underlying,
      });

      actions.setAvailability({ availableUnderlyings, availableExpiries });
      actions.replaceOverview(overview);
      actions.setReady();
    },
    [actions],
  );

  useEffect(() => {
    let canceled = false;
    const serial = ++loadSerialRef.current;

    async function run() {
      actions.setLoading();

      try {
        const result = await loadInitialOverview({
          marketDataClient,
          underlying: state.underlying,
          nowTimestamp: Date.now(),
        });

        if (canceled || serial !== loadSerialRef.current) {
          return;
        }

        cachedExchangeInfoRef.current = result.rawExchangeInfoData;
        applyOverview(result);
      } catch (error) {
        if (canceled || serial !== loadSerialRef.current) {
          return;
        }

        if (state.mode === "live" && !appConfig.simulateLive) {
          storeLiveFallbackMessage("Live service error. Switched to live (sim).");
          navigateToMode("live-simulated");
          return;
        }

        actions.setError(error.message);
      }
    }

    run();

    return () => {
      canceled = true;
    };
  }, [state.mode, state.underlying, marketDataClient, applyOverview, actions]);

  const handleQuotes = useCallback(
    (quotes) => {
      const updated = actions.applyQuoteBatch(quotes);
      if (!updated.length) {
        return;
      }

      setUpdatedSymbols(new Set(updated));
      if (clearUpdatedTimeoutRef.current) {
        window.clearTimeout(clearUpdatedTimeoutRef.current);
      }
      clearUpdatedTimeoutRef.current = window.setTimeout(() => {
        setUpdatedSymbols(new Set());
      }, 450);
    },
    [actions],
  );

  const queueQuotes = useQuoteBatcher(handleQuotes);

  const streamSymbols = useMemo(() => {
    return [...viewModel.callRows, ...viewModel.putRows].map((row) => row.symbol);
  }, [viewModel.callRows, viewModel.putRows]);

  const handleStreamError = useCallback(
    (error) => {
      if (state.mode === "live" && !appConfig.simulateLive) {
        storeLiveFallbackMessage("Live service error. Switched to live (sim).");
        navigateToMode("live-simulated");
        return;
      }

      actions.setError(error.message);
    },
    [actions, state.mode],
  );

  useOptionStream({
    mode: state.mode,
    streamType: appConfig.streamType,
    symbols: streamSymbols,
    fixtureUrl: appConfig.mockMarkPriceUrl,
    refreshMs: appConfig.streamRefreshMs,
    snapshotClient,
    simulateLive: appConfig.simulateLive,
    onBatch: queueQuotes,
    onStateChange: actions.setConnectionState,
    onError: handleStreamError,
  });

  // Derive the effective three-state mode for the switch.
  const effectiveMode = state.mode === "live"
    ? (appConfig.simulateLive ? "live-simulated" : "live")
    : "mock";

  const handleModeChange = useCallback((nextMode) => {
    if (nextMode !== effectiveMode) {
      navigateToMode(nextMode);
    }
  }, [effectiveMode]);

  const handleToggleSnapshots = useCallback(() => {
    navigateToSnapshots(!appConfig.enableLiveSnapshots);
  }, []);

  const handleLayoutChange = useCallback((nextLayoutMode) => {
    if (nextLayoutMode !== appConfig.layoutMode) {
      navigateToLayout(nextLayoutMode);
    }
  }, []);

  const handleStreamTypeChange = useCallback((nextStreamType) => {
    if (nextStreamType !== appConfig.streamType) {
      navigateToStreamType(nextStreamType);
    }
  }, []);

  const handleUnderlyingChange = useCallback(
    (nextUnderlying) => {
      if (!nextUnderlying || nextUnderlying === state.underlying) {
        return;
      }

      actions.setUnderlying(nextUnderlying);
    },
    [actions, state.underlying],
  );

  const handleExpiryChange = useCallback(
    (nextExpiryKey) => {
      if (!nextExpiryKey || !cachedExchangeInfoRef.current) {
        return;
      }

      if (nextExpiryKey === state.targetExpiryKey) {
        return;
      }

      const overview = selectNearestOptions({
        indexPrice: state.indexPrice,
        optionSymbols: cachedExchangeInfoRef.current.optionSymbols ?? [],
        underlying: state.underlying,
        nowTimestamp: Date.now(),
        forceExpiryKey: nextExpiryKey,
      });

      applyOverview(overview);
    },
    [state.indexPrice, state.underlying, state.targetExpiryKey, applyOverview],
  );

  return (
    <Layout
      viewModel={viewModel}
      effectiveMode={effectiveMode}
      snapshotsEnabled={appConfig.enableLiveSnapshots}
      layoutMode={appConfig.layoutMode}
      streamType={appConfig.streamType}
      startupMessage={startupMessage}
      formatters={formatters}
      updatedSymbols={updatedSymbols}
      onModeChange={handleModeChange}
      onToggleSnapshots={handleToggleSnapshots}
      onLayoutChange={handleLayoutChange}
      onStreamTypeChange={handleStreamTypeChange}
      onUnderlyingChange={handleUnderlyingChange}
      onExpiryChange={handleExpiryChange}
    />
  );
}

