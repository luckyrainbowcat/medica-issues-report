# คู่มือการอัพโหลดโปรเจกต์ขึ้น GitHub

## ขั้นตอนการอัพโหลดโปรเจกต์ขึ้น GitHub

### ขั้นตอนที่ 1: สร้าง Repository บน GitHub

1. ไปที่ [github.com](https://github.com) และ Login
2. คลิกที่ **"+"** มุมขวาบน → เลือก **"New repository"**
3. ตั้งชื่อ repository (เช่น `issue-tracker` หรือ `project2`)
4. เลือกเป็น **Private** หรือ **Public** ตามต้องการ
5. **อย่า** tick "Add a README file" เพราะเรามี README อยู่แล้ว
6. คลิก **"Create repository"**

---

### ขั้นตอนที่ 2: ตั้งค่า Git ในโปรเจกต์ (ถ้ายังไม่ได้ทำ)

เปิด PowerShell หรือ Command Prompt ในโฟลเดอร์โปรเจกต์ของคุณ

#### 2.1 ตรวจสอบว่า Git ติดตั้งแล้วหรือยัง:
```powershell
git --version
```

ถ้ายังไม่มี Git:
- Download จาก [git-scm.com](https://git-scm.com/download/win)
- ติดตั้งและ restart terminal

#### 2.2 ตั้งค่า Git (ครั้งแรกเท่านั้น):
```powershell
git config --global user.name "luckyrainbowcat"
git config --global user.email "sanaluckycat@gmail.com"
```

#### 2.3 Initialize Git Repository:
```powershell
git init
```

---

### ขั้นตอนที่ 3: เพิ่มไฟล์และ Commit

#### 3.1 เพิ่มไฟล์ทั้งหมด:
```powershell
git add .
```

#### 3.2 Commit ครั้งแรก:
```powershell
git commit -m "Initial commit: Issue Tracker MVP"
```

**หมายเหตุ**: ถ้ามีไฟล์ที่ยังไม่ได้ stage ให้ใช้ `git add .` อีกครั้ง

---

### ขั้นตอนที่ 4: เชื่อมต่อกับ GitHub

#### 4.1 เพิ่ม Remote Repository:
แทนที่ `YOUR_USERNAME` และ `YOUR_REPO_NAME` ด้วยชื่อที่คุณสร้าง:

```powershell
git remote add origin https://github.com/luckyrainbowcat/medica-issues-report.git
```


#### 4.2 ตั้งชื่อ branch เป็น main (ถ้ายังไม่ใช่):
```powershell
git branch -M main
```

#### 4.3 Push ขึ้น GitHub:
```powershell
git push -u origin main
```

คุณจะถูกถามให้ใส่ username และ password/token:
- Username: ชื่อ GitHub ของคุณ
- Password: ใช้ **Personal Access Token** (ไม่ใช่รหัสผ่าน GitHub)

---

### ขั้นตอนที่ 5: สร้าง Personal Access Token (ถ้ายังไม่มี)

ถ้าถูกถาม password ให้สร้าง Personal Access Token:

1. ไปที่ GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. คลิก **"Generate new token (classic)"**
3. ตั้งชื่อ token (เช่น "Issue Tracker Project")
4. เลือก scopes: **repo** (ให้สิทธิ์ทั้งหมด)
5. คลิก **"Generate token"**
6. **คัดลอก token ทันที** (จะแสดงแค่ครั้งเดียว)
7. ใช้ token แทน password เมื่อ push

---

## คำสั่งที่ใช้บ่อย

### เพิ่มไฟล์ใหม่:
```powershell
git add .
git commit -m "คำอธิบายการเปลี่ยนแปลง"
git push
```

### ดูสถานะไฟล์:
```powershell
git status
```

### ดู history:
```powershell
git log
```

### Pull โค้ดล่าสุดจาก GitHub:
```powershell
git pull
```

---

## ไฟล์ที่ถูก Ignore (ไม่ถูกอัพโหลด)

จาก `.gitignore` ไฟล์ต่อไปนี้จะ**ไม่ถูกอัพโหลด**:

- ✅ `node_modules/` - Dependencies
- ✅ `.next/` - Next.js build files
- ✅ `.env*` - Environment variables (สำคัญ! เก็บเป็นความลับ)
- ✅ `*.db` - SQLite database files
- ✅ `dev.db` - Development database

**หมายเหตุสำคัญ**: 
- ไฟล์ `.env.local` จะไม่ถูกอัพโหลด (ดีแล้ว - เก็บ credentials เป็นความลับ)
- Firebase config ใน `src/lib/firebase.ts` จะถูกอัพโหลด (ควรย้ายไปใช้ environment variables)

---

## การแก้ไขปัญหา

### ถ้า push ไม่ได้:
```powershell
# ดู remote ที่ตั้งค่าไว้
git remote -v

# ถ้าต้องการเปลี่ยน remote URL
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

### ถ้ามี conflict:
```powershell
# Pull โค้ดล่าสุดก่อน
git pull origin main

# แก้ไข conflict แล้ว commit อีกครั้ง
git add .
git commit -m "Fix conflicts"
git push
```

### ถ้าลืม commit ไฟล์:
```powershell
git add .
git commit -m "Add missing files"
git push
```

---

## ข้อแนะนำเพิ่มเติม

### 1. ใช้ `.env.example` แทน `.env`
- สร้างไฟล์ `env.example` (มีอยู่แล้ว) โดยไม่มีค่า sensitive
- เพื่อให้คนอื่นรู้ว่าต้องตั้งค่าอะไรบ้าง

### 2. เพิ่ม README ที่ดี
- อธิบายวิธีติดตั้งและรัน
- ระบุ prerequisites
- มี link ไปยัง documentation

### 3. ใช้ Branch สำหรับ Features ใหม่
```powershell
# สร้าง branch ใหม่
git checkout -b feature/new-feature

# ทำงานเสร็จแล้ว
git add .
git commit -m "Add new feature"
git push -u origin feature/new-feature

# แล้วสร้าง Pull Request บน GitHub
```

---

## สรุปคำสั่งทั้งหมด (Copy-Paste ได้)

```powershell
# 1. Initialize Git
git init

# 2. เพิ่มไฟล์ทั้งหมด
git add .

# 3. Commit
git commit -m "Initial commit: Issue Tracker MVP"

# 4. เพิ่ม Remote (แก้ไข YOUR_USERNAME และ YOUR_REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 5. ตั้งชื่อ branch
git branch -M main

# 6. Push ขึ้น GitHub
git push -u origin main
```

หลังจาก push เสร็จ คุณจะเห็นโค้ดทั้งหมดบน GitHub และสามารถ:
- แชร์โปรเจกต์กับทีม
- Deploy ไปยัง Vercel/Netlify
- จัดการ versions และ branches
- ใช้ GitHub Actions สำหรับ CI/CD

