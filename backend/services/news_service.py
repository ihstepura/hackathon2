"""
FinanceIQ v6 — News & Sentiment Service
Uses Google News RSS + FinBERT for financial sentiment analysis.
"""
import feedparser
from datetime import datetime
from core.logging import logger


def fetch_news(ticker: str, limit: int = 10) -> list[dict]:
    """Fetch latest news for a ticker from Google News RSS."""
    encoded = ticker.replace("&", "%26")
    rss_url = f"https://news.google.com/rss/search?q={encoded}+stock+when:7d&hl=en-US&gl=US&ceid=US:en"

    try:
        feed = feedparser.parse(rss_url)
        items = []
        for entry in feed.entries[:limit]:
            items.append({
                "title": entry.title,
                "link": entry.link,
                "published": entry.get("published", datetime.now().strftime("%a, %d %b %Y %H:%M:%S GMT")),
                "summary": entry.get("description", ""),
            })
        return items
    except Exception as e:
        logger.error(f"News fetch error: {e}")
        return []


_finbert_pipeline = None

def get_finbert():
    global _finbert_pipeline
    if _finbert_pipeline is None:
        from transformers import pipeline
        import warnings
        warnings.filterwarnings("ignore")
        logger.info("Lazy loading FinBERT model...")
        _finbert_pipeline = pipeline("sentiment-analysis", model="ProsusAI/finbert")
    return _finbert_pipeline

def analyze_sentiment(news_items: list[dict]) -> dict:
    """Analyze sentiment of news items using FinBERT."""
    if not news_items:
        return {"average_score": 0, "sentiment_label": "Neutral", "scored_news": []}

    try:
        analyzer = get_finbert()
    except Exception as e:
        logger.error(f"FinBERT load error: {e}")
        return {"average_score": 0, "sentiment_label": "Neutral", "scored_news": news_items}

    total = 0
    scored = []
    for item in news_items:
        text = f"{item['title']}. {item.get('summary', '')}"
        
        # FinBERT has a 512 token limit. Truncating text to be safe.
        text = text[:1000] 
        try:
            result = analyzer(text)[0]
            label = result['label'].lower()
            score = result['score']
            
            # Map FinBERT probabilities to a -1 to 1 compound score
            if label == 'positive':
                compound = score
            elif label == 'negative':
                compound = -score
            else:
                compound = 0.0
                
            total += compound
            scored.append({**item, "sentiment_score": round(compound, 4)})
        except Exception as e:
            scored.append({**item, "sentiment_score": 0.0})

    avg = total / len(news_items)
    overall_label = "Positive" if avg >= 0.05 else "Negative" if avg <= -0.05 else "Neutral"

    return {
        "average_score": round(avg, 4),
        "sentiment_label": overall_label,
        "scored_news": scored,
    }
