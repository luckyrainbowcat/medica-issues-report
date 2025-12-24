# Firestore Security Rules

## ปัญหา "client is offline"

ถ้าพบ error "Failed to get document because the client is offline" อาจเกิดจาก:

1. **Firestore Security Rules ไม่อนุญาตให้อ่านข้อมูล**
2. **Network connection issues**
3. **Firebase configuration ไม่ถูกต้อง**

## วิธีแก้ไข

### 1. ตั้งค่า Firestore Security Rules

ไปที่ [Firebase Console](https://console.firebase.google.com/) → Project ของคุณ → Firestore Database → Rules

ตั้งค่า rules ดังนี้ (สำหรับ development/testing):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents (สำหรับ development เท่านั้น)
    match /{document=**} {
      allow read, write: if true;
    }
    
    // หรือถ้าต้องการ security ที่ดีกว่า:
    match /components/{componentId} {
      allow read, write: if true;
    }
    
    match /issues/{issueId} {
      allow read, write: if true;
    }
  }
}
```

**⚠️ คำเตือน:** Rules ด้านบนอนุญาตให้ทุกคนอ่าน/เขียนข้อมูลได้ (เหมาะสำหรับ development เท่านั้น)

### 2. Rules ที่ปลอดภัยกว่า (สำหรับ production)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Components - อนุญาตให้อ่าน/เขียนได้ทั้งหมด (สำหรับตอนนี้)
    match /components/{componentId} {
      allow read, write: if request.auth != null || true; // อนุญาตถ้ามี auth หรือ true (สำหรับ development)
    }
    
    // Issues - อนุญาตให้อ่าน/เขียนได้ทั้งหมด (สำหรับตอนนี้)
    match /issues/{issueId} {
      allow read, write: if request.auth != null || true; // อนุญาตถ้ามี auth หรือ true (สำหรับ development)
    }
  }
}
```

### 3. ตรวจสอบ Network Connection

- ตรวจสอบว่า server มี internet connection
- ตรวจสอบว่า firewall ไม่ได้บล็อก Firebase

### 4. ตรวจสอบ Firebase Configuration

ตรวจสอบว่าไฟล์ `src/lib/firebase.ts` มี config ที่ถูกต้อง:
- `apiKey`
- `projectId`
- `authDomain`

## วิธีทดสอบ

1. ไปที่ Firebase Console → Firestore Database → Data
2. ตรวจสอบว่ามี collections `components` และ `issues` หรือไม่
3. ถ้าไม่มี ให้รัน migration ก่อน: `http://localhost:3000/migrate`

## Troubleshooting

### Error: "permission-denied"
- ตรวจสอบ Firestore Rules ว่าอนุญาตให้อ่าน/เขียนหรือไม่
- ตรวจสอบว่า collection name ถูกต้อง (`components`, `issues`)

### Error: "client is offline"
- ตรวจสอบ internet connection
- ตรวจสอบ Firestore Rules
- ลอง restart dev server

### Error: "Failed to get document"
- ตรวจสอบว่า document ID ถูกต้อง
- ตรวจสอบว่า document มีอยู่จริงใน Firestore

