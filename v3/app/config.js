/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

const searchParams = new URLSearchParams(window.location.search);

const mode = searchParams.get("mode") === "mock" ? "mock" : "live";

// "underlying" can be overridden via ?underlying=ETHUSDT

export const appConfig = {
    mode,
    debug: searchParams.get("debug") === "1",
    enableLiveSnapshots: searchParams.get("snapshots") === "1",
    locale: "de-CH",
    underlying: searchParams.get("underlying") ?? "BTCUSDT",
    indexBaseUrl: "https://eapi.binance.com/eapi/v1/index",
    exchangeInfoUrl: "https://eapi.binance.com/eapi/v1/exchangeInfo",
    snapshotBaseUrl: "https://eapi.binance.com/eapi/v1/depth",
    proxyUrl: "https://noisy-snow-cb60.enrico-furlan.workers.dev/",
    mockIndexUrl: "../mocks/call0.json",
    mockExchangeInfoUrl: "../mocks/call1.json",
    mockMarkPriceUrl: "../mocks/optionMarkPriceMessage.json",
    streamRefreshMs: 3000,
};

