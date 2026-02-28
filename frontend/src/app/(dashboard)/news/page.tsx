'use client';
/**
 * /news — News & Sentiment page.
 * Center: Top 5 news briefs.
 * Right column: Twitter + Reddit analytics.
 * Bottom: FinBERT sentiment analysis.
 */
import { AppShell } from '@/components/dashboard/AppShell';
import { NewsBriefs } from '@/components/dashboard/NewsBriefs';
import { SocialAnalyticsPanel } from '@/components/dashboard/SocialAnalytics';
import { FinBERTPanel } from '@/components/dashboard/FinBERTPanel';

export default function NewsPage() {
    return (
        <AppShell
            rightColumn={<SocialAnalyticsPanel />}
            bottomSlot={<FinBERTPanel />}
        >
            <NewsBriefs />
        </AppShell>
    );
}
