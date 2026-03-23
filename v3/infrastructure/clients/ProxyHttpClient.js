/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

export class ProxyHttpClient {
    constructor(proxyUrl) {
        this.proxyUrl = proxyUrl;
    }

    async fetchJson(targetUrl, options = {}) {
        const response = await fetch(`${this.proxyUrl}?url=${encodeURIComponent(targetUrl)}`, options);
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        return response.json();
    }
}
