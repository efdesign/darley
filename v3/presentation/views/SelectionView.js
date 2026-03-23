/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

function renderSelection(elements, prefix, formatters, row) {
    elements[`${prefix}Symbol`].textContent = row?.symbol ?? "-";
    elements[`${prefix}Strike`].textContent = formatters.formatCurrency(row?.strikePrice);
    elements[`${prefix}Expiry`].textContent = formatters.formatDate(row?.expiryDate);
    elements[`${prefix}Buy`].textContent = `${formatters.formatCurrency(row?.bestBuyPrice)} / ${formatters.formatQuantity(row?.bestBuyQuantity)}`;
    elements[`${prefix}Sell`].textContent = `${formatters.formatCurrency(row?.bestSellPrice)} / ${formatters.formatQuantity(row?.bestSellQuantity)}`;
}

export class SelectionView {
    constructor(elements, formatters) {
        this.elements = elements;
        this.formatters = formatters;
    }

    render(viewModel) {
        renderSelection(this.elements, "selectedCall", this.formatters, viewModel.selectedCall);
        renderSelection(this.elements, "selectedPut", this.formatters, viewModel.selectedPut);
    }
}
