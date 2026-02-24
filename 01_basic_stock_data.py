"""
=== FinanceToolkit - Lesson 1: Getting Basic Stock Data ===

This script shows you how to:
  1. Initialize the Toolkit with one or more stock tickers
  2. Fetch historical price data (OHLC, volume, returns)
  3. Fetch financial statements (income, balance sheet, cash flow)

Run this file:  python 01_basic_stock_data.py
"""

from financetoolkit import Toolkit
import os
from dotenv import load_dotenv
load_dotenv()

# ── 1. Setup ──────────────────────────────────────────────────────────
API_KEY = os.environ.get("FMP_API_KEY", "")

# You can pass one ticker or a list of tickers.
# start_date limits how far back data goes.
companies = Toolkit(
    tickers=["AAPL", "MSFT"],
    api_key=API_KEY,
    start_date="2020-01-01",   # data from Jan 2020 onwards
)

# ── 2. Historical Price Data ─────────────────────────────────────────
print("=" * 60)
print("HISTORICAL PRICE DATA (first 10 rows)")
print("=" * 60)

historical = companies.get_historical_data()
print(historical.head(10))
print()

# Filter to just one stock using .xs()
print("--- Apple only ---")
apple_hist = historical.xs("AAPL", level=1, axis=1)
print(apple_hist.head(10))
print()

# ── 3. Income Statement ─────────────────────────────────────────────
print("=" * 60)
print("INCOME STATEMENT (Annual)")
print("=" * 60)

income = companies.get_income_statement()
print(income.head(10))
print()

# Filter to just Apple
print("--- Apple Income Statement ---")
apple_income = income.loc["AAPL"]
print(apple_income.head(10))
print()

# ── 4. Balance Sheet ─────────────────────────────────────────────────
print("=" * 60)
print("BALANCE SHEET STATEMENT (Annual)")
print("=" * 60)

balance = companies.get_balance_sheet_statement()
print(balance.head(10))
print()

# ── 5. Cash Flow Statement ───────────────────────────────────────────
print("=" * 60)
print("CASH FLOW STATEMENT (Annual)")
print("=" * 60)

cashflow = companies.get_cash_flow_statement()
print(cashflow.head(10))
print()

print("[DONE] You've just pulled real stock data for AAPL & MSFT.")
print("   Try changing the tickers list or start_date above and re-run!")
