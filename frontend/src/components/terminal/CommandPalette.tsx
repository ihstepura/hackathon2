'use client';
/**
 * Command Palette — Global Ticker Search
 * Triggered via Cmd+K or /
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { commandPaletteOpenAtom, activeTickerAtom, isLoadingAtom } from '@/atoms';
import { apiGet } from '@/lib/api';

interface SearchResult {
    symbol: string;
    shortname: string;
    type: string;
    exchange: string;
}

export function CommandPalette() {
    const [open, setOpen] = useAtom(commandPaletteOpenAtom);
    const setTicker = useSetAtom(activeTickerAtom);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isSearching, setIsSearching] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Global keyboard shortcut
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(true);
            }
            if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
                e.preventDefault();
                setOpen(true);
            }
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [setOpen]);

    // Autofocus input on open
    useEffect(() => {
        if (open) {
            setQuery('');
            setResults([]);
            setActiveIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    // Search Logic
    useEffect(() => {
        if (!query.trim() || query.trim().length < 2) {
            setResults([]);
            setIsSearching(false);
            return;
        }

        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

        debounceTimerRef.current = setTimeout(() => {
            setIsSearching(true);
            apiGet<SearchResult[]>(`/api/market/search?q=${encodeURIComponent(query.trim())}`)
                .then(res => {
                    if (Array.isArray(res)) {
                        const equities = res.filter(r =>
                            r.type?.toUpperCase() === 'EQUITY' ||
                            r.type?.toUpperCase() === 'STOCK'
                        );
                        setResults(equities);
                    } else {
                        setResults([]);
                    }
                    setActiveIndex(0);
                })
                .catch(err => console.error("Search failed:", err))
                .finally(() => setIsSearching(false));
        }, 250);

        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [query]);

    const handleSelect = (symbol: string) => {
        setTicker(symbol);
        setOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && results[activeIndex]) {
            handleSelect(results[activeIndex].symbol);
        } else if (e.key === 'Enter' && query.trim() && results.length === 0) {
            // Fallback for user entering exact ticker
            handleSelect(query.toUpperCase().trim());
        }
    };

    if (!open) return null;

    return (
        <div className="cmd-overlay" onClick={() => setOpen(false)}>
            <div className="cmd-dialog" onClick={(e) => e.stopPropagation()}>
                <div style={{ position: 'relative' }}>
                    <input
                        ref={inputRef}
                        className="cmd-input"
                        placeholder="Search markets, tickers, or companies..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={{ width: '100%', paddingRight: 40 }}
                    />
                    {isSearching && (
                        <div style={{
                            position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                            width: 10, height: 10, borderRadius: '50%', background: 'var(--color-accent)',
                            opacity: 0.5, animation: 'pulse 1.5s infinite'
                        }} />
                    )}
                </div>

                <div className="cmd-results" style={{ maxHeight: 350, overflowY: 'auto' }}>
                    {results.length === 0 && query.length >= 2 && !isSearching && (
                        <div className="cmd-item" style={{ color: 'var(--color-text-muted)', justifyContent: 'center' }}>
                            No results found for "{query}"
                        </div>
                    )}
                    {results.length === 0 && query.length < 2 && (
                        <div className="cmd-item" style={{ color: 'var(--color-text-muted)' }}>
                            Start typing a company name or ticker symbol...
                        </div>
                    )}
                    {results.map((res, i) => (
                        <div
                            key={`${res.symbol}-${i}`}
                            className={`cmd-item ${i === activeIndex ? 'active' : ''}`}
                            onClick={() => handleSelect(res.symbol)}
                            onMouseEnter={() => setActiveIndex(i)}
                            style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '12px 16px', borderBottom: '1px solid var(--color-border)'
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: i === activeIndex ? 'var(--color-background)' : 'var(--color-text-primary)' }}>
                                    {res.symbol}
                                </span>
                                <span style={{ fontSize: 13, color: i === activeIndex ? 'rgba(0,0,0,0.7)' : 'var(--color-text-secondary)' }}>
                                    {res.shortname}
                                </span>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                <span style={{
                                    fontSize: 10, padding: '2px 6px', borderRadius: 4,
                                    background: i === activeIndex ? 'rgba(0,0,0,0.2)' : 'var(--color-surface)',
                                    color: i === activeIndex ? 'var(--color-background)' : 'var(--color-text-muted)',
                                    textTransform: 'uppercase', fontFamily: 'var(--font-mono)'
                                }}>
                                    {res.type}
                                </span>
                                {res.exchange && (
                                    <span style={{ fontSize: 10, color: i === activeIndex ? 'rgba(0,0,0,0.5)' : 'var(--color-text-muted)' }}>
                                        {res.exchange}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
