'use client';
import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { apiGet } from '@/lib/api';

export function NewsWidget() {
    const activeTicker = useAtomValue(activeTickerAtom);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!activeTicker) return;
        setLoading(true);
        setError('');
        apiGet<any>(`/api/news/${activeTicker}?limit=10`)
            .then(res => {
                if (res.error) setError(res.error);
                else setData(res);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [activeTicker]);

    return (
        <div className="widget-pane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="widget-header">
                <span>AI NEWS & SOCIAL</span>
                {data && (
                    <span style={{
                        color: data.sentiment_label === 'Positive' ? 'var(--color-positive)' : data.sentiment_label === 'Negative' ? 'var(--color-negative)' : 'var(--color-text-muted)',
                        fontSize: 10, border: '1px solid currentColor', padding: '2px 6px', borderRadius: 4
                    }}>
                        {data.sentiment_label.toUpperCase()} ({data.average_score.toFixed(2)})
                    </span>
                )}
            </div>

            <div className="widget-body" style={{ flex: 1, overflowY: 'auto' }}>
                {!activeTicker && <div style={{ color: 'var(--color-text-muted)', fontSize: 12, textAlign: 'center', marginTop: 20 }}>Select a ticker</div>}
                {loading && <div style={{ color: 'var(--color-accent)', fontSize: 12, textAlign: 'center', marginTop: 20 }}>ANALYZING SENTIMENT...</div>}
                {error && <div style={{ color: 'var(--color-negative)', fontSize: 12 }}>{error}</div>}

                {data?.scored_news?.map((item: any, i: number) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <a href={item.link} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--color-text-primary)', textDecoration: 'none', lineHeight: 1.4 }}>
                            {item.title}
                        </a>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>{item.source} • {item.published}</span>
                            <span style={{
                                color: item.decayed_score > 0 ? 'var(--color-positive)' : item.decayed_score < 0 ? 'var(--color-negative)' : 'var(--color-text-muted)'
                            }}>
                                {item.decayed_score > 0 ? '+' : ''}{item.decayed_score.toFixed(2)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
