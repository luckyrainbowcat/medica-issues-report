'use client';

import { useState } from 'react';

export default function MigratePage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/migrate');
      const data = await response.json();
      setStatus(data);
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการ migrate ข้อมูลจาก Prisma/SQLite ไปยัง Firebase Firestore?\n\nข้อมูลเดิมใน Firestore จะถูกเขียนทับ!')) {
      return;
    }

    setMigrating(true);
    setResult(null);
    try {
      const response = await fetch('/api/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'migrate' }),
      });

      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        alert('Migration สำเร็จ!');
        await checkStatus();
      } else {
        alert('Migration ล้มเหลว: ' + (data.error || 'Unknown error'));
      }
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setMigrating(false);
    }
  };

  const verifyMigration = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'verify' }),
      });

      const data = await response.json();
      setResult(data);
      
      if (data.success && data.match.all) {
        alert('✅ ข้อมูลทั้งหมดถูก migrate เรียบร้อยแล้ว!');
      } else {
        alert('⚠️  จำนวนข้อมูลไม่ตรงกัน กรุณาตรวจสอบ');
      }
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Migration Tool</h1>
        <p className="text-gray-600 mb-8">
          ย้ายข้อมูลจาก Prisma/SQLite ไปยัง Firebase Firestore
        </p>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4 mb-6">
            <button
              onClick={checkStatus}
              disabled={loading || migrating}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสถานะ'}
            </button>
            <button
              onClick={runMigration}
              disabled={loading || migrating}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {migrating ? 'กำลัง migrate...' : 'เริ่ม Migration'}
            </button>
            <button
              onClick={verifyMigration}
              disabled={loading || migrating}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              {loading ? 'กำลังตรวจสอบ...' : 'ตรวจสอบข้อมูล'}
            </button>
          </div>

          {status && (
            <div className="border-t pt-4">
              <h2 className="text-xl font-semibold mb-4">สถานะปัจจุบัน</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Prisma/SQLite</h3>
                  <ul className="text-sm space-y-1">
                    <li>Components: {status.prisma?.components || 0}</li>
                    <li>Issues: {status.prisma?.issues || 0}</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Firebase Firestore</h3>
                  <ul className="text-sm space-y-1">
                    <li>Components: {status.firestore?.components || 0}</li>
                    <li>Issues: {status.firestore?.issues || 0}</li>
                  </ul>
                </div>
              </div>
              {status.status && (
                <div className="mt-4 p-3 rounded" style={{
                  backgroundColor: status.status.allMigrated ? '#d1fae5' : '#fef3c7'
                }}>
                  <p className="text-sm font-semibold">
                    {status.status.allMigrated ? '✅ ข้อมูลทั้งหมดถูก migrate เรียบร้อยแล้ว' : '⚠️  ยังมีข้อมูลที่ยังไม่ได้ migrate'}
                  </p>
                  <ul className="text-xs mt-2 space-y-1">
                    <li>Components: {status.status.componentsMatch ? '✅' : '❌'}</li>
                    <li>Issues: {status.status.issuesMatch ? '✅' : '❌'}</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="border-t pt-4 mt-4">
              <h2 className="text-xl font-semibold mb-4">ผลลัพธ์</h2>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">⚠️ คำเตือน</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Migration จะเขียนทับข้อมูลเดิมใน Firestore</li>
            <li>• ข้อมูลใน Prisma/SQLite จะไม่ถูกลบ</li>
            <li>• แนะนำให้ backup ข้อมูลก่อน migration</li>
            <li>• Migration อาจใช้เวลาสักครู่ถ้ามีข้อมูลจำนวนมาก</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

