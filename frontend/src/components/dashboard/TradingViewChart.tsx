'use client';
/**
 * TradingViewChart — Real candlestick chart using lightweight-charts library.
 * Dark themed to match the app palette.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { fetchCandles, type CandlePoint } from '@/lib/api';

const RANGES = ['1D', '1W', '1M', '3M', '1Y'] as const;

export function TradingViewChart() {
    const ticker = useAtomValue(activeTickerAtom);
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<any>(null);
    const [range, setRange] = useState<string>('1M');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const createChart = useCallback(async () => {
        if (!ticker || !chartRef.current) return;

        setLoading(true);
        setError('');

        try {
            const candles = await fetchCandles(ticker, range);

            // Dynamically import lightweight-charts (client-side only)
            const { createChart: createLWChart, CandlestickSeries, HistogramSeries } = await import('lightweight-charts');

            // Clean up previous chart
            if (chartInstance.current) {
                chartInstance.current.remove();
                chartInstance.current = null;
            }

            const chart = createLWChart(chartRef.current, {
                width: chartRef.current.clientWidth,
                height: 420,
                layout: {
                    background: { color: '#0d1117' },
                    textColor: '#5a6577',
                    fontSize: 11,
                    fontFamily: "'JetBrains Mono', monospace",
                },
                grid: {
                    vertLines: { color: '#1e2a3e40' },
                    horzLines: { color: '#1e2a3e40' },
                },
                crosshair: {
                    vertLine: { color: '#4f8cff50', width: 1, labelBackgroundColor: '#4f8cff' },
                    horzLine: { color: '#4f8cff50', width: 1, labelBackgroundColor: '#4f8cff' },
                },
                rightPriceScale: {
                    borderColor: '#1e2a3e',
                },
                timeScale: {
                    borderColor: '#1e2a3e',
                    timeVisible: true,
                },
            });

            chartInstance.current = chart;

            // Candlestick series
            const candleSeries = chart.addSeries(CandlestickSeries, {
                upColor: '#00ff88',
                downColor: '#ff3b3b',
                borderUpColor: '#00ff88',
                borderDownColor: '#ff3b3b',
                wickUpColor: '#00ff8888',
                wickDownColor: '#ff3b3b88',
            });

            candleSeries.setData(candles.map(c => ({
                time: c.time,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
            })));

            // Volume series
            const volumeSeries = chart.addSeries(HistogramSeries, {
                priceFormat: { type: 'volume' },
                priceScaleId: 'volume',
            });

            chart.priceScale('volume').applyOptions({
                scaleMargins: { top: 0.85, bottom: 0 },
            });

            volumeSeries.setData(candles.map(c => ({
                time: c.time,
                value: c.volume,
                color: c.close >= c.open ? '#00ff8830' : '#ff3b3b30',
            })));

            chart.timeScale().fitContent();

            // Resize observer
            const resizeObserver = new ResizeObserver(() => {
                if (chartRef.current && chartInstance.current) {
                    chartInstance.current.applyOptions({ width: chartRef.current.clientWidth });
                }
            });
            resizeObserver.observe(chartRef.current);

        } catch (e) {
            setError('Failed to load chart data');
        } finally {
            setLoading(false);
        }
    }, [ticker, range]);

    useEffect(() => {
        createChart();
        return () => {
            if (chartInstance.current) {
                chartInstance.current.remove();
                chartInstance.current = null;
            }
        };
    }, [createChart]);

    if (!ticker) return (
        <div className="card tv-chart-card">
            <div className="card-header"><span className="card-title">PRICE CHART</span></div>
            <div className="card-body" style={{ minHeight: 420, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p className="widget-empty">Search for a company to view price chart</p>
            </div>
        </div>
    );

    return (
        <div className="card tv-chart-card">
            <div className="card-header">
                <span className="card-title">CHART — {ticker}</span>
                <div className="chart-ranges">
                    {RANGES.map((r) => (
                        <button key={r} className={`chart-range ${range === r ? 'active' : ''}`}
                            onClick={() => setRange(r)}>
                            {r}
                        </button>
                    ))}
                </div>
            </div>
            <div className="card-body tv-chart-body">
                {loading && <div className="chart-skeleton"><span className="skeleton-label">Loading chart…</span></div>}
                {error && <div className="widget-error">{error}</div>}
                <div ref={chartRef} className="tv-chart-container" />
            </div>
        </div>
    );
}
