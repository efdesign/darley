/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

export function StreamModeSwitch({ streamType, onStreamTypeChange }) {
  return (
    <div className="mode-switch" role="group" aria-label="Market data stream switch">
      <button
        className={`mode-switch__button ${streamType === "bookTicker" ? "is-active" : ""}`}
        type="button"
        aria-pressed={streamType === "bookTicker"}
        data-stream-type="bookTicker"
        onClick={() => onStreamTypeChange("bookTicker")}
      >
        Book Ticker
      </button>
      <button
        className={`mode-switch__button ${streamType === "markPrice" ? "is-active" : ""}`}
        type="button"
        aria-pressed={streamType === "markPrice"}
        data-stream-type="markPrice"
        onClick={() => onStreamTypeChange("markPrice")}
      >
        Mark Price
      </button>
    </div>
  );
}