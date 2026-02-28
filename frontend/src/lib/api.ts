/**
 * FinanceIQ v6 — API Client
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function apiGet<T = any>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
    return res.json();
}

export async function apiPost<T = any>(path: string, body: any): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
    return res.json();
}

export function apiSSE(path: string, onEvent: (data: any) => void): () => void {
    const source = new EventSource(`${API_BASE}${path}`);
    source.onmessage = (e) => {
        try { onEvent(JSON.parse(e.data)); } catch { }
    };
    source.addEventListener('thinking', (e: any) => onEvent({ event: 'thinking', ...JSON.parse(e.data) }));
    source.addEventListener('finding', (e: any) => onEvent({ event: 'finding', ...JSON.parse(e.data) }));
    source.addEventListener('debate', (e: any) => onEvent({ event: 'debate', ...JSON.parse(e.data) }));
    source.addEventListener('conclusion', (e: any) => onEvent({ event: 'conclusion', ...JSON.parse(e.data) }));
    source.addEventListener('error', () => source.close());
    return () => source.close();
}
