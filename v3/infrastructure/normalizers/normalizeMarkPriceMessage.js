/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { parseOptionSymbol } from "../../domain/optionSymbol.js";

function normalizeInstrument(instrument) {
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

export function normalizeMarkPriceMessage(payload) {
    const message = typeof payload === "string" ? JSON.parse(payload) : payload;
    const instruments = Array.isArray(message.data) ? message.data : [];

    return instruments
        .map(normalizeInstrument)
        .filter(Boolean);
}
