/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { parseOptionSymbol } from "../domain/optionSymbol.js";
import { getNextFridayDate, toExpiryKey } from "../domain/datePolicy.js";

const SIMULATED_PROFILES = {
    BTCUSDT: { baseAsset: "BTC", price: 68500, step: 2500, scale: 2 },
    ETHUSDT: { baseAsset: "ETH", price: 3550, step: 150, scale: 2 },
    BNBUSDT: { baseAsset: "BNB", price: 610, step: 25, scale: 2 },
    SOLUSDT: { baseAsset: "SOL", price: 185, step: 10, scale: 2 },
    XRPUSDT: { baseAsset: "XRP", price: 0.64, step: 0.04, scale: 4 },
    DOGEUSDT: { baseAsset: "DOGE", price: 0.18, step: 0.01, scale: 5 },
};

function round(value, decimals) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}

function formatNumber(value, decimals) {
    return round(value, decimals).toFixed(decimals);
}

function getProfile(underlying) {
    return SIMULATED_PROFILES[underlying] ?? SIMULATED_PROFILES.BTCUSDT;
}

function createExpiryDates(nowTimestamp) {
    const nextFriday = getNextFridayDate(nowTimestamp);
    const dates = [];

    for (let index = 0; index < 4; index += 1) {
        const date = new Date(nextFriday);
        date.setUTCDate(nextFriday.getUTCDate() + index * 7);
        date.setUTCHours(8, 0, 0, 0);
        dates.push(date);
    }

    return dates;
}

function oscillate(baseValue, nowTimestamp, seed) {
    const primary = Math.sin(nowTimestamp / 240000 + seed) * baseValue * 0.0045;
    const secondary = Math.cos(nowTimestamp / 170000 + seed * 0.7) * baseValue * 0.0025;
    return baseValue + primary + secondary;
}

export function getSimulatedIndexData(underlying, nowTimestamp = Date.now()) {
    const profile = getProfile(underlying);
    const indexPrice = oscillate(profile.price, nowTimestamp, underlying.length + 1);

    return {
        indexPrice: formatNumber(indexPrice, profile.scale),
        time: nowTimestamp,
    };
}

export function getSimulatedExchangeInfo(nowTimestamp = Date.now()) {
    const optionContracts = Object.entries(SIMULATED_PROFILES).map(([underlying, profile]) => ({
        baseAsset: profile.baseAsset,
        quoteAsset: "USDT",
        underlying,
        settleAsset: "USDT",
        nakedSell: underlying === "BTCUSDT" || underlying === "ETHUSDT",
    }));

    const expiryDates = createExpiryDates(nowTimestamp);
    const optionSymbols = [];

    for (const [underlying, profile] of Object.entries(SIMULATED_PROFILES)) {
        for (const expiryDate of expiryDates) {
            const expiryTimestamp = expiryDate.getTime();
            const expiryKey = toExpiryKey(expiryDate);
            const centerPrice = oscillate(profile.price, expiryTimestamp, underlying.length + 5);

            for (let stepIndex = -5; stepIndex <= 5; stepIndex += 1) {
                const strikePrice = Math.max(profile.step, centerPrice + stepIndex * profile.step);
                const strikeKey = String(Math.round(strikePrice));

                for (const side of ["CALL", "PUT"]) {
                    optionSymbols.push({
                        expiryDate: expiryTimestamp,
                        filters: [
                            {
                                filterType: "PRICE_FILTER",
                                minPrice: formatNumber(Math.max(profile.step * 0.01, 0.001), profile.scale),
                                maxPrice: formatNumber(profile.price * 3, profile.scale),
                                tickSize: formatNumber(Math.max(profile.step * 0.02, 0.001), profile.scale),
                            },
                            {
                                filterType: "LOT_SIZE",
                                minQty: "0.01",
                                maxQty: "200",
                                stepSize: "0.01",
                            },
                        ],
                        symbol: `${profile.baseAsset}-${expiryKey}-${strikeKey}-${side[0]}`,
                        side,
                        strikePrice: formatNumber(strikePrice, profile.scale),
                        underlying,
                        unit: 1,
                        liquidationFeeRate: "0.001900",
                        minQty: "0.01",
                        maxQty: "200",
                        initialMargin: "0.15000000",
                        maintenanceMargin: "0.07500000",
                        minInitialMargin: "0.10000000",
                        minMaintenanceMargin: "0.05000000",
                        priceScale: profile.scale,
                        quantityScale: 2,
                        quoteAsset: "USDT",
                        status: "TRADING",
                    });
                }
            }
        }
    }

    return {
        timezone: "UTC",
        serverTime: nowTimestamp,
        optionContracts,
        optionAssets: [{ name: "USDT" }],
        optionSymbols,
    };
}

function getOptionMidPrice(symbol, nowTimestamp) {
    const parsed = parseOptionSymbol(symbol);
    if (!parsed) {
        return { price: 0, scale: 2, indexPrice: 0 };
    }

    const underlying = `${parsed.base}USDT`;
    const profile = getProfile(underlying);
    const indexPrice = Number(getSimulatedIndexData(underlying, nowTimestamp).indexPrice);
    const strikePrice = Number(parsed.strikeKey);
    const expiryDate = new Date(Date.UTC(
        2000 + Number(parsed.expiryKey.slice(0, 2)),
        Number(parsed.expiryKey.slice(2, 4)) - 1,
        Number(parsed.expiryKey.slice(4, 6)),
        8,
        0,
        0,
        0,
    ));
    const daysToExpiry = Math.max((expiryDate.getTime() - nowTimestamp) / 86400000, 1);
    const timeValue = Math.max(indexPrice * 0.015 * (daysToExpiry / 7), profile.step * 0.08);
    const intrinsicValue = parsed.sideKey === "C"
        ? Math.max(indexPrice - strikePrice, 0)
        : Math.max(strikePrice - indexPrice, 0);
    const price = intrinsicValue + timeValue;

    return {
        price,
        scale: profile.scale,
        indexPrice,
    };
}

export function getSimulatedDepthPayload(symbol, nowTimestamp = Date.now()) {
    const { price, scale } = getOptionMidPrice(symbol, nowTimestamp);
    const spread = Math.max(price * 0.018, 0.01);
    const bid = Math.max(price - spread / 2, 0.001);
    const ask = bid + spread;

    return {
        T: nowTimestamp,
        bids: [[formatNumber(bid, scale), formatNumber(2 + Math.abs(Math.sin(nowTimestamp / 10000)), 2)]],
        asks: [[formatNumber(ask, scale), formatNumber(1.5 + Math.abs(Math.cos(nowTimestamp / 9000)), 2)]],
    };
}

export function getSimulatedBookTickerPayload(symbols, nowTimestamp = Date.now()) {
    return {
        data: symbols.map((symbol, index) => {
            const { price, scale } = getOptionMidPrice(symbol, nowTimestamp + index * 250);
            const drift = Math.sin(nowTimestamp / 3500 + index) * Math.max(price * 0.01, 0.01);
            const bid = Math.max(price + drift - Math.max(price * 0.012, 0.01), 0.001);
            const ask = bid + Math.max(price * 0.024, 0.02);

            return {
                s: symbol,
                b: formatNumber(bid, scale),
                B: formatNumber(0.5 + ((index % 7) + 1) * 0.37, 2),
                a: formatNumber(ask, scale),
                A: formatNumber(0.75 + ((index % 5) + 1) * 0.29, 2),
                E: nowTimestamp,
            };
        }),
    };
}

export function getSimulatedMarkPricePayload(symbols, nowTimestamp = Date.now()) {
    return {
        data: symbols.map((symbol, index) => {
            const { price, scale, indexPrice } = getOptionMidPrice(symbol, nowTimestamp + index * 250);
            const spread = Math.max(price * 0.024, 0.02);
            const bid = Math.max(price - spread / 2, 0.001);
            const ask = bid + spread;

            return {
                s: symbol,
                mp: formatNumber(price, scale),
                E: nowTimestamp,
                e: "markPrice",
                i: formatNumber(indexPrice, scale),
                bo: formatNumber(bid, scale),
                bq: formatNumber(0.5 + ((index % 7) + 1) * 0.37, 2),
                ao: formatNumber(ask, scale),
                aq: formatNumber(0.75 + ((index % 5) + 1) * 0.29, 2),
            };
        }),
    };
}
