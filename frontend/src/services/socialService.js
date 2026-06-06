/**
 * Social Service — SmartCity Platform
 * Uses: Flask REST APIs for FollowRequests + Users
 */
import { getJWT } from './authService';

const API_BASE = 'http://localhost:5000/api/social';

const authFetch = async (url, options = {}) => {
  const token = await getJWT();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const err = await response.json().catch(()=>({}));
    throw new Error(err.error || 'API Request failed');
  }
  return response.json();
};

// ── Search Users ──────────────────────────────────────────────────────────────
export const searchUsers = async (query) => {
  return await authFetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
};

// ── Follow Request Flow ───────────────────────────────────────────────────────
export const sendFollowRequest = async (fromUser, toUserId) => {
  const fromUserId = typeof fromUser === 'object' ? fromUser.uid : fromUser;
  return await authFetch(`${API_BASE}/follow`, {
    method: 'POST',
    body: JSON.stringify({ fromUserId, toUserId })
  });
};

export const getIncomingRequests = async (toUserId) => {
  return await authFetch(`${API_BASE}/incoming/${toUserId}`);
};

export const getOutgoingRequests = async (fromUserId) => {
  return await authFetch(`${API_BASE}/outgoing/${fromUserId}`);
};

export const respondToRequest = async (requestId, createdAt, accepted, fromUserId, toUserId) => {
  return await authFetch(`${API_BASE}/respond`, {
    method: 'POST',
    body: JSON.stringify({ requestId, accepted, fromUserId, toUserId })
  });
};

// ── Get Followers / Following ─────────────────────────────────────────────────
export const getFollowers = async (userId) => {
  return await authFetch(`${API_BASE}/followers/${userId}`);
};

export const getFollowing = async (userId) => {
  return await authFetch(`${API_BASE}/following/${userId}`);
};

// ── Legacy Compatibility / Polling ───────────────────────────────────────────
export const subscribeToFollowRequests = (userId, callback) => {
  return () => {};
};

export const subscribeToPendingRequests = (userId, callback) => {
  const fetchPending = async () => {
    try {
      const reqs = await getIncomingRequests(userId);
      callback(reqs.filter(r => r.status === 'pending'));
    } catch (e) { console.error(e); }
  };
  fetchPending();
  const interval = setInterval(fetchPending, 15000);
  return () => clearInterval(interval);
};

export const subscribeToFollowers = (userId, callback) => {
  const fetchF = async () => {
    try { callback(await getFollowers(userId)); } catch (e) { console.error(e); }
  };
  fetchF();
  const interval = setInterval(fetchF, 15000);
  return () => clearInterval(interval);
};

export const subscribeToFollowing = (userId, callback) => {
  const fetchF = async () => {
    try { callback(await getFollowing(userId)); } catch (e) { console.error(e); }
  };
  fetchF();
  const interval = setInterval(fetchF, 15000);
  return () => clearInterval(interval);
};

export const subscribeToUserActivity = (userId, callback) => {
  return () => {};
};

// ── Reputation System (Local logic) ──────────────────────────────────────────
export const calculateReputation = (trustScore) => {
  if (trustScore >= 80) return 'Highly Trusted';
  if (trustScore >= 50) return 'Trusted';
  if (trustScore >= 30) return 'Needs Verification';
  return 'Low Trust';
};

export const getReputationBadge = (trustScore) => {
  if (trustScore >= 80) return { icon: '⭐', color: '#10b981', text: 'Highly Trusted' };
  if (trustScore >= 50) return { icon: '✓', color: '#3b82f6', text: 'Trusted Citizen' };
  if (trustScore >= 30) return { icon: '!', color: '#f59e0b', text: 'New/Verifying' };
  return { icon: '⚠️', color: '#ef4444', text: 'Low Trust' };
};

// ── Fallback implementations ──────────────────────────────────────────────────
export const getFollowStatus = async (currentUserId, targetUserId) => {
  try {
    const out = await getOutgoingRequests(currentUserId);
    const existing = out.find(r => r.toUserId === targetUserId);
    if (!existing) return 'none';
    return existing.status;
  } catch (e) {
    return 'none';
  }
};

export const unfollowUser = async (currentUserId, targetUserId) => {
};

export const acceptFollowRequest = async (requestId, fromUid, fromName, fromEmail, toUid, toName, toEmail) => {
  return respondToRequest(requestId, null, true, fromUid, toUid);
};

export const rejectFollowRequest = async (requestId, fromUid, toUid) => {
  return respondToRequest(requestId, null, false, fromUid, toUid);
};

export const removeFollower = async (currentUserId, targetUserId) => {
};

export const getAllFollowRequests = async () => {
  return [];
};
