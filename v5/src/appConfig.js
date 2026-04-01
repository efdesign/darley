/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

const searchParams = new URLSearchParams(window.location.search);

const mode = searchParams.get("mode") === "mock" ? "mock" : "live";
const layoutMode = searchParams.get("layout") === "cards" ? "cards" : "t";
const streamType = searchParams.get("stream") === "markPrice" ? "markPrice" : "bookTicker";

// In live mode, simulate is off by default (pass simulate=1 to enable).
// In mock mode, simulate is always off.
const simulateLive = mode === "live" && searchParams.get("simulate") === "1";

export const appConfig = {
    mode,
    debug: searchParams.get("debug") === "1",
    enableLiveSnapshots: searchParams.get("snapshots") === "1",
    simulateLive,
    layoutMode,
    streamType,
    locale: "de-CH",
    underlying: searchParams.get("underlying") ?? "BTCUSDT",
    indexBaseUrl: "https://eapi.binance.com/eapi/v1/index",
    exchangeInfoUrl: "https://eapi.binance.com/eapi/v1/exchangeInfo",
    snapshotBaseUrl: "https://eapi.binance.com/eapi/v1/depth",
    proxyUrl: "https://noisy-snow-cb60.enrico-furlan.workers.dev/",
    mockIndexUrl: "./mocks/call0.json",
    mockExchangeInfoUrl: "./mocks/call1.json",
    mockMarkPriceUrl: "./mocks/optionMarkPriceMessage.json",
    streamRefreshMs: 3000,
};

