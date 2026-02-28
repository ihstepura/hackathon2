'use client';
import * as React from 'react';
import { useAtom } from 'jotai';
import { activeWorkspaceAtom, type WorkspaceView } from '@/atoms/workspace';

interface SidebarItem {
    id: WorkspaceView;
    label: string;
    icon: React.ReactNode;
}

const NAV_ITEMS: SidebarItem[] = [
    {
        id: 'dashboard',
        label: 'Alpha Dashboard',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
            </svg>
        )
    },
    {
        id: 'contagion',
        label: 'Supply Chain Contagion',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        )
    },
    {
        id: 'options',
        label: 'Options Chain',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
        )
    }
];

export function Sidebar() {
    const [view, setView] = useAtom(activeWorkspaceAtom);

    return (
        <aside className="terminal-sidebar" style={{
            width: 220,
            background: 'var(--color-surface)',
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '16px 0',
        }}>
            <div style={{ padding: '0 16px', marginBottom: 24 }}>
                <div style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontFamily: 'var(--font-mono)'
                }}>
                    Workspaces
                </div>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 8px' }}>
                {NAV_ITEMS.map((item) => {
                    const isActive = view === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setView(item.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '10px 12px',
                                background: isActive ? 'var(--color-surface-alt)' : 'transparent',
                                color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                border: 'none',
                                borderRadius: 6,
                                cursor: 'pointer',
                                transition: 'all 0.1s',
                                textAlign: 'left',
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'var(--color-surface-hover)';
                                    e.currentTarget.style.color = 'var(--color-text-primary)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                                }
                            }}
                        >
                            <span style={{ display: 'flex', opacity: isActive ? 1 : 0.7 }}>
                                {item.icon}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500 }}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </nav>

            <div style={{ flex: 1 }} />

            <div style={{ padding: '16px', display: 'flex', gap: 8, alignItems: 'center', color: 'var(--color-text-muted)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-positive)', boxShadow: '0 0 8px var(--color-positive)' }} />
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>FASTAPI CONNECTED</span>
            </div>
        </aside>
    );
}
