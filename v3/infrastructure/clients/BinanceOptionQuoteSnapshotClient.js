/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { parseOptionSymbol } from "../../domain/optionSymbol.js";

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

export class BinanceOptionQuoteSnapshotClient {
    constructor({ httpClient, baseUrl, concurrency = 40 }) {
        this.httpClient = httpClient;
        this.baseUrl = baseUrl;
        this.concurrency = concurrency;
    }

    async fetchQuotes(symbols) {
        const results = [];
        const batches = chunk(symbols, this.concurrency);

        for (const batch of batches) {
            const quotes = await Promise.all(
                batch.map(async (symbol) => {
                    const payload = await this.httpClient.fetchJson(
                        `${this.baseUrl}?symbol=${encodeURIComponent(symbol)}&limit=10`,
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
    }
}

