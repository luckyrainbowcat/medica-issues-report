// โหลด environment variables จากไฟล์ .env
import dotenv from 'dotenv';
dotenv.config();

import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Initialize Firebase Admin SDK
// ใช้ Service Account Key จาก environment variable หรือไฟล์
if (!admin.apps.length) {
  try {
    // วิธีที่ 1: ใช้ Service Account Key จากไฟล์ (แนะนำสำหรับ development)
    // ตั้งค่า FIREBASE_SERVICE_ACCOUNT_PATH ใน .env เช่น: ./serviceAccountKey.json
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: 'medica-issuev2', // ใช้ Firebase project เดียวกันกับโปรเจกต์หลัก
        });
        console.log('Firebase Admin initialized from service account file');
      } else {
        throw new Error(`Service account file not found: ${serviceAccountPath}`);
      }
    }
    // วิธีที่ 2: ใช้ Service Account Key จาก environment variable (JSON string)
    // ตั้งค่า FIREBASE_SERVICE_ACCOUNT_KEY ใน .env (JSON string)
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'medica-issuev2', // ใช้ Firebase project เดียวกันกับโปรเจกต์หลัก
      });
      console.log('Firebase Admin initialized from environment variable');
    }
    // วิธีที่ 3: ลองหาไฟล์ serviceAccountKey.json ใน root directory
    else {
      const defaultPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
      if (fs.existsSync(defaultPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: 'medica-issuev2', // ใช้ Firebase project เดียวกันกับโปรเจกต์หลัก
        });
        console.log('Firebase Admin initialized from default service account file');
      } else {
        // วิธีที่ 4: ใช้ default credentials (สำหรับ Firebase Functions หรือ GCP)
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: 'medica-issuev2', // ใช้ Firebase project เดียวกันกับโปรเจกต์หลัก
        });
        console.log('Firebase Admin initialized with default credentials');
      }
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
}

export const db = admin.firestore();
export { admin };

