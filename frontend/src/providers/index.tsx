'use client';
/**
 * Jotai Provider wrapper for the app.
 */
import { Provider as JotaiProvider } from 'jotai';

export function Providers({ children }: { children: React.ReactNode }) {
    return <JotaiProvider>{children}</JotaiProvider>;
}
