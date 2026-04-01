/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { ModeSwitch } from "../ModeSwitch.jsx";
import { LayoutModeSwitch } from "../LayoutModeSwitch.jsx";
import { StreamModeSwitch } from "../StreamModeSwitch.jsx";
import { SnapshotToggle } from "../SnapshotToggle.jsx";

export function Topbar({
  effectiveMode,
  snapshotsEnabled,
  layoutMode,
  streamType,
  onModeChange,
  onLayoutChange,
  onStreamTypeChange,
  onToggleSnapshots,
}) {
  return (
    <header className="topbar">
      <div className="brand-mark">
        <img
          className="brand-mark__logo"
          src="https://www.darleytechnologies.com/wp-content/uploads/2026/01/White-NO-BG-Horiztonal-300x90.png"
          width="150"
          height="45"
          alt="Darley Technologies logo"
        />
      </div>

      <div className="topbar__actions">
        <ModeSwitch effectiveMode={effectiveMode} onModeChange={onModeChange} />
        <LayoutModeSwitch layoutMode={layoutMode} onLayoutChange={onLayoutChange} />
        <StreamModeSwitch streamType={streamType} onStreamTypeChange={onStreamTypeChange} />
        <SnapshotToggle enabled={snapshotsEnabled} onToggle={onToggleSnapshots} />
      </div>
    </header>
  );
}

