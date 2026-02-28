/**
 * FinanceIQ v6 — Mock Data Layer
 * Returns sample data when the backend API is unavailable.
 */

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

export interface Fundamentals {
  symbol: string;
  name: string;
  pe_ratio: number;
  pb_ratio: number;
  roe: number;
  de_ratio: number;
  quick_ratio: number;
  current_ratio: number;
  market_cap: number;
  dividend_yield: number;
  eps: number;
  revenue: number;
  net_income: number;
  free_cash_flow: number;
  operating_margin: number;
  net_margin: number;
  beta: number;
  high_52w: number;
  low_52w: number;
  sector: string;
  industry: string;
}

export interface Technicals {
  symbol: string;
  price: number;
  rsi: number;
  macd: number;
  macd_signal: number;
  bb_upper: number;
  bb_lower: number;
  sma_20: number;
  sma_50: number;
  sma_200: number;
  ema_12: number;
  ema_26: number;
  atr: number;
  stochastic_k: number;
  stochastic_d: number;
  vwap: number;
  adx: number;
  obv: number;
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
  model_name: string;
  accuracy: number;
  training_date: string;
  features: { name: string; importance: number }[];
  evidence: { text: string; confidence: number; source: string }[];
  prediction: PredictionResult;
}

export interface PredictionResult {
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  current_price: number;
  target_price: number;
  horizon_days: number;
  predicted_change_pct: number;
  trajectory: number[];
}

export interface CompanyBrief {
  symbol: string;
  name: string;
  description: string;
  ceo: string;
  headquarters: string;
  founded: number;
  employees: number;
  website: string;
  sector: string;
  industry: string;
}

export interface SocialAnalytics {
  twitter: {
    mentions_24h: number;
    sentiment_score: number;
    trending_hashtags: string[];
    top_tweets: { user: string; text: string; likes: number; retweets: number }[];
  };
  reddit: {
    wsb_mentions: number;
    sentiment_score: number;
    top_posts: { title: string; subreddit: string; upvotes: number; comments: number }[];
  };
}

export interface FinBERTResult {
  aggregate: { positive: number; negative: number; neutral: number; label: string };
  per_article: {
    article_id: string;
    title: string;
    positive: number;
    negative: number;
    neutral: number;
    label: string;
  }[];
}

// ── Mock Search Results ──────────────────────────────
export const MOCK_SEARCH: SearchResult[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ' },
  { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE' },
  { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE' },
  { symbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE' },
];

// ── Mock Fundamentals ────────────────────────────────
export function getMockFundamentals(symbol: string): Fundamentals {
  return {
    symbol,
    name: MOCK_SEARCH.find(s => s.symbol === symbol)?.name || `${symbol} Corp`,
    pe_ratio: 28.45,
    pb_ratio: 47.2,
    roe: 0.1562,
    de_ratio: 1.73,
    quick_ratio: 0.94,
    current_ratio: 1.07,
    market_cap: 2_870_000_000_000,
    dividend_yield: 0.0055,
    eps: 6.42,
    revenue: 383_290_000_000,
    net_income: 96_995_000_000,
    free_cash_flow: 111_440_000_000,
    operating_margin: 0.302,
    net_margin: 0.253,
    beta: 1.24,
    high_52w: 199.62,
    low_52w: 164.08,
    sector: 'Technology',
    industry: 'Consumer Electronics',
  };
}

// ── Mock Technicals ──────────────────────────────────
export function getMockTechnicals(symbol: string): Technicals {
  return {
    symbol,
    price: 178.72,
    rsi: 56.3,
    macd: 1.24,
    macd_signal: 0.89,
    bb_upper: 185.40,
    bb_lower: 170.20,
    sma_20: 176.85,
    sma_50: 174.30,
    sma_200: 168.95,
    ema_12: 177.92,
    ema_26: 176.10,
    atr: 3.82,
    stochastic_k: 62.5,
    stochastic_d: 58.1,
    vwap: 177.45,
    adx: 24.7,
    obv: 45_230_000,
  };
}

// ── Mock Candles ──────────────────────────────────────
export function getMockCandles(_symbol: string): CandlePoint[] {
  const base = 175;
  const points: CandlePoint[] = [];
  const now = Date.now();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * 86400000);
    const open = base + Math.random() * 10 - 5;
    const close = open + Math.random() * 6 - 3;
    const high = Math.max(open, close) + Math.random() * 2;
    const low = Math.min(open, close) - Math.random() * 2;
    points.push({
      time: date.toISOString().split('T')[0],
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume: Math.floor(30_000_000 + Math.random() * 20_000_000),
    });
  }
  return points;
}

// ── Mock News ────────────────────────────────────────
export function getMockNews(symbol: string): NewsItem[] {
  return [
    {
      id: '1',
      title: `${symbol} beats Q4 earnings estimates, revenue up 12% YoY`,
      summary: `${symbol} reported Q4 earnings that exceeded Wall Street expectations, with revenue climbing 12% year-over-year driven by strong performance in their services division and international markets. The company also raised forward guidance for the next fiscal year.`,
      source: 'Reuters',
      url: '#',
      published: '2h ago',
      sentiment: 'bullish',
      score: 0.87,
      finbert: { positive: 0.82, negative: 0.05, neutral: 0.13 },
    },
    {
      id: '2',
      title: `Analysts raise ${symbol} price target amid strong services growth`,
      summary: `Multiple Wall Street analysts have upgraded their price targets for ${symbol} following the company's impressive services revenue growth. Goldman Sachs raised its target to $210, citing the recurring revenue model as a key driver of long-term value.`,
      source: 'Bloomberg',
      url: '#',
      published: '4h ago',
      sentiment: 'bullish',
      score: 0.72,
      finbert: { positive: 0.74, negative: 0.08, neutral: 0.18 },
    },
    {
      id: '3',
      title: `${symbol} announces expanded AI integration across product line`,
      summary: `${symbol} unveiled plans to integrate advanced AI capabilities across its entire product ecosystem at a developer event. The company plans to leverage on-device machine learning for enhanced privacy while maintaining competitive feature parity with cloud-based alternatives.`,
      source: 'TechCrunch',
      url: '#',
      published: '6h ago',
      sentiment: 'neutral',
      score: 0.15,
      finbert: { positive: 0.38, negative: 0.12, neutral: 0.50 },
    },
    {
      id: '4',
      title: `Supply chain concerns weigh on ${symbol} component costs`,
      summary: `Rising semiconductor and rare earth material costs are putting pressure on ${symbol}'s gross margins. Industry analysts warn that ongoing geopolitical tensions could further disrupt supply chains, potentially affecting production timelines for upcoming product launches.`,
      source: 'WSJ',
      url: '#',
      published: '8h ago',
      sentiment: 'bearish',
      score: -0.34,
      finbert: { positive: 0.10, negative: 0.65, neutral: 0.25 },
    },
    {
      id: '5',
      title: `${symbol} insider sells $2.4M in shares — routine filing`,
      summary: `An executive at ${symbol} sold approximately $2.4M worth of shares according to a routine SEC filing. Market analysts note the sale was part of a pre-arranged 10b5-1 trading plan and is unlikely to signal any change in management outlook on the company's prospects.`,
      source: 'SEC Filings',
      url: '#',
      published: '12h ago',
      sentiment: 'neutral',
      score: -0.08,
      finbert: { positive: 0.15, negative: 0.25, neutral: 0.60 },
    },
  ];
}

// ── Mock Prediction ──────────────────────────────────
export function getMockPrediction(symbol: string): PredictionResult {
  const currentPrice = 178.72;
  const targetPrice = 194.35;
  const trajectory: number[] = [];
  for (let i = 0; i <= 10; i++) {
    const progress = i / 10;
    const noise = (Math.random() - 0.5) * 3;
    trajectory.push(+(currentPrice + (targetPrice - currentPrice) * progress + noise).toFixed(2));
  }
  trajectory[0] = currentPrice;
  trajectory[10] = targetPrice;
  return {
    direction: 'bullish',
    confidence: 0.847,
    current_price: currentPrice,
    target_price: targetPrice,
    horizon_days: 30,
    predicted_change_pct: +((targetPrice - currentPrice) / currentPrice * 100).toFixed(2),
    trajectory,
  };
}

// ── Mock Company Brief ───────────────────────────────
export function getMockCompanyBrief(symbol: string): CompanyBrief {
  const name = MOCK_SEARCH.find(s => s.symbol === symbol)?.name || `${symbol} Corp`;
  return {
    symbol,
    name,
    description: `${name} is a leading global technology company that designs, manufactures, and markets consumer electronics, computer software, and online services. Known for innovation and premium product design, the company operates one of the world's most valuable ecosystems of hardware, software, and services.`,
    ceo: 'Tim Cook',
    headquarters: 'Cupertino, California',
    founded: 1976,
    employees: 164_000,
    website: 'https://www.apple.com',
    sector: 'Technology',
    industry: 'Consumer Electronics',
  };
}

// ── Mock Social Analytics ────────────────────────────
export function getMockSocialAnalytics(symbol: string): SocialAnalytics {
  return {
    twitter: {
      mentions_24h: 12_450,
      sentiment_score: 0.62,
      trending_hashtags: [`#${symbol}`, `#${symbol}Stock`, '#EarningsBeat', '#BuyTheDip', '#TechStocks'],
      top_tweets: [
        { user: '@WallStTrader', text: `$${symbol} just crushed earnings! 12% YoY revenue growth 🚀 This is why I've been holding since $140`, likes: 2340, retweets: 456 },
        { user: '@TechAnalyst', text: `AI integration across ${symbol}'s product line is a game changer. Services revenue is the real story here.`, likes: 1890, retweets: 312 },
        { user: '@BearishBets', text: `$${symbol} P/E at 28.5 is stretched. Supply chain headwinds incoming. Be careful up here.`, likes: 890, retweets: 145 },
      ],
    },
    reddit: {
      wsb_mentions: 3_240,
      sentiment_score: 0.71,
      top_posts: [
        { title: `${symbol} DD: Why this earnings beat changes the thesis`, subreddit: 'r/wallstreetbets', upvotes: 4500, comments: 732 },
        { title: `${symbol} Services Revenue is Underappreciated`, subreddit: 'r/stocks', upvotes: 2100, comments: 445 },
        { title: `Bear case for ${symbol} at current valuations`, subreddit: 'r/investing', upvotes: 1200, comments: 389 },
      ],
    },
  };
}

// ── Mock FinBERT ──────────────────────────────────────
export function getMockFinBERT(symbol: string): FinBERTResult {
  const news = getMockNews(symbol);
  return {
    aggregate: { positive: 0.54, negative: 0.18, neutral: 0.28, label: 'Moderately Bullish' },
    per_article: news.map(n => ({
      article_id: n.id,
      title: n.title,
      ...n.finbert,
      label: n.finbert.positive > 0.5 ? 'Positive' : n.finbert.negative > 0.5 ? 'Negative' : 'Neutral',
    })),
  };
}

// ── Mock Chat Response ───────────────────────────────
export function getMockChatResponse(symbol: string, message: string): string {
  const responses: Record<string, string> = {
    summarize: `**${symbol} Summary**\n\nThe stock is currently trading at $178.72, up 1.2% today. Key metrics:\n• P/E: 28.45 (slightly above sector avg of 25.1)\n• RSI: 56.3 (neutral territory)\n• MACD: Bullish crossover detected\n\nOverall sentiment from recent news is moderately bullish with Q4 earnings beat and analyst upgrades.`,
    bull: `**Bull Case for ${symbol}**\n\n1. **Earnings momentum**: 12% YoY revenue growth with expanding margins\n2. **AI tailwind**: Product line AI integration could drive upgrade cycles\n3. **Services growth**: High-margin recurring revenue stream growing 18% YoY\n4. **Share buybacks**: $90B authorization provides price support\n5. **Technical strength**: Price above all major moving averages`,
    bear: `**Bear Case for ${symbol}**\n\n1. **Valuation stretch**: P/E of 28.45 above historical average of 22\n2. **Supply chain risk**: Component cost pressures could compress margins\n3. **China exposure**: ~18% of revenue at geopolitical risk\n4. **Market saturation**: Smartphone upgrade cycles lengthening\n5. **Insider selling**: Recent $2.4M sale by executive`,
    technicals: `**Technical Analysis — ${symbol}**\n\n• **Trend**: Bullish — price above SMA 20/50/200\n• **Momentum**: RSI at 56.3 — neutral, room to run\n• **MACD**: Bullish crossover (1.24 vs signal 0.89)\n• **Bollinger**: Mid-band, not overextended\n• **Support**: $170.20 (BB lower) / $168.95 (SMA 200)\n• **Resistance**: $185.40 (BB upper)\n• **ADX**: 24.7 — moderate trend strength`,
  };

  const lower = message.toLowerCase();
  if (lower.includes('summar')) return responses.summarize;
  if (lower.includes('bull')) return responses.bull;
  if (lower.includes('bear')) return responses.bear;
  if (lower.includes('technic')) return responses.technicals;

  return `Analyzing ${symbol} for: "${message}"\n\nBased on current data, ${symbol} shows moderate bullish momentum with RSI at 56.3 and a recent MACD bullish crossover. The stock trades above all major moving averages, suggesting the uptrend remains intact. Recent earnings beat estimates with 12% YoY revenue growth.\n\n*This is mock data — connect the backend for live analysis.*`;
}

// ── Mock Explain Result ──────────────────────────────
export function getMockExplainResult(symbol: string): ExplainResult {
  return {
    model_name: 'FinBERT-LSTM Ensemble v2.1',
    accuracy: 0.847,
    training_date: '2026-01-15',
    features: [
      { name: 'RSI (14-day)', importance: 0.23 },
      { name: 'MACD Histogram', importance: 0.19 },
      { name: 'Volume Delta', importance: 0.16 },
      { name: 'News Sentiment Score', importance: 0.14 },
      { name: 'Bollinger Band %B', importance: 0.11 },
      { name: 'SMA 50/200 Ratio', importance: 0.08 },
      { name: 'Earnings Surprise', importance: 0.05 },
      { name: 'Insider Activity', importance: 0.04 },
    ],
    evidence: [
      { text: `${symbol} RSI at 56.3 indicates neutral momentum — model weighs this as slightly bullish`, confidence: 0.82, source: 'Technical Signal' },
      { text: 'MACD bullish crossover detected 2 days ago — historically leads to 3-5% moves', confidence: 0.76, source: 'Pattern Recognition' },
      { text: 'Q4 earnings beat by 8.3% — positive surprise factor activated', confidence: 0.91, source: 'Fundamental Signal' },
      { text: 'Aggregate news sentiment: +0.45 (moderately bullish) over 7-day window', confidence: 0.68, source: 'NLP Sentiment' },
      { text: 'Volume 15% above 20-day average — confirms directional conviction', confidence: 0.73, source: 'Volume Analysis' },
    ],
    prediction: getMockPrediction(symbol),
  };
}
