/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { memo } from "react";

export const TableRow = memo(function TableRow({
  row,
  selected,
  updated,
  formatters,
}) {
  return (
    <tr className={`${selected ? "is-selected" : ""} ${updated ? "is-updated" : ""}`.trim()}>
      <td className="symbol-cell">{row.symbol}</td>
      <td className="is-numeric strike-cell">{formatters.formatCurrency(row.strikePrice)}</td>
      <td className="is-numeric buy-price-cell">{formatters.formatCurrency(row.bestBuyPrice)}</td>
      <td className="is-numeric qty-cell">{formatters.formatQuantity(row.bestBuyQuantity)}</td>
      <td className="is-numeric sell-price-cell">{formatters.formatCurrency(row.bestSellPrice)}</td>
      <td className="is-numeric qty-cell">{formatters.formatQuantity(row.bestSellQuantity)}</td>
    </tr>
  );
});

