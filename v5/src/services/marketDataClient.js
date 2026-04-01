/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { getSimulatedExchangeInfo, getSimulatedIndexData } from "./simulatedLiveData.js";

export function createMarketDataClient(config, httpClient) {
    if (config.mode === "mock") {
        return {
            async fetchIndex() {
                return fetch(config.mockIndexUrl).then((response) => response.json());
            },
            async fetchOverview() {
                const [indexData, exchangeInfoData] = await Promise.all([
                    fetch(config.mockIndexUrl).then((response) => response.json()),
                    fetch(config.mockExchangeInfoUrl).then((response) => response.json()),
                ]);

                return { indexData, exchangeInfoData };
            },
        };
    }

    if (config.simulateLive) {
        return {
            async fetchIndex(underlying) {
                return getSimulatedIndexData(underlying);
            },

            async fetchOverview(underlying) {
                const nowTimestamp = Date.now();

                const [indexData, exchangeInfoData] = await Promise.all([
                    Promise.resolve(getSimulatedIndexData(underlying, nowTimestamp)),
                    Promise.resolve(getSimulatedExchangeInfo(nowTimestamp)),
                ]);

                return { indexData, exchangeInfoData };
            },
        };
    }

    return {
        async fetchIndex(underlying) {
            return httpClient.fetchJson(`${config.indexBaseUrl}?underlying=${underlying}`);
        },

        async fetchOverview(underlying) {
            const [indexData, exchangeInfoData] = await Promise.all([
                httpClient.fetchJson(`${config.indexBaseUrl}?underlying=${underlying}`),
                httpClient.fetchJson(config.exchangeInfoUrl),
            ]);

            return { indexData, exchangeInfoData };
        },
    };
}

