/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { TopbarActions } from "../Header/TopbarActions.jsx";

function StatusChip({ label, value }) {
  return (
    <div className="status-chip">
      <span className="status-chip__label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function StatusBar({
  effectiveMode,
  snapshotsEnabled,
  layoutMode,
  streamType,
  onModeChange,
  onLayoutChange,
  onStreamTypeChange,
  onToggleSnapshots,
  mode,
  connectionState,
  loadState,
}) {
  return (
    <section className="status-bottom">
      <div className="topbar__actions status-bottom__actions">
        <TopbarActions
          effectiveMode={effectiveMode}
          snapshotsEnabled={snapshotsEnabled}
          layoutMode={layoutMode}
          streamType={streamType}
          onModeChange={onModeChange}
          onLayoutChange={onLayoutChange}
          onStreamTypeChange={onStreamTypeChange}
          onToggleSnapshots={onToggleSnapshots}
        />
      </div>

      <StatusChip label="Mode" value={mode} />
      <StatusChip label="Connection" value={connectionState} />
      <StatusChip label="State" value={loadState} />
    </section>
  );
}

