/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

export function SnapshotToggle({ enabled, onToggle }) {
  return (
    <button
      className={`mode-switch__button ${enabled ? "is-active" : ""}`}
      type="button"
      aria-pressed={enabled}
      onClick={onToggle}
    >
      {enabled ? "Snapshot: On" : "Snapshot: Off"}
    </button>
  );
}

