"""
Backtesting Engine - Phase 7 (Bi-Directional Market Neutral)
Profits from both rising and falling markets.
Logic:
1. Long: Price > EMA 5
2. Short: Price < EMA 5
3. Hedge: If BB Width > 5% (High Volatility), hold both to stay neutral.
"""
import pandas as pd
import numpy as np
from financetoolkit import Toolkit
import sys

# Constants
API_KEY = "wybWEsp1oB9abHfz3yPpQYwffxaN21B7"
TICKERS = ["^NSEBANK", "NVDA", "TSLA"]
MONTHLY_BUDGET = 300.0

def fetch_portfolio_data():
    """Fetches 1 year of historical data with technicals."""
    print(f"--- Fetching 1 Year Data for {TICKERS} ---")
    try:
        companies = Toolkit(
            tickers=TICKERS,
            api_key=API_KEY,
            start_date="2024-01-01", 
        )
        historical = companies.get_historical_data(period="daily")
        
        portfolio = {}
        for ticker in TICKERS:
            if ticker in historical.columns.get_level_values(1):
                df = historical.xs(ticker, level=1, axis=1).copy()
            elif ticker in historical.columns.get_level_values(0):
                df = historical.xs(ticker, level=0, axis=1).copy()
            else: continue
                
            # Technicals for signals
            df['EMA_5'] = df['Close'].ewm(span=5, adjust=False).mean()
            # Bollinger Band Width
            std_20 = df['Close'].rolling(window=20).std()
            ma_20 = df['Close'].rolling(window=20).mean()
            df['BB_Width'] = (4 * std_20) / ma_20
            
            df.dropna(inplace=True)
            portfolio[ticker] = df
            
        return portfolio
    except Exception as e:
        print(f"Error fetching data: {e}")
        return {}

def simulate_market_neutral(data, ticker):
    """
    Simulates Bi-Directional strategy.
    Can be Long, Short, or Hedged.
    """
    cash = 0
    long_holdings = 0
    short_holdings = 0
    short_entry_price = 0
    
    total_invested = 0
    budget_per_month = MONTHLY_BUDGET / len(TICKERS)
    
    day_count = 0
    for date, row in data.iterrows():
        day_count += 1
        price = row['Close']
        
        # Monthly Injection
        if day_count % 20 == 0:
            cash += budget_per_month
            total_invested += budget_per_month
            
        # 1. EXIT CURRENT POSITIONS IF SIGNAL CHANGES
        # (Simplified: check daily if we should switch)
        
        signal = "NEUTRAL"
        if row['BB_Width'] > 0.08: # Hedge if high volatility (>8% width)
            signal = "HEDGE"
        elif price > row['EMA_5']:
            signal = "LONG"
        else:
            signal = "SHORT"
            
        # 2. EXECUTE
        if signal == "LONG":
            # Close Short if any
            if short_holdings > 0:
                profit = (short_entry_price - price) * short_holdings
                cash += (short_holdings * short_entry_price) + profit
                short_holdings = 0
            # Open Long
            if cash > 10:
                long_holdings += cash / price
                cash = 0
                
        elif signal == "SHORT":
            # Close Long if any
            if long_holdings > 0:
                cash += long_holdings * price
                long_holdings = 0
            # Open Short
            if cash > 10:
                short_holdings = cash / price
                short_entry_price = price
                cash = 0
                
        elif signal == "HEDGE":
            # Split 50/50
            current_val = cash + (long_holdings * price) + (short_holdings * price if short_holdings > 0 else 0)
            # Flatten everything first for simplicity in simulation
            if short_holdings > 0:
                profit = (short_entry_price - price) * short_holdings
                current_val += profit # Adjust for short profit/loss
            
            cash = current_val
            long_holdings = (cash * 0.5) / price
            short_holdings = (cash * 0.5) / price
            short_entry_price = price
            cash = 0

    # Final Liquidation
    final_price = data.iloc[-1]['Close']
    short_profit = (short_entry_price - final_price) * short_holdings if short_holdings > 0 else 0
    final_val = cash + (long_holdings * final_price) + (short_holdings * short_entry_price) + short_profit
    
    profit = final_val - total_invested
    roi = profit / total_invested if total_invested > 0 else 0
    
    # Bench
    start = data.iloc[0]['Close']
    end = data.iloc[-1]['Close']
    bench_roi = (end / start) - 1
    
    return {
        'ticker': ticker,
        'final_val': final_val,
        'invested': total_invested,
        'roi': roi * 100,
        'bench_roi': bench_roi * 100
    }

def main():
    portfolio = fetch_portfolio_data()
    if not portfolio: return

    print("\n--- Running Phase 7 Backtest (Bi-Directional Long/Short) ---")
    results = []
    
    for ticker, df in portfolio.items():
        res = simulate_market_neutral(df, ticker)
        results.append(res)
        
    print("\n" + "="*60)
    print(f"{'Ticker':<10} | {'Strategy ROI':<15} | {'Bench ROI':<10}")
    print("-" * 60)
    
    total_invested = 0
    total_final = 0
    
    for r in results:
        print(f"{r['ticker']:<10} | {r['roi']:>14.2f}% | {r['bench_roi']:>9.2f}%")
        total_invested += r['invested']
        total_final += r['final_val']
        
    final_roi = ((total_final - total_invested) / total_invested) * 100 if total_invested > 0 else 0
    
    print("-" * 60)
    print(f"{'TOTAL':<10} | {final_roi:>14.2f}% | {'---':>9}")
    print("="*60)
    
    print("\nNote: ROI includes profits from both price gains (Long) and price drops (Short).")

if __name__ == "__main__":
    main()
