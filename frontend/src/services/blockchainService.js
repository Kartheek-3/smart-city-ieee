/**
 * AWS Blockchain Audit Service — SmartCity Platform
 * Replaces: Firebase security logs
 * Uses: DynamoDB AuditLogs table with SHA-256 chained hashes
 */
import CryptoJS from 'crypto-js';
import { dbPut, dbQuery, TABLES } from './dynamoService';

const generateHash = (entityType, entityId, data, previousHash) => {
  const content = `${entityType}:${entityId}:${JSON.stringify(data)}:${previousHash}`;
  return CryptoJS.SHA256(content).toString();
};

const getLastHash = async (entityType) => {
  try {
    const items = await dbQuery(TABLES.AUDIT, {
      indexName: 'entityType-index',
      keyCondition: 'entityType = :et',
      expressionValues: { ':et': entityType },
      limit: 1,
      scanForward: false,
    });
    return items[0]?.blockchainHash || '0'.repeat(64);
  } catch {
    return '0'.repeat(64);
  }
};

export const createAuditLog = async (entityType, entityId, data, action = 'created') => {
  try {
    const previousHash = await getLastHash(entityType);
    const blockchainHash = generateHash(entityType, entityId, data, previousHash);
    const logId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timestamp = new Date().toISOString();
    const transactionId = CryptoJS.SHA256(`${logId}:${timestamp}`).toString().slice(0, 16);

    const log = {
      logId,
      timestamp,
      entityType,
      entityId,
      action,
      data: JSON.stringify(data),
      blockchainHash,
      previousHash,
      transactionId,
    };

    await dbPut(TABLES.AUDIT, log);
    return log;
  } catch (error) {
    console.error('Audit log failed:', error);
    return null;
  }
};

export const verifyAuditChain = async (entityType) => {
  const items = await dbQuery(TABLES.AUDIT, {
    indexName: 'entityType-index',
    keyCondition: 'entityType = :et',
    expressionValues: { ':et': entityType },
    scanForward: true,
  });

  let valid = true;
  for (let i = 1; i < items.length; i++) {
    const expected = generateHash(
      items[i].entityType, items[i].entityId,
      JSON.parse(items[i].data), items[i - 1].blockchainHash
    );
    if (expected !== items[i].blockchainHash) {
      valid = false;
      break;
    }
  }
  return { valid, totalBlocks: items.length };
};

export const getAuditLogs = async (entityType, limit = 50) => {
  return await dbQuery(TABLES.AUDIT, {
    indexName: 'entityType-index',
    keyCondition: 'entityType = :et',
    expressionValues: { ':et': entityType },
    limit,
    scanForward: false,
  });
};
