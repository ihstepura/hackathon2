'use client';
/**
 * ConsoleStudio — Prompt editor with run button and run history.
 */
import { useState, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { fetchExplain } from '@/lib/api';

interface RunEntry {
    id: string;
    ticker: string;
    horizon: number;
    constraints: string;
    timestamp: number;
    status: 'success' | 'error';
    resultSummary: string;
}

export function ConsoleStudio() {
    const ticker = useAtomValue(activeTickerAtom);
    const [prompt, setPrompt] = useState('Predict price movement with confidence intervals. Use all available technical and fundamental signals.');
    const [horizon, setHorizon] = useState(30);
    const [constraints, setConstraints] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [history, setHistory] = useState<RunEntry[]>([]);

    const handleRun = useCallback(async () => {
        if (!ticker || isRunning) return;
        setIsRunning(true);

        const entry: RunEntry = {
            id: `run-${Date.now()}`,
            ticker,
            horizon,
            constraints: constraints || prompt,
            timestamp: Date.now(),
            status: 'success',
            resultSummary: '',
        };

        try {
            const result = await fetchExplain(ticker, horizon, constraints || prompt);
            entry.resultSummary = `Model: ${result.model} | Accuracy: ${result.accuracy.toFixed(1)}% | Top feature: ${result.features[0]?.name || 'N/A'}`;
            entry.status = 'success';
        } catch {
            entry.resultSummary = 'Execution failed — check connection';
            entry.status = 'error';
        }

        setHistory(prev => [entry, ...prev]);
        setIsRunning(false);
    }, [ticker, horizon, constraints, prompt, isRunning]);

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

                    {/* Parameters */}
                    <div className="console-params">
                        <div className="console-param">
                            <label className="console-label">Horizon (days)</label>
                            <input
                                type="number"
                                className="console-input"
                                value={horizon}
                                onChange={(e) => setHorizon(Number(e.target.value))}
                                min={1}
                                max={365}
                                aria-label="Prediction horizon in days"
                            />
                        </div>
                        <div className="console-param" style={{ flex: 2 }}>
                            <label className="console-label">Constraints (optional)</label>
                            <input
                                type="text"
                                className="console-input"
                                value={constraints}
                                onChange={(e) => setConstraints(e.target.value)}
                                placeholder="e.g. max_drawdown=10%, exclude=earnings"
                                aria-label="Analysis constraints"
                            />
                        </div>
                    </div>

                    {/* Run button */}
                    <button
                        className="btn-primary console-run"
                        onClick={handleRun}
                        disabled={!ticker || isRunning}
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
                <div className="widget-body" style={{ padding: 0, maxHeight: 300, overflowY: 'auto' }}>
                    {history.length === 0 && (
                        <div className="widget-empty" style={{ padding: 20 }}>
                            No runs yet. Execute an analysis above.
                        </div>
                    )}
                    {history.map((entry) => (
                        <div key={entry.id} className="run-entry">
                            <div className="run-entry-header">
                                <span className={`run-status ${entry.status}`}>
                                    {entry.status === 'success' ? '✓' : '✗'}
                                </span>
                                <span className="run-ticker">{entry.ticker}</span>
                                <span className="run-horizon">{entry.horizon}d</span>
                                <span className="run-time">
                                    {new Date(entry.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                            <div className="run-summary">{entry.resultSummary}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
