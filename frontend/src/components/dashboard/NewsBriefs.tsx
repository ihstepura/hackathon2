'use client';
/**
 * NewsBriefs — Top 5 news articles with full headline, summary, source, and sentiment.
 * Main content for the News page.
 */
import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { fetchNews, type NewsItem } from '@/lib/api';

export function NewsBriefs() {
    const ticker = useAtomValue(activeTickerAtom);
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!ticker) { setNews([]); return; }
        setLoading(true);
        setError('');
        fetchNews(ticker, 5)
            .then(setNews)
            .catch(() => setError('Failed to load news'))
            .finally(() => setLoading(false));
    }, [ticker]);

    if (!ticker) return (
        <div className="news-briefs">
            <div className="card-header"><span className="card-title">TOP NEWS</span></div>
            <p className="widget-empty">Search for a company to view relevant news</p>
        </div>
    );

    if (loading) return (
        <div className="news-briefs">
            <div className="card-header"><span className="card-title">TOP NEWS — {ticker}</span></div>
            <div className="skeleton-card">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} style={{ marginBottom: 16 }}>
                        <div className="skeleton-line" style={{ width: '90%', marginBottom: 6 }} />
                        <div className="skeleton-line" style={{ width: '100%', marginBottom: 4 }} />
                        <div className="skeleton-line short" />
                    </div>
                ))}
            </div>
        </div>
    );

    if (error) return (
        <div className="news-briefs">
            <div className="card-header"><span className="card-title">TOP NEWS</span></div>
            <div className="widget-error">{error}</div>
        </div>
    );

    const sentimentColor = (s: string) =>
        s === 'bullish' ? 'var(--color-positive)' :
            s === 'bearish' ? 'var(--color-negative)' : 'var(--color-warning)';

    return (
        <div className="news-briefs">
            <div className="card-header">
                <span className="card-title">TOP NEWS — {ticker}</span>
                <span className="news-count">{news.length} ARTICLES</span>
            </div>
            <div className="news-briefs-list">
                {news.map((item, i) => (
                    <article key={item.id} className="news-brief-item">
                        <div className="news-brief-rank">#{i + 1}</div>
                        <div className="news-brief-content">
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="news-brief-title">
                                {item.title}
                            </a>
                            <p className="news-brief-summary">{item.summary}</p>
                            <div className="news-brief-meta">
                                <span className="news-brief-source">{item.source}</span>
                                <span className="news-brief-time">{item.published}</span>
                                <span className="news-sentiment" style={{ color: sentimentColor(item.sentiment), borderColor: sentimentColor(item.sentiment) }}>
                                    {item.sentiment.toUpperCase()}
                                </span>
                                <span className="news-brief-score" style={{ color: sentimentColor(item.sentiment) }}>
                                    {item.score > 0 ? '+' : ''}{item.score.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
