import { defineAuth, secret } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
        scopes: ['profile', 'email', 'openid'],
      },
      callbackUrls: ['http://localhost:3000', 'https://localhost:3000'],
      logoutUrls: ['http://localhost:3000', 'https://localhost:3000'],
    },
  },
});
