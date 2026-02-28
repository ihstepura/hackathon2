'use client';
/**
 * AlphaFilter — Main Terminal Page
 * Focused Hackathon layout prioritizing Sentiment, Contagion, and Divergence.
 */
import { useAtomValue } from 'jotai';
import { activeWorkspaceAtom } from '@/atoms/workspace';

import { CommandPalette } from '@/components/terminal/CommandPalette';
import { TerminalHeader } from '@/components/terminal/TerminalHeader';
import { Sidebar } from '@/components/terminal/Sidebar';

import { MarketPulse } from '@/components/widgets/MarketPulse';
import { TechnicalGrid } from '@/components/widgets/TechnicalGrid';
import { OptionsChainWidget } from '@/components/widgets/OptionsChainWidget';
import { PriceChart } from '@/components/widgets/PriceChart';
import { ContagionWidget } from '@/components/widgets/ContagionWidget';
import { AIChatbot } from '@/components/widgets/AIChatbot';
import { NewsWidget } from '@/components/widgets/NewsWidget';
import { CompetitorWidget } from '@/components/widgets/CompetitorWidget';
import { MonteCarloWidget } from '@/components/widgets/MonteCarloWidget';

export default function TerminalPage() {
  const activeView = useAtomValue(activeWorkspaceAtom);

  return (
    <div className="terminal-layout" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* GLOBAL OVERLAYS & HEADERS */}
      <CommandPalette />
      <AIChatbot />
      <TerminalHeader />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* SIDEBAR NAVIGATION */}
        <Sidebar />

        {/* WORKSPACE AREA */}
        <div className="terminal-body" style={{ flex: 1, padding: 12, overflow: 'hidden', display: 'flex' }}>

          {/* DASHBOARD VIEW */}
          {activeView === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 12, overflowY: 'auto', paddingRight: 4 }}>
              {/* TOP ROW: Chart & Pulse */}
              <div style={{ display: 'flex', height: '60vh', gap: 12, flexShrink: 0 }}>
                {/* Left Column: Huge Chart for Divergence (70%) */}
                <div style={{ flex: 7, minHeight: 0, overflow: 'hidden' }}>
                  <PriceChart />
                </div>

                {/* Right Column: Pulse & Technicals (30%) */}
                <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
                  <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <MarketPulse />
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <TechnicalGrid />
                  </div>
                </div>
              </div>

              {/* BOTTOM ROW: Research Modules */}
              <div style={{ display: 'flex', height: '40vh', gap: 12, flexShrink: 0, paddingBottom: 12 }}>
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}><MonteCarloWidget /></div>
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}><CompetitorWidget /></div>
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}><NewsWidget /></div>
              </div>
            </div>
          )}

          {/* CONTAGION VIEW */}
          {activeView === 'contagion' && (
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex' }}>
              <ContagionWidget />
            </div>
          )}

          {/* OPTIONS ROW VIEW */}
          {activeView === 'options' && (
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <OptionsChainWidget />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
