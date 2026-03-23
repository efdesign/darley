/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

export function SummaryCards({ viewModel, formatters }) {
  return (
    <section className="summary-grid">
      <article className="summary-card">
        <span className="summary-card__label">Index Price</span>
        <strong className="summary-card__value">
          {formatters.formatCurrency(viewModel.indexPrice)}
        </strong>
      </article>
      <article className="summary-card">
        <span className="summary-card__label">Underlying</span>
        <strong className="summary-card__value">{viewModel.underlying}</strong>
      </article>
      <article className="summary-card">
        <span className="summary-card__label">Target Expiry</span>
        <strong className="summary-card__value">
          {formatters.formatDate(viewModel.targetExpiryTimestamp)}
        </strong>
      </article>
    </section>
  );
}

