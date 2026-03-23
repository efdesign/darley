/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useAppState({ mode, underlying }) {
    const [state, setState] = useState({
        mode,
        underlying,
        loadState: "idle",
        connectionState: "idle",
        errorMessage: "",
        indexPrice: null,
        targetExpiryTimestamp: null,
        targetExpiryKey: null,
        selectedCallSymbol: null,
        selectedPutSymbol: null,
        availableUnderlyings: [],
        availableExpiries: [],
        instrumentMap: new Map(),
    });

    const stateRef = useRef(state);
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    const setLoading = useCallback(() => {
        setState((prev) => {
            if (prev.loadState === "loading" && prev.errorMessage === "") {
                return prev;
            }

            const next = { ...prev, loadState: "loading", errorMessage: "" };
            stateRef.current = next;
            return next;
        });
    }, []);

    const setReady = useCallback(() => {
        setState((prev) => {
            if (prev.loadState === "ready" && prev.errorMessage === "") {
                return prev;
            }

            const next = { ...prev, loadState: "ready", errorMessage: "" };
            stateRef.current = next;
            return next;
        });
    }, []);

    const setError = useCallback((message) => {
        setState((prev) => {
            if (prev.loadState === "error" && prev.errorMessage === message) {
                return prev;
            }

            const next = { ...prev, loadState: "error", errorMessage: message };
            stateRef.current = next;
            return next;
        });
    }, []);

    const setConnectionState = useCallback((connectionState) => {
        setState((prev) => {
            if (prev.connectionState === connectionState) {
                return prev;
            }

            const next = { ...prev, connectionState };
            stateRef.current = next;
            return next;
        });
    }, []);

    const setUnderlying = useCallback((nextUnderlying) => {
        setState((prev) => {
            if (prev.underlying === nextUnderlying) {
                return prev;
            }

            const next = { ...prev, underlying: nextUnderlying };
            stateRef.current = next;
            return next;
        });
    }, []);

    const setAvailability = useCallback(({ availableUnderlyings, availableExpiries }) => {
        setState((prev) => {
            const next = {
                ...prev,
                availableUnderlyings,
                availableExpiries,
            };
            stateRef.current = next;
            return next;
        });
    }, []);

    const replaceOverview = useCallback((overview) => {
        const instrumentMap = new Map();

        for (const row of overview.instrumentsForExpiry) {
            instrumentMap.set(row.symbol, { ...row });
        }

        setState((prev) => {
            const next = {
                ...prev,
                underlying: overview.underlying,
                indexPrice: Number(overview.indexPrice),
                targetExpiryTimestamp: overview.targetExpiryTimestamp,
                targetExpiryKey: overview.targetExpiryKey,
                selectedCallSymbol: overview.selectedCall?.symbol ?? null,
                selectedPutSymbol: overview.selectedPut?.symbol ?? null,
                instrumentMap,
            };
            stateRef.current = next;
            return next;
        });
    }, []);

    const applyQuoteBatch = useCallback((quotes) => {
        const current = stateRef.current;
        const nextInstrumentMap = new Map(current.instrumentMap);
        const updatedSymbols = new Set();
        let nextIndexPrice = current.indexPrice;

        for (const quote of quotes) {
            const hasIndexPrice =
                quote.indexPrice !== null &&
                quote.indexPrice !== undefined &&
                quote.indexPrice !== "";

            if (hasIndexPrice) {
                const parsed = Number(quote.indexPrice);
                if (Number.isFinite(parsed)) {
                    nextIndexPrice = parsed;
                }
            }

            if (quote.expiryKey !== current.targetExpiryKey) {
                continue;
            }

            const previousRow = nextInstrumentMap.get(quote.symbol);
            if (!previousRow) {
                continue;
            }

            nextInstrumentMap.set(quote.symbol, {
                ...previousRow,
                bestBuyPrice: quote.bestBuyPrice,
                bestBuyQuantity: quote.bestBuyQuantity,
                bestSellPrice: quote.bestSellPrice,
                bestSellQuantity: quote.bestSellQuantity,
            });

            updatedSymbols.add(quote.symbol);
        }

        setState((prev) => {
            const next = {
                ...prev,
                indexPrice: nextIndexPrice,
                instrumentMap: nextInstrumentMap,
            };
            stateRef.current = next;
            return next;
        });

        return [...updatedSymbols];
    }, []);

    const viewModel = useMemo(() => {
        const rows = Array.from(state.instrumentMap.values());
        const selectedCall = state.selectedCallSymbol
            ? state.instrumentMap.get(state.selectedCallSymbol) ?? null
            : null;
        const selectedPut = state.selectedPutSymbol
            ? state.instrumentMap.get(state.selectedPutSymbol) ?? null
            : null;

        return {
            ...state,
            selectedCall,
            selectedPut,
            callRows: rows
                .filter((row) => row.side === "CALL")
                .sort((left, right) => left.strikePrice - right.strikePrice),
            putRows: rows
                .filter((row) => row.side === "PUT")
                .sort((left, right) => left.strikePrice - right.strikePrice),
        };
    }, [state]);

    const actions = useMemo(
        () => ({
            setLoading,
            setReady,
            setError,
            setConnectionState,
            setUnderlying,
            setAvailability,
            replaceOverview,
            applyQuoteBatch,
        }),
        [
            setLoading,
            setReady,
            setError,
            setConnectionState,
            setUnderlying,
            setAvailability,
            replaceOverview,
            applyQuoteBatch,
        ],
    );

    return {
        state,
        viewModel,
        actions,
    };
}

