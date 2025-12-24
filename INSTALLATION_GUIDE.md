# คู่มือการติดตั้งและ Deploy โปรเจกต์

## 📋 วิธีที่ 1: Deploy บน Vercel (แนะนำ - ง่ายที่สุด)

### ขั้นตอนที่ 1: เตรียม Firebase Service Account Key

1. **ไปที่ Firebase Console**:
   - เปิดเบราว์เซอร์ไปที่: https://console.firebase.google.com
   - Login ด้วย Google account

2. **เลือกโปรเจกต์**:
   - เลือกโปรเจกต์ `medica-issuev2`

3. **สร้าง Service Account Key**:
   - คลิกที่ ⚙️ **Project Settings** (มุมซ้ายล่าง หรือไอคอน gear)
   - เลือกแท็บ **Service Accounts**
   - คลิกปุ่ม **Generate New Private Key**
   - จะมี popup แจ้งเตือน → คลิก **Generate Key**
   - ระบบจะ download JSON file อัตโนมัติ (ชื่อไฟล์ประมาณ `medica-issuev2-firebase-adminsdk-xxxxx.json`)

4. **เก็บไฟล์นี้ไว้** - เราจะใช้ในขั้นตอนต่อไป

---

### ขั้นตอนที่ 2: Deploy บน Vercel

#### 2.1 สร้าง Account บน Vercel (ถ้ายังไม่มี)

1. ไปที่: https://vercel.com
2. คลิก **Sign Up**
3. เลือก **Continue with GitHub** (แนะนำเพราะโปรเจกต์อยู่บน GitHub อยู่แล้ว)
4. Login ด้วย GitHub account

#### 2.2 Import โปรเจกต์จาก GitHub

1. หลังจาก login เข้า Vercel แล้ว
2. คลิกปุ่ม **Add New...** → เลือก **Project**
3. คุณจะเห็น repositories จาก GitHub → หา `medica-issues-report` (หรือชื่อ repo ที่คุณสร้าง)
4. คลิก **Import** ที่ repository

#### 2.3 ตั้งค่าโปรเจกต์

1. **Configure Project**:
   - **Framework Preset**: Vercel จะ detect เป็น **Next.js** อัตโนมัติ ✅
   - **Root Directory**: `.` (default - ไม่ต้องเปลี่ยน)
   - **Build Command**: `npm run build` (default - ไม่ต้องเปลี่ยน)
   - **Output Directory**: `.next` (default - ไม่ต้องเปลี่ยน)
   - **Install Command**: `npm install` (default - ไม่ต้องเปลี่ยน)

2. คลิก **Deploy** เพื่อเริ่ม deploy

   ⚠️ **หมายเหตุ**: Deploy ครั้งแรกอาจจะล้มเหลวเพราะยังไม่ได้ตั้งค่า Environment Variables อย่าตกใจ! เราจะแก้ไขต่อ

---

### ขั้นตอนที่ 3: ตั้งค่า Environment Variables

#### 3.1 เข้าไปตั้งค่า Environment Variables

1. หลัง deploy เสร็จ (หรือล้มเหลว) → ไปที่ Project Dashboard
2. คลิกแท็บ **Settings** (ด้านบน)
3. เลือก **Environment Variables** (เมนูซ้าย)

#### 3.2 เพิ่ม Environment Variables

เพิ่ม 2 variables ดังนี้:

**1. NEXT_PUBLIC_APP_URL**:
   - **Key**: `NEXT_PUBLIC_APP_URL`
   - **Value**: รอให้ Vercel deploy เสร็จก่อน แล้วจะได้ URL ประมาณ `https://medica-issues-report-xxxxx.vercel.app`
   - **Environment**: เลือกทั้ง Production, Preview, Development
   - คลิก **Save**

   **วิธีหาค่า**: หลัง deploy เสร็จ → ดู URL ที่ Vercel ให้มา (จะมีในหน้า Deployments)

**2. FIREBASE_SERVICE_ACCOUNT_KEY**:
   
   - **Key**: `FIREBASE_SERVICE_ACCOUNT_KEY`
   - **Value**: เปิด JSON file ที่ download จาก Firebase Console
     - Copy เนื้อหาทั้งหมดในไฟล์
     - **แปลงเป็น single line** (ไม่มี line breaks):
       - วิธีง่าย: ใช้ Notepad++ → Find & Replace → เปิด "Extended" mode → Replace `\r\n` ด้วย space
       - หรือใช้ online tool: https://www.freeformatter.com/json-formatter.html
     - Paste เนื้อหาที่เป็น single line ลงใน Value field
   
   - **Environment**: เลือกทั้ง Production, Preview, Development
   - คลิก **Save**

   **ตัวอย่างรูปแบบ Value** (เป็น single line):
   ```
   {"type":"service_account","project_id":"medica-issuev2","private_key_id":"xxxxx","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@medica-issuev2.iam.gserviceaccount.com","client_id":"xxxxx","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token",...}
   ```

#### 3.3 Redeploy

หลังจากตั้งค่า Environment Variables เสร็จ:

1. ไปที่แท็บ **Deployments**
2. หา deployment ล่าสุด → คลิก **...** (เมนู 3 จุด) → เลือก **Redeploy**
3. หรือคลิก **Redeploy** จาก deployment page
4. รอให้ deploy เสร็จ

---

### ขั้นตอนที่ 4: ตรวจสอบการทำงาน

1. หลัง deploy เสร็จ → คุณจะเห็น **Visit** button
2. คลิกเพื่อเปิดเว็บไซต์
3. ทดสอบ:
   - เปิดหน้าเว็บได้หรือไม่
   - ลองอัปโหลดรูปภาพ → ตรวจสอบว่าไฟล์ถูกอัปโหลดไปยัง Firebase Storage
   - ตรวจสอบ Firebase Console → Storage → ดูว่ามีไฟล์ใน folder `uploads/`

---

## 🔧 วิธีที่ 2: ติดตั้งบน Server/VPS เอง

สำหรับผู้ที่ต้องการควบคุม server เอง

### ขั้นตอนที่ 1: เตรียม Server

1. **เช่า VPS** (เช่น DigitalOcean, AWS EC2, Linode)
   - แนะนำ: Ubuntu 20.04 หรือ 22.04
   - RAM: อย่างน้อย 1GB
   - Storage: อย่างน้อย 10GB

2. **Connect ผ่าน SSH**:
   ```bash
   ssh root@your-server-ip
   ```

### ขั้นตอนที่ 2: ติดตั้ง Node.js

```bash
# อัพเดต package list
sudo apt update

# ติดตั้ง Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# ตรวจสอบ version
node --version  # ควรเป็น v20.x.x
npm --version
```

### ขั้นตอนที่ 3: Clone โปรเจกต์

```bash
# ติดตั้ง Git
sudo apt install git -y

# Clone repository
git clone https://github.com/luckyrainbowcat/medica-issues-report.git
cd medica-issues-report

# ติดตั้ง dependencies
npm install
```

### ขั้นตอนที่ 4: ตั้งค่า Environment Variables

```bash
# สร้างไฟล์ .env.production
nano .env.production
```

ใส่ค่าดังนี้ (แก้ไขให้ตรงกับค่าจริง):

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

**วิธีใส่ FIREBASE_SERVICE_ACCOUNT_KEY**:
1. เปิด JSON file ที่ download จาก Firebase Console
2. Copy เนื้อหาทั้งหมด
3. แปลงเป็น single line (ลบ line breaks ทั้งหมด)
4. Paste ลงใน `.env.production`

กด `Ctrl+X` → `Y` → `Enter` เพื่อบันทึก

### ขั้นตอนที่ 5: Build และ Deploy

```bash
# Build โปรเจกต์
npm run build

# ติดตั้ง PM2 สำหรับรัน app
sudo npm install -g pm2

# รัน app ด้วย PM2
pm2 start npm --name "issue-tracker" -- start

# บันทึก configuration
pm2 save
pm2 startup

# ดูสถานะ
pm2 status
```

### ขั้นตอนที่ 6: ตั้งค่า Nginx (Reverse Proxy)

```bash
# ติดตั้ง Nginx
sudo apt install nginx -y

# สร้างไฟล์ config
sudo nano /etc/nginx/sites-available/issue-tracker
```

ใส่เนื้อหาดังนี้ (แก้ไข `your-domain.com`):

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

บันทึกไฟล์ แล้ว:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/issue-tracker /etc/nginx/sites-enabled/

# ตรวจสอบ config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### ขั้นตอนที่ 7: ตั้งค่า SSL (Let's Encrypt)

```bash
# ติดตั้ง Certbot
sudo apt install certbot python3-certbot-nginx -y

# ตั้งค่า SSL
sudo certbot --nginx -d your-domain.com

# ตาม prompts ที่ถาม
```

---

## ✅ ตรวจสอบการทำงาน

### สำหรับ Vercel:
- ✅ เปิดเว็บผ่าน URL ที่ Vercel ให้มา
- ✅ ทดสอบอัปโหลดไฟล์
- ✅ ตรวจสอบ Firebase Storage ว่ามีไฟล์

### สำหรับ VPS:
- ✅ เปิดเว็บผ่าน `https://your-domain.com`
- ✅ ทดสอบอัปโหลดไฟล์
- ✅ ตรวจสอบ Firebase Storage
- ✅ ตรวจสอบ PM2 status: `pm2 status`
- ✅ ดู logs: `pm2 logs issue-tracker`

---

## 🆘 Troubleshooting

### Error: "Failed to upload file to Firebase Storage"
- **แก้ไข**: ตรวจสอบว่า `FIREBASE_SERVICE_ACCOUNT_KEY` ถูกตั้งค่าถูกต้อง
- ตรวจสอบว่า JSON เป็น single line แล้ว

### Error: "Cannot connect to Firebase"
- **แก้ไข**: ตรวจสอบ Firebase project ID และ credentials

### Deploy ล้มเหลวบน Vercel
- **แก้ไข**: ดู logs ใน Vercel Dashboard → Deployments → คลิกที่ deployment → ดู error messages
- ตรวจสอบ environment variables ทั้งหมด

### App ไม่ start บน VPS
- **แก้ไข**: ดู logs ด้วย `pm2 logs issue-tracker`
- ตรวจสอบว่า port 3000 ไม่ถูกใช้แล้ว: `sudo lsof -i :3000`

---

## 📝 สรุปขั้นตอนเร็ว (Vercel)

1. ✅ สร้าง Firebase Service Account Key
2. ✅ ไปที่ vercel.com → Import project จาก GitHub
3. ✅ ตั้งค่า Environment Variables:
   - `NEXT_PUBLIC_APP_URL` = URL ที่ Vercel ให้มา
   - `FIREBASE_SERVICE_ACCOUNT_KEY` = JSON content (single line)
4. ✅ Redeploy
5. ✅ ตรวจสอบการทำงาน

---

**คำแนะนำ**: ถ้าเป็นครั้งแรก แนะนำให้ใช้ **Vercel** เพราะง่ายที่สุด และไม่ต้องตั้งค่า server เอง!

