/**
 * AWS Issue / Accident / Crime / Waste Report Service — SmartCity Platform
 * Replaces: Firebase Firestore issueService.js
 * Uses: DynamoDB via dynamoService.js
 */
import { v4 as uuidv4 } from 'uuid';
import { dbPut, dbQuery, dbScan, dbUpdate, TABLES } from './dynamoService';
import { createAuditLog } from './blockchainService';

// ── Priority Helpers ──────────────────────────────────────────────────────────
export const calcPriority = ({ category, urgency, hoursOpen = 0, reportCount = 1 }) => {
  const catScore = { safety: 40, pollution: 35, traffic: 28, waste: 20, convenience: 12 };
  const urgScore = { critical: 40, high: 25, medium: 12, low: 5 };
  let score = (catScore[category] || 12) + (urgScore[urgency] || 12);
  score += Math.min(reportCount * 2, 10);
  score += Math.min(Math.floor(hoursOpen / 6) * 2, 20);
  return Math.min(Math.round(score), 100);
};

export const getPriorityMeta = (score) => {
  if (score >= 75) return { label: 'Critical', color: '#ff4444', bg: 'rgba(255,68,68,0.12)' };
  if (score >= 50) return { label: 'High',     color: '#ff8800', bg: 'rgba(255,136,0,0.12)' };
  if (score >= 30) return { label: 'Medium',   color: '#ffcc00', bg: 'rgba(255,204,0,0.12)' };
  return               { label: 'Low',     color: '#00cc66', bg: 'rgba(0,204,102,0.12)' };
};

// ── Submit Generic Report ─────────────────────────────────────────────────────
export const reportIssue = async (issueData) => {
  const reportId = uuidv4();
  const timestamp = new Date().toISOString();
  const score = calcPriority({ category: issueData.category, urgency: issueData.urgency });

  // Determine which table to use
  let table = TABLES.WASTE;
  let snsKey = 'waste';
  if (issueData.category === 'accident') { table = TABLES.ACCIDENTS; snsKey = 'accident'; }
  else if (issueData.category === 'crime' || issueData.category === 'safety') { table = TABLES.CRIMES; snsKey = 'crime'; }

  const report = {
    reportId,
    timestamp,
    reporterId: issueData.userId || 'anonymous',
    location: issueData.location || 'Unknown',
    description: issueData.description || issueData.title || '',
    category: issueData.category || 'waste',
    severity: score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 30 ? 'medium' : 'low',
    urgency: issueData.urgency || 'medium',
    status: 'pending',
    imageUrls: issueData.imageUrls || [],
    priorityScore: score,
    blockchainHash: '',
    aiConfidenceScore: 0,
    createdAt: timestamp,
  };

  try {
    const res = await fetch(`http://localhost:5000/api/reports/?type=${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    if (!res.ok) throw new Error('Failed to submit report to backend');
  } catch (err) {
    console.error('Backend API error:', err);
    // Fallback if backend is down, though it breaks the architecture pattern.
    await dbPut(table, report);
  }

  // Blockchain audit
  const auditLog = await createAuditLog('REPORT', reportId, report);
  if (auditLog) {
    await dbUpdate(table, { reportId, timestamp },
      'SET blockchainHash = :h',
      { ':h': auditLog.blockchainHash }
    );
  }

  // SNS alert removed: The AWS Lambda function attached to the DynamoDB stream
  // will now automatically handle SNS publishing for high severity items.

  return { id: reportId, ...report };
};

// ── Accident Reports ──────────────────────────────────────────────────────────
export const submitAccidentReport = async (data) =>
  reportIssue({ ...data, category: 'accident' });

export const getAccidentReports = async ({ severity, status } = {}) => {
  if (severity) {
    return await dbQuery(TABLES.ACCIDENTS, {
      indexName: 'severity-index',
      keyCondition: 'severity = :s',
      expressionValues: { ':s': severity },
      scanForward: false,
    });
  }
  return await dbScan(TABLES.ACCIDENTS);
};

// ── Crime Reports ─────────────────────────────────────────────────────────────
export const submitCrimeReport = async (data) =>
  reportIssue({ ...data, category: 'crime' });

export const getCrimeReports = async ({ crimeType, status } = {}) => {
  if (crimeType) {
    return await dbQuery(TABLES.CRIMES, {
      indexName: 'crimeType-index',
      keyCondition: 'crimeType = :t',
      expressionValues: { ':t': crimeType },
      scanForward: false,
    });
  }
  return await dbScan(TABLES.CRIMES);
};

// ── Waste Reports ─────────────────────────────────────────────────────────────
export const getWasteReports = async ({ status } = {}) => {
  if (status) {
    return await dbQuery(TABLES.WASTE, {
      indexName: 'status-index',
      keyCondition: '#s = :s',
      expressionValues: { ':s': status },
      expressionNames: { '#s': 'status' },
      scanForward: false,
    });
  }
  return await dbScan(TABLES.WASTE);
};

export const confirmWasteReport = async (reportId, timestamp, userId) => {
  return await dbUpdate(
    TABLES.WASTE,
    { reportId, timestamp },
    'ADD confirmations :one',
    { ':one': 1 }
  );
};

// ── Get All Issues (legacy compatibility) ─────────────────────────────────────
export const getIssues = async () => {
  const [accidents, crimes, waste] = await Promise.all([
    dbScan(TABLES.ACCIDENTS),
    dbScan(TABLES.CRIMES),
    dbScan(TABLES.WASTE),
  ]);
  return [...accidents, ...crimes, ...waste].sort((a, b) =>
    new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt)
  );
};

export const subscribeToIssues = (callback) => {
  getIssues().then(callback);
  const interval = setInterval(() => getIssues().then(callback), 15000);
  return () => clearInterval(interval);
};

// ── Update Status ─────────────────────────────────────────────────────────────
export const updateIssueStatus = async (reportId, timestamp, status, table = TABLES.WASTE) => {
  return await dbUpdate(table, { reportId, timestamp }, 'SET #s = :s',
    { ':s': status }, { '#s': 'status' });
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const getDatabaseAnalytics = async () => {
  try {
    const issues = await getIssues();
    const total = issues.length;
    const resolved = issues.filter(i => i.status === 'resolved' || i.status === 'collected').length;
    const critical = issues.filter(i => i.severity === 'critical').length;
    const avgPriority = total ? Math.round(issues.reduce((s, i) => s + (i.priorityScore || 50), 0) / total) : 50;

    const accidents = issues.filter(i => i.category === 'accident').length;
    const crimes = issues.filter(i => i.category === 'crime').length;
    const waste = issues.filter(i => !['accident','crime'].includes(i.category)).length;

    const overallScore = Math.round(100 - (critical * 5 + (total - resolved) * 0.5));

    return {
      success: true,
      source: 'Amazon DynamoDB',
      data: {
        summary: { total, resolved, critical, avgPriority },
        categories: [
          { name: 'Accidents', value: accidents },
          { name: 'Crimes', value: crimes },
          { name: 'Waste', value: waste },
        ],
        statuses: [
          { name: 'Pending', value: issues.filter(i => i.status === 'pending').length },
          { name: 'In Progress', value: issues.filter(i => i.status === 'in-progress').length },
          { name: 'Resolved', value: resolved },
        ],
        cityHealth: {
          cleanlinessScore: Math.max(50, 100 - waste * 2),
          safetyScore: Math.max(50, 100 - crimes * 3),
          trafficScore: Math.max(50, 100 - accidents * 2),
          overallScore: Math.max(0, Math.min(100, overallScore)),
          overallRating: overallScore >= 90 ? 'A+' : overallScore >= 80 ? 'A' : overallScore >= 70 ? 'B' : 'C',
          stats: { totalCrimes: crimes, totalAccidents: accidents, totalWaste: waste },
        },
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ── Legacy stubs ──────────────────────────────────────────────────────────────
export const createAlert = async (alertData) => ({});
export const subscribeToAlerts = (callback) => { callback([]); return () => {}; };
export const markAlertRead = async () => {};
export const resolveConflicts = () => [];
export const generateRecommendations = () => [];
