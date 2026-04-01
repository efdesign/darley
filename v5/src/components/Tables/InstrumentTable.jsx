/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { useMemo } from "react";
import { IndexMarkerRow } from "./IndexMarkerRow.jsx";
import { TableRow } from "./TableRow.jsx";

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

export function InstrumentTable({
  title,
  side,
  rows,
  selectedSymbol,
  indexPrice,
  updatedSymbols,
  formatters,
}) {
  const tableRows = useMemo(() => {
    const items = [];
    const insertionIndex = getInsertionIndex(rows, Number(indexPrice));

    for (let index = 0; index < rows.length; index += 1) {
      if (index === insertionIndex) {
        items.push({ kind: "marker", id: `index-marker-${side}` });
      }

      items.push({ kind: "row", id: rows[index].symbol, row: rows[index] });
    }

    return items;
  }, [rows, indexPrice, side]);

  return (
    <article className={`table-card table-card--${side === "CALL" ? "calls" : "puts"}`}>
      <header className="table-card__header">
        <h2>{title}</h2>
        <span>{rows.length} rows</span>
      </header>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Strike</th>
              <th>Bid</th>
              <th>Bid Size</th>
              <th>Ask</th>
              <th>Ask Size</th>
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
                  />
                );
              }

              return (
                <TableRow
                  key={item.id}
                  row={item.row}
                  selected={selectedSymbol === item.row.symbol}
                  updated={updatedSymbols.has(item.row.symbol)}
                  formatters={formatters}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}

