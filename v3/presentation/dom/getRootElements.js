/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

function requiredElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Missing required element: ${id}`);
    }

    return element;
}

export function getRootElements() {
    return {
        modeLiveButton: requiredElement("mode-live-button"),
        modeMockButton: requiredElement("mode-mock-button"),
        snapshotToggleButton: requiredElement("snapshot-toggle-button"),
        underlyingSelect: requiredElement("underlying-select"),
        expirySelect: requiredElement("expiry-select"),
        statusMode: requiredElement("status-mode"),
        statusConnection: requiredElement("status-connection"),
        statusLoad: requiredElement("status-load"),
        messageBar: requiredElement("message-bar"),
        summaryIndexPrice: requiredElement("summary-index-price"),
        summaryUnderlying: requiredElement("summary-underlying"),
        summaryExpiry: requiredElement("summary-expiry"),
        selectedCallSymbol: requiredElement("selected-call-symbol"),
        selectedCallStrike: requiredElement("selected-call-strike"),
        selectedCallExpiry: requiredElement("selected-call-expiry"),
        selectedCallBuy: requiredElement("selected-call-buy"),
        selectedCallSell: requiredElement("selected-call-sell"),
        selectedPutSymbol: requiredElement("selected-put-symbol"),
        selectedPutStrike: requiredElement("selected-put-strike"),
        selectedPutExpiry: requiredElement("selected-put-expiry"),
        selectedPutBuy: requiredElement("selected-put-buy"),
        selectedPutSell: requiredElement("selected-put-sell"),
        callsCount: requiredElement("calls-count"),
        putsCount: requiredElement("puts-count"),
        callsTableBody: requiredElement("calls-table-body"),
        putsTableBody: requiredElement("puts-table-body"),
    };
}

