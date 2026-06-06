import { dbPut, dbGet, dbScan, dbUpdate, TABLES } from './dynamoService';
import { analyzeAccidentSeverity } from './sagemaker';
import { awardCivicPoints } from './engagementService';

// ── Accident Management System ──────────────────────────────

export const reportAccident = async (accidentData, user) => {
  const aiAnalysis = await analyzeAccidentSeverity(accidentData.description, accidentData.location);
  
  const id = `acc_${Date.now()}`;
  const timestamp = new Date().toISOString();
  const newAcc = {
    reportId: id,
    timestamp: timestamp,
    userId: user?.uid || 'Anonymous',
    location: accidentData.location,
    description: accidentData.description,
    severity: aiAnalysis.severity,
    status: 'pending',
    ambulanceRequested: accidentData.ambulanceRequested || false,
    createdAt: timestamp
  };
  
  await dbPut(TABLES.ACCIDENTS, newAcc);

  if (aiAnalysis.severity === 'critical') {
    await triggerEmergencyAlert('Accident', `Critical accident detected at ${accidentData.location}: ${aiAnalysis.summary}`);
  }

  await awardCivicPoints(user?.uid, 20, 'Reported an accident');
  return newAcc;
};

export const subscribeToAccidents = (callback) => {
  dbScan(TABLES.ACCIDENTS).then(callback);
  const interval = setInterval(() => dbScan(TABLES.ACCIDENTS).then(callback), 10000);
  return () => clearInterval(interval);
};

export const updateAccidentStatus = async (id, timestamp, newStatus) => {
  await dbUpdate(TABLES.ACCIDENTS, { reportId: id, timestamp }, 'SET #status = :s', { ':s': newStatus }, { '#status': 'status' });
};

export const verifyAccident = async (accidentId, userId) => {
  return true;
};

// ── Emergency Response System ───────────────────────────────

export const requestAmbulance = async (location, details, user) => {
  const id = `amb_${Date.now()}`;
  const timestamp = new Date().toISOString();
  const newAmb = {
    reportId: id,
    timestamp: timestamp,
    userId: user?.uid || 'Anonymous',
    location,
    description: details,
    status: 'dispatched',
    severity: 'critical',
    ambulanceRequested: true,
    createdAt: timestamp
  };
  await dbPut(TABLES.ACCIDENTS, newAmb);
  
  await triggerEmergencyAlert('Ambulance', `Ambulance dispatched to ${location}`);
  return newAmb;
};

export const subscribeToEmergencies = (callback) => {
  const fetchEm = async () => {
    const items = await dbScan(TABLES.ACCIDENTS);
    callback(items.filter(i => i.ambulanceRequested === true));
  };
  fetchEm();
  const interval = setInterval(fetchEm, 10000);
  return () => clearInterval(interval);
};

export const triggerEmergencyAlert = async (type, message, priority='High', department='General', senderId='SYSTEM') => {
  const { getJWT } = require('./authService');
  const token = await getJWT();
  const headers = { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) };
  await fetch('http://localhost:5000/api/alerts/broadcast', {
    method: 'POST',
    headers,
    body: JSON.stringify({ title: type, message, priority, department, senderId })
  });
};

export const subscribeToEmergencyAlerts = (callback) => {
  const fetchAlerts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/alerts/');
      if (response.ok) {
        const data = await response.json();
        callback(data);
      }
    } catch (e) {
      console.error(e);
    }
  };
  fetchAlerts();
  const interval = setInterval(fetchAlerts, 10000);
  return () => clearInterval(interval);
};

// ── Crime Monitoring System ─────────────────────────────────

export const reportCrime = async (crimeData, user) => {
  const id = `crime_${Date.now()}`;
  const timestamp = new Date().toISOString();
  const newCrime = {
    reportId: id,
    timestamp: timestamp,
    userId: user?.uid || 'Anonymous',
    type: crimeData.type || 'General',
    location: crimeData.location,
    description: crimeData.description,
    status: 'investigating',
    createdAt: timestamp
  };
  await dbPut(TABLES.CRIMES, newCrime);
  
  await awardCivicPoints(user?.uid, 15, 'Reported a crime/suspicious activity');
  return newCrime;
};

export const subscribeToCrimes = (callback) => {
  dbScan(TABLES.CRIMES).then(callback);
  const interval = setInterval(() => dbScan(TABLES.CRIMES).then(callback), 10000);
  return () => clearInterval(interval);
};

export const updateCrimeStatus = async (id, timestamp, newStatus) => {
  await dbUpdate(TABLES.CRIMES, { reportId: id, timestamp }, 'SET #status = :s', { ':s': newStatus }, { '#status': 'status' });
};

// ── Police Assistance System ────────────────────────────────

export const requestPoliceDispatch = async (location, reason, user) => {
  const id = `police_${Date.now()}`;
  const timestamp = new Date().toISOString();
  const newPolice = {
    reportId: id,
    timestamp: timestamp,
    userId: user?.uid || 'Anonymous',
    type: 'Emergency Dispatch',
    location,
    description: reason,
    status: 'en_route',
    createdAt: timestamp
  };
  await dbPut(TABLES.CRIMES, newPolice);
  
  await triggerEmergencyAlert('Police', `Police unit dispatched to ${location}`);
  return newPolice;
};

export const subscribeToPoliceDispatches = (callback) => {
  const fetchDisp = async () => {
    const items = await dbScan(TABLES.CRIMES);
    callback(items.filter(i => i.type === 'Emergency Dispatch'));
  };
  fetchDisp();
  const interval = setInterval(fetchDisp, 10000);
  return () => clearInterval(interval);
};
