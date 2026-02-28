'use client';
/**
 * ExplainabilityResults — Feature attribution placeholder bars and evidence list.
 * Shows in the right panel on the /explain page.
 */
import { useEffect, useState, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { fetchExplain } from '@/lib/api';
import type { ExplainResult } from '@/lib/mock-data';

export function ExplainabilityResults() {
    const ticker = useAtomValue(activeTickerAtom);
    const [data, setData] = useState<ExplainResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        if (!ticker) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetchExplain(ticker, 30, '');
            setData(res);
        } catch (err: any) {
            setError(err.message || 'Failed to load results');
        } finally {
            setLoading(false);
        }
    }, [ticker]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="explain-results-panel">
            {/* Feature Attribution */}
            <div className="widget-pane">
                <div className="widget-header">
                    <span>FEATURE ATTRIBUTION</span>
                </div>
                <div className="widget-body">
                    {!ticker && <div className="widget-empty">Select a ticker</div>}

                    {ticker && loading && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <div className="skeleton-line short" />
                                    <div className="skeleton-line" />
                                </div>
                            ))}
                        </div>
                    )}

                    {ticker && error && (
                        <div className="widget-error">
                            <span>{error}</span>
                            <button className="btn-ghost" onClick={load}>Retry</button>
                        </div>
                    )}

                    {ticker && !loading && !error && data && (
                        <div className="attribution-list">
                            {data.features.map((feat, i) => {
                                const barColor = i === 0 ? 'var(--color-accent)'
                                    : i < 3 ? 'var(--color-positive)'
                                        : 'var(--color-text-muted)';
                                return (
                                    <div key={i} className="attribution-row">
                                        <div className="attribution-label">
                                            <span>{feat.name}</span>
                                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                                                {(feat.importance * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                        <div className="attribution-bar">
                                            <div
                                                className="attribution-bar-fill"
                                                style={{
                                                    width: `${feat.importance * 100 / 0.25}%`,
                                                    background: barColor,
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Evidence List */}
            {ticker && !loading && !error && data && (
                <div className="widget-pane" style={{ marginTop: 12 }}>
                    <div className="widget-header">
                        <span>EVIDENCE</span>
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                            {data.evidence.length} signals
                        </span>
                    </div>
                    <div className="widget-body" style={{ padding: '4px 12px' }}>
                        {data.evidence.map((ev, i) => (
                            <div key={i} className="evidence-item">
                                <div className="evidence-header">
                                    <span className="evidence-source">{ev.source}</span>
                                    <span
                                        className="evidence-confidence"
                                        style={{
                                            color: ev.confidence > 0.8 ? 'var(--color-positive)' : ev.confidence > 0.6 ? 'var(--color-warning)' : 'var(--color-text-muted)',
                                        }}
                                    >
                                        {(ev.confidence * 100).toFixed(0)}% conf.
                                    </span>
                                </div>
                                <p className="evidence-text">{ev.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
