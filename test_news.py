import feedparser
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

try:
    # Test Feed: Google News for AAPL
    rss_url = "https://news.google.com/rss/search?q=AAPL&hl=en-US&gl=US&ceid=US:en"
    print(f"Fetching RSS from: {rss_url}")
    
    feed = feedparser.parse(rss_url)
    
    # feedparser doesn't always return .status for local files or some responses, but usually does for HTTP
    # We check if entries are present
    print(f"Entries found: {len(feed.entries)}")

    if feed.entries:
        title = feed.entries[0].title
        print(f"Sample Title: {title}")
        
        analyzer = SentimentIntensityAnalyzer()
        score = analyzer.polarity_scores(title)
        print(f"Sentiment: {score}")
        print("✅ News + Sentiment Test PASSED")
    else:
        print("❌ No entries found in RSS feed")

except Exception as e:
    print(f"❌ Test FAILED with error: {e}")
