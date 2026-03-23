/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import {
    normalizeBookTickerMessage,
    normalizeMarkPriceMessage,
} from "./normalizers.js";
import { getSimulatedBookTickerPayload } from "./simulatedLiveData.js";

export function createOptionStreamClient({
    mode,
    symbols,
    fixtureUrl,
    refreshMs,
    simulateLive = false,
}) {
    if (mode === "mock") {
        let intervalId = null;

        return {
            async connect({ onBatch, onStateChange, onError }) {
                try {
                    const payload = await fetch(fixtureUrl).then((response) => response.json());
                    const batch = normalizeMarkPriceMessage(payload);

                    onStateChange("connected");
                    onBatch(batch);

                    intervalId = window.setInterval(() => {
                        onBatch(batch);
                    }, refreshMs);
                } catch (error) {
                    onStateChange("error");
                    onError(error);
                }
            },
            disconnect() {
                if (intervalId) {
                    window.clearInterval(intervalId);
                    intervalId = null;
                }
            },
        };
    }

    if (simulateLive) {
        let intervalId = null;

        return {
            connect({ onBatch, onStateChange }) {
                if (!symbols.length) {
                    onStateChange("idle");
                    return;
                }

                const emitBatch = () => {
                    onBatch(normalizeBookTickerMessage(getSimulatedBookTickerPayload(symbols, Date.now())));
                };

                onStateChange("connected");
                emitBatch();
                intervalId = window.setInterval(emitBatch, refreshMs);
            },
            disconnect() {
                if (intervalId) {
                    window.clearInterval(intervalId);
                    intervalId = null;
                }
            },
        };
    }

    let socket = null;

    return {
        connect({ onBatch, onStateChange, onError }) {
            if (!symbols.length) {
                onStateChange("idle");
                return;
            }

            const streams = symbols
                .map((symbol) => `${symbol.toLowerCase()}@bookTicker`)
                .join("/");

            socket = new WebSocket(
                `wss://fstream.binance.com/public/stream?streams=${streams}`,
            );

            socket.onopen = () => {
                onStateChange("connected");
            };

            socket.onmessage = (event) => {
                onBatch(normalizeBookTickerMessage(event.data));
            };

            socket.onerror = () => {
                onStateChange("error");
                onError(new Error("Book ticker stream connection error"));
            };

            socket.onclose = () => {
                onStateChange("closed");
            };
        },

        disconnect() {
            if (socket) {
                socket.close();
                socket = null;
            }
        },
    };
}

