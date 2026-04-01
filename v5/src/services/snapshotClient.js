/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { parseOptionSymbol } from "../domain/optionSymbol.js";
import { getSimulatedDepthPayload } from "./simulatedLiveData.js";

function chunk(items, size) {
    const batches = [];
    for (let index = 0; index < items.length; index += size) {
        batches.push(items.slice(index, index + size));
    }
    return batches;
}

function normalizeDepth(symbol, payload) {
    const parsed = parseOptionSymbol(symbol);
    if (!parsed) {
        return null;
    }

    const bestBid = payload?.bids?.[0] ?? [null, null];
    const bestAsk = payload?.asks?.[0] ?? [null, null];

    return {
        symbol,
        expiryKey: parsed.expiryKey,
        bestBuyPrice: bestBid[0],
        bestBuyQuantity: bestBid[1],
        bestSellPrice: bestAsk[0],
        bestSellQuantity: bestAsk[1],
        indexPrice: null,
        eventTime: payload?.T ?? null,
    };
}

export function createSnapshotClient({ httpClient, baseUrl, concurrency = 40, simulateLive = false }) {
    return {
        async fetchQuotes(symbols) {
            if (simulateLive) {
                return symbols
                    .map((symbol, index) => normalizeDepth(symbol, getSimulatedDepthPayload(symbol, Date.now() + index * 150)))
                    .filter(Boolean);
            }

            const results = [];
            const batches = chunk(symbols, concurrency);

            for (const batch of batches) {
                const quotes = await Promise.all(
                    batch.map(async (symbol) => {
                        const payload = await httpClient.fetchJson(
                            `${baseUrl}?symbol=${encodeURIComponent(symbol)}&limit=10`,
                        );
                        return normalizeDepth(symbol, payload);
                    }),
                );

                for (const quote of quotes) {
                    if (quote) {
                        results.push(quote);
                    }
                }
            }

            return results;
        },
    };
}

