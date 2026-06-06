import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';

const backend = defineBackend({
  auth,
  data,
});

const cfnUserPool = backend.auth.resources.userPool;
cfnUserPool.addDomain('CognitoDomain', {
  cognitoDomain: {
    domainPrefix: 'smartcity-auth-20156525147',
  },
});
