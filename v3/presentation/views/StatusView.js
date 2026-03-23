/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

export class StatusView {
    constructor(elements) {
        this.elements = elements;
    }

    render(viewModel) {
        this.elements.statusMode.textContent = viewModel.mode;
        this.elements.statusConnection.textContent = viewModel.connectionState;
        this.elements.statusLoad.textContent = viewModel.loadState;

        if (viewModel.errorMessage) {
            this.elements.messageBar.hidden = false;
            this.elements.messageBar.textContent = viewModel.errorMessage;
            return;
        }

        this.elements.messageBar.hidden = true;
        this.elements.messageBar.textContent = "";
    }
}
