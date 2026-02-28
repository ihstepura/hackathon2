'use client';
/**
 * /explain — Explainable AI page.
 * Center: Prediction result + Model summary + Feature importance + Evidence + Console Studio.
 * Chatbot is universal via AppShell.
 */
import { AppShell } from '@/components/dashboard/AppShell';
import { PredictionCard } from '@/components/dashboard/PredictionCard';
import { ExplainableAIPanel } from '@/components/dashboard/ExplainableAIPanel';
import { ExplainabilityResults } from '@/components/dashboard/ExplainabilityResults';
import { ConsoleStudio } from '@/components/dashboard/ConsoleStudio';

export default function ExplainPage() {
    return (
        <AppShell>
            <div className="dashboard-content">
                {/* Prediction result at top */}
                <section className="dashboard-section">
                    <PredictionCard />
                </section>

                {/* Model summary + Feature importance */}
                <section className="dashboard-section">
                    <ExplainableAIPanel />
                </section>

                {/* Evidence / Attribution */}
                <section className="dashboard-section">
                    <ExplainabilityResults />
                </section>

                {/* Console Studio */}
                <section className="dashboard-section">
                    <ConsoleStudio />
                </section>
            </div>
        </AppShell>
    );
}
