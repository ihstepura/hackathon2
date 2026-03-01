'use client';
/**
 * AppShell — Main layout with header, center, optional right column, bottom slot.
 * The AI Chatbot sidebar is universally present on all pages.
 * Pages can provide a `rightColumn` for page-specific right content.
 * Desktop: center (flex-1) + rightColumn (if any) + chatbot sidebar.
 * Tablet (<1024px): chatbot collapses into a togglable drawer.
 */
import React from 'react';
import { useAtom } from 'jotai';
import { rightDrawerOpenAtom } from '@/atoms';
import { TickerBar } from './TickerBar';
import { RightDrawer } from './RightDrawer';
import { AIChatPanel } from './AIChatPanel';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AppShellProps {
    children: React.ReactNode;
    /** Page-specific right column content (e.g. Technicals, Social analytics) */
    rightColumn?: React.ReactNode;
    bottomSlot?: React.ReactNode;
}

export function AppShell({ children, rightColumn, bottomSlot }: AppShellProps) {
    const [drawerOpen, setDrawerOpen] = useAtom(rightDrawerOpenAtom);
    const pathname = usePathname();

    const navLinks = [
        { href: '/dashboard', label: 'Overview' },
        { href: '/explain', label: 'Explain AI' },
        { href: '/charts', label: 'Charts' },
        { href: '/news', label: 'News' },
    ];

    return (
        <div className="appshell-root">
            {/* ── HEADER ────────────────────────────────── */}
            <header className="appshell-header">
                <div className="appshell-header-left">
                    <Link href="/dashboard" className="brand" style={{ textDecoration: 'none' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                        <span>FinanceIQ</span>
                        <span className="brand-version">v6</span>
                    </Link>

                    <nav className="appshell-nav">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`appshell-nav-link ${pathname === link.href ? 'active' : ''}`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="appshell-header-center">
                    <TickerBar />
                </div>

                <div className="appshell-header-right">
                    <button
                        className="appshell-drawer-toggle"
                        onClick={() => setDrawerOpen(!drawerOpen)}
                        aria-label={drawerOpen ? 'Close AI assistant' : 'Open AI assistant'}
                        aria-expanded={drawerOpen}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {drawerOpen ? (
                                <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                            ) : (
                                <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>
                            )}
                        </svg>
                    </button>
                </div>
            </header>

            {/* ── BODY ──────────────────────────────────── */}
            <div className="appshell-body">
                {/* CENTER CONTENT */}
                <main className="appshell-center">
                    {children}
                </main>

                {/* PAGE-SPECIFIC RIGHT COLUMN (e.g. Technicals, Social) */}
                {rightColumn && (
                    <aside className="appshell-right-column">
                        {rightColumn}
                    </aside>
                )}

                {/* AI CHATBOT SIDEBAR — toggleable */}
                <aside className={`appshell-chat-sidebar ${drawerOpen ? 'open' : 'closed'}`}>
                    <AIChatPanel />
                </aside>

                {/* Overlay for mobile/tablet */}
                {drawerOpen && (
                    <div className="appshell-chat-overlay" onClick={() => setDrawerOpen(false)} />
                )}
            </div>

            {/* ── BOTTOM SLOT ───────────────────────────── */}
            {bottomSlot && (
                <div className="appshell-bottom">
                    {bottomSlot}
                </div>
            )}
        </div>
    );
}
