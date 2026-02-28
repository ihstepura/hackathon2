/**
 * FinanceIQ v6 — Type Definitions
 * Defines all data shapes used by the frontend.
 */

export interface SearchResult {
  symbol: string;
  name: string;
}

export interface Fundamentals {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  price: number;
  pe_ratio: number | null;
  pb_ratio: number | null;
  eps: number | null;
  roe: number | null;
  de_ratio: number | null;
  quick_ratio: number | null;
  current_ratio: number | null;
  market_cap: number | null;
  revenue: number | null;
  net_income: number | null;
  free_cash_flow: number | null;
  operating_margin: number | null;
  net_margin: number | null;
  div_yield: number | null;
  beta: number | null;
  high_52w: number | null;
  low_52w: number | null;
}

export interface Technicals {
  symbol: string;
  price: number;
  rsi: number | null;
  macd: number | null;
  macd_signal: number | null;
  bb_upper: number | null;
  bb_lower: number | null;
  sma_20: number | null;
  sma_50: number | null;
  sma_200: number | null;
  ema_12: number | null;
  ema_26: number | null;
  atr: number | null;
  stochastic_k: number | null;
  stochastic_d: number | null;
  vwap: number | null;
  adx: number | null;
  obv: number | null;
}

export interface CandlePoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  published: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  score: number;
  finbert: { positive: number; negative: number; neutral: number };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ExplainResult {
  model: string;
  accuracy: number;
  trainingDate: string;
  features: { name: string; importance: number; rank: number }[];
  evidence: { type: string; text: string }[];
}

export interface PredictionResult {
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  currentPrice: number;
  targetPrice: number;
  percentChange: number;
  horizon: string;
  trajectory: number[];
}

export interface CompanyBrief {
  symbol: string;
  name: string;
  description: string;
  sector: string;
  industry: string;
  ceo: string;
  hq: string;
  founded: string;
  employees: number | null;
  logo: string;
}

export interface SocialAnalytics {
  symbol: string;
  twitter: {
    mentions: number;
    sentiment: number;
    hashtags: string[];
    topTweets: { user: string; text: string; likes: number; retweets: number }[];
  };
  reddit: {
    wsbMentions: number;
    sentiment: number;
    topPosts: { subreddit: string; title: string; upvotes: number }[];
  };
}

export interface FinBERTResult {
  symbol: string;
  overallSentiment: string;
  articles: {
    title: string;
    finbert: { positive: number; negative: number; neutral: number };
  }[];
}
