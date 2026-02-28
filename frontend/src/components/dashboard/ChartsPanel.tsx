'use client';
/**
 * ChartsPanel — Tabbed chart area with candlestick/line/volume views.
 * Shows a styled placeholder chart with gridlines and range selectors.
 */
import { useState, useEffect, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { fetchCandles } from '@/lib/api';
import type { CandlePoint } from '@/lib/mock-data';

type ChartTab = 'candlestick' | 'line' | 'volume';
type Range = '1D' | '1W' | '1M' | '3M' | '1Y';

export function ChartsPanel() {
    const ticker = useAtomValue(activeTickerAtom);
    const [tab, setTab] = useState<ChartTab>('candlestick');
    const [range, setRange] = useState<Range>('1M');
    const [data, setData] = useState<CandlePoint[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        if (!ticker) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetchCandles(ticker, range);
            setData(res);
        } catch (err: any) {
            setError(err.message || 'Failed to load chart data');
        } finally {
            setLoading(false);
        }
    }, [ticker, range]);

    useEffect(() => { load(); }, [load]);

    const tabs: { id: ChartTab; label: string }[] = [
        { id: 'candlestick', label: 'Candlestick' },
        { id: 'line', label: 'Line' },
        { id: 'volume', label: 'Volume' },
    ];

    const ranges: Range[] = ['1D', '1W', '1M', '3M', '1Y'];

    // Compute min/max for chart scaling
    const prices = data.map(d => tab === 'volume' ? d.volume : d.close);
    const minVal = prices.length ? Math.min(...prices) : 0;
    const maxVal = prices.length ? Math.max(...prices) : 100;
    const valRange = maxVal - minVal || 1;

    return (
        <div className="widget-pane" style={{ minHeight: 340 }}>
            <div className="widget-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span>CHART{ticker ? ` — ${ticker}` : ''}</span>
                    <div className="chart-tabs">
                        {tabs.map(t => (
                            <button
                                key={t.id}
                                className={`chart-tab ${tab === t.id ? 'active' : ''}`}
                                onClick={() => setTab(t.id)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="chart-ranges">
                    {ranges.map(r => (
                        <button
                            key={r}
                            className={`chart-range ${range === r ? 'active' : ''}`}
                            onClick={() => setRange(r)}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            <div className="widget-body chart-body">
                {!ticker && (
                    <div className="widget-empty">Select a ticker to view charts</div>
                )}

                {ticker && loading && (
                    <div className="chart-skeleton">
                        <div className="skeleton-line" style={{ width: '100%', height: '100%', borderRadius: 4 }} />
                        <span className="skeleton-label">Loading chart data…</span>
                    </div>
                )}

                {ticker && error && (
                    <div className="widget-error">
                        <span>{error}</span>
                        <button className="btn-ghost" onClick={load}>Retry</button>
                    </div>
                )}

                {ticker && !loading && !error && data.length > 0 && (
                    <div className="chart-area">
                        {/* Y-axis labels */}
                        <div className="chart-yaxis">
                            {[0, 0.25, 0.5, 0.75, 1].map(pct => (
                                <span key={pct} className="chart-ylabel">
                                    {tab === 'volume'
                                        ? `${((minVal + valRange * (1 - pct)) / 1e6).toFixed(0)}M`
                                        : `$${(minVal + valRange * (1 - pct)).toFixed(0)}`}
                                </span>
                            ))}
                        </div>

                        {/* Chart bars/lines */}
                        <div className="chart-canvas">
                            {/* Grid lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map(pct => (
                                <div key={pct} className="chart-gridline" style={{ bottom: `${pct * 100}%` }} />
                            ))}

                            {/* Data visualization */}
                            <div className="chart-bars">
                                {data.map((point, i) => {
                                    if (tab === 'volume') {
                                        const height = ((point.volume - minVal) / valRange) * 100;
                                        return (
                                            <div key={i} className="chart-bar-wrap" title={`${point.time}\nVol: ${(point.volume / 1e6).toFixed(1)}M`}>
                                                <div
                                                    className={`chart-bar ${point.close >= point.open ? 'up' : 'down'}`}
                                                    style={{ height: `${height}%` }}
                                                />
                                            </div>
                                        );
                                    }
                                    if (tab === 'candlestick') {
                                        const bodyTop = ((Math.max(point.open, point.close) - minVal) / valRange) * 100;
                                        const bodyBot = ((Math.min(point.open, point.close) - minVal) / valRange) * 100;
                                        const wickTop = ((point.high - minVal) / valRange) * 100;
                                        const wickBot = ((point.low - minVal) / valRange) * 100;
                                        const isUp = point.close >= point.open;
                                        return (
                                            <div key={i} className="chart-candle-wrap" title={`${point.time}\nO:${point.open} H:${point.high} L:${point.low} C:${point.close}`}>
                                                <div className="chart-wick" style={{ bottom: `${wickBot}%`, height: `${wickTop - wickBot}%` }} />
                                                <div
                                                    className={`chart-candle-body ${isUp ? 'up' : 'down'}`}
                                                    style={{ bottom: `${bodyBot}%`, height: `${Math.max(bodyTop - bodyBot, 0.5)}%` }}
                                                />
                                            </div>
                                        );
                                    }
                                    // Line chart
                                    const height = ((point.close - minVal) / valRange) * 100;
                                    return (
                                        <div key={i} className="chart-line-wrap" title={`${point.time}\n$${point.close}`}>
                                            <div className="chart-line-dot" style={{ bottom: `${height}%` }} />
                                        </div>
                                    );
                                })}
                            </div>

                            {/* X-axis labels */}
                            <div className="chart-xaxis">
                                {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0).map((point, i) => (
                                    <span key={i} className="chart-xlabel">{point.time.slice(5)}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
