/**
 * AWS Waste Management Service — SmartCity Platform
 * Replaces: Firebase wasteService.js
 * Uses: DynamoDB WasteReports table
 */
import { v4 as uuidv4 } from 'uuid';
import { dbPut, dbQuery, dbScan, dbUpdate, TABLES } from './dynamoService';
import { createAuditLog } from './blockchainService';

// ── Submit Waste Report ───────────────────────────────────────────────────────
export const submitWasteReport = async (data) => {
  const reportId = uuidv4();
  const timestamp = new Date().toISOString();

  const report = {
    reportId,
    timestamp,
    reporterId: data.userId || 'anonymous',
    location: data.location || 'Unknown',
    zone: data.zone || 'general',
    wasteType: data.wasteType || 'garbage',
    severity: data.severity || 'medium',
    description: data.description || '',
    imageUrls: data.imageUrls || [],
    status: 'reported',
    confirmations: 0,
    isDuplicate: false,
    blockchainHash: '',
    createdAt: timestamp,
  };

  await dbPut(TABLES.WASTE, report);

  // Blockchain audit
  const audit = await createAuditLog('WasteReport', reportId, report);
  if (audit) {
    await dbUpdate(TABLES.WASTE, { reportId, timestamp },
      'SET blockchainHash = :h', { ':h': audit.blockchainHash });
  }

  // SNS alert removed: Handled server-side via DynamoDB Lambda trigger

  return report;
};

// ── Get Waste Reports ─────────────────────────────────────────────────────────
export const getWasteReports = async ({ status, zone } = {}) => {
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

// ── Community Confirmation ────────────────────────────────────────────────────
export const confirmWasteReport = async (reportId, timestamp) => {
  return await dbUpdate(TABLES.WASTE, { reportId, timestamp },
    'ADD confirmations :one', { ':one': 1 });
};

// ── Update Status ─────────────────────────────────────────────────────────────
export const updateWasteStatus = async (reportId, timestamp, status) => {
  return await dbUpdate(TABLES.WASTE, { reportId, timestamp },
    'SET #s = :s', { ':s': status }, { '#s': 'status' });
};

// ── Heatmap Data ──────────────────────────────────────────────────────────────
export const getWasteHeatmapData = async () => {
  const reports = await dbScan(TABLES.WASTE, {
    filterExpression: '#s <> :resolved',
    expressionValues: { ':resolved': 'resolved' },
    expressionNames: { '#s': 'status' },
  });

  return reports
    .filter(r => r.location)
    .map(r => ({
      location: r.location,
      severity: r.severity,
      confirmations: r.confirmations || 0,
      wasteType: r.wasteType,
      reportId: r.reportId,
    }));
};

// ── Route Optimization (simulated) ───────────────────────────────────────────
export const optimizeCollectionRoutes = async () => {
  const pending = await getWasteReports({ status: 'reported' });
  const zones = {};
  pending.forEach(r => {
    const zone = r.zone || 'general';
    if (!zones[zone]) zones[zone] = [];
    zones[zone].push(r);
  });

  return Object.entries(zones).map(([zone, reports]) => ({
    zone,
    reportCount: reports.length,
    priority: reports.some(r => r.severity === 'high') ? 'high' : 'normal',
    estimatedTime: `${Math.ceil(reports.length * 15)} mins`,
  }));
};

// ── Subscribe (polling) ───────────────────────────────────────────────────────
export const subscribeToWasteReports = (callback) => {
  getWasteReports().then(callback);
  const interval = setInterval(() => getWasteReports().then(callback), 10000);
  return () => clearInterval(interval);
};

// Aliases for missing exports
export const reportWaste = submitWasteReport;
export const upvoteWasteReport = confirmWasteReport;

export const resolveWasteReport = async (reportId) => {
  return await updateWasteStatus(reportId, new Date().toISOString(), 'resolved');
};

export const subscribeToActiveRoutes = (callback) => {
  optimizeCollectionRoutes().then(callback);
  const interval = setInterval(() => optimizeCollectionRoutes().then(callback), 15000);
  return () => clearInterval(interval);
};

export const calculateCleanlinessScore = async () => {
  const reports = await getWasteReports();
  const total = reports.length;
  if (total === 0) return 100;
  const resolved = reports.filter(r => r.status === 'resolved').length;
  return Math.round((resolved / total) * 100);
};

export const generateCollectionRoute = async (locations) => {
  return { stops: locations, estimatedTime: '1h 30m', priority: 'normal' };
};

export const updateRouteStatus = async (routeId, status) => {
  return { routeId, status };
};
