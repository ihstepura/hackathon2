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
        l === 'Positive' || l === 'Bullish' || l === 'Moderately Bullish' ? 'var(--color-positive)' :
            l === 'Negative' || l === 'Bearish' || l === 'Moderately Bearish' ? 'var(--color-negative)' : 'var(--color-warning)';

    let aggPos = 0, aggNeu = 0, aggNeg = 0;
    if (data.articles.length > 0) {
        aggPos = data.articles.reduce((acc, a) => acc + a.finbert.positive, 0) / data.articles.length;
        aggNeu = data.articles.reduce((acc, a) => acc + a.finbert.neutral, 0) / data.articles.length;
        aggNeg = data.articles.reduce((acc, a) => acc + a.finbert.negative, 0) / data.articles.length;
    }

    return (
        <div className="finbert-panel">
            <div className="card-header">
                <span className="card-title">FINBERT SENTIMENT ANALYSIS — {ticker}</span>
                <div className="finbert-aggregate">
                    <span className="finbert-agg-label" style={{ color: labelColor(data.overallSentiment) }}>
                        {data.overallSentiment}
                    </span>
                </div>
            </div>

            {/* Aggregate bar */}
            {data.articles.length > 0 && (
                <div className="finbert-agg-bar">
                    <div className="finbert-bar-segment positive" style={{ width: `${aggPos * 100}%` }}>
                        {(aggPos * 100).toFixed(0)}%
                    </div>
                    <div className="finbert-bar-segment neutral" style={{ width: `${aggNeu * 100}%` }}>
                        {(aggNeu * 100).toFixed(0)}%
                    </div>
                    <div className="finbert-bar-segment negative" style={{ width: `${aggNeg * 100}%` }}>
                        {(aggNeg * 100).toFixed(0)}%
                    </div>
                </div>
            )}
            <div className="finbert-legend">
                <span className="finbert-legend-item"><span className="finbert-dot positive" /> Positive</span>
                <span className="finbert-legend-item"><span className="finbert-dot neutral" /> Neutral</span>
                <span className="finbert-legend-item"><span className="finbert-dot negative" /> Negative</span>
            </div>

            {/* Per-article bars */}
            <div className="finbert-strip">
                {data.articles.map((art, i) => {
                    const maxScore = Math.max(art.finbert.positive, art.finbert.neutral, art.finbert.negative);
                    const artLabel = maxScore === art.finbert.positive ? 'Positive' : maxScore === art.finbert.negative ? 'Negative' : 'Neutral';
                    return (
                        <div key={art.title + i} className="finbert-article">
                            <div className="finbert-article-title">{art.title}</div>
                            <div className="finbert-article-bar">
                                <div className="finbert-bar-segment positive" style={{ width: `${art.finbert.positive * 100}%` }} />
                                <div className="finbert-bar-segment neutral" style={{ width: `${art.finbert.neutral * 100}%` }} />
                                <div className="finbert-bar-segment negative" style={{ width: `${art.finbert.negative * 100}%` }} />
                            </div>
                            <div className="finbert-article-scores">
                                <span style={{ color: 'var(--color-positive)' }}>+{(art.finbert.positive * 100).toFixed(0)}%</span>
                                <span style={{ color: 'var(--color-warning)' }}>~{(art.finbert.neutral * 100).toFixed(0)}%</span>
                                <span style={{ color: 'var(--color-negative)' }}>-{(art.finbert.negative * 100).toFixed(0)}%</span>
                                <span className="finbert-article-label" style={{ color: labelColor(artLabel) }}>{artLabel}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
