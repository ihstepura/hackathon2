'use client';
/**
 * TechnicalsPanel — Full technical indicator list with hover tooltips explaining each indicator.
 * Designed for the right column of the Charts page.
 */
import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { fetchTechnicals, type Technicals } from '@/lib/api';

interface IndicatorMeta {
    key: keyof Technicals;
    label: string;
    tooltip: string;
    format: (v: number) => string;
    signal: (v: number, data: Technicals) => 'bullish' | 'bearish' | 'neutral';
}

const INDICATORS: IndicatorMeta[] = [
    {
        key: 'rsi', label: 'RSI (14)',
        tooltip: 'Relative Strength Index measures momentum on a 0-100 scale. Below 30 = oversold (buy signal), above 70 = overbought (sell signal). Calculated from average gains vs losses over 14 periods.',
        format: v => v.toFixed(1),
        signal: v => v < 30 ? 'bullish' : v > 70 ? 'bearish' : 'neutral',
    },
    {
        key: 'macd', label: 'MACD',
        tooltip: 'Moving Average Convergence Divergence shows the relationship between two moving averages. When MACD crosses above the signal line, it\'s bullish; below is bearish. Calculated as EMA(12) - EMA(26).',
        format: v => v.toFixed(2),
        signal: (v, d) => (d.macd_signal != null && v > d.macd_signal) ? 'bullish' : 'bearish',
    },
    {
        key: 'macd_signal', label: 'MACD Signal',
        tooltip: 'The signal line is a 9-period EMA of the MACD line. Crossovers between MACD and signal generate trade signals. A bullish crossover occurs when MACD rises above the signal.',
        format: v => v.toFixed(2),
        signal: (v, d) => (d.macd != null && d.macd > v) ? 'bullish' : 'bearish',
    },
    {
        key: 'bb_upper', label: 'BB Upper',
        tooltip: 'Upper Bollinger Band is SMA(20) + 2 standard deviations. Price touching the upper band may signal overbought conditions. Bollinger Bands expand during high volatility and contract during low volatility.',
        format: v => `$${v.toFixed(2)}`,
        signal: (v, d) => d.price > v ? 'bearish' : 'neutral',
    },
    {
        key: 'bb_lower', label: 'BB Lower',
        tooltip: 'Lower Bollinger Band is SMA(20) - 2 standard deviations. Price touching the lower band may signal oversold conditions. A bounce off the lower band can be a buy signal.',
        format: v => `$${v.toFixed(2)}`,
        signal: (v, d) => d.price < v ? 'bullish' : 'neutral',
    },
    {
        key: 'sma_20', label: 'SMA 20',
        tooltip: 'Simple Moving Average of the last 20 periods. Acts as short-term support/resistance. Price above SMA 20 indicates short-term uptrend. Often used with SMA 50 for crossover signals.',
        format: v => `$${v.toFixed(2)}`,
        signal: (v, d) => d.price > v ? 'bullish' : 'bearish',
    },
    {
        key: 'sma_50', label: 'SMA 50',
        tooltip: 'Simple Moving Average of the last 50 periods. Key intermediate-term trend indicator. A "Golden Cross" (SMA 50 crossing above SMA 200) is a strong bullish signal.',
        format: v => `$${v.toFixed(2)}`,
        signal: (v, d) => d.price > v ? 'bullish' : 'bearish',
    },
    {
        key: 'sma_200', label: 'SMA 200',
        tooltip: 'Simple Moving Average of the last 200 periods. The most widely watched long-term trend indicator. Institutional investors often use the 200-day SMA to determine the overall market direction.',
        format: v => `$${v.toFixed(2)}`,
        signal: (v, d) => d.price > v ? 'bullish' : 'bearish',
    },
    {
        key: 'ema_12', label: 'EMA 12',
        tooltip: 'Exponential Moving Average (12 periods) gives more weight to recent prices than SMA. Reacts faster to price changes. Used as the fast line in MACD calculation.',
        format: v => `$${v.toFixed(2)}`,
        signal: (v, d) => d.price > v ? 'bullish' : 'bearish',
    },
    {
        key: 'ema_26', label: 'EMA 26',
        tooltip: 'Exponential Moving Average (26 periods) is the slow component in MACD. When EMA 12 crosses above EMA 26, it generates a bullish signal. Acts as medium-term trend confirmation.',
        format: v => `$${v.toFixed(2)}`,
        signal: (v, d) => d.price > v ? 'bullish' : 'bearish',
    },
    {
        key: 'atr', label: 'ATR (14)',
        tooltip: 'Average True Range measures market volatility over 14 periods. Higher ATR = more volatile. Used for position sizing and stop-loss placement. Does not indicate direction, only volatility magnitude.',
        format: v => v.toFixed(2),
        signal: () => 'neutral',
    },
    {
        key: 'stochastic_k', label: 'Stoch %K',
        tooltip: 'Stochastic %K compares the closing price to the high-low range over 14 periods. Below 20 = oversold, above 80 = overbought. Used with %D for crossover signals.',
        format: v => v.toFixed(1),
        signal: v => v < 20 ? 'bullish' : v > 80 ? 'bearish' : 'neutral',
    },
    {
        key: 'stochastic_d', label: 'Stoch %D',
        tooltip: 'Stochastic %D is a 3-period SMA of %K, acting as a signal line. When %K crosses above %D in oversold territory, it\'s a buy signal. Smoother than %K, reduces false signals.',
        format: v => v.toFixed(1),
        signal: v => v < 20 ? 'bullish' : v > 80 ? 'bearish' : 'neutral',
    },
    {
        key: 'vwap', label: 'VWAP',
        tooltip: 'Volume Weighted Average Price represents the average price weighted by volume throughout the day. Institutional traders use VWAP as a benchmark — buying below VWAP and selling above.',
        format: v => `$${v.toFixed(2)}`,
        signal: (v, d) => d.price > v ? 'bullish' : 'bearish',
    },
    {
        key: 'adx', label: 'ADX',
        tooltip: 'Average Directional Index measures trend strength on a 0-100 scale. Below 20 = weak/no trend, 20-40 = developing trend, above 40 = strong trend. Does not indicate direction.',
        format: v => v.toFixed(1),
        signal: v => v > 25 ? 'bullish' : 'neutral',
    },
    {
        key: 'obv', label: 'OBV',
        tooltip: 'On-Balance Volume is a cumulative running total of volume. Rising OBV confirms price uptrend; divergence between OBV and price can signal reversals. Used for confirming breakouts.',
        format: v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`,
        signal: () => 'neutral',
    },
];

export function TechnicalsPanel() {
    const ticker = useAtomValue(activeTickerAtom);
    const [data, setData] = useState<Technicals | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    useEffect(() => {
        if (!ticker) { setData(null); return; }
        setLoading(true);
        setError('');
        fetchTechnicals(ticker)
            .then(setData)
            .catch(() => setError('Failed to load technicals'))
            .finally(() => setLoading(false));
    }, [ticker]);

    if (!ticker) return (
        <div className="technicals-panel">
            <div className="card-header"><span className="card-title">TECHNICALS</span></div>
            <p className="widget-empty">Select a ticker</p>
        </div>
    );

    if (loading) return (
        <div className="technicals-panel">
            <div className="card-header"><span className="card-title">TECHNICALS — {ticker}</span></div>
            <div className="skeleton-card">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton-line" style={{ width: `${60 + Math.random() * 30}%` }} />)}
            </div>
        </div>
    );

    if (error) return (
        <div className="technicals-panel">
            <div className="card-header"><span className="card-title">TECHNICALS</span></div>
            <div className="widget-error">{error}</div>
        </div>
    );

    if (!data) return null;

    return (
        <div className="technicals-panel">
            <div className="card-header">
                <span className="card-title">TECHNICALS — {ticker}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14 }}>${data.price.toFixed(2)}</span>
            </div>
            <div className="technicals-list">
                {INDICATORS.map((ind, i) => {
                    const value = data[ind.key] as number;
                    if (value == null || typeof value !== 'number') return null;
                    const sig = ind.signal(value, data);
                    const sigColor = sig === 'bullish' ? 'var(--color-positive)' :
                        sig === 'bearish' ? 'var(--color-negative)' : 'var(--color-text-muted)';

                    return (
                        <div
                            key={ind.key}
                            className={`tech-indicator-row ${hoveredIdx === i ? 'hovered' : ''}`}
                            onMouseEnter={() => setHoveredIdx(i)}
                            onMouseLeave={() => setHoveredIdx(null)}
                        >
                            <div className="tech-indicator-main">
                                <span className="tech-indicator-dot" style={{ background: sigColor }} />
                                <span className="tech-indicator-label">{ind.label}</span>
                                <span className="tech-indicator-value" style={{ color: sigColor }}>
                                    {ind.format(value)}
                                </span>
                            </div>
                            {hoveredIdx === i && (
                                <div className="tech-indicator-tooltip">
                                    <div className="tech-tooltip-signal" style={{ color: sigColor }}>
                                        {sig.toUpperCase()}
                                    </div>
                                    <p className="tech-tooltip-text">{ind.tooltip}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
