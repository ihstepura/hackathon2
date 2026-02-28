"""
FinanceIQ v6 — Backtesting Service
Ported from legacy backtester.py. Bi-directional long/short/hedge strategy.
"""
import pandas as pd
import numpy as np
import yfinance as yf


def run_backtest(
    ticker: str,
    period: str = "1y",
    monthly_budget: float = 300.0,
) -> dict:
    """
    Run bi-directional backtest on a single ticker.
    Strategy: Long when price > EMA5, Short when price < EMA5,
    Hedge (50/50) when BB Width > 8%.
    """
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period)
        if hist.empty or len(hist) < 30:
            return {"error": f"Insufficient data for {ticker}"}

        df = hist.copy()
        df["EMA_5"] = df["Close"].ewm(span=5, adjust=False).mean()
        std_20 = df["Close"].rolling(20).std()
        ma_20 = df["Close"].rolling(20).mean()
        df["BB_Width"] = (4 * std_20) / ma_20
        df.dropna(inplace=True)

        if df.empty:
            return {"error": "Not enough data after indicator computation"}

        # Simulation
        cash = 0.0
        long_holdings = 0.0
        short_holdings = 0.0
        short_entry = 0.0
        total_invested = 0.0
        equity_curve = []

        for i, (date, row) in enumerate(df.iterrows()):
            price = row["Close"]

            # Monthly injection every ~20 trading days
            if (i + 1) % 20 == 0:
                cash += monthly_budget
                total_invested += monthly_budget

            # Signal
            if row["BB_Width"] > 0.08:
                signal = "HEDGE"
            elif price > row["EMA_5"]:
                signal = "LONG"
            else:
                signal = "SHORT"

            # Execute
            if signal == "LONG":
                if short_holdings > 0:
                    profit = (short_entry - price) * short_holdings
                    cash += (short_holdings * short_entry) + profit
                    short_holdings = 0
                if cash > 10:
                    long_holdings += cash / price
                    cash = 0

            elif signal == "SHORT":
                if long_holdings > 0:
                    cash += long_holdings * price
                    long_holdings = 0
                if cash > 10:
                    short_holdings = cash / price
                    short_entry = price
                    cash = 0

            elif signal == "HEDGE":
                current_val = cash + (long_holdings * price)
                if short_holdings > 0:
                    current_val += (short_entry - price) * short_holdings + short_holdings * short_entry
                cash = current_val
                long_holdings = (cash * 0.5) / price
                short_holdings = (cash * 0.5) / price
                short_entry = price
                cash = 0

            # Track equity
            short_pnl = (short_entry - price) * short_holdings if short_holdings > 0 else 0
            equity = cash + (long_holdings * price) + (short_holdings * short_entry) + short_pnl
            equity_curve.append({
                "date": date.strftime("%Y-%m-%d"),
                "equity": round(equity, 2),
                "signal": signal,
            })

        # Final
        final_price = df.iloc[-1]["Close"]
        short_pnl = (short_entry - final_price) * short_holdings if short_holdings > 0 else 0
        final_val = cash + (long_holdings * final_price) + (short_holdings * short_entry) + short_pnl

        profit = final_val - total_invested
        roi = (profit / total_invested * 100) if total_invested > 0 else 0

        bench_start = df.iloc[0]["Close"]
        bench_end = df.iloc[-1]["Close"]
        bench_roi = ((bench_end / bench_start) - 1) * 100

        return {
            "ticker": ticker,
            "period": period,
            "total_invested": round(total_invested, 2),
            "final_value": round(final_val, 2),
            "profit": round(profit, 2),
            "strategy_roi": round(roi, 2),
            "benchmark_roi": round(bench_roi, 2),
            "alpha": round(roi - bench_roi, 2),
            "trades": len(df),
            "equity_curve": equity_curve[-60:],  # last 60 data points
        }

    except Exception as e:
        return {"error": str(e)}
