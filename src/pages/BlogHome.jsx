import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authenticatedFetch } from '../utils/authenticatedFetch';
import './BlogHome.css';

export default function BlogHome() {
  const backendBase = '/datnt/blog/server';
  const authBase = `${backendBase}/auth`;
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [feeds, setFeeds] = useState([]);
  const [feedsLoading, setFeedsLoading] = useState(false);
  const [feedsError, setFeedsError] = useState('');
  const [feedsLoaded, setFeedsLoaded] = useState(false);
  const [showFeeds, setShowFeeds] = useState(false);
  const [visibleFeedCount, setVisibleFeedCount] = useState(5);
  const [showMoreVisible, setShowMoreVisible] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postError, setPostError] = useState('');
  const [postSuccess, setPostSuccess] = useState('');

  const remainingChars = 500 - postContent.length;

  const handleLogout = async () => {
    const token = localStorage.getItem('authToken');
    const requestBody = { username: user?.username || '', token: token || '' };
    console.log('[BlogHome] logout request body:', requestBody);
    try {
      const res = await authenticatedFetch(`${authBase}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      let responseBody = null;
      try {
        const text = await res.clone().text();
        responseBody = text ? JSON.parse(text) : text;
      } catch (err) {
        responseBody = null;
      }
      console.log('[BlogHome] logout response:', {
        status: res.status,
        ok: res.ok,
        body: responseBody,
      });
      if (!res.ok) {
        console.warn(`[BlogHome] logout endpoint returned ${res.status}`);
      }
    } catch (err) {
      console.warn(`[BlogHome] logout request failed: ${err && err.message}`);
    } finally {
      logout();
      window.location.href = '/';
    }
  };

  const handleNavigate = (route) => {
    setShowMenu(false);
    if (route === 'logout') {
      handleLogout();
    } else {
      window.location.href = `/${route}`;
    }
  };

  const getFeedDateValue = (feed) => feed?.createdAt ?? feed?.createdAT ?? null;

  const formatFeedTime = (value) => {
    if (!value) return 'Just now';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleFetchFeeds = async () => {
    if (feedsLoading) return;
    setShowFeeds(true);
    if (window.location.pathname !== '/home/feeds') {
      window.history.pushState(null, '', '/home/feeds');
    }
    setFeedsLoading(true);
    setFeedsError('');
    setFeedsLoaded(false);
    try {
      const res = await authenticatedFetch(
        `${backendBase}/feeds/resources/?_ts=${Date.now()}`,
        {
        method: 'GET',
        cache: 'no-store',
      },
      );
      const text = await res.text();
      const body = text ? JSON.parse(text) : [];
      if (!res.ok) {
        throw new Error(`Feeds request failed (${res.status})`);
      }
      const list = Array.isArray(body) ? body : body?.data || [];
      setFeeds(list);
      setFeedsLoaded(true);
      setVisibleFeedCount(5);
      setShowMoreVisible(false);
    } catch (err) {
      setFeedsError(err?.message || 'Unable to load feeds. Please try again.');
      setFeedsLoaded(true);
    } finally {
      setFeedsLoading(false);
    }
  };

  const handleShowMore = () => {
    setVisibleFeedCount((prev) => prev + 5);
  };

  const handleToggleLike = async (postId) => {
    if (!postId) return;
    try {
      const res = await authenticatedFetch(
        `${backendBase}/posts/like?post_id=${encodeURIComponent(postId)}`,
        {
          method: 'POST',
        },
      );
      if (!res.ok) {
        throw new Error(`Like request failed (${res.status})`);
      }
      setFeeds((prev) =>
        prev.map((item) => {
          if (item.id !== postId) return item;
          const wasLiked = !!item.is_liked;
          const nextLiked = !wasLiked;
          const likeCount = Number.isFinite(item.like_count) ? item.like_count : 0;
          return {
            ...item,
            is_liked: nextLiked,
            like_count: nextLiked ? likeCount + 1 : Math.max(0, likeCount - 1),
          };
        }),
      );
    } catch (err) {
      console.warn(err?.message || 'Like request failed');
    }
  };

  useEffect(() => {
    if (!showFeeds) return () => {};

    const handleScroll = () => {
      if (feeds.length <= visibleFeedCount) {
        setShowMoreVisible(false);
        return;
      }
      const scrollPosition = window.scrollY + window.innerHeight;
      const pageHeight = document.documentElement.scrollHeight;
      const nearBottom = pageHeight - scrollPosition <= 120;
      const canScroll = pageHeight - window.innerHeight > 20;
      setShowMoreVisible(nearBottom || !canScroll);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showFeeds, feeds.length, visibleFeedCount]);

  const openCreatePost = () => {
    setPostError('');
    setPostSuccess('');
    setShowCreatePost(true);
  };

  const closeCreatePost = () => {
    if (postSubmitting) return;
    setShowCreatePost(false);
  };

  const handleCreatePost = async (event) => {
    event.preventDefault();
    if (postSubmitting) return;
    const trimmed = postContent.trim();
    if (!trimmed) {
      setPostError('Please enter post content.');
      return;
    }
    setPostSubmitting(true);
    setPostError('');
    setPostSuccess('');
    try {
      const res = await authenticatedFetch(`${backendBase}/posts/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: postContent }),
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`Create post failed (${res.status})`);
      }
      setPostSuccess('Post created successfully.');
      setPostContent('');
      setShowCreatePost(false);
      await handleFetchFeeds();
    } catch (err) {
      setPostError(err?.message || 'Unable to create post. Please try again.');
    } finally {
      setPostSubmitting(false);
    }
  };

  return (
    <div className="blog-home">
      {/* Header */}
      <header className="blog-header">
        <button
          type="button"
          className="brand-logo"
          title="DatNT Blog"
          onClick={() => handleNavigate('home')}
        >
          DatNT Blog
        </button>
        <div className="header-actions">
          <button
            type="button"
            className="header-btn"
            onClick={handleFetchFeeds}
            disabled={feedsLoading}
          >
            {feedsLoading ? 'Loading...' : 'Feeds'}
          </button>
          <button type="button" className="header-btn primary" onClick={openCreatePost}>
            Create Post
          </button>
        </div>

        {/* Profile Button with Dropdown */}
        <div className="profile-menu-container">
          <button
            className="profile-button"
            onClick={() => setShowMenu(!showMenu)}
            title={user?.username || 'Profile'}
          >
            {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
          </button>

          {showMenu && (
            <div className="profile-dropdown">
              <a
                href="#profile"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigate('profile');
                }}
                className="dropdown-item"
              >
                Profile
              </a>
              <a
                href="#personal"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigate('personal');
                }}
                className="dropdown-item"
              >
                Home
              </a>
              <hr className="dropdown-divider" />
              <a
                href="#logout"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigate('logout');
                }}
                className="dropdown-item logout-item"
              >
                Logout
              </a>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="blog-content">
        {showFeeds && (
          <section className="feed-panel">
            <div className="feed-panel-header">
              <div>
                <h1 className="feed-title">News Feed</h1>
                <p className="feed-subtitle">Welcome, {user?.username || 'User'}!</p>
              </div>
            </div>

            {feedsLoading && (
              <div className="feed-status">Loading posts...</div>
            )}
            {!feedsLoading && feedsError && (
              <div className="feed-status error">{feedsError}</div>
            )}
            {!feedsLoading && feedsLoaded && feeds.length === 0 && !feedsError && (
              <div className="feed-status empty">No posts yet.</div>
            )}

            <div className="feed-list">
              {feeds.slice(0, visibleFeedCount).map((feed) => (
                <article className="feed-card" key={feed.id}>
                  <div className="feed-card-header">
                    <div className="feed-avatar">
                      {feed?.author ? feed.author.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="feed-meta">
                      <div className="feed-author">{feed?.author || 'Unknown'}</div>
                      <div className="feed-time">{formatFeedTime(getFeedDateValue(feed))}</div>
                    </div>
                  </div>
                <div className="feed-content">{feed?.content}</div>
                <div className="feed-stats">
                  <span>{feed?.like_count ?? 0} Likes</span>
                  <span>{feed?.comment_count ?? 0} Comments</span>
                </div>
                <div className="feed-actions">
                  <button
                    type="button"
                    className={`feed-action-btn ${feed?.is_liked ? 'liked' : ''}`}
                    onClick={() => handleToggleLike(feed?.id)}
                  >
                    {feed?.is_liked ? 'Liked' : 'Like'}
                  </button>
                  <button type="button" className="feed-action-btn">Comment</button>
                </div>
                </article>
              ))}
            </div>
            {feeds.length > visibleFeedCount && showMoreVisible && (
              <div className="feed-more">
                <button type="button" className="feed-more-btn" onClick={handleShowMore}>
                  Show more
                </button>
              </div>
            )}
          </section>
        )}
      </div>

      <footer className="blog-footer">
        <div className="footer-content">
          <span className="footer-label">Author:</span>
          <span className="footer-value">Nguyen Tien Dat</span>
          <span className="footer-separator">|</span>
          <span className="footer-label">GitHub:</span>
          <a
            className="footer-link"
            href="https://github.com/orgs/datjj0504-personal-project/repositories"
            target="_blank"
            rel="noreferrer"
          >
            datjj0504-personal-project
          </a>
        </div>
      </footer>

      {showCreatePost && (
        <div className="modal-overlay" onClick={closeCreatePost} role="presentation">
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
            role="presentation"
          >
            <div className="modal-header">
              <h2>Create Post</h2>
              <button
                type="button"
                className="modal-close"
                onClick={closeCreatePost}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form className="modal-form" onSubmit={handleCreatePost}>
              <label className="modal-label" htmlFor="postContent">
                Content
              </label>
              <textarea
                id="postContent"
                className="modal-textarea"
                placeholder="What are you thinking?"
                maxLength={500}
                value={postContent}
                onChange={(event) => setPostContent(event.target.value)}
                rows={8}
              />
              <div className="modal-meta">
                <span className={remainingChars < 0 ? 'char-count danger' : 'char-count'}>
                  {remainingChars} characters remaining
                </span>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="modal-btn ghost"
                    onClick={closeCreatePost}
                    disabled={postSubmitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="modal-btn primary" disabled={postSubmitting}>
                    {postSubmitting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
              {postError && <div className="modal-message error">{postError}</div>}
              {postSuccess && <div className="modal-message success">{postSuccess}</div>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
