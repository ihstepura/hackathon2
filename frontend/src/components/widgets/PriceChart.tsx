'use client';
import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData, ColorType, CandlestickSeries, LineSeries, HistogramSeries, AreaSeries } from 'lightweight-charts';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { apiPost, apiGet } from '@/lib/api';
import { calcSMA, calcEMA, calcBollingerBands, calcRSI, calcMACD, PricePoint } from '@/lib/indicators';

const AVAILABLE_INDICATORS = [
    { id: 'sma20', label: 'SMA 20' },
    { id: 'sma50', label: 'SMA 50' },
    { id: 'sma200', label: 'SMA 200' },
    { id: 'ema20', label: 'EMA 20' },
    { id: 'ema50', label: 'EMA 50' },
    { id: 'bb', label: 'Bollinger Bands' },
    { id: 'rsi', label: 'RSI (14)' },
    { id: 'macd', label: 'MACD (12, 26, 9)' }
];

export function PriceChart() {
    const activeTicker = useAtomValue(activeTickerAtom);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    // Store series refs internally so we can remove them
    const seriesRefs = useRef<Record<string, ISeriesApi<any>>>({});
    const baseDataRef = useRef<any[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeInd, setActiveInd] = useState<Record<string, boolean>>({ 'sma50': true });
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [divergence, setDivergence] = useState<any>(null);

    const toggleIndicator = (id: string) => {
        setActiveInd(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // 1. Initialize Base Chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#8b95a8',
                fontFamily: 'var(--font-mono)',
            },
            grid: {
                vertLines: { color: 'rgba(30, 42, 62, 0.4)' },
                horzLines: { color: 'rgba(30, 42, 62, 0.4)' },
            },
            crosshair: {
                mode: 1,
                vertLine: { width: 1, color: '#4f8cff', style: 3 },
                horzLine: { width: 1, color: '#4f8cff', style: 3 },
            },
            rightPriceScale: {
                borderColor: 'rgba(30, 42, 62, 0.8)',
                autoScale: true,
            },
            timeScale: {
                borderColor: 'rgba(30, 42, 62, 0.8)',
                timeVisible: true,
                secondsVisible: false,
            },
            autoSize: true,
        });

        chartRef.current = chart;

        return () => {
            chart.remove();
            chartRef.current = null;
            seriesRefs.current = {};
        };
    }, []);

    // 2. Fetch Data
    useEffect(() => {
        if (!activeTicker || !chartRef.current) return;
        let isMounted = true;
        setLoading(true);
        setError('');

        apiPost<any>('/api/analyze', { ticker: activeTicker, timeframe: '1Y' })
            .then(res => {
                if (!isMounted) return;
                if (res.error) {
                    setError(res.error);
                    return;
                }
                if (res.price_history && Array.isArray(res.price_history)) {
                    baseDataRef.current = res.price_history;
                    renderData();
                }
            })
            .catch(err => {
                if (isMounted) setError(err.message || 'Failed to fetch chart data');
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        // 2b. Fetch Divergence Status
        setDivergence(null);
        apiGet<any>(`/api/divergence/${activeTicker}`)
            .then(res => {
                if (isMounted && res && res.status) {
                    setDivergence(res);
                }
            })
            .catch(err => console.error("Divergence fetch error:", err));

        return () => { isMounted = false; };
    }, [activeTicker]);

    // 3. Render Data when history or indicators change
    const renderData = () => {
        const chart = chartRef.current;
        const data = baseDataRef.current;
        if (!chart || !data.length) return;

        // Clear existing series
        Object.values(seriesRefs.current).forEach(series => chart.removeSeries(series));
        seriesRefs.current = {};

        const candleData: CandlestickData[] = [];
        const volumeData: any[] = [];
        const closeArray: PricePoint[] = [];

        data.forEach((d: any) => {
            const time = d.time as string;
            candleData.push({ time, open: d.open, high: d.high, low: d.low, close: d.close });
            volumeData.push({ time, value: d.volume, color: d.close >= d.open ? 'rgba(0, 255, 136, 0.4)' : 'rgba(255, 59, 59, 0.4)' });
            closeArray.push({ time, close: d.close });
        });

        // Base Candles
        const candles = chart.addSeries(CandlestickSeries, {
            upColor: '#00ff88', downColor: '#ff3b3b', borderVisible: false,
            wickUpColor: '#00ff88', wickDownColor: '#ff3b3b', priceScaleId: 'right'
        });
        candles.setData(candleData);
        seriesRefs.current['candles'] = candles;

        // Base Volume
        const volumes = chart.addSeries(HistogramSeries, {
            color: 'rgba(79, 140, 255, 0.2)',
            priceFormat: { type: 'volume' },
            priceScaleId: '', // pure overlay
        });
        // We set scaleMargins for overlay using a private option hack in layout or via the series if possible
        volumes.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
        volumes.setData(volumeData);
        seriesRefs.current['volumes'] = volumes;

        // Overlays
        const drawLineString = (id: string, color: string, dataPoints: any[]) => {
            if (activeInd[id]) {
                const series = chart.addSeries(LineSeries, { color, lineWidth: 1, title: id.toUpperCase(), priceScaleId: 'right' });
                series.setData(dataPoints);
                seriesRefs.current[id] = series;
            }
        };

        drawLineString('sma20', '#ff00ff', calcSMA(closeArray, 20));
        drawLineString('sma50', '#4f8cff', calcSMA(closeArray, 50));
        drawLineString('sma200', '#ff8c00', calcSMA(closeArray, 200));
        drawLineString('ema20', '#00e1ff', calcEMA(closeArray, 20));
        drawLineString('ema50', '#ffb800', calcEMA(closeArray, 50));

        if (activeInd['bb']) {
            const bbData = calcBollingerBands(closeArray, 20, 2);
            const upper = chart.addSeries(LineSeries, { color: 'rgba(79, 140, 255, 0.5)', lineWidth: 1, title: 'BB Upper' });
            const lower = chart.addSeries(LineSeries, { color: 'rgba(79, 140, 255, 0.5)', lineWidth: 1, title: 'BB Lower' });
            upper.setData(bbData.map(d => ({ time: d.time, value: d.upper })));
            lower.setData(bbData.map(d => ({ time: d.time, value: d.lower })));
            seriesRefs.current['bb_upper'] = upper;
            seriesRefs.current['bb_lower'] = lower;
        }

        // Subpanes (RSI / MACD)
        if (activeInd['rsi']) {
            const rsiData = calcRSI(closeArray, 14);
            const rsiSeries = chart.addSeries(LineSeries, { color: '#ffb800', lineWidth: 1, title: 'RSI(14)', priceScaleId: 'rsi' });
            rsiSeries.setData(rsiData);
            seriesRefs.current['rsi'] = rsiSeries;
            rsiSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

            // RSI overbought/oversold boundaries
            const rsi70 = chart.addSeries(LineSeries, { color: 'rgba(255, 59, 59, 0.5)', lineWidth: 1, lineStyle: 2, priceScaleId: 'rsi' });
            const rsi30 = chart.addSeries(LineSeries, { color: 'rgba(0, 255, 136, 0.5)', lineWidth: 1, lineStyle: 2, priceScaleId: 'rsi' });
            rsi70.setData(closeArray.map(d => ({ time: d.time, value: 70 })));
            rsi30.setData(closeArray.map(d => ({ time: d.time, value: 30 })));
            seriesRefs.current['rsi70'] = rsi70;
            seriesRefs.current['rsi30'] = rsi30;
        }

        if (activeInd['macd']) {
            const macdPoints = calcMACD(closeArray, 12, 26, 9);
            const macdLine = chart.addSeries(LineSeries, { color: '#4f8cff', lineWidth: 1, title: 'MACD', priceScaleId: 'macd' });
            const signalLine = chart.addSeries(LineSeries, { color: '#ff8c00', lineWidth: 1, title: 'Signal', priceScaleId: 'macd' });
            const histSeries = chart.addSeries(HistogramSeries, { priceScaleId: 'macd' });

            macdLine.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

            macdLine.setData(macdPoints.map(d => ({ time: d.time, value: d.macd })));
            signalLine.setData(macdPoints.map(d => ({ time: d.time, value: d.signal })));

            const histData = macdPoints.map(d => ({ time: d.time, value: d.histogram, color: d.histogram >= 0 ? 'rgba(0, 255, 136, 0.5)' : 'rgba(255, 59, 59, 0.5)' }));
            histSeries.setData(histData);

            seriesRefs.current['macd_line'] = macdLine;
            seriesRefs.current['macd_signal'] = signalLine;
            seriesRefs.current['macd_hist'] = histSeries;
        }

        chart.timeScale().fitContent();
    };

    // Re-render when indicators change
    useEffect(() => {
        renderData();
    }, [activeInd]);

    return (
        <div className="widget-pane" style={{ position: 'relative', height: '100%' }}>
            <div className="widget-header" style={{ position: 'relative', zIndex: 50 }}>
                <span>{activeTicker || 'PRICE CHART'}</span>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {/* Active simple tags */}
                    <div style={{ display: 'flex', gap: 8, marginRight: 12 }}>
                        <span style={{ color: 'var(--color-positive)', fontSize: 10 }}>O/H/L/C</span>
                        <span style={{ color: 'var(--color-accent)', fontSize: 10 }}>VOL</span>
                    </div>

                    {/* Indicator Dropdown */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="btn-ghost"
                            style={{ padding: '4px 8px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
                            Indicators
                        </button>

                        {dropdownOpen && (
                            <>
                                <div
                                    style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                                    onClick={() => setDropdownOpen(false)}
                                />
                                <div style={{
                                    position: 'absolute', top: '100%', right: 0, marginTop: 4,
                                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                                    borderRadius: 6, padding: '8px 0', minWidth: 160, zIndex: 100,
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                                }}>
                                    {AVAILABLE_INDICATORS.map(ind => (
                                        <div
                                            key={ind.id}
                                            onClick={() => toggleIndicator(ind.id)}
                                            style={{
                                                padding: '6px 16px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                                                background: activeInd[ind.id] ? 'var(--color-surface-alt)' : 'transparent',
                                                color: activeInd[ind.id] ? 'var(--color-accent)' : 'var(--color-text-primary)',
                                            }}
                                            onMouseEnter={(e) => { if (!activeInd[ind.id]) e.currentTarget.style.background = 'var(--color-card-hover)' }}
                                            onMouseLeave={(e) => { if (!activeInd[ind.id]) e.currentTarget.style.background = 'transparent' }}
                                        >
                                            <div style={{ width: 12, height: 12, border: '1px solid var(--color-border)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: activeInd[ind.id] ? 'var(--color-accent)' : 'transparent' }}>
                                                {activeInd[ind.id] && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                                            </div>
                                            {ind.label}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="widget-body" style={{ padding: 0, position: 'relative' }}>
                {loading && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10, background: 'rgba(10, 14, 20, 0.8)',
                        color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', fontSize: 12
                    }}>
                        <div style={{ animation: 'pulse 1.5s infinite' }}>CALCULATING GEOMETRY...</div>
                    </div>
                )}
                {error && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, background: 'var(--color-background)', color: 'var(--color-negative)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {error}
                    </div>
                )}
                {!activeTicker && !loading && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, color: 'var(--color-text-muted)', fontSize: 12 }}>
                        Select a ticker to view advanced charts
                    </div>
                )}

                {/* Divergence Overlay */}
                {divergence && divergence.status !== 'Neutral' && (
                    <div style={{
                        position: 'absolute', top: 20, left: 20, zIndex: 40,
                        background: divergence.status === 'Teflon' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 59, 59, 0.1)',
                        border: `1px solid ${divergence.status === 'Teflon' ? 'var(--color-positive)' : 'var(--color-negative)'}`,
                        borderRadius: 8, padding: 16, maxWidth: 320,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: divergence.status === 'Teflon' ? '#00ff88' : '#ff3b3b', boxShadow: '0 0 10px currentColor' }} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, letterSpacing: 1, color: divergence.status === 'Teflon' ? '#00ff88' : '#ff3b3b' }}>
                                AI DIVERGENCE: {divergence.status.toUpperCase()}
                            </span>
                        </div>
                        <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--color-text-primary)' }}>
                            {divergence.message}
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
                            <div>
                                <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>3D Price Action</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: divergence.price_return_pct > 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}>
                                    {divergence.price_return_pct > 0 ? '+' : ''}{divergence.price_return_pct}%
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>3D FinBERT Drift</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: divergence.sentiment_score > 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}>
                                    {divergence.sentiment_score > 0 ? '+' : ''}{divergence.sentiment_score}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
            </div>
        </div>
    );
}
