/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { getNextFridayDate, toExpiryKey } from "./datePolicy.js";
import { parseOptionSymbol } from "./optionSymbol.js";

const TRADING = "TRADING";

function toQuoteRow(symbol) {
    return {
        symbol: symbol.symbol,
        side: symbol.side,
        expiryDate: Number(symbol.expiryDate),
        strikePrice: Number(symbol.strikePrice),
        bestBuyPrice: null,
        bestBuyQuantity: null,
        bestSellPrice: null,
        bestSellQuantity: null,
    };
}

/**
 * Returns all available underlyings and the expiry list for a specific underlying.
 */
export function extractAvailableData({ optionSymbols, underlying }) {
    const underlyingSet = new Set();
    const expiryByKey = new Map();

    for (const sym of optionSymbols) {
        if (sym.status !== TRADING) continue;
        underlyingSet.add(sym.underlying);

        if (sym.underlying === underlying) {
            const parsed = parseOptionSymbol(sym.symbol);
            if (parsed && !expiryByKey.has(parsed.expiryKey)) {
                expiryByKey.set(parsed.expiryKey, Number(sym.expiryDate));
            }
        }
    }

    const availableUnderlyings = [...underlyingSet].sort();
    const availableExpiries = [...expiryByKey.entries()]
        .map(([key, timestamp]) => ({ key, timestamp }))
        .sort((a, b) => a.timestamp - b.timestamp);

    return { availableUnderlyings, availableExpiries };
}

/**
 * Selects the nearest-to-ATM call and put for a given (or auto-detected) expiry.
 * Pass forceExpiryKey to pin a specific expiry instead of auto-selecting.
 */
export function selectNearestOptions({
    indexPrice,
    optionSymbols,
    underlying,
    nowTimestamp = Date.now(),
    forceExpiryKey = null,
}) {
    const nextFridayDate = getNextFridayDate(nowTimestamp);
    const defaultTargetExpiryTimestamp = nextFridayDate.getTime();
    const targetExpiryKey = toExpiryKey(nextFridayDate);
    const candidates = [];

    let chosenExpiryKey = null;
    let chosenExpiryTimestamp = null;
    let chosenExpiryDifference = Number.POSITIVE_INFINITY;

    for (const optionSymbol of optionSymbols) {
        if (optionSymbol.underlying !== underlying || optionSymbol.status !== TRADING) {
            continue;
        }

        const parsed = parseOptionSymbol(optionSymbol.symbol);
        if (!parsed) {
            continue;
        }

        const expiryTimestamp = Number(optionSymbol.expiryDate);
        if (!Number.isFinite(expiryTimestamp)) {
            continue;
        }

        if (!forceExpiryKey) {
            const expiryDifference = Math.abs(expiryTimestamp - defaultTargetExpiryTimestamp);
            if (
                expiryDifference < chosenExpiryDifference ||
                (expiryDifference === chosenExpiryDifference && parsed.expiryKey === targetExpiryKey)
            ) {
                chosenExpiryDifference = expiryDifference;
                chosenExpiryKey = parsed.expiryKey;
                chosenExpiryTimestamp = expiryTimestamp;
            }
        }

        candidates.push({ optionSymbol, parsed });
    }

    // If a specific expiry was forced, use it (even if not auto-detected above)
    if (forceExpiryKey) {
        chosenExpiryKey = forceExpiryKey;
        const forcedCandidate = candidates.find((candidate) => candidate.parsed.expiryKey === forceExpiryKey);
        chosenExpiryTimestamp = forcedCandidate ? Number(forcedCandidate.optionSymbol.expiryDate) : null;
    }

    let selectedCall = null;
    let selectedPut = null;
    let bestCallDifference = Number.POSITIVE_INFINITY;
    let bestPutDifference = Number.POSITIVE_INFINITY;
    const instrumentsForExpiry = [];

    for (const candidate of candidates) {
        if (candidate.parsed.expiryKey !== chosenExpiryKey) {
            continue;
        }

        const row = toQuoteRow(candidate.optionSymbol);
        instrumentsForExpiry.push(row);

        const strikeDifference = Math.abs(Number(candidate.optionSymbol.strikePrice) - Number(indexPrice));
        if (candidate.optionSymbol.side === "CALL" && strikeDifference < bestCallDifference) {
            bestCallDifference = strikeDifference;
            selectedCall = row;
        }

        if (candidate.optionSymbol.side === "PUT" && strikeDifference < bestPutDifference) {
            bestPutDifference = strikeDifference;
            selectedPut = row;
        }
    }

    instrumentsForExpiry.sort((left, right) => left.strikePrice - right.strikePrice);

    return {
        underlying,
        indexPrice: Number(indexPrice),
        targetExpiryTimestamp: chosenExpiryTimestamp ?? defaultTargetExpiryTimestamp,
        targetExpiryKey: chosenExpiryKey,
        selectedCall,
        selectedPut,
        instrumentsForExpiry,
    };
}
