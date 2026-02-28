'use client';
/**
 * TechDetailsCard — Technical indicators grid with color-coded signals.
 */
import { useEffect, useState, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { fetchTechnicals } from '@/lib/api';
import type { Technicals } from '@/lib/mock-data';

const INDICATORS = [
    { key: 'rsi', label: 'RSI (14)', tip: 'Relative Strength Index. <30 oversold, >70 overbought.' },
    { key: 'macd', label: 'MACD', tip: 'Moving Average Convergence/Divergence line.' },
    { key: 'macd_signal', label: 'MACD Signal', tip: '9-period EMA of MACD. Cross = trend change.' },
    { key: 'bb_upper', label: 'BB Upper', tip: 'Bollinger Band upper (SMA20 + 2σ).' },
    { key: 'bb_lower', label: 'BB Lower', tip: 'Bollinger Band lower (SMA20 − 2σ).' },
    { key: 'sma_20', label: 'SMA 20', tip: '20-day Simple Moving Average.' },
    { key: 'sma_50', label: 'SMA 50', tip: '50-day SMA. Key trend indicator.' },
    { key: 'sma_200', label: 'SMA 200', tip: '200-day SMA. Price above = long-term bullish.' },
    { key: 'ema_12', label: 'EMA 12', tip: '12-period Exponential Moving Average.' },
    { key: 'ema_26', label: 'EMA 26', tip: '26-period EMA. Used in MACD calc.' },
    { key: 'atr', label: 'ATR (14)', tip: 'Average True Range. Measures volatility.' },
    { key: 'stochastic_k', label: 'Stoch %K', tip: 'Stochastic %K. <20 oversold, >80 overbought.' },
    { key: 'stochastic_d', label: 'Stoch %D', tip: 'Stochastic %D (3-day SMA of %K).' },
    { key: 'vwap', label: 'VWAP', tip: 'Volume Weighted Avg Price. Institutional benchmark.' },
    { key: 'adx', label: 'ADX', tip: 'Average Directional Index. >25 = trending.' },
];

function getSignal(key: string, val: number, data: Technicals): 'up' | 'down' | '' {
    if (val === null || val === undefined) return '';
    const price = data.price;
    if (key === 'rsi') return val < 30 ? 'up' : val > 70 ? 'down' : '';
    if (key === 'macd') return val > (data.macd_signal || 0) ? 'up' : 'down';
    if (key === 'stochastic_k') return val < 20 ? 'up' : val > 80 ? 'down' : '';
    if (key === 'adx') return val > 25 ? 'up' : '';
    if (['sma_20', 'sma_50', 'sma_200', 'ema_12', 'ema_26', 'vwap'].includes(key)) {
        return price > val ? 'up' : 'down';
    }
    return '';
}

export function TechDetailsCard() {
    const ticker = useAtomValue(activeTickerAtom);
    const [data, setData] = useState<Technicals | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        if (!ticker) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetchTechnicals(ticker);
            setData(res);
        } catch (err: any) {
            setError(err.message || 'Failed to load technicals');
        } finally {
            setLoading(false);
        }
    }, [ticker]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="widget-pane">
            <div className="widget-header">
                <span>TECHNICAL DETAILS{ticker ? ` — ${ticker}` : ''}</span>
                {data && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>
                        ${data.price.toFixed(2)}
                    </span>
                )}
            </div>
            <div className="widget-body" style={{ padding: 0 }}>
                {!ticker && (
                    <div className="widget-empty">Select a ticker to view technicals</div>
                )}

                {ticker && loading && (
                    <div className="skeleton-grid">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="skeleton-cell">
                                <div className="skeleton-line short" />
                                <div className="skeleton-line" />
                            </div>
                        ))}
                    </div>
                )}

                {ticker && error && (
                    <div className="widget-error">
                        <span>{error}</span>
                        <button className="btn-ghost" onClick={load}>Retry</button>
                    </div>
                )}

                {ticker && !loading && !error && data && (
                    <div className="data-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                        {INDICATORS.map(({ key, label, tip }) => {
                            const val = (data as any)[key];
                            if (val === null || val === undefined) return null;
                            return (
                                <div key={key} className="data-cell" data-tip={tip}>
                                    <span className="label">{label}</span>
                                    <span className={`value ${getSignal(key, val, data)}`}>
                                        {typeof val === 'number' ? val.toFixed(2) : val}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
