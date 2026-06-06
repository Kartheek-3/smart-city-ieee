/**
 * AWS Chat / Messaging Service — SmartCity Platform
 * Refactored to use Flask APIs instead of direct DynamoDB access
 */
import { getJWT } from './authService';

const API_BASE = 'http://localhost:5000/api/messages';

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

const buildConversationId = (uid1, uid2) => [uid1, uid2].sort().join('#');

// ── Send Message ──────────────────────────────────────────────────────────────
export const sendMessage = async (senderId, receiverId, content, mediaUrl = null) => {
  return await authFetch(`${API_BASE}/send`, {
    method: 'POST',
    body: JSON.stringify({ senderId, receiverId, content, mediaUrl })
  });
};

// ── Get Conversation ──────────────────────────────────────────────────────────
export const getConversation = async (userId1, userId2, limit = 50) => {
  const conversationId = buildConversationId(userId1, userId2);
  return await authFetch(`${API_BASE}/conversation/${conversationId}?limit=${limit}`);
};

// ── Mark Messages as Read ─────────────────────────────────────────────────────
export const markMessagesRead = async (conversationId, timestamps) => {
  return await authFetch(`${API_BASE}/mark-read`, {
    method: 'POST',
    body: JSON.stringify({ conversationId, timestamps })
  });
};

// ── Subscribe (polling) ───────────────────────────────────────────────────────
export const subscribeToConversation = (userId1, userId2, callback) => {
  getConversation(userId1, userId2).then(callback).catch(console.error);
  const interval = setInterval(() =>
    getConversation(userId1, userId2).then(callback).catch(console.error), 3000);
  return () => clearInterval(interval);
};

// ── Get All Conversations for a User ─────────────────────────────────────────
export const getUserConversations = async (userId) => {
  return await authFetch(`${API_BASE}/user/${userId}`);
};

// ── Legacy compatibility ──────────────────────────────────────────────────────
export const getOrCreateChat = async (userId1, userId2, userName1 = 'User 1', userName2 = 'User 2') => {
  const conversationId = buildConversationId(userId1, userId2);
  return {
    id: conversationId,
    participantIds: [userId1, userId2],
    participants: {
      [userId1]: { uid: userId1, name: userName1 },
      [userId2]: { uid: userId2, name: userName2 }
    },
    updatedAt: new Date().toISOString(),
  };
};

export const subscribeToChats = (userId, callback) => {
  const fetchChats = async () => {
    try {
      const latestMsgs = await getUserConversations(userId);
      const chats = latestMsgs.map(m => {
        const otherId = m.senderId === userId ? m.receiverId : m.senderId;
        return {
          id: m.conversationId,
          participantIds: [userId, otherId],
          participants: {
            [userId]: { uid: userId, name: 'You' },
            [otherId]: { uid: otherId, name: 'User' }
          },
          lastMessage: m.content,
          lastMessageTime: m.timestamp,
          status: m.status,
          receiverId: m.receiverId
        };
      });
      callback(chats);
    } catch (e) {
      console.error(e);
    }
  };
  
  fetchChats();
  const interval = setInterval(fetchChats, 3000);
  return () => clearInterval(interval);
};

export const subscribeToMessages = (conversationId, callback) => {
  const fetchMessages = async () => {
    try {
      const messages = await authFetch(`${API_BASE}/conversation/${conversationId}?limit=100`);
      callback(messages);
    } catch (e) {
      console.error(e);
    }
  };
  
  fetchMessages();
  const interval = setInterval(fetchMessages, 2000);
  return () => clearInterval(interval);
};

export const getTotalUnread = (chats, userId) => {
  if (!chats) return 0;
  return chats.filter(c => c.receiverId === userId && c.status !== 'read').length;
};

export const canChat = async (userId1, userId2) => {
  return true;
};

// ── Admin Tools ───────────────────────────────────────────────────────────────
export const getAllMessages = async () => {
  try {
    const { dbScan, TABLES } = require('./dynamoService');
    const messages = await dbScan(TABLES.MESSAGES);
    return messages;
  } catch (e) {
    console.error("Admin error fetching all messages", e);
    return [];
  }
};
