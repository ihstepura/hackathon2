'use client';
/**
 * PredictionCard — AI prediction trajectory display.
 * Shows: direction badge, confidence gauge, target price, % change, sparkline.
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { fetchPrediction, type PredictionResult } from '@/lib/api';

export function PredictionCard() {
    const ticker = useAtomValue(activeTickerAtom);
    const [data, setData] = useState<PredictionResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const [sparkW, setSparkW] = useState(200);

    useEffect(() => {
        if (!ticker) { setData(null); return; }
        setLoading(true);
        setError('');
        fetchPrediction(ticker)
            .then(setData)
            .catch(() => setError('Failed to load prediction'))
            .finally(() => setLoading(false));
    }, [ticker]);

    // Measure container width for responsive sparkline
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const measure = () => {
            const yAxisW = 36;
            const rAxisW = 36;
            const padding = 24; // card body padding
            const w = el.clientWidth - yAxisW - rAxisW - padding;
            setSparkW(Math.max(w, 100));
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [data]);

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
    const sparkH = 100;
    const yAxisW = 36;
    const rAxisW = 36;
    const totalW = sparkW + yAxisW + rAxisW;
    const sparkPoints = data.trajectory.map((v, i) => {
        const x = yAxisW + (i / (data.trajectory.length - 1)) * sparkW;
        const y = sparkH - ((v - min) / range) * sparkH;
        return `${x},${y}`;
    }).join(' ');

    // Y positions for first and last points
    const yStart = sparkH - ((data.trajectory[0] - min) / range) * sparkH;
    const yEnd = sparkH - ((data.trajectory[data.trajectory.length - 1] - min) / range) * sparkH;

    return (
        <div className="card prediction-card">
            <div className="card-header">
                <span className="card-title">AI PREDICTION — {ticker}</span>
                <span className="prediction-horizon">{data.horizon}</span>
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
                        <span className="prediction-price-value">${data.currentPrice.toFixed(2)}</span>
                    </div>
                    <div className="prediction-arrow" style={{ color: dirColor }}>{dirIcon}</div>
                    <div className="prediction-price-item">
                        <span className="prediction-price-label">Target</span>
                        <span className="prediction-price-value" style={{ color: dirColor }}>${data.targetPrice.toFixed(2)}</span>
                    </div>
                    <div className="prediction-change" style={{ background: dirColor + '18', color: dirColor }}>
                        {data.percentChange > 0 ? '+' : ''}{data.percentChange}%
                    </div>
                </div>

                {/* Sparkline */}
                <div className="prediction-sparkline" ref={containerRef}>
                    <span className="prediction-spark-label">Predicted Trajectory</span>
                    <svg width="100%" height={sparkH + 20} viewBox={`0 0 ${totalW} ${sparkH + 20}`} className="prediction-svg" preserveAspectRatio="xMidYMid meet">
                        {/* Y-axis price labels on the left */}
                        <text x={yAxisW - 4} y={Math.max(yStart + 3, 10)} fill="var(--color-text-muted)" fontSize="9" fontFamily="var(--font-mono)" textAnchor="end">
                            ${data.trajectory[0]?.toFixed(0)}
                        </text>
                        <text x={yAxisW + sparkW + 4} y={Math.max(yEnd + 3, 10)} fill={dirColor} fontSize="9" fontFamily="var(--font-mono)">
                            ${data.trajectory[data.trajectory.length - 1]?.toFixed(0)}
                        </text>
                        {/* Divider line between historical and forecast */}
                        {data.trajectory.length > 10 && (
                            <line
                                x1={yAxisW + (9 / (data.trajectory.length - 1)) * sparkW}
                                y1={0}
                                x2={yAxisW + (9 / (data.trajectory.length - 1)) * sparkW}
                                y2={sparkH}
                                stroke="var(--color-text-muted)"
                                strokeWidth="1"
                                strokeDasharray="3 3"
                                opacity={0.5}
                            />
                        )}
                        <polyline points={sparkPoints} fill="none" stroke={dirColor} strokeWidth="2" strokeLinejoin="round" />
                        {data.trajectory.map((v, i) => {
                            const x = yAxisW + (i / (data.trajectory.length - 1)) * sparkW;
                            const y = sparkH - ((v - min) / range) * sparkH;
                            return <circle key={i} cx={x} cy={y} r="3" fill={dirColor} opacity={i === 0 || i === data.trajectory.length - 1 ? 1 : 0.4} />;
                        })}
                        {/* Time axis labels */}
                        <text x={yAxisW} y={sparkH + 14} fill="var(--color-text-muted)" fontSize="9" fontFamily="var(--font-mono)">
                            −10d
                        </text>
                        {data.trajectory.length > 10 && (
                            <text x={yAxisW + (9 / (data.trajectory.length - 1)) * sparkW} y={sparkH + 14} fill="var(--color-text-muted)" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle">
                                Today
                            </text>
                        )}
                        <text x={totalW} y={sparkH + 14} fill="var(--color-text-muted)" fontSize="9" fontFamily="var(--font-mono)" textAnchor="end">
                            +10d
                        </text>
                    </svg>
                </div>
            </div>
        </div>
    );
}
