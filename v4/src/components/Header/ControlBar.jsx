/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

export function ControlBar({
  underlying,
  expiryKey,
  availableUnderlyings,
  availableExpiries,
  onUnderlyingChange,
  onExpiryChange,
  formatters,
}) {
  const underlyingOptions = availableUnderlyings.length
    ? availableUnderlyings
    : [underlying];

  return (
    <div className="controls-bar">
      <div className="control-field">
        <label className="control-field__label" htmlFor="underlying-select">
          Underlying
        </label>
        <select
          id="underlying-select"
          className="control-select"
          value={underlying}
          onChange={(event) => onUnderlyingChange(event.target.value)}
        >
          {underlyingOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="control-field">
        <label className="control-field__label" htmlFor="expiry-select">
          Expiry
        </label>
        <select
          id="expiry-select"
          className="control-select"
          value={expiryKey ?? ""}
          onChange={(event) => onExpiryChange(event.target.value)}
        >
          {availableExpiries.length === 0 ? (
            <option value="">Loading...</option>
          ) : (
            availableExpiries.map((item) => (
              <option key={item.key} value={item.key}>
                {formatters.formatDate(item.timestamp)}
              </option>
            ))
          )}
        </select>
      </div>
    </div>
  );
}

