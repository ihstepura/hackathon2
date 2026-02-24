"""
=== FinanceToolkit - Lesson 3: Technical Indicators, Risk & Performance ===

This script shows you how to:
  1. Get technical indicators (Bollinger Bands, MACD, RSI, Ichimoku)
  2. Measure risk (Value at Risk)
  3. Evaluate performance (Fama-French factor correlations)

Run this file:  python 03_technicals_risk_performance.py
"""

from financetoolkit import Toolkit

API_KEY = "wybWEsp1oB9abHfz3yPpQYwffxaN21B7"

companies = Toolkit(
    tickers=["AAPL", "MSFT"],
    api_key=API_KEY,
    start_date="2020-01-01",
)

# ── 1. Bollinger Bands ───────────────────────────────────────────────
print("=" * 60)
print("BOLLINGER BANDS")
print("=" * 60)

bollinger = companies.technicals.get_bollinger_bands()
print(bollinger.head(15))
print()

# ── 2. MACD ───────────────────────────────────────────────────────────
print("=" * 60)
print("MACD (Moving Average Convergence Divergence)")
print("=" * 60)

macd = companies.technicals.get_moving_average_convergence_divergence()
print(macd.head(15))
print()

# ── 3. RSI ────────────────────────────────────────────────────────────
print("=" * 60)
print("RSI (Relative Strength Index)")
print("=" * 60)

rsi = companies.technicals.get_relative_strength_index()
print(rsi.head(15))
print()

# ── 4. Value at Risk ─────────────────────────────────────────────────
print("=" * 60)
print("VALUE AT RISK (Weekly)")
print("=" * 60)

var = companies.risk.get_value_at_risk(period="weekly")
print(var.head(15))
print()

# ── 5. Factor Correlations ───────────────────────────────────────────
print("=" * 60)
print("FAMA-FRENCH FACTOR CORRELATIONS (Quarterly)")
print("=" * 60)

correlations = companies.performance.get_factor_asset_correlations(
    period="quarterly"
)
print(correlations)
print()

print("[DONE] You can now analyze stocks with technical indicators,")
print("   assess risk with VaR, and see performance factor exposures.")
