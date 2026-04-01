/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { useEffect, useMemo, useState } from "react";
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

function formatMobileQuoteSize(formatters, value) {
  return formatQuantityValue(formatters, value);
}

function useIsMobileChain() {
  const [isMobileChain, setIsMobileChain] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia("(max-width: 720px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 720px)");
    const updateIsMobile = () => {
      setIsMobileChain(mediaQuery.matches);
    };

    updateIsMobile();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateIsMobile);
      return () => mediaQuery.removeEventListener("change", updateIsMobile);
    }

    mediaQuery.addListener(updateIsMobile);
    return () => mediaQuery.removeListener(updateIsMobile);
  }, []);

  return isMobileChain;
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
  const isMobileChain = useIsMobileChain();
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

  const markerColSpan = isMobileChain ? 5 : 11;

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
              <th className="chain-header--group chain-header--group-call" colSpan={5}>Call</th>
              <th className="option-chain-table__strike-header chain-header--strike">Strike</th>
              <th className="chain-header--group chain-header--group-put" colSpan={5}>Put</th>
            </tr>
            <tr>
              <th className="chain-header--symbol">Symbol</th>
              <th className="chain-header--bid">Bid</th>
              <th className="chain-header--bid-size">Bid Size</th>
              <th className="chain-header--ask">Ask</th>
              <th className="chain-header--ask-size">Ask Size</th>
              <th className="option-chain-table__strike-header chain-header--strike">Strike</th>
              <th className="chain-header--bid">Bid</th>
              <th className="chain-header--bid-size">Bid Size</th>
              <th className="chain-header--ask">Ask</th>
              <th className="chain-header--ask-size">Ask Size</th>
              <th className="chain-header--symbol chain-header--symbol-right">Symbol</th>
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
                    colSpan={markerColSpan}
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
                  <td
                    className="chain-cell chain-cell--numeric chain-cell--quote chain-cell--bid"
                    data-mobile-size={formatMobileQuoteSize(formatters, call?.bestBuyQuantity)}
                  >
                    {formatQuoteValue(formatters, call?.bestBuyPrice)}
                  </td>
                  <td className="chain-cell chain-cell--numeric chain-cell--bid-size">{formatQuantityValue(formatters, call?.bestBuyQuantity)}</td>
                  <td
                    className="chain-cell chain-cell--numeric chain-cell--quote chain-cell--ask"
                    data-mobile-size={formatMobileQuoteSize(formatters, call?.bestSellQuantity)}
                  >
                    {formatQuoteValue(formatters, call?.bestSellPrice)}
                  </td>
                  <td className="chain-cell chain-cell--numeric chain-cell--ask-size">{formatQuantityValue(formatters, call?.bestSellQuantity)}</td>
                  <td className="chain-cell chain-cell--strike">{formatQuoteValue(formatters, item.row.strike)}</td>
                  <td
                    className="chain-cell chain-cell--numeric chain-cell--quote chain-cell--bid"
                    data-mobile-size={formatMobileQuoteSize(formatters, put?.bestBuyQuantity)}
                  >
                    {formatQuoteValue(formatters, put?.bestBuyPrice)}
                  </td>
                  <td className="chain-cell chain-cell--numeric chain-cell--bid-size">{formatQuantityValue(formatters, put?.bestBuyQuantity)}</td>
                  <td
                    className="chain-cell chain-cell--numeric chain-cell--quote chain-cell--ask"
                    data-mobile-size={formatMobileQuoteSize(formatters, put?.bestSellQuantity)}
                  >
                    {formatQuoteValue(formatters, put?.bestSellPrice)}
                  </td>
                  <td className="chain-cell chain-cell--numeric chain-cell--ask-size">{formatQuantityValue(formatters, put?.bestSellQuantity)}</td>
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