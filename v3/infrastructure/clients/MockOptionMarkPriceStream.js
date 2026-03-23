/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { normalizeMarkPriceMessage } from "../normalizers/normalizeMarkPriceMessage.js";

export class MockOptionMarkPriceStream {
    constructor({ fixtureUrl, refreshMs }) {
        this.fixtureUrl = fixtureUrl;
        this.refreshMs = refreshMs;
        this.intervalId = null;
    }

    async connect({ onBatch, onStateChange, onError }) {
        try {
            const payload = await fetch(this.fixtureUrl).then((response) => response.json());
            const batch = normalizeMarkPriceMessage(payload);

            onStateChange("connected");
            onBatch(batch);

            this.intervalId = window.setInterval(() => {
                onBatch(batch);
            }, this.refreshMs);
        } catch (error) {
            onStateChange("error");
            onError(error);
        }
    }

    disconnect() {
        if (this.intervalId) {
            window.clearInterval(this.intervalId);
        }
    }
}
