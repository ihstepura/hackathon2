"""
FinanceIQ - Hacker Edition
AlphaMath: Signal Decay Engine (Temporal Exponential Decay)
"""
from datetime import datetime, timezone
import math

def calculate_time_decay(published_time_str: str, half_life_hours: float = 24.0) -> float:
    """
    Apply exponential decay based on the age of the news/post.
    
    Formula: M(t) = M_0 * (0.5)^(t / half_life)
    We return the multiplier (0.0 to 1.0) based on age.
    """
    try:
        dt = None
        formats = [
            "%a, %d %b %Y %H:%M:%S %Z",
            "%a, %d %b %Y %H:%M:%S GMT",
            "%Y-%m-%dT%H:%M:%SZ",
            "%b %d, %Y · %I:%M %p UTC", # Nitter
            "%a, %d %b %Y %H:%M:%S"
        ]
        
        for fmt in formats:
            try:
                # Remove GMT text if present for fallback
                clean_str = published_time_str.replace(" GMT", "")
                dt = datetime.strptime(clean_str, fmt.replace(" %Z", "").replace(" GMT", ""))
                break
            except ValueError:
                # Also try original
                try:
                    dt = datetime.strptime(published_time_str, fmt)
                    break
                except ValueError:
                    continue
                
        if not dt:
            return 1.0 # Fallback if unparsable
            
        now = datetime.now() # Assume local/naive
        # Timezone stripping hack if needed
        if dt.tzinfo:
            dt = dt.replace(tzinfo=None)
            
        age_delta = now - dt
        age_hours = age_delta.total_seconds() / 3600.0
        
        if age_hours < 0:
            age_hours = 0
            
        multiplier = math.pow(0.5, age_hours / half_life_hours)
        
        # Hard cap if older than 72 hours
        if age_hours > 72:
            return 0.0
            
        return round(multiplier, 4)
    except Exception as e:
        print(f"Time decay error: {e}")
        return 1.0

def apply_signal_decay(scored_items: list[dict], half_life_hours: float = 24.0) -> list[dict]:
    """
    Given a list of items with 'sentiment_score' and 'published',
    return a new list where 'decayed_score' is calculated.
    """
    decayed_list = []
    
    for item in scored_items:
        pub_str = item.get("published", "")
        raw_score = item.get("sentiment_score", 0.0)
        
        multiplier = calculate_time_decay(pub_str, half_life_hours)
        decayed_score = raw_score * multiplier
        
        item["decay_multiplier"] = multiplier
        item["decayed_score"] = round(decayed_score, 4)
        decayed_list.append(item)
        
    return decayed_list

def calculate_divergence(price_return: float, sentiment_score: float) -> dict:
    """
    Calculate the Teflon/Value Trap divergence.
    
    price_return: percentage return over the period (e.g., 5.0 for +5%)
    sentiment_score: aggregated decayed sentiment score (-1.0 to +1.0)
    """
    divergence_type = "Neutral"
    message = "Price and sentiment are aligned."
    score = 0.0
    
    # Normalize price return roughly to a -1.0 to 1.0 scale (assumes +/- 10% is the extreme cap for 3-day)
    normalized_price = min(max(price_return / 10.0, -1.0), 1.0)
    
    # Divergence Magnitude: difference between normalized price direction and sentiment
    divergence_magnitude = abs(normalized_price - sentiment_score)
    
    if normalized_price > 0.1 and sentiment_score < -0.1:
        divergence_type = "Teflon"
        message = "Price is rising despite negative news sentiment (Teflon Stock)."
        score = divergence_magnitude
        
    elif normalized_price < -0.1 and sentiment_score > 0.1:
        divergence_type = "Value Trap"
        message = "Price is falling despite positive news sentiment (Value Trap)."
        score = divergence_magnitude
        
    return {
        "status": divergence_type,
        "divergence_score": round(score, 2),
        "message": message,
        "price_return_pct": round(price_return, 2),
        "sentiment_score": round(sentiment_score, 2)
    }
