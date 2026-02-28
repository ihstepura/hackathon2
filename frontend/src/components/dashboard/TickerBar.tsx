'use client';
/**
 * TickerBar — Autocomplete ticker search with keyboard navigation.
 * Persists selection to Jotai atom, URL query param, and localStorage.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAtom } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { fetchSearch } from '@/lib/api';
import type { SearchResult } from '@/lib/mock-data';
import { useRouter, useSearchParams } from 'next/navigation';

export function TickerBar() {
    const [ticker, setTicker] = useAtom(activeTickerAtom);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    // Restore ticker from URL > localStorage > empty on mount
    useEffect(() => {
        const urlTicker = searchParams.get('ticker');
        if (urlTicker) {
            setTicker(urlTicker.toUpperCase());
            setQuery(urlTicker.toUpperCase());
        } else {
            const stored = localStorage.getItem('financeiq-ticker');
            if (stored) {
                setTicker(stored);
                setQuery(stored);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Debounced search
    const handleSearch = useCallback((q: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (q.length < 1) {
            setResults([]);
            setIsOpen(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            const res = await fetchSearch(q);
            setResults(res.slice(0, 8));
            setIsOpen(res.length > 0);
            setActiveIndex(-1);
        }, 200);
    }, []);

    const selectTicker = useCallback((symbol: string) => {
        setTicker(symbol);
        setQuery(symbol);
        setIsOpen(false);
        setResults([]);
        localStorage.setItem('financeiq-ticker', symbol);
        // Update URL without full navigation
        const url = new URL(window.location.href);
        url.searchParams.set('ticker', symbol);
        router.replace(url.pathname + url.search, { scroll: false });
    }, [setTicker, router]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) return;
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(prev => Math.min(prev + 1, results.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(prev => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (activeIndex >= 0 && results[activeIndex]) {
                    selectTicker(results[activeIndex].symbol);
                } else if (query.trim()) {
                    selectTicker(query.trim().toUpperCase());
                }
                break;
            case 'Escape':
                setIsOpen(false);
                inputRef.current?.blur();
                break;
        }
    };

    // Scroll active item into view
    useEffect(() => {
        if (activeIndex >= 0 && listRef.current) {
            const items = listRef.current.children;
            if (items[activeIndex]) {
                (items[activeIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
            }
        }
    }, [activeIndex]);

    return (
        <div className="tickerbar-wrapper" role="combobox" aria-expanded={isOpen} aria-haspopup="listbox">
            <div className="tickerbar-input-wrap">
                <svg className="tickerbar-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    ref={inputRef}
                    type="text"
                    className="tickerbar-input"
                    placeholder="Search ticker…"
                    aria-label="Search stock ticker"
                    value={query}
                    onChange={(e) => {
                        const v = e.target.value.toUpperCase();
                        setQuery(v);
                        handleSearch(v);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => { if (results.length > 0) setIsOpen(true); }}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                />
                {ticker && (
                    <span className="tickerbar-badge">{ticker}</span>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <ul ref={listRef} className="tickerbar-dropdown" role="listbox">
                    {results.map((item, i) => (
                        <li
                            key={item.symbol}
                            role="option"
                            aria-selected={i === activeIndex}
                            className={`tickerbar-option ${i === activeIndex ? 'active' : ''}`}
                            onMouseDown={() => selectTicker(item.symbol)}
                            onMouseEnter={() => setActiveIndex(i)}
                        >
                            <span className="tickerbar-option-symbol">{item.symbol}</span>
                            <span className="tickerbar-option-name">{item.name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
