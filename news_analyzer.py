"""
Module for fetching financial news via Google News RSS and analyzing sentiment using VADER.
"""
import feedparser
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from datetime import datetime
import time

def fetch_news(ticker, limit=5):
    """
    Fetches the latest news for a given ticker from Google News RSS.
    
    Args:
        ticker (str): Stock ticker symbol (e.g., 'AAPL', 'NVDA', 'RELIANCE.NS').
        limit (int): Maximum number of news items to return.
        
    Returns:
        list: A list of dictionaries containing 'title', 'link', 'published', and 'summary'.
    """
    # Use standard Google News RSS search query
    # "when:1d" parameter ensures recent news if supported, but RSS feed order is usually chronological
    encoded_ticker = ticker.replace("&", "%26")
    rss_url = f"https://news.google.com/rss/search?q={encoded_ticker}+stock+when:1d&hl=en-US&gl=US&ceid=US:en"
    
    try:
        feed = feedparser.parse(rss_url)
        news_items = []
        
        for entry in feed.entries[:limit]:
            news_items.append({
                'title': entry.title,
                'link': entry.link,
                'published': entry.get('published', datetime.now().strftime("%a, %d %b %Y %H:%M:%S GMT")),
                'summary': entry.get('description', '')
            })
            
        return news_items
    except Exception as e:
        print(f"Error fetching news for {ticker}: {e}")
        return []

def analyze_sentiment(news_items):
    """
    Analyzes the sentiment of a list of news items.
    
    Args:
        news_items (list): List of news dictionaries.
        
    Returns:
        dict: Contains 'average_score', 'sentiment_label', and 'scored_news'.
    """
    analyzer = SentimentIntensityAnalyzer()
    total_score = 0
    scored_news = []
    
    if not news_items:
        return {
            'average_score': 0,
            'sentiment_label': 'Neutral',
            'scored_news': []
        }
        
    for item in news_items:
        # Analyze title mostly as it contains the key info in RSS
        text_to_analyze = f"{item['title']}. {item['summary']}"
        sentiment = analyzer.polarity_scores(text_to_analyze)
        compound_score = sentiment['compound']
        
        total_score += compound_score
        
        item_with_score = item.copy()
        item_with_score['sentiment_score'] = compound_score
        scored_news.append(item_with_score)
        
    average_score = total_score / len(news_items)
    
    if average_score >= 0.05:
        label = "Positive"
    elif average_score <= -0.05:
        label = "Negative"
    else:
        label = "Neutral"
        
    return {
        'average_score': round(average_score, 4),
        'sentiment_label': label,
        'scored_news': scored_news
    }

if __name__ == "__main__":
    # Test Block
    ticker = "AAPL"
    print(f"--- Fetching News for {ticker} ---")
    news = fetch_news(ticker)
    for n in news:
        print(f"- {n['title']}")
        
    print(f"\n--- Analyzing Sentiment ---")
    result = analyze_sentiment(news)
    print(f"Average Score: {result['average_score']}")
    print(f"Label: {result['sentiment_label']}")
