/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

const parsedSymbolCache = new Map();

export function parseOptionSymbol(symbol) {
    if (!symbol) return null;

    const cached = parsedSymbolCache.get(symbol);
    if (cached) {
        return cached;
    }

    const parts = symbol.split("-");
    if (parts.length < 4) {
        return null;
    }

    const parsed = {
        base: parts[0],
        expiryKey: parts[1],
        strikeKey: parts[2],
        sideKey: parts[3],
    };

    parsedSymbolCache.set(symbol, parsed);
    return parsed;
}
