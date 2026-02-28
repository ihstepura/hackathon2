'use client';
/**
 * FundamentalsCard — KPI tile grid showing key financial metrics.
 */
import { useEffect, useState, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { fetchFundamentals } from '@/lib/api';
import type { Fundamentals } from '@/lib/mock-data';

const _fmtBig = (n: number) => {
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    return `$${n.toLocaleString()}`;
};

const KPI_DEFS = [
    { key: 'pe_ratio', label: 'P/E Ratio', format: (v: any) => (typeof v === 'number' ? v.toFixed(2) : 'N/A'), tip: 'Price-to-Earnings ratio. Lower may indicate undervaluation.' },
    { key: 'eps', label: 'EPS', format: (v: any) => (typeof v === 'number' ? `$${v.toFixed(2)}` : 'N/A'), tip: 'Earnings per Share. Higher is better.' },
    { key: 'roe', label: 'ROE', format: (v: any) => (typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : 'N/A'), tip: 'Return on Equity. Measures profitability vs shareholder equity.' },
    { key: 'de_ratio', label: 'D/E Ratio', format: (v: any) => (typeof v === 'number' ? v.toFixed(2) : 'N/A'), tip: 'Debt-to-Equity. Lower means less leverage risk.' },
    { key: 'quick_ratio', label: 'Quick Ratio', format: (v: any) => (typeof v === 'number' ? v.toFixed(2) : 'N/A'), tip: 'Liquid assets / current liabilities. >1 is healthy.' },
    { key: 'market_cap', label: 'Market Cap', format: (v: any) => (typeof v === 'number' ? _fmtBig(v) : 'N/A'), tip: 'Total market capitalization.' },
    { key: 'div_yield', label: 'Div Yield', format: (v: any) => (typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : 'N/A'), tip: 'Annual dividend / share price.' },
    { key: 'revenue', label: 'Revenue', format: (v: any) => (typeof v === 'number' ? _fmtBig(v) : 'N/A'), tip: 'Total annual revenue (TTM).' },
];

// Using pre-formatted strings from api.ts instead

export function FundamentalsCard() {
    const ticker = useAtomValue(activeTickerAtom);
    const [data, setData] = useState<Fundamentals | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        if (!ticker) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetchFundamentals(ticker);
            setData(res);
        } catch (err: any) {
            setError(err.message || 'Failed to load fundamentals');
        } finally {
            setLoading(false);
        }
    }, [ticker]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="widget-pane">
            <div className="widget-header">
                <span>FUNDAMENTALS{ticker ? ` — ${ticker}` : ''}</span>
                {data && (
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                        {data.sector} · {data.industry}
                    </span>
                )}
            </div>
            <div className="widget-body" style={{ padding: 0 }}>
                {!ticker && (
                    <div className="widget-empty">Select a ticker to view fundamentals</div>
                )}

                {ticker && loading && (
                    <div className="skeleton-grid">
                        {Array.from({ length: 8 }).map((_, i) => (
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
                    <div className="data-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                        {KPI_DEFS.map(({ key, label, format, tip }) => {
                            const val = (data as any)[key];
                            if (val === null || val === undefined) return null;
                            return (
                                <div key={key} className="data-cell" data-tip={tip}>
                                    <span className="label">{label}</span>
                                    <span className="value" style={{ fontFamily: 'var(--font-mono)' }}>
                                        {format(val)}
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
