'use client';
import { useState, useRef, useEffect } from 'react';
import { useAtomValue, useAtom } from 'jotai';
import { activeTickerAtom, aiChatbotOpenAtom } from '@/atoms';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export function AIChatbot() {
    const ticker = useAtomValue(activeTickerAtom);
    const [open, setOpen] = useAtom(aiChatbotOpenAtom);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial greeting when opened
    useEffect(() => {
        if (open && messages.length === 0) {
            setMessages([{
                id: 'init',
                role: 'assistant',
                content: `**AlphaFilter AI Council** (Local Ollama)\n\nI am analyzing ${ticker || 'the broader market'}. I provide objective data summarization of fundamentals, technicals, and news. \n\n*Note: I do not provide market predictions or investment advice.*`
            }]);
        }
    }, [open, ticker, messages.length]);

    // Close on escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        if (open) window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, setOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');

        const newMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: userMsg };
        setMessages(prev => [...prev, newMsg]);
        setIsLoading(true);

        try {
            const res = await fetch('http://localhost:8004/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticker: ticker,
                    messages: [...messages, newMsg].map(m => ({ role: m.role, content: m.content }))
                })
            });

            if (!res.ok) throw new Error("Failed to fetch");

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();

            setMessages(prev => [...prev, { id: 'stream-temp', role: 'assistant', content: '' }]);

            if (reader) {
                let chunks = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    chunks += chunk;
                    setMessages(prev => {
                        const copy = [...prev];
                        copy[copy.length - 1].content = chunks;
                        return copy;
                    });
                }
            }
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Connection Error: Failed to reach the local Ollama engine.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
            zIndex: 9999, display: 'flex', justifyContent: 'flex-end'
        }} onClick={() => setOpen(false)}>
            <div style={{
                width: 450, height: '100%', background: 'var(--color-surface)',
                borderLeft: '1px solid var(--color-border)',
                display: 'flex', flexDirection: 'column',
                boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
                animation: 'slideIn 0.2s ease-out'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    padding: '20px', borderBottom: '1px solid var(--color-border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--color-surface-hover)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-accent)', boxShadow: '0 0 10px currentColor' }} />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>Universal AI Council</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>LOCAL OLLAMA RUNTIME</div>
                        </div>
                    </div>
                    <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 20 }}>
                        &times;
                    </button>
                </div>

                {/* Message Log */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {messages.map((msg) => (
                        <div key={msg.id} style={{
                            display: 'flex', flexDirection: 'column',
                            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
                        }}>
                            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                                {msg.role === 'user' ? 'You' : 'AI Council'}
                            </span>
                            <div style={{
                                background: msg.role === 'user' ? 'var(--color-accent)' : 'var(--color-surface-alt)',
                                color: msg.role === 'user' ? '#fff' : 'var(--color-text-primary)',
                                padding: '12px 16px', borderRadius: 12,
                                borderTopRightRadius: msg.role === 'user' ? 4 : 12,
                                borderTopLeftRadius: msg.role === 'assistant' ? 4 : 12,
                                fontSize: 14, lineHeight: 1.6, maxWidth: '90%',
                                border: msg.role === 'assistant' ? '1px solid var(--color-border)' : 'none',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div style={{ alignSelf: 'flex-start', color: 'var(--color-text-muted)', fontSize: 13, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="spinner" style={{ width: 14, height: 14, border: '2px solid var(--color-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            Consulting Ollama...
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSubmit} style={{ padding: 20, borderTop: '1px solid var(--color-border)', background: 'var(--color-background)', display: 'flex', gap: 12 }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Highlight text to ask, or type here..."
                        style={{
                            flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                            borderRadius: 8, padding: '12px 16px', color: 'var(--color-text-primary)', fontSize: 14, outline: 'none'
                        }}
                        disabled={isLoading}
                    />
                    <button type="submit" className="btn-primary" disabled={isLoading || !input.trim()} style={{ padding: '0 20px', borderRadius: 8, fontWeight: 600 }}>
                        Ask
                    </button>
                </form>
                <style>{`
                    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
                `}</style>
            </div>
        </div>
    );
}
