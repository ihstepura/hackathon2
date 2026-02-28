'use client';
/**
 * ExplainableAIPanel — Model summary card and feature importance list.
 */
import { useEffect, useState, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { fetchExplain } from '@/lib/api';
import type { ExplainResult } from '@/lib/mock-data';

export function ExplainableAIPanel() {
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
            setError(err.message || 'Failed to load model data');
        } finally {
            setLoading(false);
        }
    }, [ticker]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="explain-panel">
            {/* Model Summary */}
            <div className="widget-pane">
                <div className="widget-header">
                    <span>MODEL SUMMARY</span>
                    {data && (
                        <span style={{
                            fontSize: 10,
                            color: 'var(--color-positive)',
                            border: '1px solid var(--color-positive)',
                            padding: '2px 6px',
                            borderRadius: 4,
                        }}>
                            {data.accuracy.toFixed(1)}% Accuracy
                        </span>
                    )}
                </div>
                <div className="widget-body">
                    {!ticker && <div className="widget-empty">Select a ticker to view model details</div>}

                    {ticker && loading && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div className="skeleton-line" style={{ width: '60%' }} />
                            <div className="skeleton-line" style={{ width: '40%' }} />
                            <div className="skeleton-line" style={{ width: '50%' }} />
                        </div>
                    )}

                    {ticker && error && (
                        <div className="widget-error">
                            <span>{error}</span>
                            <button className="btn-ghost" onClick={load}>Retry</button>
                        </div>
                    )}

                    {ticker && !loading && !error && data && (
                        <div className="model-summary-grid">
                            <div className="model-summary-item">
                                <span className="label">Model</span>
                                <span className="value" style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{data.model}</span>
                            </div>
                            <div className="model-summary-item">
                                <span className="label">Accuracy</span>
                                <span className="value" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-positive)' }}>
                                    {data.accuracy.toFixed(1)}%
                                </span>
                            </div>
                            <div className="model-summary-item">
                                <span className="label">Training Date</span>
                                <span className="value" style={{ fontFamily: 'var(--font-mono)' }}>{data.trainingDate}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Feature Importance */}
            {ticker && !loading && !error && data && (
                <div className="widget-pane" style={{ marginTop: 12 }}>
                    <div className="widget-header">FEATURE IMPORTANCE</div>
                    <div className="widget-body" style={{ padding: '8px 12px' }}>
                        {data.features.map((feat, i) => (
                            <div key={i} className="feature-row">
                                <div className="feature-info">
                                    <span className="feature-rank">#{i + 1}</span>
                                    <span className="feature-name">{feat.name}</span>
                                    <span className="feature-pct">{feat.importance.toFixed(0)}%</span>
                                </div>
                                <div className="feature-bar-bg">
                                    <div
                                        className="feature-bar-fill"
                                        style={{ width: `${feat.importance}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
