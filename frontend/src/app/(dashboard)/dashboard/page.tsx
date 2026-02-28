'use client';
/**
 * /dashboard — Overview page.
 * Center: AI prediction + company brief + key fundamentals.
 * Bottom: News strip.
 * Chatbot is universal via AppShell.
 */
import { AppShell } from '@/components/dashboard/AppShell';
import { PredictionCard } from '@/components/dashboard/PredictionCard';
import { CompanyBriefCard } from '@/components/dashboard/CompanyBriefCard';
import { FundamentalsCard } from '@/components/dashboard/FundamentalsCard';
import { NewsStrip } from '@/components/dashboard/NewsStrip';

export default function DashboardPage() {
    return (
        <AppShell bottomSlot={<NewsStrip />}>
            <div className="dashboard-content">
                {/* AI Prediction — hero section */}
                <section className="dashboard-section">
                    <PredictionCard />
                </section>

                {/* Company Brief + Key Fundamentals side by side */}
                <div className="dashboard-split">
                    <section className="dashboard-section" style={{ flex: 1 }}>
                        <CompanyBriefCard />
                    </section>
                    <section className="dashboard-section" style={{ flex: 1 }}>
                        <FundamentalsCard />
                    </section>
                </div>
            </div>
        </AppShell>
    );
}
