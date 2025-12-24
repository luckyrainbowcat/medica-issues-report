# รายละเอียดโปรแกรม Issue Tracker MVP

## ภาพรวมโปรแกรม

โปรแกรม Issue Tracker MVP เป็นระบบจัดการปัญหาที่พัฒนาด้วย Next.js 14 (App Router) และ TypeScript ใช้ Firebase Firestore เป็นฐานข้อมูล และ MinIO สำหรับจัดเก็บไฟล์ภาพ

## เทคโนโลยีที่ใช้

### Frontend
- **Next.js 14** (App Router) + TypeScript
- **React 18.3**
- **Tailwind CSS** สำหรับ styling
- **ContentEditable API** สำหรับ rich text editor แบบง่าย

### Backend & Database
- **Firebase Firestore** - ฐานข้อมูล NoSQL (แทน MongoDB และ Prisma/SQLite ที่เคยใช้)
- **MinIO** - Object storage สำหรับเก็บไฟล์ภาพ (S3-compatible)

### Libraries
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` - สำหรับ drag & drop (แต่ยังไม่ได้ใช้งาน)
- `fabric` - Canvas library (ยังไม่ได้ใช้งาน)
- `uuid` - สำหรับสร้าง unique ID

## โครงสร้างโปรเจกต์

```
Project2/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/login/route.ts          # API login
│   │   │   ├── components/
│   │   │   │   ├── route.ts                  # GET/POST components
│   │   │   │   └── [id]/route.ts            # GET/PATCH/DELETE component
│   │   │   ├── issues/
│   │   │   │   ├── route.ts                  # GET/POST issues
│   │   │   │   └── [id]/route.ts            # GET/PATCH/DELETE issue
│   │   │   ├── users/route.ts               # GET/POST users
│   │   │   ├── upload/route.ts              # POST image upload
│   │   │   ├── migrate/route.ts             # Migration API
│   │   │   └── firebase-check/route.ts      # Firebase health check
│   │   ├── issues/[id]/page.tsx             # หน้าแสดงรายละเอียด issue
│   │   ├── page.tsx                         # หน้าหลัก (Kanban board)
│   │   ├── layout.tsx                       # Root layout
│   │   └── globals.css                      # Global styles
│   ├── components/
│   │   ├── Header.tsx                       # Header component (มี login, create user, create component, create issue)
│   │   ├── IssueEditor.tsx                  # Wrapper สำหรับ SimpleEditor
│   │   ├── SimpleEditor.tsx                 # Rich text editor แบบ contentEditable พร้อม image upload/crop
│   │   └── CanvasEditor.tsx                 # (ยังไม่ได้ใช้งาน)
│   └── lib/
│       ├── firebase.ts                      # Firebase configuration
│       ├── firestore.ts                     # Firestore operations (CRUD สำหรับ components, issues, users)
│       ├── json-helpers.ts                  # Helper functions สำหรับ serialize/deserialize JSON
│       ├── minio.ts                         # MinIO client configuration
│       └── upload.ts                        # Upload helper functions
├── prisma/                                  # (ไม่ใช้แล้ว - ใช้ Firebase แทน)
├── scripts/
│   └── migrate-to-firestore.ts              # Script สำหรับ migrate ข้อมูล
├── public/uploads/                          # ไฟล์ภาพที่อัปโหลด (130+ ไฟล์)
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── env.example
```

## ฟีเจอร์หลัก

### 1. Kanban Board (หน้าหลัก)
- แสดง issues ในรูปแบบ Kanban board แบ่งเป็น 3 คอลัมน์: OPEN, IN_PROGRESS, DONE
- แยกประเภทปัญหาเป็น 2 ประเภท:
  - **Internal** - ปัญหาที่แจ้งจากภายใน
  - **External** - ปัญหาที่แจ้งจากภายนอก (มีฟิลด์ hospital และ department เพิ่มเติม)
- แสดงจำนวน sub-issues ในแต่ละ issue card
- Auto-refresh ทุก 60 วินาที
- แก้ไขชื่อ issue ได้โดยตรงใน card
- ปุ่ม Accept (สำหรับ OPEN) และ Done (สำหรับ IN_PROGRESS) พร้อมฟอร์มกรอกชื่อผู้รับงาน/ผู้ปิดงาน

### 2. Issue Management
- **สร้าง Issue**: 
  - ระบุหัวข้อ, component, priority (LOW/MED/HIGH)
  - ระบุผู้แจ้งปัญหา (ถ้า login อยู่จะใช้ชื่อ user อัตโนมัติ)
  - ระบุผู้รับผิดชอบ (ไม่บังคับ)
  - สำหรับ external: ระบุโรงพยาบาลและแผนก
- **Sub-issues**: 
  - สร้างปัญหาย่อยได้ไม่จำกัดระดับ (nested sub-issues)
  - แสดงจำนวน sub-issues ทั้งหมด (รวม nested)
  - ไม่สามารถปิด parent issue ได้ถ้ายังมี sub-issues ที่ยังไม่ปิด
  - Parent issue จะเปลี่ยนเป็น IN_PROGRESS อัตโนมัติเมื่อมี sub-issue ถูก accept
- **แก้ไข Issue**: 
  - แก้ไขชื่อ, component path, priority, reporter, assignedTo, closedBy
  - แก้ไข description ด้วย rich text editor
  - แก้ไข hospital และ department (สำหรับ external)

### 3. Component Management
- สร้าง component ได้แบบ hierarchical (parent-child)
- Component path จะถูกคำนวณอัตโนมัติ (เช่น "Component1 > Component2 > Component3")
- สามารถสร้าง component ใหม่ได้จากหน้า issue detail หรือตอนสร้าง issue

### 4. User Management
- สร้างผู้ใช้ใหม่ (username, password, name)
- Login/Logout
- เก็บ session ใน localStorage
- Password ยังไม่ได้ hash (เก็บเป็น plain text)

### 5. Rich Text Editor
- ใช้ ContentEditable API
- **Image Upload**:
  - อัปโหลดภาพได้ (drag & drop หรือ paste)
  - ภาพจะถูกอัปโหลดไปยัง MinIO
  - แสดงภาพใน editor
- **Image Crop**:
  - คลิกที่ภาพเพื่อเลือก
  - กดปุ่ม Crop เพื่อเปิด modal
  - ลากเพื่อเลือกพื้นที่ที่ต้องการ crop
  - Crop แล้วจะอัปโหลดภาพใหม่และแทนที่ภาพเดิม
- **Image Delete**: ลบภาพที่เลือกได้
- บันทึก content เป็น JSON format (html, text, images array)

### 6. Issue Detail Page
- แสดงรายละเอียด issue ครบถ้วน
- แสดง sub-issues ทั้งหมด
- แก้ไขฟิลด์ต่างๆ ได้โดยคลิกที่ฟิลด์
- Rich text editor สำหรับ description
- Auto-refresh ทุก 60 วินาที (ยกเว้นตอนกำลังแก้ไข description)

## Data Models

### Issue
```typescript
{
  _id: string;
  title: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MED' | 'HIGH';
  componentId?: string | null;
  componentPath: string[];  // Snapshot ของ component path ตอนสร้าง issue
  description?: any;  // JSON object { html, text, images }
  type: 'internal' | 'external';
  reporterName?: string;
  assignedTo?: string;
  closedBy?: string;
  parentIssueId?: string | null;  // สำหรับ sub-issues
  hospital?: string;  // สำหรับ external
  department?: string;  // สำหรับ external
  createdAt: Date;
  updatedAt: Date;
}
```

### Component
```typescript
{
  _id: string;
  name: string;
  parentId?: string | null;
  path: string[];  // Full path เช่น ["Component1", "Component2", "Component3"]
  createdAt: Date;
  updatedAt: Date;
}
```

### User
```typescript
{
  _id: string;
  username: string;
  password: string;  // Plain text (ยังไม่ได้ hash)
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## API Endpoints

### Issues
- `GET /api/issues` - ดึงรายการ issues (รองรับ query params: status, componentId, type, parentIssueId)
- `POST /api/issues` - สร้าง issue ใหม่
- `GET /api/issues/[id]` - ดึง issue ตาม ID
- `PATCH /api/issues/[id]` - อัปเดต issue

### Components
- `GET /api/components` - ดึงรายการ components
- `POST /api/components` - สร้าง component ใหม่
- `GET /api/components/[id]` - ดึง component ตาม ID
- `PATCH /api/components/[id]` - อัปเดต component
- `DELETE /api/components/[id]` - ลบ component

### Users
- `GET /api/users` - ดึงรายการ users (ไม่ส่ง password กลับ)
- `POST /api/users` - สร้าง user ใหม่

### Auth
- `POST /api/auth/login` - Login (ตรวจสอบ username/password)

### Upload
- `POST /api/upload` - อัปโหลดไฟล์ภาพ (FormData)

## Firebase Configuration

Firebase config ถูก hardcode ใน `src/lib/firebase.ts`:
- Project ID: `medica-issuev2`
- Firestore collections: `components`, `issues`, `users`

## Environment Variables

ดูจาก `env.example`:
- `MINIO_ENDPOINT` - MinIO server endpoint (default: localhost)
- `MINIO_PORT` - MinIO port (default: 9000)
- `MINIO_USE_SSL` - ใช้ SSL หรือไม่ (default: false)
- `MINIO_ACCESS_KEY` - MinIO access key (default: minioadmin)
- `MINIO_SECRET_KEY` - MinIO secret key (default: minioadmin)
- `MINIO_BUCKET` - Bucket name (default: issue-uploads)
- `MINIO_PUBLIC_URL` - Public URL สำหรับเข้าถึงไฟล์ (default: http://localhost:9000)

## Business Logic

### Issue Status Flow
1. **OPEN** → กด Accept → **IN_PROGRESS** (ต้องระบุ assignedTo)
2. **IN_PROGRESS** → กด Done → **DONE** (ต้องระบุ closedBy)

### Sub-issues Rules
- Parent issue ไม่สามารถปิดได้ถ้ายังมี sub-issues ที่ status ไม่ใช่ DONE
- Parent issue จะเปลี่ยนเป็น IN_PROGRESS อัตโนมัติเมื่อมี sub-issue ถูก accept
- Sub-issues สามารถมี sub-issues ต่อได้ไม่จำกัดระดับ (nested)

### Component Path
- Component path ถูกคำนวณอัตโนมัติจาก parent hierarchy
- Issue จะเก็บ component path เป็น snapshot (ไม่เปลี่ยนแปลงแม้ component path เปลี่ยน)

## UI/UX Features

- Responsive design ด้วย Tailwind CSS
- Modal dialogs สำหรับ forms
- Inline editing สำหรับฟิลด์ต่างๆ
- Auto-refresh ทุก 60 วินาที
- Loading states
- Error handling พร้อม alert messages
- Hover effects และ visual feedback
- Color coding สำหรับ priority และ status

## Security Notes

⚠️ **ข้อควรระวัง**:
- Password ยังไม่ได้ hash (เก็บเป็น plain text)
- Firebase security rules ควรตั้งค่าให้เหมาะสม
- MinIO bucket ควรตั้งค่า public read policy สำหรับไฟล์ภาพ

## Migration

โปรเจกต์นี้เคยใช้ MongoDB และ Prisma/SQLite แต่ได้ migrate ไปใช้ Firebase Firestore แล้ว
- มี script `scripts/migrate-to-firestore.ts` สำหรับ migrate ข้อมูล
- มี API endpoint `/api/migrate` สำหรับ migration

## การใช้งาน

1. **Setup**:
   ```bash
   npm install
   cp env.example .env.local
   # แก้ไข .env.local ตามต้องการ
   ```

2. **Start MinIO** (ถ้ายังไม่ได้ start):
   ```bash
   minio server ~/minio-data
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

4. **Access**: http://localhost:3000

## Dependencies

ดูรายละเอียดใน `package.json`:
- Next.js 14.2.0
- React 18.3.0
- Firebase 12.7.0
- MinIO 8.0.0
- และอื่นๆ

## Notes

- Drag & drop สำหรับ Kanban board ยังไม่ได้ implement (มี library แต่ยังไม่ได้ใช้)
- Canvas editor (fabric.js) ยังไม่ได้ใช้งาน
- Tiptap editor ถูกติดตั้งไว้แต่ไม่ได้ใช้ (ใช้ ContentEditable แทน)
- Prisma schema ยังมีอยู่แต่ไม่ได้ใช้ (ใช้ Firebase แทน)

