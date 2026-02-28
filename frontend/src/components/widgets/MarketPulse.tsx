'use client';
/**
 * MarketPulse Widget — Global market overview (indices, commodities, currencies).
 */
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';

interface MarketItem {
    symbol: string;
    name: string;
    price: number;
    change: number;
    change_pct: number;
}

export function MarketPulse() {
    const [data, setData] = useState<Record<string, MarketItem[]> | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const res = await apiGet<Record<string, MarketItem[]>>('/api/market/pulse');
                if (mounted) { setData(res); setLoading(false); }
            } catch (e: any) {
                if (mounted) { setError(e.message); setLoading(false); }
            }
        };
        load();
        const interval = setInterval(load, 60000);
        return () => { mounted = false; clearInterval(interval); };
    }, []);

    if (loading) {
        return (
            <div className="widget-pane">
                <div className="widget-header">Market Pulse</div>
                <div className="widget-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        Loading market data...
                    </span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="widget-pane">
                <div className="widget-header">Market Pulse</div>
                <div className="widget-body">
                    <span style={{ color: 'var(--color-negative)', fontSize: 12 }}>
                        Backend offline — start with: uvicorn main:app --port 8000
                    </span>
                </div>
            </div>
        );
    }

    const sections = [
        { key: 'indices', label: 'Indices' },
        { key: 'commodities', label: 'Commodities' },
        { key: 'currencies', label: 'Currencies' },
    ];

    return (
        <div className="widget-pane">
            <div className="widget-header">
                <span>Market Pulse</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-positive)' }}>● LIVE</span>
            </div>
            <div className="widget-body">
                {sections.map(({ key, label }) => (
                    <div key={key} style={{ marginBottom: 16 }}>
                        <div className="section-label">{label}</div>
                        <div className="pulse-grid">
                            {(data?.[key] || []).map((item) => (
                                <div className="pulse-card" key={item.symbol}>
                                    <div className="pulse-name">{item.name}</div>
                                    <div className="pulse-price">{formatPrice(item.price)}</div>
                                    <div className={`pulse-change ${item.change >= 0 ? 'up' : 'down'}`}>
                                        {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)} ({item.change >= 0 ? '+' : ''}{item.change_pct.toFixed(2)}%)
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function formatPrice(p: number): string {
    if (p >= 10000) return p.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
