'use client';
/**
 * Shared layout for /dashboard and /explain pages.
 * Wraps children in the AppShell with the appropriate right panel.
 */
import { Suspense } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-background)',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
            }}>
                Loading FinanceIQ…
            </div>
        }>
            {children}
        </Suspense>
    );
}
