'use client';
/**
 * FinBERTPanel — Per-article FinBERT sentiment analysis with probability bars.
 * Bottom strip for the News page.
 */
import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { fetchFinBERT, type FinBERTResult } from '@/lib/api';

export function FinBERTPanel() {
    const ticker = useAtomValue(activeTickerAtom);
    const [data, setData] = useState<FinBERTResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!ticker) { setData(null); return; }
        setLoading(true);
        setError('');
        fetchFinBERT(ticker)
            .then(setData)
            .catch(() => setError('Failed to load FinBERT analysis'))
            .finally(() => setLoading(false));
    }, [ticker]);

    if (!ticker) return (
        <div className="finbert-panel">
            <div className="card-header"><span className="card-title">FINBERT ANALYSIS</span></div>
            <p className="widget-empty">Select a ticker</p>
        </div>
    );

    if (loading) return (
        <div className="finbert-panel">
            <div className="card-header"><span className="card-title">FINBERT ANALYSIS — {ticker}</span></div>
            <div className="finbert-strip">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="finbert-article-skel">
                        <div className="skeleton-line" style={{ width: '80%' }} />
                        <div className="skeleton-line short" />
                    </div>
                ))}
            </div>
        </div>
    );

    if (error) return (
        <div className="finbert-panel">
            <div className="card-header"><span className="card-title">FINBERT ANALYSIS</span></div>
            <div className="widget-error">{error}</div>
        </div>
    );

    if (!data) return null;

    const labelColor = (l: string) =>
        l === 'Positive' ? 'var(--color-positive)' :
            l === 'Negative' ? 'var(--color-negative)' : 'var(--color-warning)';

    return (
        <div className="finbert-panel">
            <div className="card-header">
                <span className="card-title">FINBERT SENTIMENT ANALYSIS — {ticker}</span>
                <div className="finbert-aggregate">
                    <span className="finbert-agg-label" style={{ color: labelColor(data.aggregate.label === 'Moderately Bullish' ? 'Positive' : data.aggregate.label) }}>
                        {data.aggregate.label}
                    </span>
                </div>
            </div>

            {/* Aggregate bar */}
            <div className="finbert-agg-bar">
                <div className="finbert-bar-segment positive" style={{ width: `${data.aggregate.positive * 100}%` }}>
                    {(data.aggregate.positive * 100).toFixed(0)}%
                </div>
                <div className="finbert-bar-segment neutral" style={{ width: `${data.aggregate.neutral * 100}%` }}>
                    {(data.aggregate.neutral * 100).toFixed(0)}%
                </div>
                <div className="finbert-bar-segment negative" style={{ width: `${data.aggregate.negative * 100}%` }}>
                    {(data.aggregate.negative * 100).toFixed(0)}%
                </div>
            </div>
            <div className="finbert-legend">
                <span className="finbert-legend-item"><span className="finbert-dot positive" /> Positive</span>
                <span className="finbert-legend-item"><span className="finbert-dot neutral" /> Neutral</span>
                <span className="finbert-legend-item"><span className="finbert-dot negative" /> Negative</span>
            </div>

            {/* Per-article bars */}
            <div className="finbert-strip">
                {data.per_article.map((art) => (
                    <div key={art.article_id} className="finbert-article">
                        <div className="finbert-article-title">{art.title}</div>
                        <div className="finbert-article-bar">
                            <div className="finbert-bar-segment positive" style={{ width: `${art.positive * 100}%` }} />
                            <div className="finbert-bar-segment neutral" style={{ width: `${art.neutral * 100}%` }} />
                            <div className="finbert-bar-segment negative" style={{ width: `${art.negative * 100}%` }} />
                        </div>
                        <div className="finbert-article-scores">
                            <span style={{ color: 'var(--color-positive)' }}>+{(art.positive * 100).toFixed(0)}%</span>
                            <span style={{ color: 'var(--color-warning)' }}>~{(art.neutral * 100).toFixed(0)}%</span>
                            <span style={{ color: 'var(--color-negative)' }}>-{(art.negative * 100).toFixed(0)}%</span>
                            <span className="finbert-article-label" style={{ color: labelColor(art.label) }}>{art.label}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
