/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

export class MockMarketDataClient {
    constructor({ indexUrl, exchangeInfoUrl }) {
        this.indexUrl = indexUrl;
        this.exchangeInfoUrl = exchangeInfoUrl;
    }

    async fetchIndex(_underlying) {
        return fetch(this.indexUrl).then((response) => response.json());
    }

    async fetchOverview(_underlying) {
        const [indexData, exchangeInfoData] = await Promise.all([
            fetch(this.indexUrl).then((response) => response.json()),
            fetch(this.exchangeInfoUrl).then((response) => response.json()),
        ]);
        return { indexData, exchangeInfoData };
    }
}
