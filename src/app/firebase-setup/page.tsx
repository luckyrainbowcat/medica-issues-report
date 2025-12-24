'use client';

import { useState } from 'react';

export default function FirebaseSetupPage() {
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<any>(null);

  const checkFirestoreStatus = async () => {
    setChecking(true);
    try {
      // Try to create a test document to check if Firestore is enabled
      const response = await fetch('/api/firebase-check', {
        method: 'POST',
      });
      const data = await response.json();
      setStatus(data);
    } catch (error: any) {
      setStatus({
        enabled: false,
        error: error.message,
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Firebase Setup Guide</h1>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-red-800 mb-4">⚠️ ปัญหาที่พบ</h2>
          <p className="text-red-700 mb-4">
            Firestore API ยังไม่ได้เปิดใช้งานในโปรเจกต์ Firebase ของคุณ
          </p>
          <div className="bg-red-100 p-4 rounded mb-4">
            <p className="text-sm font-mono text-red-800">
              Error: Cloud Firestore API has not been used in project medica-issuev2 before or it is disabled.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">วิธีแก้ไข</h2>
          
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold mb-2">ขั้นตอนที่ 1: เปิดใช้งาน Firestore API</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>คลิกที่ลิงก์ด้านล่างเพื่อไปยัง Google Cloud Console</li>
                <li>เลือกโปรเจกต์: <code className="bg-gray-100 px-2 py-1 rounded">medica-issuev2</code></li>
                <li>กดปุ่ม "Enable" เพื่อเปิดใช้งาน Firestore API</li>
                <li>รอสักครู่ (ประมาณ 1-2 นาที) เพื่อให้ระบบอัปเดต</li>
              </ol>
              <div className="mt-4">
                <a
                  href="https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=medica-issuev2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 font-semibold"
                >
                  เปิดใช้งาน Firestore API →
                </a>
              </div>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold mb-2">ขั้นตอนที่ 2: ตั้งค่า Firestore Database</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>ไปที่ <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Firebase Console</a></li>
                <li>เลือกโปรเจกต์: <code className="bg-gray-100 px-2 py-1 rounded">medica-issues-report</code></li>
                <li>ไปที่ Firestore Database (ในเมนูด้านซ้าย)</li>
                <li>กด "Create database" ถ้ายังไม่ได้สร้าง</li>
                <li>เลือก "Start in test mode" (สำหรับ development)</li>
                <li>เลือก location (แนะนำ: asia-southeast1 หรือ asia-southeast2)</li>
              </ol>
              <div className="mt-4">
                <a
                  href="https://console.firebase.google.com/project/medica-issuev2/firestore"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600 font-semibold"
                >
                  ไปที่ Firestore Database →
                </a>
              </div>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-semibold mb-2">ขั้นตอนที่ 3: ตั้งค่า Firestore Security Rules</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>ในหน้า Firestore Database กดแท็บ "Rules"</li>
                <li>ตั้งค่า rules ดังนี้ (สำหรับ development):</li>
              </ol>
              <div className="mt-4 bg-gray-900 text-green-400 p-4 rounded font-mono text-xs overflow-x-auto">
                <pre>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}</pre>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                ⚠️ Rules นี้อนุญาตให้ทุกคนอ่าน/เขียนได้ (เหมาะสำหรับ development เท่านั้น)
              </p>
              <div className="mt-4">
                <a
                  href="https://console.firebase.google.com/project/medica-issuev2/firestore/rules"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-3 bg-purple-500 text-white rounded hover:bg-purple-600 font-semibold"
                >
                  ไปที่ Firestore Rules →
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">ตรวจสอบสถานะ</h2>
          <button
            onClick={checkFirestoreStatus}
            disabled={checking}
            className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 font-semibold"
          >
            {checking ? 'กำลังตรวจสอบ...' : 'ตรวจสอบ Firestore Status'}
          </button>

          {status && (
            <div className="mt-4 p-4 rounded" style={{
              backgroundColor: status.enabled ? '#d1fae5' : '#fee2e2'
            }}>
              <p className="font-semibold">
                {status.enabled ? '✅ Firestore เปิดใช้งานแล้ว' : '❌ Firestore ยังไม่ได้เปิดใช้งาน'}
              </p>
              {status.error && (
                <p className="text-sm mt-2 text-red-700">{status.error}</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">💡 คำแนะนำ</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• หลังจากเปิดใช้งาน API แล้ว รอสักครู่ (1-2 นาที) ก่อนลองใหม่</li>
            <li>• ถ้ายังมีปัญหา ลอง restart dev server: <code className="bg-yellow-100 px-2 py-1 rounded">npm run dev</code></li>
            <li>• ตรวจสอบว่า billing account ถูกเปิดใช้งาน (Firestore ต้องการ billing)</li>
            <li>• สำหรับ production ควรตั้งค่า Security Rules ที่ปลอดภัยกว่า</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

