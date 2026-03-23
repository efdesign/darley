/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

function StatusChip({ label, value }) {
  return (
    <div className="status-chip">
      <span className="status-chip__label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function StatusBar({ mode, connectionState, loadState }) {
  return (
    <section className="status-bottom">
      <StatusChip label="Mode" value={mode} />
      <StatusChip label="Connection" value={connectionState} />
      <StatusChip label="State" value={loadState} />
    </section>
  );
}

