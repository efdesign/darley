/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

function createCell(className = "") {
    const cell = document.createElement("td");
    if (className) {
        cell.className = className;
    }
    return cell;
}

function setText(cell, value) {
    cell.textContent = value;
}

function updateRowContent(cells, row, formatters) {
    setText(cells.symbol, row.symbol);
    setText(cells.strike, formatters.formatCurrency(row.strikePrice));
    setText(cells.buyPrice, formatters.formatCurrency(row.bestBuyPrice));
    setText(cells.buyQuantity, formatters.formatQuantity(row.bestBuyQuantity));
    setText(cells.sellPrice, formatters.formatCurrency(row.bestSellPrice));
    setText(cells.sellQuantity, formatters.formatQuantity(row.bestSellQuantity));
}

function flashRow(element) {
    element.classList.remove("is-updated");
    void element.offsetWidth;
    element.classList.add("is-updated");

    if (element._flashTimeoutId) {
        window.clearTimeout(element._flashTimeoutId);
    }

    element._flashTimeoutId = window.setTimeout(() => {
        element.classList.remove("is-updated");
    }, 420);
}

function buildRow(row, formatters) {
    const element = document.createElement("tr");
    element.dataset.symbol = row.symbol;

    const cells = {
        symbol: createCell("symbol-cell"),
        strike: createCell("is-numeric strike-cell"),
        buyPrice: createCell("is-numeric buy-price-cell"),
        buyQuantity: createCell("is-numeric qty-cell"),
        sellPrice: createCell("is-numeric sell-price-cell"),
        sellQuantity: createCell("is-numeric qty-cell"),
    };

    element.append(
        cells.symbol,
        cells.strike,
        cells.buyPrice,
        cells.buyQuantity,
        cells.sellPrice,
        cells.sellQuantity,
    );

    updateRowContent(cells, row, formatters);

    return { element, cells };
}

function createIndexMarkerRow(indexPrice, formatters) {
    const markerRow = document.createElement("tr");
    markerRow.className = "index-marker-row";

    const markerCell = document.createElement("td");
    markerCell.className = "index-marker-cell";
    markerCell.colSpan = 6;
    markerCell.textContent = `Index Price ${formatters.formatCurrency(indexPrice)}`;

    markerRow.appendChild(markerCell);
    return markerRow;
}

function getInsertionIndex(rows, indexPrice) {
    if (!Number.isFinite(indexPrice) || rows.length < 2) {
        return -1;
    }

    for (let index = 0; index < rows.length - 1; index += 1) {
        const left = Number(rows[index].strikePrice);
        const right = Number(rows[index + 1].strikePrice);
        if (!Number.isFinite(left) || !Number.isFinite(right)) {
            continue;
        }

        if (indexPrice >= left && indexPrice <= right) {
            return index + 1;
        }
    }

    if (indexPrice < Number(rows[0].strikePrice)) {
        return 1;
    }

    return rows.length - 1;
}

function buildTableRowsWithIndexMarker(rows, indexPrice, formatters, rowRefs) {
    const insertionIndex = getInsertionIndex(rows, indexPrice);
    const elements = [];

    for (let index = 0; index < rows.length; index += 1) {
        if (index === insertionIndex) {
            elements.push(createIndexMarkerRow(indexPrice, formatters));
        }

        const row = rows[index];
        const rowRef = buildRow(row, formatters);
        rowRef.symbol = row.symbol;
        rowRefs.set(row.symbol, rowRef);
        elements.push(rowRef.element);
    }

    return elements;
}

export class InstrumentTableView {
    constructor(elements, formatters) {
        this.elements = elements;
        this.formatters = formatters;
        this.rowRefs = new Map();
        this.lastIndexPrice = null;
    }

    updateCounts(viewModel) {
        this.elements.callsCount.textContent = `${viewModel.callRows.length} rows`;
        this.elements.putsCount.textContent = `${viewModel.putRows.length} rows`;
    }

    syncSelection(selectedSymbols) {
        for (const rowRef of this.rowRefs.values()) {
            rowRef.element.classList.toggle("is-selected", selectedSymbols.has(rowRef.symbol));
        }
    }

    render(viewModel) {
        this.rowRefs.clear();
        const nextIndexPrice = Number(viewModel.indexPrice);
        this.lastIndexPrice = Number.isFinite(nextIndexPrice) ? nextIndexPrice : null;

        const selectedSymbols = new Set([
            viewModel.selectedCall?.symbol,
            viewModel.selectedPut?.symbol,
        ].filter(Boolean));

        const callRows = buildTableRowsWithIndexMarker(
            viewModel.callRows,
            this.lastIndexPrice,
            this.formatters,
            this.rowRefs,
        );

        const putRows = buildTableRowsWithIndexMarker(
            viewModel.putRows,
            this.lastIndexPrice,
            this.formatters,
            this.rowRefs,
        );

        this.elements.callsTableBody.replaceChildren(...callRows);
        this.elements.putsTableBody.replaceChildren(...putRows);
        this.syncSelection(selectedSymbols);
        this.updateCounts(viewModel);
    }

    patch(viewModel, updatedSymbols) {
        const nextIndexPrice = Number(viewModel.indexPrice);
        const normalizedIndexPrice = Number.isFinite(nextIndexPrice) ? nextIndexPrice : null;
        if (normalizedIndexPrice !== this.lastIndexPrice) {
            this.render(viewModel);
            return;
        }

        const totalRows = viewModel.callRows.length + viewModel.putRows.length;
        if (this.rowRefs.size !== totalRows) {
            this.render(viewModel);
            return;
        }

        const rowsBySymbol = new Map();
        for (const row of viewModel.callRows) {
            rowsBySymbol.set(row.symbol, row);
        }
        for (const row of viewModel.putRows) {
            rowsBySymbol.set(row.symbol, row);
        }

        for (const symbol of updatedSymbols) {
            const rowRef = this.rowRefs.get(symbol);
            const row = rowsBySymbol.get(symbol);
            if (!rowRef || !row) {
                this.render(viewModel);
                return;
            }

            updateRowContent(rowRef.cells, row, this.formatters);
            flashRow(rowRef.element);
        }

        const selectedSymbols = new Set([
            viewModel.selectedCall?.symbol,
            viewModel.selectedPut?.symbol,
        ].filter(Boolean));

        this.syncSelection(selectedSymbols);
        this.updateCounts(viewModel);
    }
}

