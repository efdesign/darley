/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

export function LayoutModeSwitch({ layoutMode, onLayoutChange }) {
  return (
    <div className="mode-switch" role="group" aria-label="Layout switch">
      <button
        className={`mode-switch__button ${layoutMode === "cards" ? "is-active" : ""}`}
        type="button"
        onClick={() => onLayoutChange("cards")}
      >
        Cards
      </button>
      <button
        className={`mode-switch__button ${layoutMode === "t" ? "is-active" : ""}`}
        type="button"
        onClick={() => onLayoutChange("t")}
      >
        T
      </button>
    </div>
  );
}