/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { normalizeMarkPriceMessage } from "../normalizers/normalizeMarkPriceMessage.js";

export class BinanceOptionMarkPriceStream {
    constructor({ underlying }) {
        this.underlying = underlying;
        this.socket = null;
    }

    connect({ onBatch, onStateChange, onError }) {
        this.socket = new WebSocket(
            `wss://fstream.binance.com/market/stream?streams=${this.underlying.toLowerCase()}@optionMarkPrice`,
        );

        this.socket.onopen = () => {
            onStateChange("connected");
        };

        this.socket.onmessage = (event) => {
            onBatch(normalizeMarkPriceMessage(event.data));
        };

        this.socket.onerror = () => {
            onStateChange("error");
            onError(new Error("WebSocket connection error"));
        };

        this.socket.onclose = () => {
            onStateChange("closed");
        };
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
    }
}
