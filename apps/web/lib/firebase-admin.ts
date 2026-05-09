import 'server-only';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

/**
 * Lazy-initialise the Firebase Admin SDK. We defer init until first call so
 * the build doesn't fail when an instance doesn't have the Firebase env vars
 * set (e.g. a new site that opts into the lib/otp.ts auth path and skips
 * Firebase entirely). The throw still fires at runtime if a route that needs
 * Firebase is hit on a deployment that wasn't configured for it.
 */
let cachedAuth: Auth | null = null;

export function getAdminAuth(): Auth {
  if (cachedAuth) return cachedAuth;

  const existing = getApps()[0];
  if (existing) {
    cachedAuth = getAuth(existing);
    return cachedAuth;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin env vars missing. Need FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY.',
    );
  }

  const app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  cachedAuth = getAuth(app);
  return cachedAuth;
}
