'use client';
/**
 * AIChatPanel — Right panel chat interface with prompt chips and search filter.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAtomValue, useAtom } from 'jotai';
import { activeTickerAtom, chatHistoryAtom } from '@/atoms';
import { fetchChat } from '@/lib/api';
import type { ChatMessage } from '@/lib/mock-data';

const PROMPT_CHIPS = [
    { label: 'Summarize', prompt: 'Give me a comprehensive summary' },
    { label: 'Bull Case', prompt: 'What is the bull case?' },
    { label: 'Bear Case', prompt: 'What is the bear case?' },
    { label: 'Technicals', prompt: 'Analyze the technical indicators' },
    { label: 'Compare Peers', prompt: 'Compare with sector peers' },
    { label: 'Risk Analysis', prompt: 'What are the key risks?' },
];

export function AIChatPanel() {
    const ticker = useAtomValue(activeTickerAtom);
    const [history, setHistory] = useAtom(chatHistoryAtom);
    const [input, setInput] = useState('');
    const [searchFilter, setSearchFilter] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history, isLoading]);

    const sendMessage = useCallback(async (message: string) => {
        if (!message.trim() || isLoading) return;
        const sym = ticker || 'MARKET';

        const userMsg: ChatMessage = {
            id: `${Date.now()}-user`,
            role: 'user',
            content: message.trim(),
            timestamp: Date.now(),
        };
        setHistory(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const allMsgs = [...history, userMsg].map(m => ({ role: m.role, content: m.content }));
            const response = await fetchChat(sym, allMsgs);
            const assistantMsg: ChatMessage = {
                id: `${Date.now()}-assistant`,
                role: 'assistant',
                content: response,
                timestamp: Date.now(),
            };
            setHistory(prev => [...prev, assistantMsg]);
        } catch {
            const errMsg: ChatMessage = {
                id: `${Date.now()}-error`,
                role: 'assistant',
                content: 'Failed to get a response. Please try again.',
                timestamp: Date.now(),
            };
            setHistory(prev => [...prev, errMsg]);
        } finally {
            setIsLoading(false);
        }
    }, [ticker, history, setHistory, isLoading]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    const filteredHistory = searchFilter
        ? history.filter(m => m.content.toLowerCase().includes(searchFilter.toLowerCase()))
        : history;

    return (
        <div className="chat-panel">
            {/* Header */}
            <div className="chat-panel-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="chat-status-dot" />
                    <div>
                        <div className="chat-panel-title">AI Assistant</div>
                        <div className="chat-panel-subtitle">
                            {ticker ? `Analyzing ${ticker}` : 'Select a ticker'}
                        </div>
                    </div>
                </div>
                <button
                    className="btn-ghost"
                    onClick={() => setHistory([])}
                    aria-label="Clear chat history"
                    style={{ fontSize: 10, padding: '3px 8px' }}
                >
                    Clear
                </button>
            </div>

            {/* Search filter */}
            <div className="chat-search-wrap">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    type="text"
                    placeholder="Search chat…"
                    className="chat-search-input"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    aria-label="Search chat history"
                />
            </div>

            {/* Prompt chips */}
            <div className="chat-chips">
                {PROMPT_CHIPS.map(chip => (
                    <button
                        key={chip.label}
                        className="chat-chip"
                        onClick={() => sendMessage(chip.prompt)}
                        disabled={isLoading}
                    >
                        {chip.label}
                    </button>
                ))}
            </div>

            {/* Messages */}
            <div className="chat-messages">
                {filteredHistory.length === 0 && !searchFilter && (
                    <div className="chat-empty">
                        <div className="chat-empty-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <p>Ask a question about {ticker || 'any stock'}</p>
                        <p className="chat-empty-hint">Use the prompt chips above or type below</p>
                    </div>
                )}

                {filteredHistory.length === 0 && searchFilter && (
                    <div className="chat-empty">
                        <p>No messages matching &quot;{searchFilter}&quot;</p>
                    </div>
                )}

                {filteredHistory.map((msg) => (
                    <div key={msg.id} className={`chat-message ${msg.role}`}>
                        <div className="chat-message-label">
                            {msg.role === 'user' ? 'You' : 'AI'}
                        </div>
                        <div className="chat-message-content">
                            {msg.content}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="chat-message assistant">
                        <div className="chat-message-label">AI</div>
                        <div className="chat-message-content chat-typing">
                            <span className="chat-dot" /><span className="chat-dot" /><span className="chat-dot" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="chat-input-form">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={ticker ? `Ask about ${ticker}…` : 'Select a ticker first…'}
                    className="chat-input"
                    disabled={isLoading}
                    aria-label="Chat message input"
                />
                <button
                    type="submit"
                    className="btn-primary chat-send"
                    disabled={isLoading || !input.trim()}
                    aria-label="Send message"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
            </form>
        </div>
    );
}
