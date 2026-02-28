'use client';
/**
 * NewsStrip — Bottom-fixed horizontal strip showing top 5 news for selected stock.
 * Horizontally scrollable on tablet.
 */
import { useEffect, useState, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { fetchNews } from '@/lib/api';
import type { NewsItem } from '@/lib/mock-data';

export function NewsStrip() {
    const ticker = useAtomValue(activeTickerAtom);
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        if (!ticker) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetchNews(ticker, 5);
            setNews(res);
        } catch (err: any) {
            setError(err.message || 'Failed to load news');
        } finally {
            setLoading(false);
        }
    }, [ticker]);

    useEffect(() => { load(); }, [load]);

    const sentimentColor = (s: string) => {
        switch (s) {
            case 'bullish': return 'var(--color-positive)';
            case 'bearish': return 'var(--color-negative)';
            default: return 'var(--color-text-muted)';
        }
    };

    if (!ticker) {
        return (
            <div className="news-strip">
                <div className="news-strip-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
                    </svg>
                    <span>LIVE NEWS</span>
                </div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Select a ticker to view news</span>
            </div>
        );
    }

    return (
        <div className="news-strip">
            <div className="news-strip-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
                </svg>
                <span>NEWS — {ticker}</span>
            </div>

            {loading && (
                <div className="news-strip-scroll">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="news-card skeleton-card">
                            <div className="skeleton-line" style={{ width: '80%' }} />
                            <div className="skeleton-line short" />
                        </div>
                    ))}
                </div>
            )}

            {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--color-negative)', fontSize: 12 }}>{error}</span>
                    <button className="btn-ghost" onClick={load} style={{ fontSize: 10, padding: '2px 8px' }}>Retry</button>
                </div>
            )}

            {!loading && !error && (
                <div className="news-strip-scroll">
                    {news.map((item) => (
                        <a
                            key={item.id}
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="news-card"
                        >
                            <div className="news-card-title">{item.title}</div>
                            <div className="news-card-meta">
                                <span>{item.source}</span>
                                <span>·</span>
                                <span>{item.published}</span>
                                <span
                                    className="news-sentiment"
                                    style={{ color: sentimentColor(item.sentiment), borderColor: sentimentColor(item.sentiment) }}
                                >
                                    {item.sentiment.toUpperCase()}
                                </span>
                            </div>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
