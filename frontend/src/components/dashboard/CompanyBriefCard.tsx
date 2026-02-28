'use client';
/**
 * CompanyBriefCard — Company description and quick facts.
 */
import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { fetchCompanyBrief, type CompanyBrief } from '@/lib/api';

export function CompanyBriefCard() {
    const ticker = useAtomValue(activeTickerAtom);
    const [data, setData] = useState<CompanyBrief | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!ticker) { setData(null); return; }
        setLoading(true);
        setError('');
        fetchCompanyBrief(ticker)
            .then(setData)
            .catch(() => setError('Failed to load company info'))
            .finally(() => setLoading(false));
    }, [ticker]);

    if (!ticker) return (
        <div className="card company-brief-card">
            <div className="card-header"><span className="card-title">COMPANY OVERVIEW</span></div>
            <div className="card-body"><p className="widget-empty">Select a ticker to view company details</p></div>
        </div>
    );

    if (loading) return (
        <div className="card company-brief-card">
            <div className="card-header"><span className="card-title">COMPANY OVERVIEW</span></div>
            <div className="card-body skeleton-card">
                <div className="skeleton-line" style={{ width: '80%' }} />
                <div className="skeleton-line" style={{ width: '100%' }} />
                <div className="skeleton-line" style={{ width: '60%' }} />
            </div>
        </div>
    );

    if (error) return (
        <div className="card company-brief-card">
            <div className="card-header"><span className="card-title">COMPANY OVERVIEW</span></div>
            <div className="card-body widget-error">{error}</div>
        </div>
    );

    if (!data) return null;

    return (
        <div className="card company-brief-card">
            <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="company-logo-placeholder">{data.symbol[0]}</div>
                    <div>
                        <span className="card-title">{data.name}</span>
                        <div className="company-sector-badge">{data.sector} · {data.industry}</div>
                    </div>
                </div>
            </div>
            <div className="card-body">
                <p className="company-description">{data.description}</p>
                <div className="company-facts-grid">
                    <div className="company-fact">
                        <span className="company-fact-label">CEO</span>
                        <span className="company-fact-value">{data.ceo}</span>
                    </div>
                    <div className="company-fact">
                        <span className="company-fact-label">Headquarters</span>
                        <span className="company-fact-value">{data.hq}</span>
                    </div>
                    <div className="company-fact">
                        <span className="company-fact-label">Founded</span>
                        <span className="company-fact-value">{data.founded}</span>
                    </div>
                    <div className="company-fact">
                        <span className="company-fact-label">Employees</span>
                        <span className="company-fact-value">{data.employees ? (data.employees / 1000).toFixed(0) + 'K' : 'N/A'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
