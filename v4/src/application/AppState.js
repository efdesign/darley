/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

export class AppState {
    constructor({ mode, underlying }) {
        this.snapshot = {
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
        };
        this.instrumentMap = new Map();
    }

    setLoading() {
        this.snapshot.loadState = "loading";
        this.snapshot.errorMessage = "";
    }

    setReady() {
        this.snapshot.loadState = "ready";
        this.snapshot.errorMessage = "";
    }

    setError(message) {
        this.snapshot.loadState = "error";
        this.snapshot.errorMessage = message;
    }

    setConnectionState(connectionState) {
        this.snapshot.connectionState = connectionState;
    }

    replaceOverview(overview) {
        this.instrumentMap = new Map();

        for (const row of overview.instrumentsForExpiry) {
            this.instrumentMap.set(row.symbol, { ...row });
        }

        this.snapshot.underlying = overview.underlying;
        this.snapshot.indexPrice = overview.indexPrice;
        this.snapshot.targetExpiryTimestamp = overview.targetExpiryTimestamp;
        this.snapshot.targetExpiryKey = overview.targetExpiryKey;
        this.snapshot.selectedCallSymbol = overview.selectedCall?.symbol ?? null;
        this.snapshot.selectedPutSymbol = overview.selectedPut?.symbol ?? null;
    }

    applyQuoteBatch(quotes) {
        const updatedSymbols = new Set();

        for (const quote of quotes) {
            const hasIndexPrice =
                quote.indexPrice !== null &&
                quote.indexPrice !== undefined &&
                quote.indexPrice !== "";
            const nextIndexPrice = hasIndexPrice ? Number(quote.indexPrice) : Number.NaN;
            if (Number.isFinite(nextIndexPrice)) {
                this.snapshot.indexPrice = nextIndexPrice;
            }

            if (quote.expiryKey !== this.snapshot.targetExpiryKey) {
                continue;
            }

            const current = this.instrumentMap.get(quote.symbol);
            if (!current) {
                continue;
            }

            this.instrumentMap.set(quote.symbol, {
                ...current,
                bestBuyPrice: quote.bestBuyPrice,
                bestBuyQuantity: quote.bestBuyQuantity,
                bestSellPrice: quote.bestSellPrice,
                bestSellQuantity: quote.bestSellQuantity,
            });

            updatedSymbols.add(quote.symbol);
        }

        return [...updatedSymbols];
    }

    getRow(symbol) {
        return this.instrumentMap.get(symbol) ?? null;
    }

    getViewModel() {
        const rows = Array.from(this.instrumentMap.values());
        return {
            ...this.snapshot,
            selectedCall: this.getRow(this.snapshot.selectedCallSymbol),
            selectedPut: this.getRow(this.snapshot.selectedPutSymbol),
            callRows: rows.filter((row) => row.side === "CALL"),
            putRows: rows.filter((row) => row.side === "PUT"),
        };
    }
}

