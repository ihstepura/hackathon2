"""
FinanceIQ v6 — Alternative Data Scrapers (Reddit & Twitter)
"""
import os
import praw
from core.logging import logger
from ntscraper import Nitter
from datetime import datetime

def fetch_reddit_sentiment(ticker: str, limit: int = 15) -> list[dict]:
    """Fetch recent posts from Reddit mentioning the ticker."""
    client_id = os.getenv("REDDIT_CLIENT_ID")
    client_secret = os.getenv("REDDIT_CLIENT_SECRET")
    user_agent = os.getenv("REDDIT_USER_AGENT", "AlphaFilter/1.0")

    if not client_id or not client_secret:
        return []

    try:
        reddit = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            user_agent=user_agent
        )
        subreddits = ["wallstreetbets", "stocks", "investing"]
        query = f"{ticker}"
        
        items = []
        for sub in subreddits:
            try:
                subreddit = reddit.subreddit(sub)
                for submission in subreddit.search(query, sort='new', time_filter='week', limit=max(3, limit//len(subreddits))):
                    # Ensure the ticker is actually mentioned
                    if ticker.upper() in submission.title.upper() or ticker.upper() in submission.selftext.upper():
                        items.append({
                            "title": submission.title,
                            "summary": submission.selftext[:500],
                            "published": datetime.fromtimestamp(submission.created_utc).strftime("%a, %d %b %Y %H:%M:%S GMT"),
                            "source": f"Reddit (r/{sub})",
                            "link": f"https://reddit.com{submission.permalink}"
                        })
            except Exception:
                continue
        return items
    except Exception as e:
        logger.error(f"Reddit fetch error: {e}")
        return []

def fetch_twitter_sentiment(ticker: str, limit: int = 10) -> list[dict]:
    """Fetch recent tweets using unofficial ntscraper."""
    try:
        scraper = Nitter(log_level=1, skip_instance_check=False)
        query = f"${ticker} OR #{ticker}"
        tweets = scraper.get_tweets(query, mode='term', number=limit)
        
        items = []
        if tweets and 'tweets' in tweets:
            for t in tweets['tweets']:
                items.append({
                    "title": f"Tweet by {t['user']['username']}",
                    "summary": t['text'],
                    "published": t['date'],
                    "source": "Twitter / X",
                    "link": t['link']
                })
        return items
    except Exception as e:
        logger.error(f"Twitter fetch error: {e}")
        return []

def aggregate_social_data(ticker: str, limit: int = 20) -> list[dict]:
    """Combine Reddit and Twitter data."""
    reddit_data = fetch_reddit_sentiment(ticker, limit=limit//2)
    twitter_data = fetch_twitter_sentiment(ticker, limit=limit//2)
    return reddit_data + twitter_data
