'use client';
/**
 * Terminal Header — Top bar with brand, ticker input, security groups, and shortcuts.
 */
import { useAtom, useSetAtom } from 'jotai';
import {
    activeTickerAtom,
    activeGroupAtom,
    commandPaletteOpenAtom,
    aiChatbotOpenAtom,
    type SecurityGroup,
} from '@/atoms';
import { useState, useCallback, useEffect, useRef } from 'react';
import { apiGet } from '@/lib/api';

const GROUPS: SecurityGroup[] = ['A', 'B', 'C'];

interface SearchResult {
    symbol: string;
    shortname: string;
    type: string;
    exchange: string;
}

export function TerminalHeader() {
    const [activeTicker, setActiveTicker] = useAtom(activeTickerAtom);
    const [activeGroup, setActiveGroup] = useAtom(activeGroupAtom);
    const setCommandOpen = useSetAtom(commandPaletteOpenAtom);
    const setAiOpen = useSetAtom(aiChatbotOpenAtom);

    // Global shortcut for AI Chatbot
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
                e.preventDefault();
                setAiOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [setAiOpen]);

    // Search Autocomplete State
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    // Debounced search
    useEffect(() => {
        if (!inputValue.trim() || inputValue.trim().length < 2) {
            setSuggestions([]);
            setShowDropdown(false);
            return;
        }

        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

        debounceTimerRef.current = setTimeout(() => {
            setIsSearching(true);
            apiGet<SearchResult[]>(`/api/market/search?q=${encodeURIComponent(inputValue.trim())}`)
                .then(res => {
                    if (Array.isArray(res) && res.length > 0) {
                        setSuggestions(res);
                        setShowDropdown(true);
                    } else {
                        setSuggestions([]);
                    }
                })
                .catch(err => console.error("Search failed:", err))
                .finally(() => setIsSearching(false));
        }, 300); // 300ms debounce

        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [inputValue]);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const ticker = inputValue.toUpperCase().trim();
        if (ticker) {
            setActiveTicker(ticker);
            setInputValue('');
            setShowDropdown(false);
        }
    }, [inputValue, setActiveTicker]);

    const handleSelectSuggestion = (symbol: string) => {
        setActiveTicker(symbol);
        setInputValue('');
        setShowDropdown(false);
    };

    return (
        <header className="terminal-header" style={{ position: 'relative', overflow: 'visible' }}>
            {/* Brand */}
            <div className="brand">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M3 3v18h18" /><path d="M7 16l4-8 4 4 4-8" />
                </svg>
                <span>FinanceIQ</span>
                <span className="brand-version">v6</span>
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: 'var(--color-border)' }} />

            {/* Security Groups */}
            <div style={{ display: 'flex', gap: 4 }}>
                {GROUPS.map((g) => (
                    <button
                        key={g}
                        className={`group-badge ${activeGroup === g ? 'active' : ''}`}
                        data-group={g}
                        onClick={() => setActiveGroup(g)}
                        title={`Security Group ${g}`}
                    >
                        {g}
                    </button>
                ))}
            </div>

            {/* Ticker Input Container */}
            <div ref={wrapperRef} style={{ position: 'relative' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 6 }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            className="ticker-input"
                            placeholder="Ticker search..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onFocus={() => {
                                if (suggestions.length > 0) setShowDropdown(true);
                            }}
                            style={{ width: 180 }}
                        />
                        {isSearching && (
                            <div style={{
                                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)',
                                opacity: 0.5, animation: 'pulse 1.5s infinite'
                            }} />
                        )}
                    </div>
                    <button type="submit" className="btn-primary" style={{ fontSize: 11, padding: '6px 14px' }}>
                        GO
                    </button>
                </form>

                {/* Autocomplete Dropdown */}
                {showDropdown && suggestions.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: 4,
                        width: 280,
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border-light)',
                        borderRadius: 6,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        zIndex: 100,
                        maxHeight: 250,
                        overflowY: 'auto'
                    }}>
                        {suggestions.map((s, i) => (
                            <div
                                key={`${s.symbol}-${i}`}
                                onClick={() => handleSelectSuggestion(s.symbol)}
                                style={{
                                    padding: '8px 12px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    borderBottom: i < suggestions.length - 1 ? '1px solid var(--color-border)' : 'none',
                                    transition: 'background 0.1s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
                                    <span style={{
                                        fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                                        color: 'var(--color-text-primary)'
                                    }}>
                                        {s.symbol}
                                    </span>
                                    <span style={{
                                        fontSize: 11, color: 'var(--color-text-secondary)',
                                        whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden'
                                    }}>
                                        {s.shortname}
                                    </span>
                                </div>
                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                                    <span style={{
                                        fontSize: 9, padding: '2px 4px', borderRadius: 3,
                                        background: 'var(--color-background)', color: 'var(--color-text-muted)',
                                        textTransform: 'uppercase', fontFamily: 'var(--font-mono)'
                                    }}>
                                        {s.type}
                                    </span>
                                    {s.exchange && (
                                        <span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
                                            {s.exchange}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Active Ticker Display */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 8 }}>
                {activeTicker && (
                    <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        fontSize: 14,
                        color: 'var(--color-positive)',
                        letterSpacing: '0.5px',
                    }}>
                        {activeTicker}
                    </div>
                )}
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Command Palette Trigger */}
            <button
                className="btn-ghost"
                onClick={() => setCommandOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
                <span>Command</span>
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    background: 'var(--color-background)',
                    padding: '2px 6px',
                    borderRadius: 3,
                }}>
                    Ctrl+K
                </span>
            </button>

            {/* AI Chatbot Trigger */}
            <button
                className="btn-ghost"
                onClick={() => setAiOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-accent)' }}
            >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 8px currentColor' }} />
                <span style={{ fontWeight: 700 }}>Ask AI</span>
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    background: 'var(--color-background)',
                    padding: '2px 6px',
                    borderRadius: 3,
                    color: 'var(--color-text-secondary)'
                }}>
                    Ctrl+J
                </span>
            </button>

            {/* Clock */}
            <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--color-text-muted)',
            }}>
                <Clock />
            </div>
        </header>
    );
}

function Clock() {
    const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));

    if (typeof window !== 'undefined') {
        setTimeout(() => setTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
    }

    return <>{time}</>;
}
