/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

export function ModeSwitch({ effectiveMode, onModeChange }) {
  return (
    <div className="mode-switch" role="group" aria-label="Data source switch">
      <button
        className={`mode-switch__button ${effectiveMode === "live-simulated" ? "is-active" : ""}`}
        type="button"
        data-mode="live-simulated"
        onClick={() => onModeChange("live-simulated")}
      >
        Live (Sim)
      </button>
      <button
        className={`mode-switch__button ${effectiveMode === "live" ? "is-active" : ""}`}
        type="button"
        data-mode="live"
        onClick={() => onModeChange("live")}
      >
        Live
      </button>
      <button
        className={`mode-switch__button ${effectiveMode === "mock" ? "is-active" : ""}`}
        type="button"
        data-mode="mock"
        onClick={() => onModeChange("mock")}
      >
        Mock
      </button>
    </div>
  );
}

