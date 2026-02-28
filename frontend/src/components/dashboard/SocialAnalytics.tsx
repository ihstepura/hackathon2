'use client';
/**
 * SocialAnalytics — Twitter + Reddit analytics panel for the News page right column.
 */
import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { activeTickerAtom } from '@/atoms';
import { fetchSocialAnalytics, type SocialAnalytics } from '@/lib/api';

export function SocialAnalyticsPanel() {
    const ticker = useAtomValue(activeTickerAtom);
    const [data, setData] = useState<SocialAnalytics | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!ticker) { setData(null); return; }
        setLoading(true);
        setError('');
        fetchSocialAnalytics(ticker)
            .then(setData)
            .catch(() => setError('Failed to load social data'))
            .finally(() => setLoading(false));
    }, [ticker]);

    if (!ticker) return (
        <div className="social-panel">
            <div className="card-header"><span className="card-title">SOCIAL ANALYTICS</span></div>
            <p className="widget-empty">Select a ticker</p>
        </div>
    );

    if (loading) return (
        <div className="social-panel">
            <div className="card-header"><span className="card-title">SOCIAL ANALYTICS</span></div>
            <div className="skeleton-card">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton-line" style={{ width: `${50 + Math.random() * 40}%` }} />)}
            </div>
        </div>
    );

    if (error) return (
        <div className="social-panel">
            <div className="card-header"><span className="card-title">SOCIAL ANALYTICS</span></div>
            <div className="widget-error">{error}</div>
        </div>
    );

    if (!data) return null;

    const sentColor = (s: number) => s > 0.5 ? 'var(--color-positive)' : s < -0.5 ? 'var(--color-negative)' : 'var(--color-warning)';

    return (
        <div className="social-panel">
            {/* ── Twitter ── */}
            <div className="social-section">
                <div className="card-header">
                    <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                        TWITTER / X
                    </span>
                </div>
                <div className="social-stats">
                    <div className="social-stat">
                        <span className="social-stat-label">24h Mentions</span>
                        <span className="social-stat-value">{data.twitter.mentions_24h.toLocaleString()}</span>
                    </div>
                    <div className="social-stat">
                        <span className="social-stat-label">Sentiment</span>
                        <span className="social-stat-value" style={{ color: sentColor(data.twitter.sentiment_score) }}>
                            {data.twitter.sentiment_score > 0 ? '+' : ''}{data.twitter.sentiment_score.toFixed(2)}
                        </span>
                    </div>
                </div>
                <div className="social-hashtags">
                    {data.twitter.trending_hashtags.map((tag, i) => (
                        <span key={i} className="social-hashtag">{tag}</span>
                    ))}
                </div>
                <div className="social-posts">
                    {data.twitter.top_tweets.map((tweet, i) => (
                        <div key={i} className="social-post">
                            <span className="social-post-user">{tweet.user}</span>
                            <p className="social-post-text">{tweet.text}</p>
                            <div className="social-post-stats">
                                <span>♥ {tweet.likes.toLocaleString()}</span>
                                <span>↺ {tweet.retweets.toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Reddit ── */}
            <div className="social-section">
                <div className="card-header">
                    <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="9" cy="11" r="1.5" fill="currentColor" /><circle cx="15" cy="11" r="1.5" fill="currentColor" /><path d="M8 15c1.5 1.5 6.5 1.5 8 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                        REDDIT
                    </span>
                </div>
                <div className="social-stats">
                    <div className="social-stat">
                        <span className="social-stat-label">WSB Mentions</span>
                        <span className="social-stat-value">{data.reddit.wsb_mentions.toLocaleString()}</span>
                    </div>
                    <div className="social-stat">
                        <span className="social-stat-label">Sentiment</span>
                        <span className="social-stat-value" style={{ color: sentColor(data.reddit.sentiment_score) }}>
                            {data.reddit.sentiment_score > 0 ? '+' : ''}{data.reddit.sentiment_score.toFixed(2)}
                        </span>
                    </div>
                </div>
                <div className="social-posts">
                    {data.reddit.top_posts.map((post, i) => (
                        <div key={i} className="social-post">
                            <span className="social-post-sub">{post.subreddit}</span>
                            <p className="social-post-text">{post.title}</p>
                            <div className="social-post-stats">
                                <span>▲ {post.upvotes.toLocaleString()}</span>
                                <span>💬 {post.comments.toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
