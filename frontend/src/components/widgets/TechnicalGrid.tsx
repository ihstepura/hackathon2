'use client';
/**
 * TechnicalGrid — Display technical indicators in a high-density data grid.
 */
import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { apiGet } from '@/lib/api';

interface Technicals {
    price: number;
    ema_5: number;
    ema_10: number;
    ema_20: number;
    ema_50: number;
    sma_200: number | null;
    rsi: number;
    macd: number;
    macd_signal: number;
    bb_upper: number | null;
    bb_lower: number | null;
    atr: number | null;
    vwap: number | null;
}

const INDICATORS = [
    { key: 'ema_5', label: 'EMA 5', tip: '5-period EMA. Price above = short-term bullish.' },
    { key: 'ema_10', label: 'EMA 10', tip: '10-period EMA. Tracks short-term momentum.' },
    { key: 'ema_20', label: 'EMA 20', tip: '20-period EMA. Medium-term trend direction.' },
    { key: 'ema_50', label: 'EMA 50', tip: '50-period EMA. Key support/resistance level.' },
    { key: 'sma_200', label: 'SMA 200', tip: '200-day SMA. Price above = long-term bull market.' },
    { key: 'rsi', label: 'RSI (14)', tip: 'Relative Strength Index. <30 oversold, >70 overbought.' },
    { key: 'macd', label: 'MACD', tip: 'Moving Average Convergence/Divergence line.' },
    { key: 'macd_signal', label: 'MACD Signal', tip: '9-period EMA of MACD. Cross = trend change.' },
    { key: 'bb_upper', label: 'BB Upper', tip: 'Bollinger Band upper (SMA20 + 2σ).' },
    { key: 'bb_lower', label: 'BB Lower', tip: 'Bollinger Band lower (SMA20 - 2σ).' },
    { key: 'atr', label: 'ATR (14)', tip: 'Average True Range. Measures volatility.' },
    { key: 'vwap', label: 'VWAP', tip: 'Volume Weighted Avg Price. Institutional benchmark.' },
];

export function TechnicalGrid() {
    const ticker = useAtomValue(activeTickerAtom);
    const [data, setData] = useState<Technicals | null>(null);

    useEffect(() => {
        if (!ticker) { setData(null); return; }
        apiGet<Technicals>(`/api/technicals/${ticker}`).then(setData).catch(() => { });
    }, [ticker]);

    if (!ticker) {
        return (
            <div className="widget-pane">
                <div className="widget-header">Technical Indicators</div>
                <div className="widget-body" style={{ color: 'var(--color-text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                    Select a ticker to view technicals
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="widget-pane">
                <div className="widget-header">Technical Indicators — {ticker}</div>
                <div className="widget-body" style={{ color: 'var(--color-text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                    Loading...
                </div>
            </div>
        );
    }

    const price = data.price;

    const getSignal = (key: string, val: number): 'up' | 'down' | '' => {
        if (val === null || val === undefined) return '';
        if (key === 'rsi') return val < 30 ? 'up' : val > 70 ? 'down' : '';
        if (key === 'macd') return val > (data.macd_signal || 0) ? 'up' : 'down';
        if (key === 'macd_signal') return '';
        if (key === 'atr') return '';
        if (['ema_5', 'ema_10', 'ema_20', 'ema_50', 'sma_200', 'vwap'].includes(key)) {
            return price > val ? 'up' : 'down';
        }
        return '';
    };

    return (
        <div className="widget-pane">
            <div className="widget-header">
                <span>Technical Indicators — {ticker}</span>
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: 14,
                    color: 'var(--color-text-primary)',
                }}>
                    ${price.toFixed(2)}
                </span>
            </div>
            <div className="widget-body" style={{ padding: 0 }}>
                <div className="data-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                    {INDICATORS.map(({ key, label, tip }) => {
                        const val = (data as any)[key];
                        if (val === null || val === undefined) return null;
                        return (
                            <div key={key} className="data-cell" data-tip={tip}>
                                <span className="label">{label}</span>
                                <span className={`value ${getSignal(key, val)}`}>
                                    {key === 'rsi' ? val.toFixed(1) : val.toFixed(2)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
