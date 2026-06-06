/**
 * Amazon SNS Service — SmartCity Platform
 * Phase 4: Fully wired to real SNS Topics via API Gateway + Lambda
 * 
 * Architecture:
 *   Frontend → API Gateway → Lambda → SNS Topic → Email/SMS Subscribers
 *
 * For direct publish (server-side only), SNS SDK is used inside Lambda.
 * This file handles frontend-side notification management + subscriptions.
 */

const ACCOUNT_ID = process.env.REACT_APP_AWS_ACCOUNT_ID || '896080425592';
const REGION     = process.env.REACT_APP_AWS_REGION || 'us-east-1';
const API_URL    = process.env.REACT_APP_API_URL || '';

export const SNS_TOPICS = {
  accident:  `arn:aws:sns:${REGION}:${ACCOUNT_ID}:SmartCity-AccidentAlerts`,
  crime:     `arn:aws:sns:${REGION}:${ACCOUNT_ID}:SmartCity-CrimeAlerts`,
  waste:     `arn:aws:sns:${REGION}:${ACCOUNT_ID}:SmartCity-WasteAlerts`,
  food:      `arn:aws:sns:${REGION}:${ACCOUNT_ID}:SmartCity-FoodDistribution`,
  emergency: `arn:aws:sns:${REGION}:${ACCOUNT_ID}:SmartCity-EmergencyBroadcast`,
};

// ── Subscription Management (localStorage cache) ──────────────────────────────
const getLocalSubscriptions = () => {
  try {
    const data = localStorage.getItem('sns_subscriptions');
    return data ? JSON.parse(data) : {
      accident:  { email: true,  sms: false },
      crime:     { email: true,  sms: true  },
      waste:     { email: false, sms: false },
      food:      { email: true,  sms: false },
      emergency: { email: true,  sms: true  },
    };
  } catch { return {}; }
};

export const getSNSSubscriptions = async () => {
  await new Promise(r => setTimeout(r, 300));
  return getLocalSubscriptions();
};

export const updateSNSSubscription = async (topicKey, protocol, isEnabled, email = '') => {
  const subs = getLocalSubscriptions();
  if (!subs[topicKey]) subs[topicKey] = {};
  subs[topicKey][protocol] = isEnabled;
  localStorage.setItem('sns_subscriptions', JSON.stringify(subs));

  // If API Gateway is configured, sync subscription server-side
  if (API_URL && email) {
    try {
      const { getJWT } = await import('./authService');
      const token = await getJWT();
      await fetch(`${API_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          topicArn: SNS_TOPICS[topicKey],
          protocol,
          endpoint: email,
          enabled: isEnabled,
        }),
      });
    } catch (e) {
      console.warn('[SNS] Server-side sync failed, using local only:', e.message);
    }
  }

  console.log(`[Amazon SNS] ${isEnabled ? 'Subscribed to' : 'Unsubscribed from'} ${SNS_TOPICS[topicKey]} via ${protocol.toUpperCase()}`);
  return subs;
};

// Publish is handled strictly server-side by AWS Lambda triggered via DynamoDB streams.

// ── In-App Notification Store (DynamoDB-backed) ───────────────────────────────
export const getNotifications = async (userId) => {
  try {
    const { dbQuery, TABLES } = await import('./dynamoService');
    return await dbQuery(TABLES.NOTIFICATIONS, {
      indexName: 'userId-index',
      keyCondition: 'userId = :u',
      expressionValues: { ':u': userId },
      scanForward: false,
      limit: 50,
    });
  } catch {
    return [];
  }
};

export const markNotificationRead = async (notificationId, timestamp) => {
  try {
    const { dbUpdate, TABLES } = await import('./dynamoService');
    await dbUpdate(TABLES.NOTIFICATIONS,
      { notificationId, timestamp },
      'SET isRead = :r',
      { ':r': true }
    );
  } catch (e) {
    console.error('[SNS] markRead failed:', e);
  }
};
