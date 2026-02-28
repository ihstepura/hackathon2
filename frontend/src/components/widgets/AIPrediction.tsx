'use client';
/**
 * AIPrediction — LSTM price forecast & Explainable AI (XAI) feature importance
 */
import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { apiGet } from '@/lib/api';

interface XAI_Feature {
    feature: string;
    importance: number;
}

interface PredictionData {
    ticker: string;
    current_price: number;
    forecast_price: number;
    projected_return: number;
    historical_context: { dates: string[], prices: number[] };
    forecast: { days: number, prices: number[] };
    xai_explanation: {
        description: string;
        feature_importance: XAI_Feature[];
    };
}

export function AIPrediction() {
    const ticker = useAtomValue(activeTickerAtom);
    const [data, setData] = useState<PredictionData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!ticker) { setData(null); return; }

        let mounted = true;
        setLoading(true);
        setError('');

        apiGet<PredictionData>(`/api/ai/predict/${ticker}?days=10`)
            .then(res => {
                if (!mounted) return;
                if ((res as any).error) setError((res as any).error);
                else setData(res);
            })
            .catch(e => {
                if (mounted) setError(e.message || 'Failed to generate prediction');
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => { mounted = false; };
    }, [ticker]);

    if (!ticker) {
        return (
            <div className="widget-pane">
                <div className="widget-header">AI Prediction Model</div>
                <div className="widget-body" style={{ color: 'var(--color-text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                    Select a ticker to run LSTM forecast
                </div>
            </div>
        );
    }

    return (
        <div className="widget-pane">
            <div className="widget-header">
                <span>AI Forecast (LSTM) — {ticker}</span>
                {loading && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-warning)' }}>TRAINING...</span>}
            </div>

            <div className="widget-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {loading && !data && (
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                        Initializing PyTorch tensors...<br />
                        Training LSTM on 1yr historical sequence...<br />
                        Computing occlusion sensitivity (XAI)...
                    </div>
                )}

                {error && (
                    <div style={{ color: 'var(--color-negative)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                        Error: {error}
                    </div>
                )}

                {data && !loading && (
                    <>
                        {/* Forecast Summary */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: 12,
                            background: 'var(--color-surface-alt)',
                            borderRadius: 6,
                            border: '1px solid var(--color-border-light)',
                        }}>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>10-Day Target</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                    ${data.forecast_price.toFixed(2)}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Projected Move</div>
                                <div style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: data.projected_return >= 0 ? 'var(--color-positive)' : 'var(--color-negative)'
                                }}>
                                    {data.projected_return >= 0 ? '+' : ''}{data.projected_return.toFixed(2)}%
                                </div>
                            </div>
                        </div>

                        {/* XAI Feature Importance */}
                        <div>
                            <div className="section-label" style={{ marginBottom: 8 }}>Explainable AI (Occlusion Sensitivity)</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {data.xai_explanation.feature_importance.map((feat, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 140, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                                            {feat.feature}
                                        </div>
                                        <div style={{ flex: 1, height: 6, background: 'var(--color-surface-hover)', borderRadius: 3, overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%',
                                                width: `${feat.importance}%`,
                                                background: 'var(--color-accent)',
                                                borderRadius: 3
                                            }} />
                                        </div>
                                        <div style={{ width: 30, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)' }}>
                                            {feat.importance}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Forecast Ribbon */}
                        <div>
                            <div className="section-label" style={{ marginBottom: 8 }}>Trajectory</div>
                            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4 }}>
                                {data.forecast.prices.map((p, i) => (
                                    <div key={i} style={{
                                        minWidth: 48,
                                        padding: '4px 6px',
                                        background: 'var(--color-surface-hover)',
                                        borderRadius: 4,
                                        textAlign: 'center'
                                    }}>
                                        <div style={{ fontSize: 9, color: 'var(--color-text-muted)', marginBottom: 2 }}>D+{i + 1}</div>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-primary)' }}>{p.toFixed(0)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
