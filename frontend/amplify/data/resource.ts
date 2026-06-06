import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  User: a.model({
    email: a.string(),
    displayName: a.string(),
    role: a.string(), // admin, resident, responder, etc.
    avatarUrl: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  AccidentReport: a.model({
    userId: a.string(),
    location: a.string(),
    description: a.string(),
    status: a.string(),
    severity: a.string(),
    ambulanceRequested: a.boolean(),
  }).authorization(allow => [allow.publicApiKey()]),

  CrimeReport: a.model({
    userId: a.string(),
    type: a.string(),
    location: a.string(),
    description: a.string(),
    status: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  WasteReport: a.model({
    userId: a.string(),
    location: a.string(),
    description: a.string(),
    status: a.string(), // pending, collected
    imageUrl: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  Message: a.model({
    senderId: a.string(),
    receiverId: a.string(),
    content: a.string(),
    read: a.boolean(),
  }).authorization(allow => [allow.publicApiKey()]),

  FoodDonation: a.model({
    donorId: a.string(),
    foodType: a.string(),
    quantity: a.string(),
    location: a.string(),
    expirationDate: a.datetime(),
    status: a.string(), // available, claimed
    claimedById: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  TrustScore: a.model({
    userId: a.string(),
    score: a.integer(),
    lastUpdated: a.datetime(),
  }).authorization(allow => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
