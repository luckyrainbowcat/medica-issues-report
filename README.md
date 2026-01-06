# Issue Tracker & Service Management System

ระบบจัดการปัญหาและบริการสำหรับโรงพยาบาล พร้อม Kanban board, rich text editor, และ image annotation

## Features

### Issues Tracker
- **Kanban Board**: Drag and drop issues ระหว่าง columns (OPEN, IN_PROGRESS, DONE)
- **Component Tree**: Component hierarchy แบบไม่จำกัดความลึก
- **Rich Text Editor**: Canvas editor พร้อม image upload และ annotation
- **Image Annotation**: วาด ตัดต่อ และ annotate รูปภาพด้วย Fabric.js
- **Priority & Urgency**: ระบบจัดลำดับความสำคัญและความเร่งด่วน
- **Sub-issues**: สร้างปัญหาย่อยที่เชื่อมโยงกับปัญหาหลัก

### Service Management
- **Installation Management**: จัดการข้อมูลการติดตั้งระบบ
- **Hospital Management**: จัดการข้อมูลโรงพยาบาล
- **Department Management**: จัดการแผนก
- **Remote Connection**: จัดการการเชื่อมต่อรีโมต (AnyDesk, VPN)
- **SIM Management**: จัดการข้อมูล SIM card
- **Warranty Extension**: จัดการการต่อประกัน
- **Connection Management**: จัดการการเชื่อมต่อระบบ (PACS, EMR, Server)

## Tech Stack

### Frontend
- **Next.js 14** (App Router) + TypeScript
- **React 19**
- **Ant Design 5** (สำหรับ Service Management)
- **Fabric.js 5** (สำหรับ Canvas editor และ image annotation)
- **Tailwind CSS**

### Backend
- **Next.js API Routes** (สำหรับ Issues Tracker)
- **Express.js** (สำหรับ Service Management API - port 4000)
- **Firebase Firestore** (Database)
- **Firebase Admin SDK** (Server-side operations)

### Image Storage
- **ImgBB API** (Free image hosting - 100% ฟรี)

### Authentication
- **JWT** (JSON Web Tokens)
- **Cookie-based authentication**

## Prerequisites

- **Node.js 20** หรือสูงกว่า
- **Firebase Project** (สำหรับ Firestore)
- **ImgBB API Key** (ฟรี - ลงทะเบียนที่ [imgbb.com](https://imgbb.com))

## Installation

### 1. ติดตั้ง Node.js

ดาวน์โหลดและติดตั้งจาก [nodejs.org](https://nodejs.org/)

### 2. Setup Firebase

1. สร้าง Firebase Project ที่ [Firebase Console](https://console.firebase.google.com/)
2. เปิดใช้งาน Firestore Database
3. ดาวน์โหลด Service Account Key (JSON)
4. เก็บไฟล์ JSON ไว้ในโปรเจคต์

### 3. Setup ImgBB API

1. ลงทะเบียนที่ [imgbb.com](https://imgbb.com) (ฟรี)
2. สร้าง API Key จาก [imgbb.com/api](https://api.imgbb.com/)
3. คัดลอก API Key ไว้สำหรับขั้นตอนถัดไป

### 4. Setup Project

1. Clone หรือ extract โปรเจคต์
2. Copy `env.example` เป็น `.env.local`:
```bash
# Windows PowerShell
Copy-Item env.example .env.local

# macOS/Linux
cp env.example .env.local
```

3. แก้ไข `.env.local` และตั้งค่าตามนี้:
```env
# Firebase
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}  # ใส่ JSON ทั้งหมดในบรรทัดเดียว

# ImgBB API
IMGBB_API_KEY=your_imgbb_api_key_here

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SERVICE_MANAGEMENT_PORT=4000
```

**หมายเหตุ**: `FIREBASE_SERVICE_ACCOUNT_KEY` ต้องเป็น JSON string ทั้งหมดในบรรทัดเดียว (ไม่ต้องมี line breaks)

4. ติดตั้ง dependencies:
```bash
npm install
```

5. รันโปรเจคต์:
```bash
# รันทั้ง Issues Tracker และ Service Management Backend
npm run dev:all

# หรือรันแยกกัน:
npm run dev              # Issues Tracker เท่านั้น (port 3000)
npm run dev:backend      # Service Management Backend เท่านั้น (port 4000)
```

## Access Points

- **Issues Tracker**: `http://localhost:3000`
- **Service Management**: `http://localhost:3000/service-management`
- **Service Management API**: `http://localhost:4000`

## Required Ports

- **3000**: Next.js development server (Issues Tracker)
- **4000**: Express API server (Service Management Backend)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── upload/route.ts          # Image upload endpoint (ImgBB)
│   │   ├── issues/                   # Issues API
│   │   ├── users/                    # Users API
│   │   └── components/               # Components API
│   ├── issues/[id]/page.tsx          # Issue detail page
│   ├── service-management/           # Service Management pages
│   │   ├── page.tsx                  # Dashboard
│   │   ├── installations/            # Installation management
│   │   ├── hospitals/                # Hospital management
│   │   ├── remote/                   # Remote connection management
│   │   └── ...
│   └── page.tsx                      # Home page (Kanban board)
├── components/
│   ├── CanvasEditor.tsx              # Rich text editor with image annotation
│   ├── IssueEditor.tsx               # Issue editor component
│   ├── Header.tsx                    # Main header
│   ├── Sidebar.tsx                   # Sidebar navigation
│   └── service-management/            # Service Management components
├── lib/
│   ├── firestore.ts                  # Firestore helpers
│   ├── firebase-admin.ts             # Firebase Admin setup
│   ├── upload.ts                     # ImgBB upload helper
│   └── service-management/           # Service Management utilities
└── service-management-backend/
    ├── server.ts                     # Express API server
    ├── firestoreClient.ts            # Firestore client
    ├── firestoreHelpers.ts           # Firestore helpers
    └── types.ts                      # TypeScript types
```

## Usage

### Issues Tracker

1. **สร้าง Components**: ใช้ฟอร์ม "Create Component" เพื่อสร้าง component tree
2. **สร้าง Issues**: สร้างปัญหาและกำหนดให้กับ component
3. **Drag & Drop**: ลาก issue cards ระหว่าง columns เพื่อเปลี่ยนสถานะ
4. **แก้ไข Issues**: คลิกที่ issue card เพื่อเปิดหน้า detail
5. **Rich Text Editing**: ใช้ Canvas editor เพื่อเพิ่มข้อความและรูปภาพ
6. **Image Upload**: Paste รูปภาพจาก clipboard หรือ drag & drop เข้า editor
7. **Image Annotation**: คลิกที่รูปภาพใน editor เพื่อเปิด annotation modal

### Service Management

1. **จัดการโรงพยาบาล**: เพิ่ม แก้ไข ดูรายการโรงพยาบาล
2. **จัดการการติดตั้ง**: บันทึกข้อมูลการติดตั้งระบบ พร้อมรูปภาพ
3. **จัดการการรีโมต**: บันทึกข้อมูล AnyDesk, VPN, และการเชื่อมต่อ
4. **จัดการ SIM**: บันทึกข้อมูล SIM card และเครือข่าย
5. **ส่งออก Excel**: ส่งออกข้อมูลเป็นไฟล์ Excel

## Notes

- รูปภาพทั้งหมดถูกเก็บไว้ที่ ImgBB (ฟรี 100%)
- รูปภาพสามารถเข้าถึงได้จากทุกอุปกรณ์ (ไม่จำกัดเฉพาะเครื่องที่อัปโหลด)
- Canvas editor รองรับการวาด ตัดต่อ และ annotate รูปภาพ
- ข้อมูลทั้งหมดถูกเก็บใน Firebase Firestore
- Service Management Backend รันแยกที่ port 4000

## Troubleshooting

**Firebase connection error:**
- ตรวจสอบว่า `FIREBASE_SERVICE_ACCOUNT_KEY` ใน `.env.local` ถูกต้อง
- ตรวจสอบว่า Service Account Key มีสิทธิ์เข้าถึง Firestore

**ImgBB upload error:**
- ตรวจสอบว่า `IMGBB_API_KEY` ใน `.env.local` ถูกต้อง
- ตรวจสอบว่า API Key ยังใช้งานได้ (ไม่หมดอายุ)

**Service Management API error:**
- ตรวจสอบว่า Backend server รันอยู่ที่ port 4000
- ตรวจสอบว่า `NEXT_PUBLIC_API_URL` ใน `.env.local` ถูกต้อง

**Image not displaying:**
- ตรวจสอบว่า URL ของรูปภาพเป็น ImgBB URL (https://i.ibb.co/...)
- ตรวจสอบ network connection

## Development Scripts

- `npm run dev` - รัน Issues Tracker เท่านั้น
- `npm run dev:backend` - รัน Service Management Backend เท่านั้น
- `npm run dev:all` - รันทั้ง Issues Tracker และ Service Management Backend พร้อมกัน
- `npm run build` - Build สำหรับ production
- `npm run start` - รัน production server
- `npm run lint` - ตรวจสอบ code quality
