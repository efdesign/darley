/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

function OptionDetails({ row, formatters, kind }) {
  const rowClass = kind === "call" ? "selection-card--call" : "selection-card--put";
  const pill = kind === "call" ? "Call" : "Put";

  return (
    <article className={`selection-card ${rowClass}`}>
      <header className="selection-card__header">
        <strong>{row?.symbol ?? "-"}</strong>
        <span className="selection-card__pill">{pill}</span>
      </header>
      <dl className="selection-card__details">
        <div>
          <dt>Strike</dt>
          <dd>{formatters.formatCurrency(row?.strikePrice)}</dd>
        </div>
        <div>
          <dt>Expiry</dt>
          <dd>{formatters.formatDate(row?.expiryDate)}</dd>
        </div>
        <div>
          <dt>Best Bid</dt>
          <dd>
            {formatters.formatCurrency(row?.bestBuyPrice)} / {formatters.formatQuantity(row?.bestBuyQuantity)}
          </dd>
        </div>
        <div>
          <dt>Best Ask</dt>
          <dd>
            {formatters.formatCurrency(row?.bestSellPrice)} / {formatters.formatQuantity(row?.bestSellQuantity)}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export function SelectionCards({ selectedCall, selectedPut, formatters }) {
  return (
    <section className="selection-grid">
      <OptionDetails row={selectedCall} formatters={formatters} kind="call" />
      <OptionDetails row={selectedPut} formatters={formatters} kind="put" />
    </section>
  );
}

