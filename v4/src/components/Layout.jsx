/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { Topbar } from "./Header/Topbar.jsx";
import { ControlBar } from "./Header/ControlBar.jsx";
import { SummaryCards } from "./Header/SummaryCards.jsx";
import { SelectionCards } from "./Selection/SelectionCards.jsx";
import { InstrumentTable } from "./Tables/InstrumentTable.jsx";
import { StatusBar } from "./Status/StatusBar.jsx";
import { MessageBanner } from "./Status/MessageBanner.jsx";

export function Layout({
  viewModel,
  effectiveMode,
  snapshotsEnabled,
  formatters,
  updatedSymbols,
  onModeChange,
  onToggleSnapshots,
  onUnderlyingChange,
  onExpiryChange,
}) {
  return (
    <div className="page-shell">
      <Topbar
        effectiveMode={effectiveMode}
        snapshotsEnabled={snapshotsEnabled}
        onModeChange={onModeChange}
        onToggleSnapshots={onToggleSnapshots}
      />

      <ControlBar
        underlying={viewModel.underlying}
        expiryKey={viewModel.targetExpiryKey}
        availableUnderlyings={viewModel.availableUnderlyings}
        availableExpiries={viewModel.availableExpiries}
        onUnderlyingChange={onUnderlyingChange}
        onExpiryChange={onExpiryChange}
        formatters={formatters}
      />

      <main className="dashboard">
        <SummaryCards viewModel={viewModel} formatters={formatters} />

        <SelectionCards
          selectedCall={viewModel.selectedCall}
          selectedPut={viewModel.selectedPut}
          formatters={formatters}
        />

        <MessageBanner message={viewModel.errorMessage} />

        <section className="tables-grid">
          <InstrumentTable
            title="Calls"
            side="CALL"
            rows={viewModel.callRows}
            selectedSymbol={viewModel.selectedCall?.symbol}
            indexPrice={viewModel.indexPrice}
            updatedSymbols={updatedSymbols}
            formatters={formatters}
          />

          <InstrumentTable
            title="Puts"
            side="PUT"
            rows={viewModel.putRows}
            selectedSymbol={viewModel.selectedPut?.symbol}
            indexPrice={viewModel.indexPrice}
            updatedSymbols={updatedSymbols}
            formatters={formatters}
          />
        </section>
      </main>

      <StatusBar
        mode={viewModel.mode}
        connectionState={viewModel.connectionState}
        loadState={viewModel.loadState}
      />
    </div>
  );
}

