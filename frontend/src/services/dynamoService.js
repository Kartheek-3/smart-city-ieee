/**
 * AWS DynamoDB Service — SmartCity Platform
 * Provides a thin wrapper over the DynamoDB Document Client
 * using AWS Amplify's configured credentials.
 */
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const REGION = process.env.REACT_APP_AWS_REGION || 'us-east-1';

let dynamoClientInstance = null;

const getClient = () => {
  if (!dynamoClientInstance) {
    dynamoClientInstance = new DynamoDBClient({
      region: REGION,
      credentials: {
        accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }
  return dynamoClientInstance;
};

// ── Generic CRUD helpers ──────────────────────────────────────────────────────

export const dbPut = async (tableName, item) => {
  try {
    const client = await getClient();
    await client.send(new PutItemCommand({
      TableName: tableName,
      Item: marshall(item, { removeUndefinedValues: true }),
    }));
    return item;
  } catch (error) {
    console.error(`DynamoDB Put Error (${tableName}):`, error);
    return null;
  }
};

export const dbGet = async (tableName, key) => {
  try {
    const client = await getClient();
    const { Item } = await client.send(new GetItemCommand({
      TableName: tableName,
      Key: marshall(key, { removeUndefinedValues: true }),
    }));
    return Item ? unmarshall(Item) : null;
  } catch (error) {
    console.error(`DynamoDB Get Error (${tableName}):`, error);
    return null;
  }
};

export const dbQuery = async (tableName, { indexName, keyCondition, expressionValues, expressionNames, limit, scanForward = false }) => {
  try {
    const client = await getClient();
    const { Items = [] } = await client.send(new QueryCommand({
      TableName: tableName,
      IndexName: indexName,
      KeyConditionExpression: keyCondition,
      ExpressionAttributeValues: marshall(expressionValues, { removeUndefinedValues: true }),
      ExpressionAttributeNames: expressionNames,
      Limit: limit,
      ScanIndexForward: scanForward,
    }));
    return Items.map(unmarshall);
  } catch (error) {
    console.error(`DynamoDB Query Error (${tableName}):`, error);
    return [];
  }
};

export const dbScan = async (tableName, { filterExpression, expressionValues, expressionNames, limit } = {}) => {
  try {
    const client = await getClient();
    const params = { TableName: tableName };
    if (filterExpression) {
      params.FilterExpression = filterExpression;
      params.ExpressionAttributeValues = marshall(expressionValues, { removeUndefinedValues: true });
      if (expressionNames) params.ExpressionAttributeNames = expressionNames;
    }
    if (limit) params.Limit = limit;
    const { Items = [] } = await client.send(new ScanCommand(params));
    return Items.map(unmarshall);
  } catch (error) {
    console.error(`DynamoDB Scan Error (${tableName}):`, error);
    return [];
  }
};

export const dbUpdate = async (tableName, key, updateExpression, expressionValues, expressionNames) => {
  try {
    const client = await getClient();
    const { Attributes } = await client.send(new UpdateItemCommand({
      TableName: tableName,
      Key: marshall(key, { removeUndefinedValues: true }),
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: marshall(expressionValues, { removeUndefinedValues: true }),
      ExpressionAttributeNames: expressionNames,
      ReturnValues: 'ALL_NEW',
    }));
    return Attributes ? unmarshall(Attributes) : null;
  } catch (error) {
    console.error(`DynamoDB Update Error (${tableName}):`, error);
    return null;
  }
};

// ── Table name constants ──────────────────────────────────────────────────────
export const TABLES = {
  USERS: 'SmartCity-Users',
  MESSAGES: 'SmartCity-Messages',
  FOLLOW_REQUESTS: 'SmartCity-FollowRequests',
  ACCIDENTS: 'SmartCity-AccidentReports',
  CRIMES: 'SmartCity-CrimeReports',
  WASTE: 'SmartCity-WasteReports',
  FOOD: 'SmartCity-FoodDonations',
  TRUST: 'SmartCity-TrustScores',
  NOTIFICATIONS: 'SmartCity-Notifications',
  EMERGENCY: 'SmartCity-EmergencyDispatch',
  POLICE: 'SmartCity-PoliceDispatch',
  CITY_PLANS: 'SmartCity-CityPlans',
  AUDIT: 'SmartCity-AuditLogs',
};
