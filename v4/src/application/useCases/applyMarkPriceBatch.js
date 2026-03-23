/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

export function applyMarkPriceBatch({ appState, quotes }) {
    const updatedSymbols = appState.applyQuoteBatch(quotes);

    return {
        updatedSymbols,
        viewModel: appState.getViewModel(),
    };
}
