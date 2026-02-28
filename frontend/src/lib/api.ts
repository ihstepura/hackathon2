/**
 * FinanceIQ v6 — API Client with Mock Fallback
 */
import {
    MOCK_SEARCH,
    getMockFundamentals,
    getMockTechnicals,
    getMockCandles,
    getMockNews,
    getMockChatResponse,
    getMockExplainResult,
    getMockPrediction,
    getMockCompanyBrief,
    getMockSocialAnalytics,
    getMockFinBERT,
    type SearchResult,
    type Fundamentals,
    type Technicals,
    type CandlePoint,
    type NewsItem,
    type ExplainResult,
    type PredictionResult,
    type CompanyBrief,
    type SocialAnalytics,
    type FinBERTResult,
} from './mock-data';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function apiGet<T = any>(path: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
        const res = await fetch(`${API_BASE}${path}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
        return res.json();
    } finally {
        clearTimeout(timeout);
    }
}

export async function apiPost<T = any>(path: string, body: any): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
        return res.json();
    } finally {
        clearTimeout(timeout);
    }
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

// ── Fetchers with Mock Fallback ──────────────────────

export async function fetchSearch(query: string): Promise<SearchResult[]> {
    try {
        const data = await apiGet<SearchResult[]>(`/api/search?q=${encodeURIComponent(query)}`);
        if (!Array.isArray(data)) throw new Error('Invalid response');
        return data;
    } catch {
        const q = query.toUpperCase();
        return MOCK_SEARCH.filter(
            (s) => s.symbol.includes(q) || s.name.toUpperCase().includes(q)
        );
    }
}

export async function fetchFundamentals(symbol: string): Promise<Fundamentals> {
    try {
        const data = await apiGet<Fundamentals>(`/api/fundamentals/${symbol}`);
        if (!data || !data.symbol) throw new Error('Invalid response');
        return data;
    } catch {
        return getMockFundamentals(symbol);
    }
}

export async function fetchTechnicals(symbol: string): Promise<Technicals> {
    try {
        const data = await apiGet<Technicals>(`/api/technicals/${symbol}`);
        if (!data || typeof data.rsi !== 'number' || typeof data.sma_20 !== 'number' || typeof data.price !== 'number') throw new Error('Invalid response');
        return data;
    } catch {
        return getMockTechnicals(symbol);
    }
}

export async function fetchCandles(symbol: string, range = '1M'): Promise<CandlePoint[]> {
    try {
        const data = await apiGet<CandlePoint[]>(`/api/candles/${symbol}?range=${range}`);
        if (!Array.isArray(data)) throw new Error('Invalid response');
        return data;
    } catch {
        return getMockCandles(symbol);
    }
}

export async function fetchNews(symbol: string, limit = 5): Promise<NewsItem[]> {
    try {
        const data = await apiGet<NewsItem[]>(`/api/news/${symbol}?limit=${limit}`);
        if (!Array.isArray(data)) throw new Error('Invalid response');
        return data;
    } catch {
        return getMockNews(symbol);
    }
}

export async function fetchChat(
    symbol: string,
    messages: { role: string; content: string }[]
): Promise<string> {
    try {
        const res = await apiPost<{ response: string }>('/api/chat', { symbol, messages });
        return res.response;
    } catch {
        const lastMsg = messages[messages.length - 1]?.content || 'summarize';
        return getMockChatResponse(symbol, lastMsg);
    }
}

export async function fetchExplain(
    symbol: string,
    horizon: number,
    constraints: string
): Promise<ExplainResult> {
    try {
        return await apiPost<ExplainResult>('/api/explain', { symbol, horizon, constraints });
    } catch {
        return getMockExplainResult(symbol);
    }
}

export async function fetchPrediction(symbol: string): Promise<PredictionResult> {
    try {
        return await apiGet<PredictionResult>(`/api/prediction/${symbol}`);
    } catch {
        return getMockPrediction(symbol);
    }
}

export async function fetchCompanyBrief(symbol: string): Promise<CompanyBrief> {
    try {
        return await apiGet<CompanyBrief>(`/api/company/${symbol}`);
    } catch {
        return getMockCompanyBrief(symbol);
    }
}

export async function fetchSocialAnalytics(symbol: string): Promise<SocialAnalytics> {
    try {
        return await apiGet<SocialAnalytics>(`/api/social/${symbol}`);
    } catch {
        return getMockSocialAnalytics(symbol);
    }
}

export async function fetchFinBERT(symbol: string): Promise<FinBERTResult> {
    try {
        return await apiGet<FinBERTResult>(`/api/finbert/${symbol}`);
    } catch {
        return getMockFinBERT(symbol);
    }
}

// Re-export types for convenience
export type { SearchResult, Fundamentals, Technicals, CandlePoint, NewsItem, ExplainResult, PredictionResult, CompanyBrief, SocialAnalytics, FinBERTResult };
