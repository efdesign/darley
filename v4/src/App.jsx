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

function navigateToMode(nextMode) {
  const url = new URL(window.location.href);
  if (nextMode === "mock") {
    url.searchParams.set("mode", "mock");
    url.searchParams.delete("simulate");
  } else if (nextMode === "live-simulated") {
    url.searchParams.set("mode", "live");
    url.searchParams.delete("simulate"); // simulate=on is the default
  } else {
    // "live" = real API
    url.searchParams.set("mode", "live");
    url.searchParams.set("simulate", "0");
  }
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

export function App() {
  const { state, viewModel, actions } = useAppState({
    mode: appConfig.mode,
    underlying: appConfig.underlying,
  });
  const formatters = useFormatters(appConfig.locale);

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
      actions.setError(error.message);
    },
    [actions],
  );

  useOptionStream({
    mode: state.mode,
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
      formatters={formatters}
      updatedSymbols={updatedSymbols}
      onModeChange={handleModeChange}
      onToggleSnapshots={handleToggleSnapshots}
      onUnderlyingChange={handleUnderlyingChange}
      onExpiryChange={handleExpiryChange}
    />
  );
}

