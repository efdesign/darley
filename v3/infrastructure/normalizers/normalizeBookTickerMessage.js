/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { parseOptionSymbol } from "../../domain/optionSymbol.js";

function normalizeEvent(event) {
    const parsed = parseOptionSymbol(event.s);
    if (!parsed) {
        return null;
    }

    return {
        symbol: event.s,
        expiryKey: parsed.expiryKey,
        bestBuyPrice: event.b,
        bestBuyQuantity: event.B,
        bestSellPrice: event.a,
        bestSellQuantity: event.A,
        indexPrice: null,
        eventTime: event.E,
    };
}

export function normalizeBookTickerMessage(payload) {
    const parsedPayload = typeof payload === "string" ? JSON.parse(payload) : payload;
    const event = parsedPayload?.data ?? parsedPayload;
    const events = Array.isArray(event) ? event : [event];

    return events.map(normalizeEvent).filter(Boolean);
}

