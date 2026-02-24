"""
Module for Technical Analysis using FinanceToolkit.
Calculates RSI, EMA, Volatility, MACD, Bollinger Bands, and Fibonacci Retracement Levels.
"""
from financetoolkit import Toolkit
import pandas as pd
import numpy as np

def get_technicals(ticker, api_key, period="daily"):
    """
    Fetches comprehensive technical indicators for a given ticker.
    
    Args:
        ticker (str): Stock ticker symbol.
        api_key (str): FMP API Key.
        period (str): 'daily', 'weekly', etc.
        
    Returns:
        dict: Latest technical values and signals for 'Pro' analysis.
    """
    try:
        companies = Toolkit(
            tickers=[ticker],
            api_key=api_key,
        )
        
        # Helper to safely get the latest value for the specific ticker
        def get_latest_series(df, col_name=None):
            if df.empty: return 0
            # multi-index handling: typically (Symbol, Metric) or (Metric, Symbol)
            if isinstance(df.columns, pd.MultiIndex):
                # Try selecting ticker from level 1
                if ticker in df.columns.get_level_values(1):
                    df = df.xs(ticker, level=1, axis=1)
                # Try selecting ticker from level 0
                elif ticker in df.columns.get_level_values(0):
                    df = df.xs(ticker, level=0, axis=1)
            
            # If still DataFrame, try to pick the specific column or just the first
            if isinstance(df, pd.DataFrame):
                if col_name and col_name in df.columns:
                    return df[col_name].iloc[-1]
                return df.iloc[-1, 0] # Default to first column
            else:
                return df.iloc[-1]

        def get_value(val):
            return val.values[0] if hasattr(val, 'values') else val

        # 1. RSI (14 periods) - Good for Overbought/Oversold
        rsi_df = companies.technicals.get_relative_strength_index(window=14)
        current_rsi = get_value(get_latest_series(rsi_df))
        
        # 2. EMA (50 periods) - Trend Filter
        ema_df = companies.technicals.get_exponential_moving_average(window=50)
        current_ema = get_value(get_latest_series(ema_df))

        # 2b. EMA (10 periods) - Short Term Trend (Phase 3)
        ema10_df = companies.technicals.get_exponential_moving_average(window=10)
        current_ema10 = get_value(get_latest_series(ema10_df))

        # 2c. EMA (5 periods) - Ultra-Short Term (Phase 5 Aggressive)
        ema5_df = companies.technicals.get_exponential_moving_average(window=5)
        current_ema5 = get_value(get_latest_series(ema5_df))
        
        # 3. MACD (12, 26, 9) - Momentum
        macd_df = companies.technicals.get_moving_average_convergence_divergence(short_window=12, long_window=26, signal_window=9)
        # MACD usually returns MACD line and Signal line. We need both.
        # Structure likely: [MACD, Signal, Histogram] columns per ticker
        # Let's get the full series for the ticker first
        if isinstance(macd_df.columns, pd.MultiIndex):
             if ticker in macd_df.columns.get_level_values(1):
                macd_data = macd_df.xs(ticker, level=1, axis=1)
             elif ticker in macd_df.columns.get_level_values(0):
                macd_data = macd_df.xs(ticker, level=0, axis=1)
             else:
                macd_data = macd_df
        else:
            macd_data = macd_df

        # Assuming columns like 'MACD', 'Signal', 'Histogram' or similar exist
        # If columns are just numbered or named differently, we take last row
        if 'MACD' in macd_data.columns and 'Signal' in macd_data.columns:
            current_macd = macd_data['MACD'].iloc[-1]
            current_signal_line = macd_data['Signal'].iloc[-1]
        else:
            # Fallback: assume col 0 is MACD, col 1 is Signal (standard toolkit output order often)
            current_macd = macd_data.iloc[-1, 0]
            current_signal_line = macd_data.iloc[-1, 1] if macd_data.shape[1] > 1 else 0

        # 4. Bollinger Bands (20, 2) - Volatility & Mean Reversion
        bb_df = companies.technicals.get_bollinger_bands(window=20, num_std_dev=2)
        # Usually returns: Upper, Lower, (maybe Middle)
        if isinstance(bb_df.columns, pd.MultiIndex):
             if ticker in bb_df.columns.get_level_values(1):
                bb_data = bb_df.xs(ticker, level=1, axis=1)
             elif ticker in bb_df.columns.get_level_values(0):
                bb_data = bb_df.xs(ticker, level=0, axis=1)
             else:
                bb_data = bb_df
        else:
            bb_data = bb_df
            
        # Inspect columns for Upper/Lower
        # Typ. 'Bollinger High', 'Bollinger Low' or similar
        # Fallback to column indices if names vary
        if bb_data.shape[1] >= 2:
            bb_upper = bb_data.iloc[-1, 0] # Often Upper is first or checking names
            bb_lower = bb_data.iloc[-1, 1]
            # Try to be more specific if possible, but for now robust fallback
            # Let's look for 'Upper' or 'High' in columns
            for col in bb_data.columns:
                if 'Upper' in str(col) or 'High' in str(col): bb_upper = bb_data[col].iloc[-1]
                if 'Lower' in str(col) or 'Low' in str(col): bb_lower = bb_data[col].iloc[-1]
        else:
            bb_upper = 0
            bb_lower = 0

        # 5. Volatility & Fibonacci & NEW EXPERT METRICS (SMA, Volume, ATR)
        hist_data = companies.get_historical_data()
        
        atr = 0
        rvol = 0
        sma_200 = 0
        sma_50 = 0
        
        if not hist_data.empty:
            # Handle MultiIndex
            if isinstance(hist_data.columns, pd.MultiIndex):
                try:
                    if ticker in hist_data.columns.get_level_values(1):
                        hist_data = hist_data.xs(ticker, level=1, axis=1)
                    elif ticker in hist_data.columns.get_level_values(0):
                        hist_data = hist_data.xs(ticker, level=0, axis=1)
                except: pass
                
            daily_returns = hist_data['Return'].iloc[-20:]
            volatility = daily_returns.std() * np.sqrt(252) * 100 
            current_close = hist_data['Close'].iloc[-1]
            if isinstance(current_close, pd.Series): current_close = current_close.iloc[0]
            
            # --- EXPERT METRICS ---
            # SMA 50 & 200
            sma_50 = hist_data['Close'].rolling(window=50).mean().iloc[-1]
            sma_200 = hist_data['Close'].rolling(window=200).mean().iloc[-1]
            
            # Volume Relative Strength (RVOL)
            # Current Volume / Avg Volume 20
            curr_vol = hist_data['Volume'].iloc[-1]
            avg_vol_20 = hist_data['Volume'].rolling(window=20).mean().iloc[-1]
            rvol = curr_vol / avg_vol_20 if avg_vol_20 > 0 else 0
            
            # ATR (14)
            high = hist_data['High']
            low = hist_data['Low']
            close = hist_data['Close']
            tr1 = high - low
            tr2 = (high - close.shift()).abs()
            tr3 = (low - close.shift()).abs()
            tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
            atr = tr.rolling(window=14).mean().iloc[-1]
            
            # Fibonacci
            last_year = hist_data.iloc[-252:]
            high_price = last_year['High'].max()
            low_price = last_year['Low'].min()
            if isinstance(high_price, pd.Series): high_price = high_price.iloc[0]
            if isinstance(low_price, pd.Series): low_price = low_price.iloc[0]
            
            diff = high_price - low_price
            fib_levels = {
                '0.0%': high_price,
                '23.6%': high_price - 0.236 * diff,
                '38.2%': high_price - 0.382 * diff,
                '50.0%': high_price - 0.5 * diff,
                '61.8%': high_price - 0.618 * diff,
                '100.0%': low_price
            }
        else:
            volatility = 0
            current_close = 0
            fib_levels = {}

        return {
            'symbol': ticker,
            'price': current_close,
            'rsi': current_rsi,
            'ema_50': current_ema,
            'ema_10': current_ema10,
            'ema_5': current_ema5,
            'sma_50': sma_50,
            'sma_200': sma_200,
            'rvol': rvol,
            'atr': atr,
            'macd_line': current_macd,
            'macd_signal': current_signal_line,
            'bb_upper': bb_upper,
            'bb_lower': bb_lower,
            'volatility_annual_pct': volatility.values[0] if hasattr(volatility, 'values') else volatility,
            'fibonacci_levels': fib_levels
        }

    except Exception as e:
        print(f"Error fetching technicals for {ticker}: {e}")
        return None
