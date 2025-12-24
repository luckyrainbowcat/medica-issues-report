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

  // Initialize with service account if available, otherwise use default credentials
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Use service account from environment variable (JSON string)
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: 'medica-issuev2.firebasestorage.app',
      });
    } else {
      // Use Application Default Credentials (works on Vercel with GOOGLE_APPLICATION_CREDENTIALS)
      // Or use project ID for emulator/testing
      adminApp = initializeApp({
        projectId: 'medica-issuev2',
        storageBucket: 'medica-issuev2.firebasestorage.app',
      });
    }
  } catch (error: any) {
    // If initialization fails, try without credentials (for local development)
    console.warn('Firebase Admin initialization warning:', error.message);
    adminApp = initializeApp({
      projectId: 'medica-issuev2',
      storageBucket: 'medica-issuev2.firebasestorage.app',
    });
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

