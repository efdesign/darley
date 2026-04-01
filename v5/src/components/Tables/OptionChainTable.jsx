/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { useMemo } from "react";
import { IndexMarkerRow } from "./IndexMarkerRow.jsx";

function getInsertionIndex(strikes, indexPrice) {
  if (!Number.isFinite(indexPrice) || strikes.length < 2) {
    return -1;
  }

  for (let index = 0; index < strikes.length - 1; index += 1) {
    const left = Number(strikes[index]);
    const right = Number(strikes[index + 1]);
    if (!Number.isFinite(left) || !Number.isFinite(right)) {
      continue;
    }

    if (indexPrice >= left && indexPrice <= right) {
      return index + 1;
    }
  }

  if (indexPrice < Number(strikes[0])) {
    return 1;
  }

  return strikes.length - 1;
}

function formatQuoteValue(formatters, value) {
  return formatters.formatCurrency(value);
}

function formatQuantityValue(formatters, value) {
  return formatters.formatQuantity(value);
}

function getMergedRows(callRows, putRows) {
  const callByStrike = new Map(callRows.map((row) => [Number(row.strikePrice), row]));
  const putByStrike = new Map(putRows.map((row) => [Number(row.strikePrice), row]));
  const strikeValues = [...new Set([
    ...callRows.map((row) => Number(row.strikePrice)),
    ...putRows.map((row) => Number(row.strikePrice)),
  ])]
    .filter((strike) => Number.isFinite(strike))
    .sort((left, right) => left - right);

  return strikeValues.map((strike) => ({
    strike,
    call: callByStrike.get(strike) ?? null,
    put: putByStrike.get(strike) ?? null,
  }));
}

export function OptionChainTable({
  callRows,
  putRows,
  selectedCallSymbol,
  selectedPutSymbol,
  indexPrice,
  updatedSymbols,
  formatters,
}) {
  const tableRows = useMemo(() => {
    const rows = getMergedRows(callRows, putRows);
    const insertionIndex = getInsertionIndex(
      rows.map((row) => row.strike),
      Number(indexPrice),
    );

    const items = [];
    for (let index = 0; index < rows.length; index += 1) {
      if (index === insertionIndex) {
        items.push({ kind: "marker", id: "index-marker-chain" });
      }

      items.push({ kind: "row", id: `chain-${rows[index].strike}`, row: rows[index] });
    }

    return items;
  }, [callRows, putRows, indexPrice]);

  return (
    <article className="table-card table-card--chain">
      <header className="table-card__header">
        <h2>Option Chain</h2>
        <span>{Math.max(callRows.length, putRows.length)} rows</span>
      </header>

      <div className="table-scroll">
        <table className="option-chain-table">
          <thead>
            <tr className="option-chain-table__group-row">
              <th colSpan={5}>Call</th>
              <th className="option-chain-table__strike-header">Strike</th>
              <th colSpan={5}>Put</th>
            </tr>
            <tr>
              <th>Symbol</th>
              <th>Bid</th>
              <th>Bid Size</th>
              <th>Ask</th>
              <th>Ask Size</th>
              <th className="option-chain-table__strike-header">Strike</th>
              <th>Bid</th>
              <th>Bid Size</th>
              <th>Ask</th>
              <th>Ask Size</th>
              <th>Symbol</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((item) => {
              if (item.kind === "marker") {
                return (
                  <IndexMarkerRow
                    key={item.id}
                    indexPrice={Number(indexPrice)}
                    formatters={formatters}
                    colSpan={11}
                  />
                );
              }

              const call = item.row.call;
              const put = item.row.put;
              const isSelected = selectedCallSymbol === call?.symbol || selectedPutSymbol === put?.symbol;
              const isUpdated = updatedSymbols.has(call?.symbol) || updatedSymbols.has(put?.symbol);

              return (
                <tr key={item.id} className={`${isSelected ? "is-selected" : ""} ${isUpdated ? "is-updated" : ""}`.trim()}>
                  <td className="chain-cell chain-cell--symbol">{call?.symbol ?? "-"}</td>
                  <td className="chain-cell chain-cell--numeric">{formatQuoteValue(formatters, call?.bestBuyPrice)}</td>
                  <td className="chain-cell chain-cell--numeric">{formatQuantityValue(formatters, call?.bestBuyQuantity)}</td>
                  <td className="chain-cell chain-cell--numeric">{formatQuoteValue(formatters, call?.bestSellPrice)}</td>
                  <td className="chain-cell chain-cell--numeric">{formatQuantityValue(formatters, call?.bestSellQuantity)}</td>
                  <td className="chain-cell chain-cell--strike">{formatQuoteValue(formatters, item.row.strike)}</td>
                  <td className="chain-cell chain-cell--numeric">{formatQuoteValue(formatters, put?.bestBuyPrice)}</td>
                  <td className="chain-cell chain-cell--numeric">{formatQuantityValue(formatters, put?.bestBuyQuantity)}</td>
                  <td className="chain-cell chain-cell--numeric">{formatQuoteValue(formatters, put?.bestSellPrice)}</td>
                  <td className="chain-cell chain-cell--numeric">{formatQuantityValue(formatters, put?.bestSellQuantity)}</td>
                  <td className="chain-cell chain-cell--symbol chain-cell--symbol-right">{put?.symbol ?? "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}