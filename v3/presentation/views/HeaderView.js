/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

export class HeaderView {
    constructor(elements, formatters) {
        this.elements = elements;
        this.formatters = formatters;
    }

    render(viewModel) {
        this.elements.summaryIndexPrice.textContent = this.formatters.formatCurrency(viewModel.indexPrice);
        this.elements.summaryUnderlying.textContent = viewModel.underlying ?? "-";
        this.elements.summaryExpiry.textContent = this.formatters.formatDate(viewModel.targetExpiryTimestamp);
    }
}
