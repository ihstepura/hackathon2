'use client';
/**
 * AgentScratchpad — Real-time agent thinking process via SSE.
 */
import { useState, useRef, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { apiSSE } from '@/lib/api';

interface AgentEvent {
    event: string;
    agent: string;
    content: string;
}

export function AgentScratchpad() {
    const ticker = useAtomValue(activeTickerAtom);
    const [events, setEvents] = useState<AgentEvent[]>([]);
    const [running, setRunning] = useState(false);
    const [conclusion, setConclusion] = useState<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const startAnalysis = () => {
        if (!ticker || running) return;
        setEvents([]);
        setConclusion(null);
        setRunning(true);

        const cleanup = apiSSE(`/agent/analyze/${ticker}`, (data) => {
            if (data.event === 'conclusion') {
                try {
                    setConclusion(JSON.parse(data.content));
                } catch {
                    setConclusion({ verdict: 'ERROR', report: data.content });
                }
                setRunning(false);
            } else {
                setEvents((prev) => [...prev, data]);
            }
        });

        // Auto-cleanup after 30s
        setTimeout(() => { cleanup(); setRunning(false); }, 30000);
    };

    // Auto-scroll
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [events]);

    const eventIcon = (e: string) => {
        switch (e) {
            case 'thinking': return '🔍';
            case 'finding': return '📊';
            case 'debate': return '⚖️';
            case 'tool_call': return '🔧';
            default: return '•';
        }
    };

    return (
        <div className="widget-pane">
            <div className="widget-header">
                <span>Agent Scratchpad</span>
                {ticker && (
                    <button
                        className="btn-primary"
                        onClick={startAnalysis}
                        disabled={running || !ticker}
                        style={{ fontSize: 10, padding: '4px 10px' }}
                    >
                        {running ? 'Analyzing...' : `Analyze ${ticker}`}
                    </button>
                )}
            </div>
            <div className="widget-body" ref={scrollRef} style={{ maxHeight: 400 }}>
                {events.length === 0 && !conclusion && (
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                        {ticker
                            ? `Ready to analyze ${ticker}. Click "Analyze" to start multi-agent workflow.`
                            : 'Enter a ticker to begin agent analysis.'}
                    </div>
                )}

                {events.map((ev, i) => (
                    <div key={i} className="agent-event">
                        <span style={{ fontSize: 14 }}>{eventIcon(ev.event)}</span>
                        <span className="agent-badge">{ev.agent}</span>
                        <span className="agent-content">{ev.content}</span>
                    </div>
                ))}

                {conclusion && (
                    <div style={{
                        marginTop: 12,
                        padding: 16,
                        background: 'var(--color-surface-alt)',
                        borderRadius: 8,
                        border: '1px solid var(--color-border-light)',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            marginBottom: 12,
                        }}>
                            <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 800,
                                fontSize: 24,
                                color: conclusion.verdict === 'BUY'
                                    ? 'var(--color-positive)'
                                    : conclusion.verdict === 'SELL'
                                        ? 'var(--color-negative)'
                                        : 'var(--color-warning)',
                            }}>
                                {conclusion.verdict}
                            </span>
                            <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 14,
                                color: 'var(--color-text-secondary)',
                            }}>
                                {conclusion.confidence}% confidence
                            </span>
                        </div>

                        {conclusion.scores && (
                            <div className="data-grid" style={{ marginBottom: 12 }}>
                                <div className="data-cell">
                                    <span className="label">Fundamental</span>
                                    <span className="value">{conclusion.scores.fundamental}/10</span>
                                </div>
                                <div className="data-cell">
                                    <span className="label">Technical</span>
                                    <span className="value">{conclusion.scores.technical}/10</span>
                                </div>
                                <div className="data-cell">
                                    <span className="label">Sentiment</span>
                                    <span className="value">{conclusion.scores.sentiment}/10</span>
                                </div>
                                <div className="data-cell">
                                    <span className="label">Total</span>
                                    <span className={`value ${conclusion.scores.total >= 6 ? 'up' : conclusion.scores.total <= 4 ? 'down' : ''}`}>
                                        {conclusion.scores.total}/10
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
