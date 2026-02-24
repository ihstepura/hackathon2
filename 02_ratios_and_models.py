"""
=== FinanceToolkit - Lesson 2: Financial Ratios & Models ===

This script shows you how to:
  1. Calculate profitability, liquidity, and valuation ratios
  2. Run financial models (DuPont Analysis, WACC, etc.)

Run this file:  python 02_ratios_and_models.py
"""

from financetoolkit import Toolkit
import os
from dotenv import load_dotenv
load_dotenv()

API_KEY = os.environ.get("FMP_API_KEY", "")

companies = Toolkit(
    tickers=["AAPL", "MSFT", "GOOGL"],
    api_key=API_KEY,
    start_date="2020-01-01",
)

# ── 1. Profitability Ratios ──────────────────────────────────────────
print("=" * 60)
print("PROFITABILITY RATIOS")
print("=" * 60)

profitability = companies.ratios.collect_profitability_ratios()
print(profitability)
print()

# ── 2. Liquidity Ratios ──────────────────────────────────────────────
print("=" * 60)
print("LIQUIDITY RATIOS")
print("=" * 60)

liquidity = companies.ratios.collect_liquidity_ratios()
print(liquidity)
print()

# ── 3. Valuation Ratios ──────────────────────────────────────────────
print("=" * 60)
print("VALUATION RATIOS (e.g. P/E, P/B, EV/EBITDA)")
print("=" * 60)

valuation = companies.ratios.collect_valuation_ratios()
print(valuation)
print()

# ── 4. Individual Ratio ──────────────────────────────────────────────
# Use get_ functions for a single ratio
print("=" * 60)
print("RETURN ON EQUITY (single ratio)")
print("=" * 60)

roe = companies.ratios.get_return_on_equity()
print(roe)
print()

# ── 5. DuPont Analysis ───────────────────────────────────────────────
print("=" * 60)
print("EXTENDED DUPONT ANALYSIS")
print("=" * 60)

dupont = companies.models.get_extended_dupont_analysis()
print(dupont)
print()

# ── 6. Weighted Average Cost of Capital (WACC) ───────────────────────
print("=" * 60)
print("WEIGHTED AVERAGE COST OF CAPITAL (WACC)")
print("=" * 60)

wacc = companies.models.get_weighted_average_cost_of_capital()
print(wacc)
print()

print("[DONE] You now know how to compute 50+ financial ratios")
print("   and run valuation models on any public company.")
