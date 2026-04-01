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

export function TopbarActions({
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
    <>
      <ModeSwitch effectiveMode={effectiveMode} onModeChange={onModeChange} />
      <LayoutModeSwitch layoutMode={layoutMode} onLayoutChange={onLayoutChange} />
      <StreamModeSwitch streamType={streamType} onStreamTypeChange={onStreamTypeChange} />
      <SnapshotToggle enabled={snapshotsEnabled} onToggle={onToggleSnapshots} />
    </>
  );
}