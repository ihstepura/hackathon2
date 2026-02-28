'use client';
/**
 * /charts — Charts & Technicals page.
 * Center: TradingView Lightweight Charts.
 * Right column: All technicals with hover tooltips.
 * Bottom: Detailed fundamentals.
 */
import { AppShell } from '@/components/dashboard/AppShell';
import { TradingViewChart } from '@/components/dashboard/TradingViewChart';
import { TechnicalsPanel } from '@/components/dashboard/TechnicalsPanel';
import { DetailedFundamentals } from '@/components/dashboard/DetailedFundamentals';

export default function ChartsPage() {
    return (
        <AppShell
            rightColumn={<TechnicalsPanel />}
            bottomSlot={<DetailedFundamentals />}
        >
            <TradingViewChart />
        </AppShell>
    );
}
