'use client';
/**
 * ConsoleStudio — AI prompt editor with custom analysis responses.
 */
import { useState, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { fetchChat } from '@/lib/api';

interface RunEntry {
    id: string;
    ticker: string;
    prompt: string;
    timestamp: number;
    status: 'success' | 'error';
    response: string;
    expanded: boolean;
}

const EXAMPLE_PROMPTS = [
    'Predict price movement with confidence intervals. Use all available technical and fundamental signals.',
    'What are the key support and resistance levels?',
    'Analyze the risk/reward ratio for a 30-day hold.',
    'Compare the current valuation to historical averages.',
];

export function ConsoleStudio() {
    const ticker = useAtomValue(activeTickerAtom);
    const [prompt, setPrompt] = useState(EXAMPLE_PROMPTS[0]);
    const [isRunning, setIsRunning] = useState(false);
    const [history, setHistory] = useState<RunEntry[]>([]);

    const handleRun = useCallback(async () => {
        if (!ticker || isRunning || !prompt.trim()) return;
        setIsRunning(true);

        const entry: RunEntry = {
            id: `run-${Date.now()}`,
            ticker,
            prompt: prompt.trim(),
            timestamp: Date.now(),
            status: 'success',
            response: '',
            expanded: true,
        };

        try {
            const fullPrompt = `[Ticker: ${ticker}] ${prompt.trim()}`;
            let response = await fetchChat(ticker, [{ role: 'user', content: fullPrompt }]);
            // Strip markdown bold/italic markers
            response = response.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/__(.+?)__/g, '$1');
            entry.response = response;
            entry.status = 'success';
        } catch {
            entry.response = 'Execution failed — check backend connection.';
            entry.status = 'error';
        }

        setHistory(prev => {
            // Collapse all previous entries
            const collapsed = prev.map(e => ({ ...e, expanded: false }));
            return [entry, ...collapsed];
        });
        setIsRunning(false);
    }, [ticker, prompt, isRunning]);

    const toggleExpand = (id: string) => {
        setHistory(prev => prev.map(e => e.id === id ? { ...e, expanded: !e.expanded } : e));
    };

    return (
        <div className="console-studio">
            {/* Prompt Editor */}
            <div className="widget-pane">
                <div className="widget-header">
                    <span>CONSOLE STUDIO</span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {ticker || 'NO TICKER'}
                    </span>
                </div>
                <div className="widget-body" style={{ padding: '12px' }}>
                    {/* Prompt textarea */}
                    <label className="console-label">Prompt</label>
                    <textarea
                        className="console-textarea"
                        rows={4}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Enter your analysis prompt..."
                        aria-label="Analysis prompt"
                    />

                    {/* Quick prompt chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                        {EXAMPLE_PROMPTS.map((p, i) => (
                            <button
                                key={i}
                                className="chat-chip"
                                onClick={() => setPrompt(p)}
                                style={{ fontSize: 10 }}
                            >
                                {p.length > 40 ? p.slice(0, 40) + '…' : p}
                            </button>
                        ))}
                    </div>

                    {/* Run button */}
                    <button
                        className="btn-primary console-run"
                        onClick={handleRun}
                        disabled={!ticker || isRunning || !prompt.trim()}
                    >
                        {isRunning ? (
                            <>
                                <span className="console-spinner" />
                                Running…
                            </>
                        ) : (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                                Execute Analysis
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Run History */}
            <div className="widget-pane" style={{ marginTop: 12 }}>
                <div className="widget-header">
                    <span>RUN HISTORY</span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                        {history.length} run{history.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="widget-body" style={{ padding: 0, maxHeight: 400, overflowY: 'auto' }}>
                    {history.length === 0 && (
                        <div className="widget-empty" style={{ padding: 20 }}>
                            No runs yet. Enter a prompt and click Execute Analysis.
                        </div>
                    )}
                    {history.map((entry) => (
                        <div key={entry.id} className="run-entry">
                            <div className="run-entry-header" style={{ cursor: 'pointer' }} onClick={() => toggleExpand(entry.id)}>
                                <span className={`run-status ${entry.status}`}>
                                    {entry.status === 'success' ? '✓' : '✗'}
                                </span>
                                <span className="run-ticker">{entry.ticker}</span>
                                <span className="run-time" style={{ flex: 1, textAlign: 'right' }}>
                                    {new Date(entry.timestamp).toLocaleTimeString()}
                                </span>
                                <span style={{ fontSize: 10, marginLeft: 8, color: 'var(--color-text-muted)' }}>
                                    {entry.expanded ? '▼' : '▶'}
                                </span>
                            </div>
                            <div className="run-summary" style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: entry.expanded ? 8 : 0, cursor: 'pointer' }} onClick={() => toggleExpand(entry.id)}>
                                {entry.prompt.length > 80 ? entry.prompt.slice(0, 80) + '…' : entry.prompt}
                            </div>
                            {entry.expanded && (
                                <div style={{
                                    padding: '10px 12px',
                                    background: 'var(--color-surface)',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    lineHeight: 1.6,
                                    whiteSpace: 'pre-wrap',
                                    fontFamily: 'var(--font-mono)',
                                    color: entry.status === 'error' ? 'var(--color-negative)' : 'var(--color-text)',
                                    marginBottom: 4,
                                }}>
                                    {entry.response}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
