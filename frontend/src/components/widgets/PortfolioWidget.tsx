'use client';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '@/lib/api';

interface PortfolioPosition {
    ticker: string;
    shares: number;
    avg_cost: number;
    current_price: number;
    market_value: number;
    unrealized_pnl: number;
    side: string;
}

interface PortfolioData {
    cash: number;
    total_value: number;
    positions: PortfolioPosition[];
}

export function PortfolioWidget() {
    const activeTicker = useAtomValue(activeTickerAtom);
    const [data, setData] = useState<PortfolioData | null>(null);
    const [loading, setLoading] = useState(true);

    // Trade form state
    const [tradeAction, setTradeAction] = useState<'BUY' | 'SELL' | 'SHORT' | 'COVER'>('BUY');
    const [tradeShares, setTradeShares] = useState(10);
    const [tradeError, setTradeError] = useState('');
    const [isTrading, setIsTrading] = useState(false);

    const fetchPortfolio = () => {
        setLoading(true);
        apiGet<PortfolioData>('/api/portfolio')
            .then(res => {
                if (res && typeof res.cash === 'number') setData(res);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchPortfolio();
        // Auto-refresh every 30s
        const int = setInterval(fetchPortfolio, 30000);
        return () => clearInterval(int);
    }, []);

    const executeTrade = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeTicker) {
            setTradeError("Select a ticker first");
            return;
        }
        setIsTrading(true);
        setTradeError('');
        try {
            const res = await apiPost<any>('/api/portfolio/trade', {
                ticker: activeTicker,
                action: tradeAction,
                shares: tradeShares
            });
            if (res.error) setTradeError(res.error);
            else fetchPortfolio(); // refresh
        } catch (err: any) {
            setTradeError(err.message || "Trade failed");
        } finally {
            setIsTrading(false);
        }
    };

    return (
        <div className="widget-pane">
            <div className="widget-header">
                <span>Portfolio & Trading</span>
                {data && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>
                        CASH: ${data.cash.toLocaleString()}
                    </span>
                )}
            </div>

            <div className="widget-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* ACCOUNT SUMMARY */}
                {data && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--color-surface)', borderRadius: 4, border: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Net Liquidity</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                ${data.total_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Return</span>
                            {(() => {
                                const ret = ((data.total_value - 100000) / 100000) * 100;
                                return (
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: ret >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}>
                                        {ret >= 0 ? '+' : ''}{ret.toFixed(2)}%
                                    </span>
                                );
                            })()}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Available Cash</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--color-text-secondary)' }}>
                                ${data.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                )}

                {/* TRADE FORM */}
                <form onSubmit={executeTrade} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{
                        fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent)',
                        background: 'var(--color-surface)', padding: '4px 8px', borderRadius: 4, border: '1px solid var(--color-border)'
                    }}>
                        {activeTicker || '---'}
                    </div>

                    <select
                        value={tradeAction}
                        onChange={(e) => setTradeAction(e.target.value as any)}
                        style={{ background: 'var(--color-surface)', color: 'white', border: '1px solid var(--color-border)', borderRadius: 4, padding: '4px', fontSize: 12 }}
                    >
                        <option value="BUY">BUY</option>
                        <option value="SELL">SELL</option>
                        <option value="SHORT">SHORT</option>
                        <option value="COVER">COVER</option>
                    </select>

                    <input
                        type="number"
                        min="1"
                        step="1"
                        value={tradeShares}
                        onChange={(e) => setTradeShares(parseInt(e.target.value) || 0)}
                        style={{ width: 60, background: 'var(--color-background)', color: 'white', border: '1px solid var(--color-border)', borderRadius: 4, padding: '4px', fontFamily: 'var(--font-mono)', fontSize: 12 }}
                    />

                    <button type="submit" className="btn-primary" style={{ padding: '4px 12px', fontSize: 11 }} disabled={isTrading}>
                        {isTrading ? '...' : 'EXECUTE'}
                    </button>
                    {tradeError && <span style={{ color: 'var(--color-negative)', fontSize: 10 }}>{tradeError}</span>}
                </form>

                {/* POSITIONS TABLE */}
                <div style={{ flex: 1, overflowY: 'auto' }} className="grid-table">
                    <div className="grid-row grid-header" style={{ gridTemplateColumns: '2fr 1.5fr 2fr 2fr 2fr' }}>
                        <div>SYM</div>
                        <div style={{ textAlign: 'right' }}>QTY</div>
                        <div style={{ textAlign: 'right' }}>AVG</div>
                        <div style={{ textAlign: 'right' }}>MKT</div>
                        <div style={{ textAlign: 'right' }}>U. PNL</div>
                    </div>

                    {loading && !data && (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>Loading portfolio...</div>
                    )}

                    {data?.positions.length === 0 && (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>No active positions.</div>
                    )}

                    {data?.positions.map((p, i) => (
                        <div
                            key={`${p.ticker}-${i}`}
                            className="grid-row"
                            style={{
                                gridTemplateColumns: '2fr 1.5fr 2fr 2fr 2fr',
                                animation: 'fadeIn 0.3s ease-out forwards',
                                animationDelay: `${i * 0.05}s`,
                                opacity: 0
                            }}
                        >
                            <div style={{ fontWeight: 700 }}>{p.ticker} <span style={{ fontSize: 9, color: 'var(--color-text-muted)', fontWeight: 400 }}>{p.side}</span></div>
                            <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{p.shares}</div>
                            <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>${p.avg_cost.toFixed(2)}</div>
                            <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>${p.current_price.toFixed(2)}</div>
                            <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: p.unrealized_pnl >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}>
                                {p.unrealized_pnl >= 0 ? '+' : ''}{p.unrealized_pnl.toFixed(2)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
