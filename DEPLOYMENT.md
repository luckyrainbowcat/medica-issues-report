# คู่มือการ Deploy โปรเจกต์ไปยังโดเมน

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
- **MinIO**: เชื่อมต่อผ่าน environment variables สำหรับเก็บไฟล์ภาพ

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
   ```
   MINIO_ENDPOINT=your-minio-domain.com
   MINIO_PORT=9000
   MINIO_USE_SSL=true
   MINIO_ACCESS_KEY=your-access-key
   MINIO_SECRET_KEY=your-secret-key
   MINIO_BUCKET=issue-uploads
   MINIO_PUBLIC_URL=https://your-minio-domain.com
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```

5. **Deploy** - Vercel จะ build และ deploy อัตโนมัติ

#### ข้อดี:
- ✅ ไม่ต้องตั้งค่า server เอง
- ✅ Auto-deploy เมื่อ push code
- ✅ HTTPS และ CDN รวมอยู่แล้ว
- ✅ ฟรีสำหรับ personal projects

#### ข้อจำกัด:
- MinIO ต้อง deploy แยก (ไม่สามารถรัน MinIO บน Vercel ได้)

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

| Variable | คำอธิบาย | ตัวอย่าง Production Value |
|----------|----------|---------------------------|
| `MINIO_ENDPOINT` | MinIO server endpoint | `minio.yourdomain.com` |
| `MINIO_PORT` | MinIO port | `9000` (หรือ `443` ถ้าใช้ SSL) |
| `MINIO_USE_SSL` | ใช้ HTTPS หรือไม่ | `true` |
| `MINIO_ACCESS_KEY` | MinIO access key | (ตั้งค่าเอง) |
| `MINIO_SECRET_KEY` | MinIO secret key | (ตั้งค่าเอง - ต้องเก็บเป็นความลับ) |
| `MINIO_BUCKET` | Bucket name | `issue-uploads` |
| `MINIO_PUBLIC_URL` | Public URL สำหรับเข้าถึงไฟล์ | `https://minio.yourdomain.com` |
| `NEXT_PUBLIC_APP_URL` | URL ของแอปของคุณ | `https://yourdomain.com` |

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

