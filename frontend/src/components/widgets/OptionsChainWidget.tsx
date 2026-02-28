'use client';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';

interface OptionContract {
    contractSymbol: string;
    strike: number;
    lastPrice: number;
    impliedVolatility: number;
    volume: number;
    openInterest: number;
    _type: 'call' | 'put';
}

interface OptionsData {
    ticker: string;
    expirations: string[];
    selected_expiry: string;
    calls: OptionContract[];
    puts: OptionContract[];
    error?: string;
}

export function OptionsChainWidget() {
    const activeTicker = useAtomValue(activeTickerAtom);
    const [data, setData] = useState<OptionsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!activeTicker) return;
        setLoading(true);
        setError('');

        apiGet<OptionsData>(`/api/options/chain/${activeTicker}`)
            .then(res => {
                if (res.error) {
                    setError(res.error);
                    setData(null);
                } else {
                    setData(res);
                }
            })
            .catch(err => setError(err.message || 'Failed to load options'))
            .finally(() => setLoading(false));
    }, [activeTicker]);

    return (
        <div className="widget-pane">
            <div className="widget-header">
                <span>Options Chain</span>
                {data && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)' }}>
                        EXP: {data.selected_expiry}
                    </span>
                )}
            </div>

            <div className="widget-body" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 0 }}>
                {loading && (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        FETCHING OPTION CHAIN...
                    </div>
                )}

                {error && !loading && (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-negative)', fontSize: 12 }}>
                        {error}
                    </div>
                )}

                {!activeTicker && !loading && (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
                        Select a ticker to view options.
                    </div>
                )}

                {data && !loading && (
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <div style={{ display: 'flex', background: 'var(--color-surface)', fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', padding: '6px 0', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, zIndex: 10 }}>
                            <div style={{ flex: 1, textAlign: 'center', color: 'var(--color-positive)' }}>CALLS</div>
                            <div style={{ width: 60, textAlign: 'center', fontWeight: 'bold' }}>STRIKE</div>
                            <div style={{ flex: 1, textAlign: 'center', color: 'var(--color-negative)' }}>PUTS</div>
                        </div>

                        {data.calls.slice(0, 15).map((call, i) => {
                            const put = data.puts.find(p => p.strike === call.strike);
                            return (
                                <div
                                    key={call.strike}
                                    style={{
                                        display: 'flex',
                                        borderBottom: '1px solid var(--color-border-light)',
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: 11,
                                        transition: 'background 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    {/* Call Side */}
                                    <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around', padding: '6px 4px', color: 'var(--color-positive)' }}>
                                        <span>{call.lastPrice.toFixed(2)}</span>
                                        <span style={{ color: 'var(--color-text-muted)' }}>{(call.impliedVolatility * 100).toFixed(0)}%</span>
                                        <span style={{ color: 'var(--color-text-muted)' }}>{call.openInterest}</span>
                                    </div>

                                    {/* Strike Center */}
                                    <div style={{ width: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', fontWeight: 700, color: 'white' }}>
                                        {call.strike}
                                    </div>

                                    {/* Put Side */}
                                    <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around', padding: '6px 4px', color: 'var(--color-negative)' }}>
                                        <span>{put ? put.lastPrice.toFixed(2) : '-'}</span>
                                        <span style={{ color: 'var(--color-text-muted)' }}>{put ? (put.impliedVolatility * 100).toFixed(0) + '%' : '-'}</span>
                                        <span style={{ color: 'var(--color-text-muted)' }}>{put ? put.openInterest : '-'}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
