'use client';
import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { apiGet } from '@/lib/api';

function formatCap(num: number) {
    if (!num) return '-';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return num.toLocaleString();
}

export function CompetitorWidget() {
    const activeTicker = useAtomValue(activeTickerAtom);
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!activeTicker) return;
        setLoading(true);
        setError('');
        setData([]);
        apiGet<any>(`/api/market/peers/${activeTicker}`)
            .then(res => {
                if (res.error) setError(res.error);
                else if (res.peers) setData(res.peers);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [activeTicker]);

    return (
        <div className="widget-pane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="widget-header">
                <span>COMPETITOR MATRIX</span>
            </div>

            <div className="widget-body" style={{ flex: 1, overflowY: 'auto' }}>
                {!activeTicker && <div style={{ color: 'var(--color-text-muted)', fontSize: 12, textAlign: 'center', marginTop: 20 }}>Select a ticker</div>}
                {loading && <div style={{ color: 'var(--color-accent)', fontSize: 12, textAlign: 'center', marginTop: 20 }}>FETCHING PEERS...</div>}
                {error && <div style={{ color: 'var(--color-negative)', fontSize: 12 }}>{error}</div>}

                {data.length > 0 && (
                    <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>
                                <th style={{ padding: '4px 0', fontWeight: 'normal' }}>TICKER</th>
                                <th style={{ padding: '4px 0', fontWeight: 'normal' }}>PRICE</th>
                                <th style={{ padding: '4px 0', fontWeight: 'normal' }}>M.CAP</th>
                                <th style={{ padding: '4px 0', fontWeight: 'normal' }}>P/E</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((peer, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: peer.similar === 0 ? 'rgba(79, 140, 255, 0.1)' : 'transparent' }}>
                                    <td style={{ padding: '6px 0', color: peer.similar === 0 ? 'var(--color-accent)' : 'inherit', fontWeight: peer.similar === 0 ? 'bold' : 'normal' }}>
                                        {peer.ticker}
                                        {peer.similar === 0 && <span style={{ marginLeft: 4, fontSize: 8, color: 'var(--color-text-muted)' }}>(TARGET)</span>}
                                    </td>
                                    <td style={{ padding: '6px 0', fontFamily: 'var(--font-mono)' }}>{peer.price ? peer.price.toFixed(2) : '-'}</td>
                                    <td style={{ padding: '6px 0', fontFamily: 'var(--font-mono)' }}>{formatCap(peer.market_cap)}</td>
                                    <td style={{ padding: '6px 0', fontFamily: 'var(--font-mono)' }}>{peer.pe_ratio ? peer.pe_ratio.toFixed(1) : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
