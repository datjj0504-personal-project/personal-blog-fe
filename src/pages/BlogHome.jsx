import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authenticatedFetch } from '../utils/authenticatedFetch';
import './BlogHome.css';

export default function BlogHome() {
  const backendBase = '/datnt/blog/server';
  const authBase = `${backendBase}/auth`;
  const { user, logout } = useAuth();
  const currentUsername = user?.username || 'You';
  const [showMenu, setShowMenu] = useState(false);
  const [feeds, setFeeds] = useState([]);
  const [feedsLoading, setFeedsLoading] = useState(false);
  const [feedsError, setFeedsError] = useState('');
  const [feedsLoaded, setFeedsLoaded] = useState(false);
  const [showFeeds, setShowFeeds] = useState(false);
  const [feedView, setFeedView] = useState('news');
  const [visibleFeedCount, setVisibleFeedCount] = useState(5);
  const [showMoreVisible, setShowMoreVisible] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postError, setPostError] = useState('');
  const [postSuccess, setPostSuccess] = useState('');
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPostContent, setEditPostContent] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [deleteSubmittingId, setDeleteSubmittingId] = useState(null);
  const [expandedComments, setExpandedComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentSubmitting, setCommentSubmitting] = useState({});
  const [commentErrors, setCommentErrors] = useState({});
  const feedScrollRef = useRef(null);

  const remainingChars = 500 - postContent.length;
  const editRemainingChars = 500 - editPostContent.length;

  const extractFeedComments = (feed) => {
    const possibleComments =
      feed?.comments ??
      feed?.comment_list ??
      feed?.commentList ??
      feed?.comment_data ??
      [];

    if (!Array.isArray(possibleComments)) return [];

    return possibleComments.map((comment, index) => ({
      id: comment?.id ?? `${feed?.id || 'post'}-comment-${index}`,
      author: comment?.author ?? comment?.username ?? comment?.user_name ?? 'User',
      content: comment?.content ?? comment?.comment ?? '',
      createdAt: comment?.createdAt ?? comment?.created_at ?? comment?.createdAT ?? null,
    }));
  };

  const normalizeFeeds = (list) =>
    list.map((feed) => ({
      ...feed,
      comments: extractFeedComments(feed),
    }));

  const getFeedCommentCount = (feed) => {
    if (Number.isFinite(feed?.comment_count)) return feed.comment_count;
    if (Array.isArray(feed?.comments)) return feed.comments.length;
    return 0;
  };

  const isOwnPost = (feed) =>
    String(feed?.user_id ?? '') === String(user?.id ?? '') || feed?.author === currentUsername;

  const displayedFeeds = feeds;

  const handleLogout = async () => {
    const token = sessionStorage.getItem('authToken');
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
      } catch {
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

  const getFeedDateValue = (feed) =>
    feed?.createdAt ?? feed?.created_at ?? feed?.createdAT ?? null;

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

  const handleFetchFeeds = async (view = 'news') => {
    if (feedsLoading) return;
    setShowMenu(false);
    setShowFeeds(true);
    setFeedView(view);
    setVisibleFeedCount(5);
    const nextPath = view === 'profile' ? '/home/profile' : '/home/feeds';
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
    setFeedsLoading(true);
    setFeedsError('');
    setFeedsLoaded(false);
    try {
      const url = view === 'profile'
        ? `${backendBase}/feeds/resources?personal=true`
        : `${backendBase}/feeds/resources`;
      const res = await authenticatedFetch(url, {
        method: 'GET',
        cache: 'no-store',
      });
      const text = await res.text();
      const body = text ? JSON.parse(text) : [];
      if (!res.ok) {
        throw new Error(`Feeds request failed (${res.status})`);
      }
      const list = Array.isArray(body) ? body : body?.data || [];
      setFeeds(normalizeFeeds(list));
      setFeedsLoaded(true);
      setShowMoreVisible(false);
    } catch (err) {
      setFeedsError(err?.message || 'Unable to load feeds. Please try again.');
      setFeedsLoaded(true);
    } finally {
      setFeedsLoading(false);
    }
  };

  const handleNavigate = (route) => {
    if (route === 'logout') {
      setShowMenu(false);
      handleLogout();
      return;
    }
    if (route === 'profile') {
      handleFetchFeeds('profile');
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

  const toggleComments = (postId) => {
    if (!postId) return;
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
    setCommentErrors((prev) => ({
      ...prev,
      [postId]: '',
    }));
  };

  const handleCommentDraftChange = (postId, value) => {
    setCommentDrafts((prev) => ({
      ...prev,
      [postId]: value,
    }));
  };

  const handleSubmitComment = async (event, postId) => {
    event.preventDefault();
    if (!postId || commentSubmitting[postId]) return;

    const content = (commentDrafts[postId] || '').trim();
    if (!content) {
      setCommentErrors((prev) => ({
        ...prev,
        [postId]: 'Please enter a comment before sending.',
      }));
      return;
    }

    setCommentSubmitting((prev) => ({
      ...prev,
      [postId]: true,
    }));
    setCommentErrors((prev) => ({
      ...prev,
      [postId]: '',
    }));

    try {
      const res = await authenticatedFetch(`${backendBase}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          content,
        }),
      });
      const text = await res.text();
      let body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = null;
      }

      if (!res.ok) {
        throw new Error(`Create comment failed (${res.status})`);
      }

      const savedComment = {
        id: body?.id ?? body?.data?.id ?? `${postId}-${Date.now()}`,
        author:
          body?.author ??
          body?.username ??
          body?.data?.author ??
          body?.data?.username ??
          currentUsername,
        content: body?.content ?? body?.data?.content ?? content,
        createdAt:
          body?.createdAt ??
          body?.created_at ??
          body?.data?.createdAt ??
          body?.data?.created_at ??
          new Date().toISOString(),
      };

      setFeeds((prev) =>
        prev.map((feed) => {
          if (feed.id !== postId) return feed;
          const comments = Array.isArray(feed.comments) ? feed.comments : [];
          return {
            ...feed,
            comments: [...comments, savedComment],
            comment_count: (feed?.comment_count ?? comments.length) + 1,
          };
        }),
      );
      setCommentDrafts((prev) => ({
        ...prev,
        [postId]: '',
      }));
      setExpandedComments((prev) => ({
        ...prev,
        [postId]: true,
      }));
    } catch (err) {
      setCommentErrors((prev) => ({
        ...prev,
        [postId]: err?.message || 'Unable to send comment. Please try again.',
      }));
    } finally {
      setCommentSubmitting((prev) => ({
        ...prev,
        [postId]: false,
      }));
    }
  };

  useEffect(() => {
    if (!showFeeds) return () => {};

    const scrollContainer = feedScrollRef.current;
    if (!scrollContainer) return () => {};

    const handleScroll = () => {
      if (displayedFeeds.length <= visibleFeedCount) {
        setShowMoreVisible(false);
        return;
      }
      const scrollPosition = scrollContainer.scrollTop + scrollContainer.clientHeight;
      const pageHeight = scrollContainer.scrollHeight;
      const nearBottom = pageHeight - scrollPosition <= 120;
      const canScroll = pageHeight - scrollContainer.clientHeight > 20;
      setShowMoreVisible(nearBottom || !canScroll);
    };

    handleScroll();
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [showFeeds, displayedFeeds.length, visibleFeedCount]);

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
      if (!res.ok) {
        throw new Error(`Create post failed (${res.status})`);
      }
      setPostSuccess('Post created successfully.');
      setPostContent('');
      setShowCreatePost(false);
      await handleFetchFeeds(feedView);
    } catch (err) {
      setPostError(err?.message || 'Unable to create post. Please try again.');
    } finally {
      setPostSubmitting(false);
    }
  };

  const openEditPost = (feed) => {
    setEditError('');
    setEditingPostId(feed?.id ?? null);
    setEditPostContent(feed?.content ?? '');
  };

  const closeEditPost = () => {
    if (editSubmitting) return;
    setEditingPostId(null);
    setEditPostContent('');
    setEditError('');
  };

  const handleUpdatePost = async (event) => {
    event.preventDefault();
    if (!editingPostId || editSubmitting) return;

    const trimmed = editPostContent.trim();
    if (!trimmed) {
      setEditError('Please enter post content.');
      return;
    }

    setEditSubmitting(true);
    setEditError('');
    try {
      const res = await authenticatedFetch(`${backendBase}/posts/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: editingPostId,
          content: trimmed,
        }),
      });
      if (!res.ok) {
        throw new Error(`Update post failed (${res.status})`);
      }

      setFeeds((prev) =>
        prev.map((feed) =>
          feed.id === editingPostId
            ? {
                ...feed,
                content: trimmed,
                updated_at: new Date().toISOString(),
              }
            : feed,
        ),
      );
      closeEditPost();
    } catch (err) {
      setEditError(err?.message || 'Unable to update post. Please try again.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!postId || deleteSubmittingId) return;
    setDeleteSubmittingId(postId);
    try {
      const res = await authenticatedFetch(`${backendBase}/posts/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId }),
      });
      if (!res.ok) {
        throw new Error(`Delete post failed (${res.status})`);
      }

      setFeeds((prev) => prev.filter((feed) => feed.id !== postId));
      setExpandedComments((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
    } catch (err) {
      console.warn(err?.message || 'Unable to delete post.');
    } finally {
      setDeleteSubmittingId(null);
    }
  };

  return (
    <div className="blog-home">
      <header className="blog-header">
        <button type="button" className="brand-logo" title="DatNT Blog" onClick={() => handleFetchFeeds('news')}>
          DatNT Blog
        </button>
        <div className="header-actions">
          <button
            type="button"
            className="header-btn"
            onClick={() => handleFetchFeeds('news')}
            disabled={feedsLoading}
          >
            {feedsLoading && feedView === 'news' ? 'Loading...' : 'Feeds'}
          </button>
          <button type="button" className="header-btn primary" onClick={openCreatePost}>
            Create Post
          </button>
        </div>

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

      <div className="blog-content" ref={feedScrollRef}>
        {showFeeds && (
          <section className="feed-panel">
            <div className="feed-panel-header">
              <div>
                <h1 className="feed-title">{feedView === 'profile' ? 'My Posts' : 'News Feed'}</h1>
                <p className="feed-subtitle">
                  {feedView === 'profile'
                    ? `Manage posts by ${currentUsername}`
                    : `Welcome, ${user?.username || 'User'}!`}
                </p>
              </div>
              {feedView === 'profile' && (
                <button
                  type="button"
                  className="feed-view-btn"
                  onClick={() => handleFetchFeeds('news')}
                  disabled={feedsLoading}
                >
                  Back To Feed
                </button>
              )}
            </div>

            {feedsLoading && <div className="feed-status">Loading posts...</div>}
            {!feedsLoading && feedsError && <div className="feed-status error">{feedsError}</div>}
            {!feedsLoading && feedsLoaded && displayedFeeds.length === 0 && !feedsError && (
              <div className="feed-status empty">
                {feedView === 'profile' ? 'You have not created any posts yet.' : 'No posts yet.'}
              </div>
            )}

            <div className="feed-list">
              {displayedFeeds.slice(0, visibleFeedCount).map((feed) => (
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
                    <span>{getFeedCommentCount(feed)} Comments</span>
                  </div>
                  <div className="feed-actions">
                    <button
                      type="button"
                      className={`feed-action-btn ${feed?.is_liked ? 'liked' : ''}`}
                      onClick={() => handleToggleLike(feed?.id)}
                    >
                      {feed?.is_liked ? 'Liked' : 'Like'}
                    </button>
                    <button
                      type="button"
                      className={`feed-action-btn ${expandedComments[feed.id] ? 'active' : ''}`}
                      onClick={() => toggleComments(feed?.id)}
                    >
                      {expandedComments[feed.id] ? 'Hide comments' : 'Comment'}
                    </button>
                    {feedView === 'profile' && (
                      <>
                        <button
                          type="button"
                          className="feed-action-btn edit"
                          onClick={() => openEditPost(feed)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="feed-action-btn danger"
                          onClick={() => handleDeletePost(feed?.id)}
                          disabled={deleteSubmittingId === feed?.id}
                        >
                          {deleteSubmittingId === feed?.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </>
                    )}
                  </div>
                  {expandedComments[feed.id] && (
                    <div className="comment-panel">
                      <form
                        className="comment-composer"
                        onSubmit={(event) => handleSubmitComment(event, feed.id)}
                      >
                        <div className="comment-composer-avatar">
                          {currentUsername.charAt(0).toUpperCase()}
                        </div>
                        <div className="comment-composer-body">
                          <textarea
                            className="comment-input"
                            placeholder="Write a public comment..."
                            value={commentDrafts[feed.id] || ''}
                            onChange={(event) => handleCommentDraftChange(feed.id, event.target.value)}
                            rows={2}
                            maxLength={300}
                          />
                          <div className="comment-composer-actions">
                            <span className="comment-helper">Share your thoughts, Facebook-style.</span>
                            <button
                              type="submit"
                              className="comment-submit-btn"
                              disabled={!!commentSubmitting[feed.id]}
                            >
                              {commentSubmitting[feed.id] ? 'Sending...' : 'Comment'}
                            </button>
                          </div>
                          {commentErrors[feed.id] && (
                            <div className="comment-message error">{commentErrors[feed.id]}</div>
                          )}
                        </div>
                      </form>

                      <div className="comment-thread">
                        {feed?.comments?.length ? (
                          feed.comments.map((comment) => (
                            <div className="comment-item" key={comment.id}>
                              <div className="comment-avatar">
                                {comment?.author ? comment.author.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div className="comment-bubble">
                                <div className="comment-author">{comment?.author || 'User'}</div>
                                <div className="comment-content">{comment?.content}</div>
                                <div className="comment-time">{formatFeedTime(comment?.createdAt)}</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="comment-empty">
                            No comments yet. Be the first one to start the conversation.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
            {displayedFeeds.length > visibleFeedCount && showMoreVisible && (
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
          <div className="modal-card" onClick={(event) => event.stopPropagation()} role="presentation">
            <div className="modal-header">
              <h2>Create Post</h2>
              <button
                type="button"
                className="modal-close"
                onClick={closeCreatePost}
                aria-label="Close"
              >
                �
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

      {editingPostId && (
        <div className="modal-overlay" onClick={closeEditPost} role="presentation">
          <div className="modal-card" onClick={(event) => event.stopPropagation()} role="presentation">
            <div className="modal-header">
              <h2>Edit Post</h2>
              <button
                type="button"
                className="modal-close"
                onClick={closeEditPost}
                aria-label="Close"
              >
                �
              </button>
            </div>
            <form className="modal-form" onSubmit={handleUpdatePost}>
              <label className="modal-label" htmlFor="editPostContent">
                Content
              </label>
              <textarea
                id="editPostContent"
                className="modal-textarea"
                placeholder="Update your post..."
                maxLength={500}
                value={editPostContent}
                onChange={(event) => setEditPostContent(event.target.value)}
                rows={8}
              />
              <div className="modal-meta">
                <span className={editRemainingChars < 0 ? 'char-count danger' : 'char-count'}>
                  {editRemainingChars} characters remaining
                </span>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="modal-btn ghost"
                    onClick={closeEditPost}
                    disabled={editSubmitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="modal-btn primary" disabled={editSubmitting}>
                    {editSubmitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
              {editError && <div className="modal-message error">{editError}</div>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
