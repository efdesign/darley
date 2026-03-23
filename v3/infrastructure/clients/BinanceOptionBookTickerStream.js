/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { normalizeBookTickerMessage } from "../normalizers/normalizeBookTickerMessage.js";

export class BinanceOptionBookTickerStream {
    constructor({ symbols }) {
        this.symbols = symbols;
        this.socket = null;
    }

    connect({ onBatch, onStateChange, onError }) {
        if (!this.symbols.length) {
            onStateChange("idle");
            return;
        }

        const streams = this.symbols
            .map((symbol) => `${symbol.toLowerCase()}@bookTicker`)
            .join("/");

        this.socket = new WebSocket(
            `wss://fstream.binance.com/public/stream?streams=${streams}`,
        );

        this.socket.onopen = () => {
            onStateChange("connected");
        };

        this.socket.onmessage = (event) => {
            onBatch(normalizeBookTickerMessage(event.data));
        };

        this.socket.onerror = () => {
            onStateChange("error");
            onError(new Error("Book ticker stream connection error"));
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

