'use client';
/**
 * DetailedFundamentals — Extended fundamental metrics for the Charts page bottom strip.
 */
import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { fetchFundamentals, type Fundamentals } from '@/lib/api';

function fmt(n: number | null | undefined, type: 'currency' | 'pct' | 'num' | 'bigcur' = 'num'): string {
    if (n == null || isNaN(n)) return 'N/A';
    if (type === 'currency') return `$${n.toFixed(2)}`;
    if (type === 'pct') return `${(n * 100).toFixed(1)}%`;
    if (type === 'bigcur') {
        if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
        if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
        if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
        return `$${n.toLocaleString()}`;
    }
    return n.toFixed(2);
}

const METRICS: { label: string; key: keyof Fundamentals; format: 'currency' | 'pct' | 'num' | 'bigcur' }[] = [
    { label: 'P/E Ratio', key: 'pe_ratio', format: 'num' },
    { label: 'P/B Ratio', key: 'pb_ratio', format: 'num' },
    { label: 'EPS', key: 'eps', format: 'currency' },
    { label: 'ROE', key: 'roe', format: 'pct' },
    { label: 'D/E Ratio', key: 'de_ratio', format: 'num' },
    { label: 'Quick Ratio', key: 'quick_ratio', format: 'num' },
    { label: 'Current Ratio', key: 'current_ratio', format: 'num' },
    { label: 'Market Cap', key: 'market_cap', format: 'bigcur' },
    { label: 'Revenue', key: 'revenue', format: 'bigcur' },
    { label: 'Net Income', key: 'net_income', format: 'bigcur' },
    { label: 'Free Cash Flow', key: 'free_cash_flow', format: 'bigcur' },
    { label: 'Operating Margin', key: 'operating_margin', format: 'pct' },
    { label: 'Net Margin', key: 'net_margin', format: 'pct' },
    { label: 'Div Yield', key: 'div_yield', format: 'pct' },
    { label: 'Beta', key: 'beta', format: 'num' },
    { label: '52W High', key: 'high_52w', format: 'currency' },
    { label: '52W Low', key: 'low_52w', format: 'currency' },
];

export function DetailedFundamentals() {
    const ticker = useAtomValue(activeTickerAtom);
    const [data, setData] = useState<Fundamentals | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!ticker) { setData(null); return; }
        setLoading(true);
        setError('');
        fetchFundamentals(ticker)
            .then(setData)
            .catch(() => setError('Failed to load fundamentals'))
            .finally(() => setLoading(false));
    }, [ticker]);

    if (!ticker) return (
        <div className="detailed-fundamentals">
            <div className="card-header"><span className="card-title">DETAILED FUNDAMENTALS</span></div>
            <p className="widget-empty">Select a ticker</p>
        </div>
    );

    if (loading) return (
        <div className="detailed-fundamentals">
            <div className="card-header"><span className="card-title">DETAILED FUNDAMENTALS — {ticker}</span></div>
            <div className="detailed-fund-grid">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="detailed-fund-cell"><div className="skeleton-line short" /><div className="skeleton-line" /></div>
                ))}
            </div>
        </div>
    );

    if (error) return (
        <div className="detailed-fundamentals">
            <div className="card-header"><span className="card-title">DETAILED FUNDAMENTALS</span></div>
            <div className="widget-error">{error}</div>
        </div>
    );

    if (!data) return null;

    return (
        <div className="detailed-fundamentals">
            <div className="card-header">
                <span className="card-title">DETAILED FUNDAMENTALS — {ticker}</span>
                <span className="company-sector-badge">{data.sector} · {data.industry}</span>
            </div>
            <div className="detailed-fund-grid">
                {METRICS.map((m) => (
                    <div key={m.key} className="detailed-fund-cell">
                        <span className="detailed-fund-label">{m.label}</span>
                        <span className="detailed-fund-value">{fmt(data[m.key] as number, m.format)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
