import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getStorage, Storage } from 'firebase-admin/storage';

let adminApp: App | null = null;
let storage: Storage | null = null;

// Initialize Firebase Admin
export function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  // Check if already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  // Initialize with service account if available
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      // Use service account from environment variable (JSON string)
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: 'medica-issuev2.firebasestorage.app',
      });
      return adminApp;
    } catch (error: any) {
      // If JSON parsing fails, throw error
      throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY: ${error.message}`);
    }
  } else {
    // No credentials available - this is OK for local development (will fallback to local storage)
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Using local file storage fallback.');
  }

  return adminApp;
}

// Get Storage instance
export function getAdminStorage(): Storage {
  if (storage) {
    return storage;
  }

  const app = getAdminApp();
  storage = getStorage(app);
  return storage;
}

