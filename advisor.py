"""
Financial Advisory Algorithm - Phase 7 (Bi-Directional / Market Neutral)
Analyzes Technicals + News to suggest Long, Short, or Hedge positions.
"""
import technical_analyzer
import news_analyzer
import sys

API_KEY = "wybWEsp1oB9abHfz3yPpQYwffxaN21B7"

def get_user_input():
    print("\n=== Financial Advisor (Bi-Directional Hedge Edition) ===")
    ticker = input("Enter Stock Ticker (e.g., ^NSEBANK, NVDA): ").strip().upper()
    if not ticker: ticker = "^NSEBANK"
    try:
        budget = float(input("Enter Monthly Budget (in USD/GBP): ").strip())
    except ValueError: budget = 150.0
    return ticker, budget

def determine_strategy(tech, sent):
    """
    Combines news sentiment and technicals to pick direction.
    """
    price = tech['price']
    ema5 = tech.get('ema_5', price)
    bb_upper = tech.get('bb_upper', 0)
    bb_lower = tech.get('bb_lower', 0)
    bb_width = (bb_upper - bb_lower) / price if price > 0 else 0
    
    sentiment_score = sent['average_score']
    
    analysis = []
    
    # DIRECTIONAL BIAS
    technical_bias = "BULLISH" if price > ema5 else "BEARISH"
    sentiment_bias = "BULLISH" if sentiment_score > 0.1 else "BEARISH" if sentiment_score < -0.1 else "NEUTRAL"
    
    analysis.append(f"Technical Bias (EMA 5): {technical_bias}")
    analysis.append(f"Sentiment Bias (News): {sentiment_bias} ({sentiment_score})")

    # DECISION LOGIC
    if bb_width > 0.08:
        # High volatility = Hedge
        signal = "HEDGE (50% Long / 50% Short)"
        reason = "Market volatility is extremely high (BB Width > 8%). Hedging will neutralize risk from weekend news gaps."
    elif technical_bias == "BULLISH" and sentiment_bias != "BEARISH":
        signal = "AGGRESSIVE LONG"
        reason = "Price is trending above EMA 5 and news sentiment confirms strength."
    elif technical_bias == "BEARISH" and sentiment_bias != "BULLISH":
        signal = "AGGRESSIVE SHORT"
        reason = "Price is breaking down and news sentiment is negative. Profit from the drop."
    else:
        # Conflict between news and tech
        signal = "TACTICAL HEDGE / WAIT"
        reason = "Conflicting signals (Tech vs Sentiment). Protecting capital is a priority."
        
    return {
        'signal': signal,
        'reason': reason,
        'details': analysis,
        'sentiment_data': sent
    }

def print_trade_plan(ticker, budget, tech, strategy):
    print(f"\n--- {ticker} BI-DIRECTIONAL PLAN ---")
    for detail in strategy['details']:
        print(f" * {detail}")
    
    print(f"\n RECOMMENDED ACTION: {strategy['signal']}")
    print(f" RATIONALE: {strategy['reason']}")
    
    price = tech['price']
    if "LONG" in strategy['signal']:
        print(f"\n [BULLISH EXECUTION]")
        print(f"  - Entry:    {price:.2f}")
        print(f"  - Target:   {price * 1.05:.2f} (+5%)")
        print(f"  - Stop:     {price * 0.97:.2f} (-3%)")
    elif "SHORT" in strategy['signal']:
        print(f"\n [BEARISH EXECUTION]")
        print(f"  - Entry:    {price:.2f} (Sell)")
        print(f"  - Target:   {price * 0.95:.2f} (Profit from drop)")
        print(f"  - Stop:     {price * 1.03:.2f} (Exit if price rises)")
    elif "HEDGE" in strategy['signal']:
        print(f"\n [NEUTRAL EXECUTION]")
        print(f"  - Long Px:  {price:.2f} (50% Allocation)")
        print(f"  - Short Px: {price:.2f} (50% Allocation)")
        print(f"  - Effect:   Portfolio value stays stable regardless of Monday open.")

def main():
    ticker, budget = get_user_input()
    
    print(f"\n... Analyzing {ticker} (Technicals + News) ...")
    tech_data = technical_analyzer.get_technicals(ticker, API_KEY)
    
    # Fetch real news
    news_items = news_analyzer.fetch_news(ticker, limit=5)
    sentiment = news_analyzer.analyze_sentiment(news_items)
    
    if tech_data:
        strategy = determine_strategy(tech_data, sentiment)
        print_trade_plan(ticker, budget, tech_data, strategy)
    else:
        print("Failed to fetch data.")

if __name__ == "__main__":
    main()
