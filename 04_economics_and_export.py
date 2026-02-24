"""
=== FinanceToolkit - Lesson 4: Economics Data & Exporting Results ===

This script shows you how to:
  1. Access macroeconomic data (GDP, CPI, unemployment)
  2. Export any DataFrame to CSV or Excel for further use

Run this file:  python 04_economics_and_export.py
"""

from financetoolkit import Toolkit

API_KEY = "wybWEsp1oB9abHfz3yPpQYwffxaN21B7"

companies = Toolkit(
    tickers=["AAPL"],
    api_key=API_KEY,
    start_date="2020-01-01",
)

# ── 1. Unemployment Rates ─────────────────────────────────────────────
print("=" * 60)
print("UNEMPLOYMENT RATES")
print("=" * 60)

unemployment = companies.economics.get_unemployment_rate()
print(unemployment.head(10))
print()

# ── 2. Consumer Price Index (CPI) ────────────────────────────────────
print("=" * 60)
print("CONSUMER PRICE INDEX (CPI)")
print("=" * 60)

cpi = companies.economics.get_consumer_price_index()
print(cpi.head(10))
print()

# ── 3. GDP ────────────────────────────────────────────────────────────
print("=" * 60)
print("GROSS DOMESTIC PRODUCT (GDP)")
print("=" * 60)

gdp = companies.economics.get_gross_domestic_product()
print(gdp.head(10))
print()

# ── 4. Exporting Data ────────────────────────────────────────────────
# Any DataFrame can be saved to CSV or Excel for use in reports,
# other tools, or further analysis.

# Export historical data to CSV
historical = companies.get_historical_data()
historical.to_csv("aapl_historical_data.csv")
print("[SAVED] aapl_historical_data.csv")

# Export income statement to Excel
income = companies.get_income_statement()
income.to_excel("aapl_income_statement.xlsx")
print("[SAVED] aapl_income_statement.xlsx")

# Export ratios to CSV
ratios = companies.ratios.collect_profitability_ratios()
ratios.to_csv("aapl_profitability_ratios.csv")
print("[SAVED] aapl_profitability_ratios.csv")

print()
print("[DONE] Your data has been exported. Open the CSV/Excel files")
print("   in Excel, Google Sheets, or any data analysis tool.")
