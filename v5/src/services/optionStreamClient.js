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
import {
    getSimulatedBookTickerPayload,
    getSimulatedMarkPricePayload,
} from "./simulatedLiveData.js";

function normalizeStreamPayload(payload, streamType) {
    return streamType === "markPrice"
        ? normalizeMarkPriceMessage(payload)
        : normalizeBookTickerMessage(payload);
}

function getStreamName(streamType) {
    return streamType === "markPrice" ? "optionMarkPrice" : "bookTicker";
}

function getStreamBaseUrl(streamType) {
    return streamType === "markPrice"
        ? "wss://fstream.binance.com/market/stream?streams="
        : "wss://fstream.binance.com/public/stream?streams=";
}

export function createOptionStreamClient({
    mode,
    streamType,
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
                    const batch = normalizeStreamPayload(payload, streamType);

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
                    const payload = streamType === "markPrice"
                        ? getSimulatedMarkPricePayload(symbols, Date.now())
                        : getSimulatedBookTickerPayload(symbols, Date.now());
                    onBatch(normalizeStreamPayload(payload, streamType));
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
                .map((symbol) => `${symbol.toLowerCase()}@${getStreamName(streamType)}`)
                .join("/");

            socket = new WebSocket(
                `${getStreamBaseUrl(streamType)}${streams}`,
            );

            socket.onopen = () => {
                onStateChange("connected");
            };

            socket.onmessage = (event) => {
                onBatch(normalizeStreamPayload(event.data, streamType));
            };

            socket.onerror = () => {
                onStateChange("error");
                onError(new Error(
                    streamType === "markPrice"
                        ? "Mark price stream connection error"
                        : "Book ticker stream connection error",
                ));
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

