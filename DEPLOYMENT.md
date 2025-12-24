# คู่มือการ Deploy โปรเจกต์ไปยังโดเมน

> **📘 คู่มือติดตั้งแบบละเอียด**: ดู `INSTALLATION_GUIDE.md` สำหรับขั้นตอนติดตั้งทีละขั้นตอนที่เข้าใจง่าย

## ภาพรวมการทำงานเมื่อ Deploy

เมื่อ deploy โปรเจกต์ Next.js ไปยังโดเมนแล้ว มันจะทำงานดังนี้:

### 1. **การ Build**
- Next.js จะแปลงโค้ด TypeScript/React เป็น JavaScript ที่ optimized
- สร้าง Server-Side Rendering (SSR) และ Static Generation
- Package ทั้งหมดเป็น production bundle

### 2. **การรันบน Production Server**
- ใช้คำสั่ง `npm run start` หรือ `next start` เพื่อรัน production server
- Next.js จะรันในโหมด production บน port ที่กำหนด (default: 3000)
- Server จะรับ request จากโดเมนและส่ง response กลับ

### 3. **การเชื่อมต่อกับ Services**
- **Firebase Firestore**: เชื่อมต่อผ่าน Firebase SDK (hardcode ใน `src/lib/firebase.ts`)
- **Firebase Storage**: ใช้สำหรับเก็บไฟล์ภาพ (ใช้ Firebase Admin SDK สำหรับ server-side upload)

---

## วิธี Deploy

### วิธีที่ 1: Deploy บน Vercel (แนะนำ - ง่ายที่สุด)

Vercel เป็น platform ที่สร้างโดยทีม Next.js เหมาะสำหรับ deploy Next.js

#### ขั้นตอน:
1. **Push โค้ดขึ้น GitHub/GitLab/Bitbucket**

2. **ติดตั้ง Vercel CLI** (ถ้าต้องการ deploy ผ่าน command line):
   ```bash
   npm i -g vercel
   ```

3. **Deploy ผ่านเว็บ**:
   - ไปที่ [vercel.com](https://vercel.com)
   - Login ด้วย GitHub account
   - กด "New Project"
   - Import repository ของคุณ
   - Vercel จะ detect Next.js อัตโนมัติ

4. **ตั้งค่า Environment Variables**:

   **ข่าวดี**: โปรเจกต์ใช้ **Firebase Storage** สำหรับเก็บไฟล์แล้ว! ไฟล์จะไม่หายไปหลัง deploy
   
   คุณต้องตั้งค่า environment variables ดังนี้:

   ```
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
   ```

   **FIREBASE_SERVICE_ACCOUNT_KEY**: Service Account Key จาก Firebase
   
   **วิธีสร้าง Service Account Key**:
   1. ไปที่ [Firebase Console](https://console.firebase.google.com)
   2. เลือกโปรเจกต์ `medica-issuev2`
   3. ไปที่ ⚙️ **Project Settings** → **Service Accounts**
   4. คลิก **Generate New Private Key**
   5. Download JSON file
   6. Copy เนื้อหา JSON ทั้งหมดมาใส่ใน environment variable `FIREBASE_SERVICE_ACCOUNT_KEY`
   
   **หมายเหตุสำคัญ**:
   - Firebase Storage เก็บไฟล์ถาวร ไม่หายหลัง deploy
   - ไฟล์จะถูกเก็บใน `uploads/` folder ใน Firebase Storage bucket
   - Firebase config อื่นๆ (เช่น apiKey, projectId) ถูกตั้งค่าใน `src/lib/firebase.ts` แล้ว
   
   **ถ้าต้องการใช้ MinIO (ตัวเลือกสำหรับ production)**:
   
   คุณต้องตั้งค่า environment variables เหล่านี้ (ถ้าต้องการใช้ MinIO):
   
   ```
   MINIO_ENDPOINT=your-minio-domain.com
   MINIO_PORT=9000
   MINIO_USE_SSL=true
   MINIO_ACCESS_KEY=your-access-key
   MINIO_SECRET_KEY=your-secret-key
   MINIO_BUCKET=issue-uploads
   MINIO_PUBLIC_URL=https://your-minio-domain.com
   ```
   
   **วิธีหาค่าต่างๆ** (ถ้าใช้ MinIO):
   
   - **MINIO_ENDPOINT**: Domain หรือ IP ของ MinIO server ที่คุณ deploy
     - ตัวอย่าง: `minio.yourdomain.com` หรือ `192.168.1.100` (ถ้าใช้ IP)
     - ถ้าใช้ MinIO Cloud: ใช้ endpoint ที่ MinIO ให้มา
   
   - **MINIO_PORT**: Port ของ MinIO (default: 9000)
     - ถ้าใช้ SSL/HTTPS: ใช้ `443` แทน
   
   - **MINIO_USE_SSL**: ตั้งเป็น `true` ถ้าใช้ HTTPS, `false` ถ้าใช้ HTTP
   
   - **MINIO_ACCESS_KEY** และ **MINIO_SECRET_KEY**: 
     - ตั้งค่าเองเมื่อติดตั้ง MinIO server
     - Default: `minioadmin` / `minioadmin` (ควรเปลี่ยนเมื่อ deploy production!)
     - ถ้าใช้ MinIO Cloud: ใช้ credentials ที่ได้จาก MinIO
   
   - **MINIO_BUCKET**: ชื่อ bucket ที่ใช้เก็บไฟล์ (default: `issue-uploads`)
     - Bucket จะถูกสร้างอัตโนมัติเมื่อ upload ครั้งแรก
   
   - **MINIO_PUBLIC_URL**: URL ที่ผู้ใช้เข้าถึงไฟล์ได้ (ต้องเข้าถึงได้จาก browser)
     - ตัวอย่าง: `https://minio.yourdomain.com` หรือ `https://storage.yourdomain.com`
     - **สำคัญ**: URL นี้ต้องเข้าถึงได้จาก public internet
   
   - **NEXT_PUBLIC_APP_URL**: URL ของ Next.js app ที่ deploy แล้ว
     - ถ้าใช้ Vercel: ใช้ URL ที่ Vercel ให้มา เช่น `https://your-app.vercel.app`
     - หรือใช้ custom domain ที่ตั้งค่า เช่น `https://yourdomain.com`

5. **Deploy** - Vercel จะ build และ deploy อัตโนมัติ

#### ข้อดี:
- ✅ ไม่ต้องตั้งค่า server เอง
- ✅ Auto-deploy เมื่อ push code
- ✅ HTTPS และ CDN รวมอยู่แล้ว
- ✅ ฟรีสำหรับ personal projects

#### ข้อดีของ Firebase Storage:
- ✅ ไฟล์เก็บถาวร ไม่หายหลัง deploy
- ✅ ไม่ต้องตั้งค่า server แยก
- ✅ ใช้ Firebase project เดียวกับ Firestore
- ✅ CDN และ HTTPS รวมอยู่แล้ว

---

### วิธีที่ 2: Deploy บน VPS/Server เอง

เหมาะสำหรับกรณีที่ต้องการควบคุม server เองหรือมี MinIO อยู่แล้ว

#### ขั้นตอน:

1. **เตรียม Server**:
   - Ubuntu/Debian Linux server
   - ติดตั้ง Node.js 20+
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Clone โปรเจกต์**:
   ```bash
   git clone <your-repo-url>
   cd Project2
   npm install
   ```

3. **ตั้งค่า Environment Variables**:
   สร้างไฟล์ `.env.production`:
   ```env
   MINIO_ENDPOINT=your-minio-ip-or-domain
   MINIO_PORT=9000
   MINIO_USE_SSL=true
   MINIO_ACCESS_KEY=your-access-key
   MINIO_SECRET_KEY=your-secret-key
   MINIO_BUCKET=issue-uploads
   MINIO_PUBLIC_URL=https://your-minio-domain.com
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```

4. **Build โปรเจกต์**:
   ```bash
   npm run build
   ```

5. **รัน Production Server**:
   
   **ตัวเลือก A: ใช้ PM2 (แนะนำ)**:
   ```bash
   # ติดตั้ง PM2
   npm install -g pm2
   
   # รัน app
   pm2 start npm --name "issue-tracker" -- start
   
   # บันทึก configuration
   pm2 save
   pm2 startup
   ```

   **ตัวเลือก B: ใช้ systemd service**:
   สร้างไฟล์ `/etc/systemd/system/issue-tracker.service`:
   ```ini
   [Unit]
   Description=Issue Tracker Next.js App
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/path/to/Project2
   ExecStart=/usr/bin/npm start
   Restart=always
   Environment=NODE_ENV=production

   [Install]
   WantedBy=multi-user.target
   ```
   
   แล้วรัน:
   ```bash
   sudo systemctl enable issue-tracker
   sudo systemctl start issue-tracker
   ```

6. **ตั้งค่า Reverse Proxy (Nginx)**:
   
   ติดตั้ง Nginx:
   ```bash
   sudo apt install nginx
   ```

   สร้างไฟล์ `/etc/nginx/sites-available/issue-tracker`:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

   Enable site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/issue-tracker /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

7. **ตั้งค่า SSL ด้วย Let's Encrypt**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

---

### วิธีที่ 3: Deploy MinIO (สำหรับ File Storage)

MinIO ต้อง deploy แยกจาก Next.js เพราะมันเป็น object storage server

#### ตัวเลือก A: MinIO Cloud หรือ Self-hosted MinIO

1. **Self-hosted MinIO บน VPS**:
   ```bash
   # Download MinIO
   wget https://dl.min.io/server/minio/release/linux-amd64/minio
   chmod +x minio
   
   # รัน MinIO (ควรใช้ systemd หรือ PM2)
   ./minio server /path/to/minio-data --console-address ":9001"
   ```

2. **MinIO Cloud (Managed)**:
   - ใช้ [MinIO Cloud](https://min.io/cloud) หรือ
   - ใช้ AWS S3, Google Cloud Storage, หรือ DigitalOcean Spaces

#### ตัวเลือก B: ใช้ Firebase Storage (แนะนำถ้าใช้ Firebase อยู่แล้ว)

แก้ไข `src/lib/upload.ts` และ `src/app/api/upload/route.ts` ให้ใช้ Firebase Storage แทน MinIO

---

## Environment Variables ที่ต้องตั้งค่า

| Variable | คำอธิบาย | วิธีหา/ตั้งค่า | ตัวอย่าง Production Value |
|----------|----------|----------------|---------------------------|
| `MINIO_ENDPOINT` | MinIO server endpoint | ตั้งเมื่อ deploy MinIO server | `minio.yourdomain.com` หรือ IP `192.168.1.100` |
| `MINIO_PORT` | MinIO port | Default: `9000`, ถ้าใช้ HTTPS: `443` | `9000` หรือ `443` |
| `MINIO_USE_SSL` | ใช้ HTTPS หรือไม่ | `true` สำหรับ production, `false` สำหรับ dev | `true` |
| `MINIO_ACCESS_KEY` | MinIO access key | ตั้งเมื่อติดตั้ง MinIO (หรือใช้ default: `minioadmin`) | ตั้งเอง (อย่าใช้ default ใน production!) |
| `MINIO_SECRET_KEY` | MinIO secret key | ตั้งเมื่อติดตั้ง MinIO (หรือใช้ default: `minioadmin`) | ตั้งเอง (เก็บเป็นความลับ!) |
| `MINIO_BUCKET` | Bucket name สำหรับเก็บไฟล์ | ตั้งชื่อเอง หรือใช้ default | `issue-uploads` |
| `MINIO_PUBLIC_URL` | Public URL ที่เข้าถึงไฟล์ได้ | URL ที่ point ไปยัง MinIO server (ต้องเข้าถึงได้จาก internet) | `https://storage.yourdomain.com` |
| `NEXT_PUBLIC_APP_URL` | URL ของ Next.js app | URL ที่ deploy แล้ว (จาก Vercel หรือ domain ของคุณ) | `https://yourdomain.com` หรือ `https://app.vercel.app` |

### รายละเอียดเพิ่มเติม

#### 1. MinIO Environment Variables

**ถ้าคุณใช้ MinIO (Object Storage)**:
- MinIO คือ self-hosted object storage (คล้าย AWS S3)
- ต้อง deploy MinIO server แยกจาก Next.js
- ใช้สำหรับเก็บไฟล์ภาพที่อัปโหลด

**วิธีหาค่า MinIO**:
- ถ้า deploy MinIO เอง: ตั้งค่า ACCESS_KEY และ SECRET_KEY เองเมื่อติดตั้ง
- ถ้าใช้ MinIO Cloud: ใช้ credentials ที่ได้จาก MinIO Cloud dashboard
- ถ้าใช้ AWS S3 หรือบริการอื่น: ต้องแก้โค้ดให้รองรับ (ไม่แนะนำตอนนี้)

**ถ้าไม่อยากตั้ง MinIO** (แนะนำสำหรับผู้เริ่มต้น):
- ใช้ **Firebase Storage** แทน (ง่ายกว่า ไม่ต้องตั้ง server แยก)
- Firebase Storage ทำงานกับ Firebase project ที่มีอยู่แล้ว
- ต้องแก้โค้ดใน `src/lib/upload.ts` และ `src/app/api/upload/route.ts`

#### 2. NEXT_PUBLIC_APP_URL

**วิธีหา**:
- ถ้า deploy บน Vercel: ใช้ URL ที่ Vercel ให้มา เช่น `https://your-app-name.vercel.app`
- ถ้ามี custom domain: ใช้ domain ที่ตั้งค่า เช่น `https://yourdomain.com`
- ใช้ URL นี้เพื่อให้แอปรู้ว่า URL ของตัวเองคืออะไร (สำหรับสร้าง absolute URLs)

**หมายเหตุ**: Firebase config ถูก hardcode ใน `src/lib/firebase.ts` แล้ว ไม่ต้องตั้งค่า environment variable

---

## สิ่งที่ต้องเตรียมก่อน Deploy

### 1. **Firebase Configuration**
- ✅ Firebase config ถูกตั้งค่าใน `src/lib/firebase.ts` แล้ว
- ตรวจสอบว่า Firebase project (`medica-issuev2`) เปิดใช้งานแล้ว
- ตั้งค่า Firestore Security Rules (ดู `FIRESTORE_RULES.md`)

### 2. **MinIO Setup**
- Deploy MinIO server บน server/VPS แยก
- สร้าง bucket `issue-uploads`
- ตั้งค่า public read policy สำหรับ bucket
- ตั้งค่า SSL certificate

### 3. **Domain Configuration**
- Point domain A record ไปที่ server IP (VPS) หรือใช้ Vercel DNS
- ตั้งค่า SSL certificate (Let's Encrypt ฟรี)

---

## การทำงานหลัง Deploy

เมื่อ deploy เสร็จแล้ว:

1. **ผู้ใช้เข้าถึง**: `https://your-domain.com`
2. **Next.js Server**: 
   - รับ HTTP requests
   - Render pages (SSR) หรือส่ง static files
   - Handle API routes (`/api/*`)
3. **Firebase Firestore**: 
   - เก็บข้อมูล issues, components, users
   - เชื่อมต่อผ่าน Firebase SDK
4. **MinIO**: 
   - เก็บไฟล์ภาพที่อัปโหลด
   - เข้าถึงผ่าน `MINIO_PUBLIC_URL`

---

## คำสั่งที่ใช้หลัง Deploy

```bash
# ตรวจสอบสถานะ
pm2 status                    # ถ้าใช้ PM2
sudo systemctl status issue-tracker  # ถ้าใช้ systemd

# ดู logs
pm2 logs issue-tracker
sudo journalctl -u issue-tracker -f

# Restart app
pm2 restart issue-tracker
sudo systemctl restart issue-tracker

# Update โค้ดใหม่
git pull
npm install
npm run build
pm2 restart issue-tracker
```

---

## Troubleshooting

### Next.js ไม่ start
- ตรวจสอบว่า build สำเร็จ: `npm run build`
- ตรวจสอบ environment variables ครบ
- ดู logs: `pm2 logs` หรือ `sudo journalctl -u issue-tracker`

### MinIO connection error
- ตรวจสอบว่า MinIO server ทำงานอยู่
- ตรวจสอบ `MINIO_ENDPOINT` และ `MINIO_PORT` ถูกต้อง
- ตรวจสอบ firewall rules

### Firebase error
- ตรวจสอบ Firebase config ใน `src/lib/firebase.ts`
- ตรวจสอบ Firestore Security Rules
- ตรวจสอบว่า Firebase project เปิดใช้งานแล้ว

---

## คำแนะนำ

1. **ใช้ Vercel** ถ้าเป็นไปได้ - ง่ายและจัดการได้ดี
2. **ใช้ Firebase Storage** แทน MinIO ถ้าต้องการลดความซับซ้อน
3. **ตั้งค่า monitoring** (เช่น Sentry) สำหรับ production
4. **Backup Firebase** เป็นประจำ
5. **ใช้ Environment Variables** สำหรับข้อมูลสำคัญ (อย่า hardcode)

