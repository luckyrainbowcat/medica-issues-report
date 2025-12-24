# คู่มือการตั้งค่า Firebase Storage

โปรเจกต์นี้ใช้ **Firebase Storage** สำหรับเก็บไฟล์ภาพ ซึ่งจะทำให้ไฟล์ไม่หายไปหลัง deploy

## ขั้นตอนการตั้งค่า

### 1. สร้าง Service Account Key

1. ไปที่ [Firebase Console](https://console.firebase.google.com)
2. เลือกโปรเจกต์ `medica-issuev2`
3. ไปที่ ⚙️ **Project Settings** (มุมซ้ายล่าง)
4. เลือกแท็บ **Service Accounts**
5. คลิก **Generate New Private Key**
6. คลิก **Generate Key** เพื่อยืนยัน
7. Download JSON file (เช่น `medica-issuev2-firebase-adminsdk-xxxxx.json`)

### 2. ตั้งค่า Environment Variable

#### สำหรับ Local Development:

สร้างไฟล์ `.env.local` ในโฟลเดอร์โปรเจกต์:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"medica-issuev2",...}
```

**วิธีใส่ JSON ใน Environment Variable**:

1. เปิด JSON file ที่ download มา
2. Copy เนื้อหาทั้งหมด (เป็น JSON object)
3. **ใส่ในบรรทัดเดียว** (ไม่มี line breaks) หรือใช้ escape characters
4. ใส่ใน `.env.local` แบบนี้:

```env
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"medica-issuev2","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

**หรือ** ใช้วิธีง่ายๆ ด้วย PowerShell (Windows):

```powershell
# อ่านไฟล์ JSON และแปลงเป็น single line
$json = Get-Content "medica-issuev2-firebase-adminsdk-xxxxx.json" -Raw | ConvertTo-Json -Compress
Add-Content .env.local "FIREBASE_SERVICE_ACCOUNT_KEY=$json"
```

**หรือ** ใช้เครื่องมือออนไลน์:
- ไปที่ https://www.freeformatter.com/json-escape.html
- Paste JSON content
- คลิก "Escape JSON"
- Copy มาวางใน environment variable

#### สำหรับ Vercel Production:

1. ไปที่ Vercel Dashboard → Project Settings → Environment Variables
2. เพิ่ม Variable:
   - **Name**: `FIREBASE_SERVICE_ACCOUNT_KEY`
   - **Value**: JSON content จาก service account key file (เป็น single line)
   - **Environment**: Production, Preview, Development (เลือกทั้งหมด)

### 3. ตรวจสอบ Firebase Storage Rules

1. ไปที่ Firebase Console → **Storage**
2. ไปที่แท็บ **Rules**
3. ตรวจสอบว่า rules อนุญาตให้อ่านไฟล์ได้:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow read access to uploads folder
    match /uploads/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null; // หรือ true ถ้าต้องการให้ upload ได้โดยไม่ต้อง login
    }
  }
}
```

4. คลิก **Publish** เพื่อบันทึก rules

### 4. ทดสอบการ Upload

1. รัน development server:
   ```bash
   npm run dev
   ```

2. ไปที่หน้าเว็บและลองอัปโหลดรูปภาพ
3. ตรวจสอบใน Firebase Console → Storage ว่ามีไฟล์ถูกอัปโหลด

## การทำงาน

- เมื่ออัปโหลดไฟล์ ไฟล์จะถูกเก็บใน Firebase Storage bucket: `medica-issuev2.firebasestorage.app`
- ไฟล์จะอยู่ใน folder `uploads/` ใน Firebase Storage
- URL ของไฟล์จะเป็นแบบ: `https://storage.googleapis.com/medica-issuev2.firebasestorage.app/uploads/xxx-xxx-xxx.png`
- ไฟล์จะไม่หายไปหลัง deploy เพราะเก็บใน Firebase Storage แล้ว

## Troubleshooting

### Error: "Failed to upload file to Firebase Storage"

**สาเหตุ**: Service Account Key ไม่ถูกต้องหรือไม่มี

**วิธีแก้**:
- ตรวจสอบว่า `FIREBASE_SERVICE_ACCOUNT_KEY` ถูกตั้งค่าใน `.env.local` แล้ว
- ตรวจสอบว่า JSON format ถูกต้อง (เป็น single line)
- ลองสร้าง Service Account Key ใหม่

### Error: "Permission denied"

**สาเหตุ**: Firebase Storage Rules ไม่อนุญาตให้ upload

**วิธีแก้**:
- ไปที่ Firebase Console → Storage → Rules
- ปรับ rules ให้อนุญาต write access (ดูตัวอย่าง rules ข้างบน)

### ไฟล์ไม่แสดงใน browser

**สาเหตุ**: Firebase Storage Rules ไม่อนุญาตให้อ่าน

**วิธีแก้**:
- ตรวจสอบ Firebase Storage Rules ให้อนุญาต read access
- ตรวจสอบว่าไฟล์ถูกตั้งค่าเป็น public แล้ว (ในโค้ดมี `file.makePublic()`)

## Security Notes

- **อย่า commit** Service Account Key ลงใน Git!
- Service Account Key ควรเก็บเป็นความลับ
- ใช้ `.env.local` สำหรับ local development (ถูก ignore ใน Git แล้ว)
- ใช้ Vercel Environment Variables สำหรับ production

