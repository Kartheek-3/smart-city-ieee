/**
 * Authentication Service — SmartCity Platform
 * Uses: Firebase Authentication for identity, DynamoDB for user profiles.
 */
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signInWithPopup,
  updateProfile as updateFirebaseAuthProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { dbPut, dbGet, dbUpdate, TABLES } from './dynamoService';

// ── 1. Register ───────────────────────────────────────────────────────────────
export const registerUser = async (email, password, role = 'citizen', fullName = '') => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update Firebase Profile
    if (fullName) {
      await updateFirebaseAuthProfile(user, { displayName: fullName });
    }

    // Sync user with Flask Backend
    await fetch('http://localhost:5000/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.uid,
        email: user.email,
        name: fullName || 'Citizen',
        role: role
      })
    });

    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ── 2. Login ──────────────────────────────────────────────────────────────────
export const loginUser = async (email, password) => {
  const cleanEmail = email.trim().toLowerCase();
  try {
    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    } catch (err) {
      if (cleanEmail === 'super@gmail.com' && password === 'superadmin') {
        const res = await registerUser(cleanEmail, password, 'admin', 'System Admin');
        if (res.success) return { success: true, user: res.user };
        // If auto-registration fails, return its error instead of the original sign-in error
        return { success: false, error: `Admin auto-registration failed: ${res.error}` };
      }
      throw err;
    }
    
    // Enforce admin role if superadmin
    if (cleanEmail === 'super@gmail.com') {
      try {
        await dbUpdate(TABLES.USERS, { userId: userCredential.user.uid }, 'SET #r = :r', { ':r': 'admin' }, { '#r': 'role' });
      } catch (e) {
        console.error('Failed to enforce admin role:', e);
      }
    }
    
    // Sync user with Flask Backend
    await fetch('http://localhost:5000/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userCredential.user.uid,
        email: userCredential.user.email,
        name: userCredential.user.displayName || 'Citizen',
        role: cleanEmail === 'super@gmail.com' ? 'admin' : 'citizen'
      })
    });

    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ── 3. Google Sign-In ─────────────────────────────────────────────────────────
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Sync user with Flask Backend (checks if exists, creates if not)
    await fetch('http://localhost:5000/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.uid,
        email: user.email,
        name: user.displayName || 'Citizen',
        role: 'citizen'
      })
    });

    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ── 4. Logout ─────────────────────────────────────────────────────────────────
export const logout = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ── 5. Password Reset ─────────────────────────────────────────────────────────
export const sendPasswordResetEmail = async (email) => {
  try {
    await firebaseSendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Alias for backwards compatibility
export const resetPasswordRequest = sendPasswordResetEmail;
export const resetPassword = sendPasswordResetEmail;

// ── 6. Get Current User ───────────────────────────────────────────────────────
export const fetchCurrentUser = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return null;

    // Load the full profile from DynamoDB
    const profile = await dbGet(TABLES.USERS, { userId: user.uid });

    return {
      uid: user.uid,
      userId: user.uid,
      email: user.email,
      name: user.displayName || user.email,
      displayName: user.displayName || user.email,
      role: profile?.role || 'citizen',
      trustScore: profile?.trustScore ?? 50,
      trustLevel: profile?.trustLevel ?? 'normal',
      ...profile,
    };
  } catch {
    return null;
  }
};

// ── 7. Get JWT Token ──────────────────────────────────────────────────────────
export const getJWT = async () => {
  try {
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken();
    }
    return null;
  } catch {
    return null;
  }
};

// ── 8. Get / Update User Profile ─────────────────────────────────────────────
export const getUserData = async (uid) => {
  const data = await dbGet(TABLES.USERS, { userId: uid });
  if (!data) return null;
  return {
    ...data,
    uid: data.userId,
    name: data.displayName
  };
};

export const updateProfile = async (uid, data) => {
  try {
    // Update Firebase attributes if displayName changed
    if (data.displayName && auth.currentUser) {
      await updateFirebaseAuthProfile(auth.currentUser, { displayName: data.displayName });
    }

    // Update DynamoDB
    const updateExp = 'SET ' + Object.keys(data).map((k, i) => `#attr${i} = :val${i}`).join(', ');
    const exprNames = Object.fromEntries(Object.keys(data).map((k, i) => [`#attr${i}`, k]));
    const exprVals = Object.fromEntries(Object.entries(data).map(([, v], i) => [`:val${i}`, v]));
    await dbUpdate(TABLES.USERS, { userId: uid }, updateExp, exprVals, exprNames);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateUserRole = async (uid, role) => updateProfile(uid, { role });

// ── 9. Subscribe to User (real-time polling simulation) ──────────────────────
export const subscribeToUserData = (uid, callback) => {
  // DynamoDB doesn't push changes; we poll every 30s as a fallback
  getUserData(uid).then(callback);
  const interval = setInterval(() => getUserData(uid).then(callback), 30000);
  return () => clearInterval(interval);
};

export const subscribeToAllUsers = (callback) => {
  const { dbScan } = require('./dynamoService');
  dbScan(TABLES.USERS).then(callback);
  const interval = setInterval(() => dbScan(TABLES.USERS).then(callback), 30000);
  return () => clearInterval(interval);
};

// ── 10. Security Event Logging ────────────────────────────────────────────────
export const logSecurityEvent = async (eventData) => {
  try {
    const { createAuditLog } = await import('./blockchainService');
    await createAuditLog('SECURITY_EVENT', eventData.userId || 'SYSTEM', eventData);
  } catch (e) {
    console.error('Failed to log security event', e);
  }
};

// ── Legacy helpers (no-ops for compatibility) ─────────────────────────────────
export const setupRecaptcha = (containerId) => {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: (response) => {
        // reCAPTCHA solved
      }
    });
  }
  return window.recaptchaVerifier;
};

export const sendPhoneOtp = async (phoneNumber, appVerifier) => {
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    return confirmationResult;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const verifyPhoneOtp = async (confirmationResult, otp) => {
  try {
    const result = await confirmationResult.confirm(otp);
    const user = result.user;
    
    // Check if user exists in DynamoDB, if not create profile
    const existingProfile = await dbGet(TABLES.USERS, { userId: user.uid });
    if (!existingProfile) {
      await dbPut(TABLES.USERS, {
        userId: user.uid,
        email: user.phoneNumber, // Use phone number as email fallback for display
        displayName: 'Citizen',
        role: 'citizen',
        trustScore: 50,
        trustLevel: 'normal',
        validReports: 0,
        fakeReports: 0,
        communityConfirmations: 0,
        followers: 0,
        following: 0,
        isVerified: true, // Phone is verified
        createdAt: new Date().toISOString(),
      });
    }
    
    return { success: true, user };
  } catch (error) {
    throw new Error(error.message);
  }
};
export const confirmUserSignUp = async () => ({ success: true, isSignUpComplete: true });
