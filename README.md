<p align="center">
  <h1 align="center">📊 FinanceIQ</h1>
  <p align="center">
    <strong>Real-time Financial Analytics & Portfolio Simulation Platform</strong>
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/python-3.10+-blue?style=flat-square&logo=python" alt="Python">
    <img src="https://img.shields.io/badge/flask-3.x-green?style=flat-square&logo=flask" alt="Flask">
    <img src="https://img.shields.io/badge/version-5.2-purple?style=flat-square" alt="Version">
    <img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="License">
  </p>
</p>

---

A full-stack financial analytics web application built with **Flask**, **yfinance**, and **Google Gemini AI**. Features interactive charting, professional-grade portfolio simulation, options pricing, backtesting, AI-driven advisory, and a live market dashboard — all in a sleek, responsive single-page dashboard.

## ✨ Features

### 📈 Market Analysis
- **Interactive Candlestick Charts** — powered by TradingView Lightweight Charts
- **Technical Indicators** — RSI, MACD, Bollinger Bands, SMA/EMA, ATR, Stochastic
- **Candlestick Pattern Recognition** — Doji, Hammer, Engulfing, Morning Star, and more
- **Key Financial Metrics** — P/E, ROE, D/E, Quick Ratio, Dividend Yield
- **Sector Peer Comparison** — heatmap of competitors across 7 sectors
- **Valuation Models** — DCF, Graham Number, PEG Ratio, DDM

### 💼 Portfolio Simulation
- **$100K Paper Trading** — buy/sell with real-time prices from Yahoo Finance
- **Advanced Order Types** — Market, Limit, and Stop orders
- **Short Selling** — open and cover short positions with margin tracking
- **Slippage & Commission Modeling** — realistic IBKR-style execution costs
- **Equity Curve** — track portfolio value over time with interactive charts
- **Performance Analytics** — Sharpe, Sortino, Calmar ratios, profit factor, max drawdown

### 🎯 Options Pricing
- **Black-Scholes Model** — call/put pricing with real-time IV
- **Greeks Dashboard** — Delta, Gamma, Theta, Vega, Rho
- **Monte Carlo Simulation** — 10,000-path price projections
- **Interactive Payoff Charts** — visualize P&L at expiration

### 🤖 AI-Powered Advisory
- **Gemini AI Integration** — personalized investment analysis
- **Macro Dashboard** — Fed rates, Treasury yields, VIX, DXY, oil, gold
- **Risk Assessment** — automated risk scoring with traffic-light indicators
- **Natural Language Insights** — ask questions about any stock

### 📰 News & Sentiment
- **Real-time News Feed** — latest headlines for any ticker
- **AI Sentiment Analysis** — bullish/bearish/neutral classification
- **Currency Converter** — 150+ currency pairs with live rates

### 🔬 Backtesting Engine
- **Strategy Backtester** — SMA crossover, RSI, MACD, Bollinger Band strategies
- **Bi-directional Trading** — long and short strategy support
- **Performance Metrics** — Sharpe ratio, win rate, max drawdown, trade log

### 🌍 Market Dashboard
- **Global Indices** — S&P 500, NASDAQ, Dow, FTSE, Nikkei, DAX
- **Commodities** — Gold, Silver, Crude Oil, Natural Gas
- **Currency Pairs** — EUR/USD, GBP/USD, USD/JPY, and more
- **Live Pulse** — auto-refreshing with animated counters

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

```bash
# Clone the repo
git clone https://github.com/vanshshah10002-prog/FinanceIQ.git
cd FinanceIQ

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Run the application
python app.py
```

Then open `http://localhost:5000` in your browser.

## 📁 Project Structure

```
FinanceIQ/
├── app.py                  # Flask server & API routes
├── portfolio_engine.py     # Portfolio simulation engine (SQLite-backed)
├── options_engine.py       # Black-Scholes, Greeks, Monte Carlo
├── backtester.py           # Strategy backtesting engine
├── advisor.py              # Gemini AI financial advisory
├── technical_analyzer.py   # Technical indicators & patterns
├── news_analyzer.py        # News fetching & sentiment analysis
├── requirements.txt        # Python dependencies
├── .env.example            # Environment variable template
├── templates/
│   └── index.html          # Single-page dashboard UI
└── static/
    ├── script.js           # Frontend logic & chart rendering
    └── style.css           # Glassmorphism UI design system
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Flask, Python 3.10+ |
| **Data** | yfinance, Yahoo Finance API |
| **AI** | Google Gemini 2.0 Flash |
| **Database** | SQLite (WAL mode) |
| **Charts** | TradingView Lightweight Charts |
| **Frontend** | Vanilla JS, CSS (Glassmorphism) |

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze` | POST | Full stock analysis |
| `/api/suggest` | GET | Ticker autocomplete |
| `/api/portfolio` | GET | Portfolio summary |
| `/api/portfolio/buy` | POST | Buy long |
| `/api/portfolio/sell` | POST | Sell long |
| `/api/portfolio/short` | POST | Short sell |
| `/api/portfolio/cover` | POST | Cover short |
| `/api/portfolio/limit-order` | POST | Place limit order |
| `/api/portfolio/stop-order` | POST | Place stop order |
| `/api/portfolio/analytics` | GET | Performance metrics |
| `/api/portfolio/equity-curve` | GET | Equity curve data |
| `/api/market-summary` | GET | Market dashboard data |
| `/api/options/price` | POST | Options pricing |
| `/api/backtest` | POST | Run backtests |
| `/api/advisor/analyze` | POST | AI advisory |
| `/api/news` | GET | News & sentiment |

## 📜 License

This project is for educational purposes. Built as part of a university finance course.

---

<p align="center">
  Built with ❤️ using Flask & yfinance
</p>
