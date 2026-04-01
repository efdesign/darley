/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { parseOptionSymbol } from "../domain/optionSymbol.js";

function normalizeMarkPriceInstrument(instrument) {
    const parsed = parseOptionSymbol(instrument.s);
    if (!parsed) {
        return null;
    }

    return {
        symbol: instrument.s,
        expiryKey: parsed.expiryKey,
        strikePrice: Number(parsed.strikeKey),
        bestBuyPrice: instrument.bo,
        bestBuyQuantity: instrument.bq,
        bestSellPrice: instrument.ao,
        bestSellQuantity: instrument.aq,
        indexPrice: instrument.i,
        eventTime: instrument.E,
    };
}

function normalizeBookTickerEvent(event) {
    const parsed = parseOptionSymbol(event.s);
    if (!parsed) {
        return null;
    }

    const bestBuyPrice = event.b ?? event.bo ?? null;
    const bestBuyQuantity = event.B ?? event.bq ?? null;
    const bestSellPrice = event.a ?? event.ao ?? null;
    const bestSellQuantity = event.A ?? event.aq ?? null;

    return {
        symbol: event.s,
        expiryKey: parsed.expiryKey,
        bestBuyPrice,
        bestBuyQuantity,
        bestSellPrice,
        bestSellQuantity,
        indexPrice: event.i ?? null,
        eventTime: event.E,
    };
}

export function normalizeMarkPriceMessage(payload) {
    const message = typeof payload === "string" ? JSON.parse(payload) : payload;
    const instruments = Array.isArray(message.data) ? message.data : [];

    return instruments.map(normalizeMarkPriceInstrument).filter(Boolean);
}

export function normalizeBookTickerMessage(payload) {
    const parsedPayload = typeof payload === "string" ? JSON.parse(payload) : payload;
    const event = parsedPayload?.data ?? parsedPayload;
    const events = Array.isArray(event) ? event : [event];

    return events.map(normalizeBookTickerEvent).filter(Boolean);
}

