'use client';
import { useEffect, useState, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { apiGet } from '@/lib/api';

export function MonteCarloWidget() {
    const activeTicker = useAtomValue(activeTickerAtom);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!activeTicker) return;
        setLoading(true);
        setError('');
        setData(null);
        apiGet<any>(`/api/analyze/monte_carlo/${activeTicker}?days=30&sims=50`)
            .then(res => {
                if (res.error) setError(res.error);
                else setData(res);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [activeTicker]);

    // Simple SVG Path drawing
    const renderPaths = () => {
        if (!data || !data.paths || data.paths.length === 0) return null;

        const paths = data.paths;
        const days = paths[0].length;

        let minPrice = Infinity;
        let maxPrice = -Infinity;

        paths.forEach((path: number[]) => {
            path.forEach(p => {
                if (p < minPrice) minPrice = p;
                if (p > maxPrice) maxPrice = p;
            });
        });

        // Add some padding to min/max
        const range = maxPrice - minPrice;
        minPrice -= range * 0.1;
        maxPrice += range * 0.1;

        const width = 300;
        const height = 100;

        const getX = (i: number) => (i / (days - 1)) * width;
        const getY = (p: number) => height - ((p - minPrice) / (maxPrice - minPrice)) * height;

        return (
            <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100px', display: 'block', marginTop: 8 }}>
                {paths.map((path: number[], i: number) => {
                    const isUp = path[path.length - 1] > data.current_price;
                    const color = isUp ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 59, 59, 0.15)';

                    const d = path.map((p, j) => `${j === 0 ? 'M' : 'L'} ${getX(j)} ${getY(p)}`).join(' ');
                    return <path key={i} d={d} fill="none" stroke={color} strokeWidth="1" />;
                })}
                {/* Current Price Line */}
                <line x1="0" y1={getY(data.current_price)} x2={width} y2={getY(data.current_price)} stroke="var(--color-text-primary)" strokeWidth="1" strokeDasharray="4 4" />
            </svg>
        );
    };

    return (
        <div className="widget-pane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="widget-header">
                <span>MONTE CARLO (30D)</span>
            </div>

            <div className="widget-body" style={{ flex: 1, overflowY: 'auto' }}>
                {!activeTicker && <div style={{ color: 'var(--color-text-muted)', fontSize: 12, textAlign: 'center', marginTop: 20 }}>Select a ticker</div>}
                {loading && <div style={{ color: 'var(--color-accent)', fontSize: 12, textAlign: 'center', marginTop: 20 }}>RUNNING SIMULATIONS...</div>}
                {error && <div style={{ color: 'var(--color-negative)', fontSize: 12 }}>{error}</div>}

                {data && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div>
                                <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>CURRENT</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>${data.current_price.toFixed(2)}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>MEAN FINAL</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: data.mean_final_price > data.current_price ? 'var(--color-positive)' : 'var(--color-negative)' }}>
                                    ${data.mean_final_price.toFixed(2)}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>PROBABILITY UP</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: data.pct_chance_up > 50 ? 'var(--color-positive)' : 'var(--color-negative)' }}>
                                    {data.pct_chance_up.toFixed(1)}%
                                </div>
                            </div>
                        </div>
                        {renderPaths()}
                    </div>
                )}
            </div>
        </div>
    );
}
