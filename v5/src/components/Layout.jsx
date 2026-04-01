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
import { OptionChainTable } from "./Tables/OptionChainTable.jsx";
import { StatusBar } from "./Status/StatusBar.jsx";
import { MessageBanner } from "./Status/MessageBanner.jsx";

export function Layout({
  viewModel,
  effectiveMode,
  snapshotsEnabled,
  layoutMode,
  streamType,
  startupMessage,
  formatters,
  updatedSymbols,
  onModeChange,
  onLayoutChange,
  onStreamTypeChange,
  onToggleSnapshots,
  onUnderlyingChange,
  onExpiryChange,
}) {
  const isChainLayout = layoutMode === "t";

  return (
    <div className="page-shell">
      <Topbar
        effectiveMode={effectiveMode}
        snapshotsEnabled={snapshotsEnabled}
        layoutMode={layoutMode}
        streamType={streamType}
        onModeChange={onModeChange}
        onLayoutChange={onLayoutChange}
        onStreamTypeChange={onStreamTypeChange}
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

        <MessageBanner message={viewModel.errorMessage || startupMessage} />

        {isChainLayout ? (
          <section className="chain-grid">
            <OptionChainTable
              callRows={viewModel.callRows}
              putRows={viewModel.putRows}
              selectedCallSymbol={viewModel.selectedCall?.symbol}
              selectedPutSymbol={viewModel.selectedPut?.symbol}
              indexPrice={viewModel.indexPrice}
              updatedSymbols={updatedSymbols}
              formatters={formatters}
            />
          </section>
        ) : (
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
        )}
      </main>

      <StatusBar
        effectiveMode={effectiveMode}
        snapshotsEnabled={snapshotsEnabled}
        layoutMode={layoutMode}
        streamType={streamType}
        onModeChange={onModeChange}
        onLayoutChange={onLayoutChange}
        onStreamTypeChange={onStreamTypeChange}
        onToggleSnapshots={onToggleSnapshots}
        mode={viewModel.mode}
        connectionState={viewModel.connectionState}
        loadState={viewModel.loadState}
      />
    </div>
  );
}

