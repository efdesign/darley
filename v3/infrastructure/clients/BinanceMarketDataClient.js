/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

export class BinanceMarketDataClient {
    constructor({ httpClient, indexBaseUrl, exchangeInfoUrl }) {
        this.httpClient = httpClient;
        this.indexBaseUrl = indexBaseUrl;
        this.exchangeInfoUrl = exchangeInfoUrl;
    }

    async fetchIndex(underlying) {
        return this.httpClient.fetchJson(`${this.indexBaseUrl}?underlying=${underlying}`);
    }

    async fetchOverview(underlying) {
        const [indexData, exchangeInfoData] = await Promise.all([
            this.fetchIndex(underlying),
            this.httpClient.fetchJson(this.exchangeInfoUrl),
        ]);
        return { indexData, exchangeInfoData };
    }
}
