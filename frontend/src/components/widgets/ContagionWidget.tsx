'use client';
import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { apiGet } from '@/lib/api';

interface ContagionData {
    contagion_score: number;
    risk_breakdown: {
        geopolitics: number;
        governance: number;
        supply_routes: number;
        summary: string;
    };
    peer_sentiment_impact: number;
}

export function ContagionWidget() {
    const ticker = useAtomValue(activeTickerAtom) || 'AAPL';
    const [data, setData] = useState<ContagionData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let mounted = true;
        const fetchContagion = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await apiGet<ContagionData>(`/api/contagion/${ticker}`);
                if (mounted) setData(res);
            } catch (err: any) {
                if (mounted) setError(err.message || 'Failed to analyze contagion.');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchContagion();
        return () => { mounted = false; };
    }, [ticker]);

    const renderMeter = (label: string, value: number) => {
        const pct = (value / 10) * 100;
        const color = value > 7 ? 'var(--color-negative)' : value > 4 ? 'var(--color-warning)' : 'var(--color-positive)';

        return (
            <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color }}>{value}/10</span>
                </div>
                <div style={{ height: 6, background: 'var(--color-surface-hover)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                </div>
            </div>
        );
    };

    return (
        <div className="widget-pane" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="widget-header">
                <span>Supply Chain Contagion Engine</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-accent)' }}>{ticker} SEC 10-K Data</span>
            </div>

            <div className="widget-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 32 }}>
                {loading ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                        <div className="spinner" style={{ width: 32, height: 32, border: '3px solid var(--color-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite' }} />
                        <div style={{ color: 'var(--color-text-muted)', fontSize: 13, fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>ANALYZING SEC FILINGS VIA LOCAL OLLAMA...</div>
                        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : error ? (
                    <div style={{ color: 'var(--color-negative)', fontSize: 13 }}>{error}</div>
                ) : data ? (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 32 }}>
                        {/* Macro Score */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '32px 0 40px', borderBottom: '1px solid var(--color-border)' }}>
                            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--color-text-muted)', marginBottom: 12 }}>Macro Contagion Score</div>
                            <div style={{ fontSize: 84, fontWeight: 900, fontFamily: 'var(--font-mono)', lineHeight: 1, color: data.contagion_score > 70 ? 'var(--color-negative)' : data.contagion_score > 40 ? 'var(--color-warning)' : 'var(--color-positive)', textShadow: '0 0 40px currentColor' }}>
                                {data.contagion_score.toFixed(1)}
                            </div>
                            <div style={{ fontSize: 13, marginTop: 16, color: 'var(--color-text-secondary)' }}>
                                Peer Sentiment Multiplier: <span style={{ fontFamily: 'var(--font-mono)', color: data.peer_sentiment_impact < 0 ? 'var(--color-negative)' : 'var(--color-positive)' }}>{data.peer_sentiment_impact > 0 ? '+' : ''}{data.peer_sentiment_impact}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 48, flex: 1, alignItems: 'center' }}>
                            {/* Vector Breakdown */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 8 }}>Identified Risk Vectors</div>
                                {renderMeter('Geopolitics & Trade', data.risk_breakdown.geopolitics)}
                                {renderMeter('Corporate Governance', data.risk_breakdown.governance)}
                                {renderMeter('Supply Routes & Logistics', data.risk_breakdown.supply_routes)}
                            </div>

                            {/* AI Assessment */}
                            <div style={{ flex: 1, background: 'var(--color-surface-alt)', borderRadius: 12, padding: 24, border: '1px solid var(--color-border)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: 'var(--color-accent)' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)', boxShadow: '0 0 12px currentColor' }} />
                                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--color-accent)' }}>Ollama SEC Assessment</span>
                                </div>
                                <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--color-text-primary)', margin: 0 }}>
                                    {data.risk_breakdown.summary}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
