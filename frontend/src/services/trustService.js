/**
 * AWS Trust Score Service — SmartCity Platform
 * Replaces: Firebase trust logic
 * Formula: (validReports × 5) + (confirmations × 3) - (fakeReports × 10)
 */
import { dbGet, dbPut, dbUpdate, dbQuery, TABLES } from './dynamoService';
import { createAuditLog } from './blockchainService';

export const TRUST_LEVELS = {
  SUSPICIOUS: { label: 'Suspicious', min: 0,  max: 20, color: '#ff4444', icon: '🔴' },
  NORMAL:     { label: 'Normal',     min: 21, max: 50, color: '#ffcc00', icon: '🟡' },
  TRUSTED:    { label: 'Trusted',    min: 51, max: 80, color: '#00cc66', icon: '🟢' },
  EXPERT:     { label: 'Expert',     min: 81, max: 100,color: '#0088ff', icon: '🔵' },
};

export const computeTrustScore = (validReports = 0, confirmations = 0, fakeReports = 0) => {
  const raw = (validReports * 5) + (confirmations * 3) - (fakeReports * 10);
  return Math.max(0, Math.min(100, raw));
};

export const getTrustLevel = (score) => {
  if (score <= 20) return 'suspicious';
  if (score <= 50) return 'normal';
  if (score <= 80) return 'trusted';
  return 'expert';
};

export const getTrustMeta = (level) => {
  return TRUST_LEVELS[level?.toUpperCase()] || TRUST_LEVELS.NORMAL;
};

export const updateTrustScore = async (userId, reason, delta = {}) => {
  try {
    const user = await dbGet(TABLES.USERS, { userId });
    if (!user) return { success: false, error: 'User not found' };

    const validReports = (user.validReports || 0) + (delta.validReports || 0);
    const fakeReports = (user.fakeReports || 0) + (delta.fakeReports || 0);
    const confirmations = (user.communityConfirmations || 0) + (delta.confirmations || 0);
    const score = computeTrustScore(validReports, confirmations, fakeReports);
    const level = getTrustLevel(score);
    const updatedAt = new Date().toISOString();

    // Update Users table
    await dbUpdate(TABLES.USERS, { userId },
      'SET trustScore = :s, trustLevel = :l, validReports = :v, fakeReports = :f, communityConfirmations = :c',
      { ':s': score, ':l': level, ':v': validReports, ':f': fakeReports, ':c': confirmations }
    );

    // Record in TrustScores history table
    await dbPut(TABLES.TRUST, {
      userId,
      updatedAt,
      score,
      level,
      validReports,
      fakeReports,
      confirmations,
      changeReason: reason,
    });

    // Blockchain audit
    await createAuditLog('TrustScore', userId, { score, level, reason }, 'updated');

    return { success: true, score, level };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getTrustHistory = async (userId) => {
  return await dbQuery(TABLES.TRUST, {
    keyCondition: 'userId = :u',
    expressionValues: { ':u': userId },
    scanForward: false,
  });
};
