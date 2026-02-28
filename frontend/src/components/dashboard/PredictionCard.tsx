'use client';
/**
 * PredictionCard — AI prediction trajectory display.
 * Shows: direction badge, confidence gauge, target price, % change, sparkline.
 */
import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { fetchPrediction, type PredictionResult } from '@/lib/api';

export function PredictionCard() {
    const ticker = useAtomValue(activeTickerAtom);
    const [data, setData] = useState<PredictionResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!ticker) { setData(null); return; }
        setLoading(true);
        setError('');
        fetchPrediction(ticker)
            .then(setData)
            .catch(() => setError('Failed to load prediction'))
            .finally(() => setLoading(false));
    }, [ticker]);

    if (!ticker) return (
        <div className="card prediction-card prediction-empty">
            <div className="card-header"><span className="card-title">AI PREDICTION</span></div>
            <div className="card-body"><p className="widget-empty">Search for a company above to view AI predictions</p></div>
        </div>
    );

    if (loading) return (
        <div className="card prediction-card">
            <div className="card-header"><span className="card-title">AI PREDICTION</span></div>
            <div className="card-body skeleton-card">
                <div className="skeleton-line" style={{ width: '60%' }} />
                <div className="skeleton-line" style={{ width: '80%' }} />
                <div className="skeleton-line short" />
            </div>
        </div>
    );

    if (error) return (
        <div className="card prediction-card">
            <div className="card-header"><span className="card-title">AI PREDICTION</span></div>
            <div className="card-body widget-error">{error}</div>
        </div>
    );

    if (!data) return null;

    const dirColor = data.direction === 'bullish' ? 'var(--color-positive)' :
        data.direction === 'bearish' ? 'var(--color-negative)' : 'var(--color-warning)';
    const dirIcon = data.direction === 'bullish' ? '↗' : data.direction === 'bearish' ? '↘' : '→';
    const confPct = (data.confidence * 100).toFixed(1);

    // Sparkline path
    const min = Math.min(...data.trajectory);
    const max = Math.max(...data.trajectory);
    const range = max - min || 1;
    const sparkH = 60;
    const sparkW = 200;
    const sparkPoints = data.trajectory.map((v, i) => {
        const x = (i / (data.trajectory.length - 1)) * sparkW;
        const y = sparkH - ((v - min) / range) * sparkH;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="card prediction-card">
            <div className="card-header">
                <span className="card-title">AI PREDICTION — {ticker}</span>
                <span className="prediction-horizon">{data.horizon_days}-DAY FORECAST</span>
            </div>
            <div className="card-body prediction-body">
                {/* Direction + confidence */}
                <div className="prediction-hero">
                    <div className="prediction-direction" style={{ color: dirColor, borderColor: dirColor }}>
                        <span className="prediction-dir-icon">{dirIcon}</span>
                        <span className="prediction-dir-label">{data.direction.toUpperCase()}</span>
                    </div>
                    <div className="prediction-confidence">
                        <svg width="80" height="80" viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="34" fill="none" stroke="var(--color-border)" strokeWidth="6" />
                            <circle cx="40" cy="40" r="34" fill="none" stroke={dirColor} strokeWidth="6"
                                strokeDasharray={`${data.confidence * 213.6} 213.6`}
                                strokeLinecap="round" transform="rotate(-90 40 40)" />
                            <text x="40" y="36" textAnchor="middle" fill={dirColor} fontSize="16" fontWeight="700" fontFamily="var(--font-mono)">
                                {confPct}%
                            </text>
                            <text x="40" y="50" textAnchor="middle" fill="var(--color-text-muted)" fontSize="9">
                                CONFIDENCE
                            </text>
                        </svg>
                    </div>
                </div>

                {/* Prices */}
                <div className="prediction-prices">
                    <div className="prediction-price-item">
                        <span className="prediction-price-label">Current</span>
                        <span className="prediction-price-value">${data.current_price.toFixed(2)}</span>
                    </div>
                    <div className="prediction-arrow" style={{ color: dirColor }}>{dirIcon}</div>
                    <div className="prediction-price-item">
                        <span className="prediction-price-label">Target</span>
                        <span className="prediction-price-value" style={{ color: dirColor }}>${data.target_price.toFixed(2)}</span>
                    </div>
                    <div className="prediction-change" style={{ background: dirColor + '18', color: dirColor }}>
                        {data.predicted_change_pct > 0 ? '+' : ''}{data.predicted_change_pct}%
                    </div>
                </div>

                {/* Sparkline */}
                <div className="prediction-sparkline">
                    <span className="prediction-spark-label">Predicted Trajectory</span>
                    <svg width={sparkW} height={sparkH} viewBox={`0 0 ${sparkW} ${sparkH}`} className="prediction-svg">
                        <polyline points={sparkPoints} fill="none" stroke={dirColor} strokeWidth="2" strokeLinejoin="round" />
                        {data.trajectory.map((v, i) => {
                            const x = (i / (data.trajectory.length - 1)) * sparkW;
                            const y = sparkH - ((v - min) / range) * sparkH;
                            return <circle key={i} cx={x} cy={y} r="3" fill={dirColor} opacity={i === 0 || i === data.trajectory.length - 1 ? 1 : 0.4} />;
                        })}
                    </svg>
                </div>
            </div>
        </div>
    );
}
