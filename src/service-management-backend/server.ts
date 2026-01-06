// โหลด environment variables จากไฟล์ .env หรือ .env.local (ใช้ร่วมกับ Next.js)
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// ลองโหลด .env.local ก่อน (Next.js ใช้ไฟล์นี้)
// ถ้าไม่มีค่อยใช้ .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log('✅ Loaded environment variables from .env.local');
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✅ Loaded environment variables from .env');
} else {
  dotenv.config(); // fallback to default .env
  console.log('⚠️ Using default .env (or environment variables)');
}

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import multer from "multer";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Upload buffer function for ImgBB - ต้อง copy function มาใส่ที่นี่เพราะ rootDir จำกัด
async function uploadBuffer(
  buffer: Buffer,
  mimeType: string,
  originalName?: string
): Promise<{ url: string; key: string; mime: string; size: number }> {
  const imgbbApiKey = process.env.IMGBB_API_KEY;

  if (!imgbbApiKey) {
    console.error('[uploadBuffer] IMGBB_API_KEY is not set in environment variables');
    console.error('[uploadBuffer] Please set IMGBB_API_KEY in .env file and restart the server');
    throw new Error('IMGBB_API_KEY is not set. Please set IMGBB_API_KEY in .env file and restart the server.');
  }

  try {
    const base64Image = buffer.toString('base64');
    const formData = new URLSearchParams();
    formData.append('key', imgbbApiKey);
    formData.append('image', base64Image);

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || `ImgBB API error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const result = await response.json();

    if (!result.success || !result.data || !result.data.url) {
      throw new Error('ImgBB API did not return image URL');
    }

    const publicUrl = result.data.url;
    const imageKey = result.data.id || result.data.url.split('/').pop() || 'unknown';

    return {
      url: publicUrl,
      key: imageKey,
      mime: mimeType,
      size: buffer.length,
    };
  } catch (error: any) {
    console.error('ImgBB upload error:', error);
    throw new Error(`Failed to upload file to ImgBB: ${error.message}`);
  }
}
import {
  findAll,
  findById,
  findOneByField,
  findMany,
  create,
  update,
  deleteDoc,
  upsert,
  count,
  runBatch,
  toFirestoreDate,
  fromFirestoreDate,
} from "./firestoreHelpers";
import { populateInstallation, prepareInstallationData } from "./installationFirestoreHelpers";
import { db } from "./firestoreClient";
import { FieldValue } from "firebase-admin/firestore";
import type {
  HospitalRequestBody,
  DepartmentRequestBody,
  SimRequestBody,
  ConnectionRequestBody,
  InstallationRequestBody,
  NetworkUpdateRequestBody,
  WarrantyExtensionRequestBody,
  SimWithRelations,
} from "./types";

const app = express();
app.use(cors({
  origin: true, // อนุญาตให้ทุก origin (ใน production ควรระบุ origin ที่แน่นอน)
  credentials: true, // อนุญาตให้ส่ง cookie
}));
app.use(cookieParser());


// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        isAuthenticated: boolean;
      };
    }
  }
}

// ตั้งค่า multer สำหรับอัปโหลดไฟล์
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

// ใช้ memory storage แทน disk storage เพื่ออัปโหลดไปยัง ImgBB
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 32 * 1024 * 1024 }, // 32MB (ImgBB limit)
  fileFilter: (_req: express.Request, file: MulterFile, cb: FileFilterCallback) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น"), false);
  },
}) as unknown as {
  single: (fieldName: string) => express.RequestHandler;
};

/* ------------------------------------------------
 *  AUTHENTICATION MIDDLEWARE (disabled - no login required)
 * ------------------------------------------------ */
function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  // No authentication required - allow all requests
  req.user = { id: "server", isAuthenticated: true };
  return next();
}

/* ------------------------------------------------
 *  POST /api/upload-image   (อัปโหลดรูปภาพไปยัง ImgBB)
 *  ต้องวางไว้ก่อน bodyParser เพื่อให้ multer อ่าน request body ได้
 * ------------------------------------------------ */
app.post("/api/upload-image", upload.single("image"), authenticateToken, async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "ไม่พบไฟล์รูปภาพ" });
    }

    console.log('[upload-image] Received file:', {
      name: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      bufferLength: req.file.buffer?.length || 0
    });

    // อัปโหลดไปยัง ImgBB
    const result = await uploadBuffer(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    console.log('[upload-image] Upload successful, URL:', result.url);

    // ส่ง URL กลับไป (absolute URL จาก ImgBB)
    res.json({ url: result.url });
  } catch (err: unknown) {
    console.error("POST /api/upload-image error:", err);
    const errorMessage = getErrorMessage(err);
    console.error("POST /api/upload-image error message:", errorMessage);
    res.status(500).json({ error: "อัปโหลดรูปภาพไม่สำเร็จ", detail: errorMessage });
  }
});

// ตั้งค่า bodyParser สำหรับ routes อื่นๆ (ต้องวางหลัง route upload-image)
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));


app.get("/", (_req, res) => {
  res.json({
    status: "online",
    message: "Hospital system API is running.",
    endpoints: {
      hospitals: "GET/POST/PUT /api/hospitals",
      departments: "GET/POST/PUT /api/departments",
      sims: "GET/POST/PUT /api/sims",
      list: "GET /api/installations",
      getOne: "GET /api/installations/:id",
      create: "POST /api/installations",
      update: "PUT /api/installations/:id",
    },
  });
});

// สร้าง hospital ตัวอย่างกัน DB ว่าง (ใช้ตอน start)
async function ensureSampleHospital() {
  const hospitalCount = await count("hospitals");
  if (hospitalCount === 0) {
    await create("hospitals", {
      name: "โรงพยาบาลตัวอย่าง",
      code: "HOSP-DEMO",
      region: "ภาคเหนือ",
      province: "เชียงใหม่",
      address: "123 ถนนสุขุมวิท ต.ช้างคลาน อ.เมือง จ.เชียงใหม่",
    } as any);
  }
}

async function ensureSampleDepartments() {
  const seeds = ["GI", "OR", "ENT", "URO", "GYN", "อื่นๆ"];
  for (const name of seeds) {
    await upsert("departments", "name", name, { name } as any);
  }
}

function mapHospitalPayload(body: HospitalRequestBody) {
  const name = (body?.name ?? "").trim();
  const code = body?.code ? String(body.code).trim() : null;
  const province = body?.province ? String(body.province).trim() : null;
  const region =
    body?.region?.trim?.() ||
    (province ? `ภาค${province}` : null); // fallback เก็บ region ไว้บางกรณี
  const address = body?.address ? String(body.address).trim() : null;

  return {
    name,
    code: code || null,
    province: province || null,
    region: region || null,
    address: address || null,
  };
}

function mapDepartmentPayload(body: DepartmentRequestBody) {
  const name = (body?.name ?? "").trim();
  return { name };
}

// แปลง string (yyyy-mm-dd) → Date | null
function toDateOrNull(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// Helper function: แปลง Date objects ใน object/array เป็น ISO string สำหรับส่งไปให้ client
function serializeDates(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => serializeDates(item));
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = serializeDates(obj[key]);
      }
    }
    return result;
  }
  
  return obj;
}

// ฟังก์ชันตรวจสอบสถานะหมดอายุของซิมโดยอัตโนมัติ
function checkSimExpirationStatus(sim: any): "active" | "expired" {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // ตั้งเวลาเป็น 00:00:00 เพื่อเปรียบเทียบเฉพาะวันที่

  // แปลง Timestamp เป็น Date ถ้าจำเป็น
  let simExpireAt: Date | null = null;
  if (sim.simExpireAt) {
    simExpireAt = sim.simExpireAt instanceof Date ? sim.simExpireAt : fromFirestoreDate(sim.simExpireAt);
  }

  let activatedDate: Date | null = null;
  if (sim.activatedDate) {
    activatedDate = sim.activatedDate instanceof Date ? sim.activatedDate : fromFirestoreDate(sim.activatedDate);
  }

  // ตรวจสอบจาก simExpireAt ก่อน (ถ้ามี)
  if (simExpireAt) {
    const expireDate = new Date(simExpireAt);
    expireDate.setHours(0, 0, 0, 0);
    if (now > expireDate) {
      return "expired";
    }
  }

  // ตรวจสอบจาก activatedDate + 1 ปี (ถ้ามี activatedDate แต่ไม่มี simExpireAt)
  if (activatedDate && !simExpireAt) {
    const activated = new Date(activatedDate);
    activated.setHours(0, 0, 0, 0);
    
    // เพิ่ม 1 ปีจากวันที่เปิดซิม
    const expireDate = new Date(activated);
    expireDate.setFullYear(expireDate.getFullYear() + 1);
    
    if (now > expireDate) {
      return "expired";
    }
  }

  return "active";
}

function mapSimPayload(body: SimRequestBody) {
  const phoneNumber = (body?.phoneNumber ?? "").trim();

  // network flags รองรับ array หรือ csv string
  const rawFlags = body?.networkFlags;
  let flagsCsv = "";
  if (Array.isArray(rawFlags)) {
    flagsCsv = rawFlags.map((s) => String(s).trim()).filter(Boolean).join(",");
  } else if (typeof rawFlags === "string") {
    flagsCsv = rawFlags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(",");
  }

  const networkOther = body?.networkOther ? String(body.networkOther).trim() : null;
  const ownerName = body?.ownerName ? String(body.ownerName).trim() : null;
  const packageDetail = body?.packageDetail ? String(body.packageDetail).trim() : null;
  const status = body?.status === "expired" ? "expired" : "active";

  // แปลง hospitalId และ departmentId เป็น string แต่ถ้าเป็น null/undefined/empty ให้เป็น null
  const hospitalId = body?.hospitalId != null && body.hospitalId !== "" 
    ? String(body.hospitalId) 
    : null;
  const departmentId = body?.departmentId != null && body.departmentId !== "" 
    ? String(body.departmentId) 
    : null;

  return {
    phoneNumber,
    networkFlags: flagsCsv,
    networkOther: networkOther || null,
    ownerName,
    activatedDate: toFirestoreDate(toDateOrNull(body?.activatedDate)),
    packageDetail,
    packageExpireAt: toFirestoreDate(toDateOrNull(body?.packageExpireAt)),
    simExpireAt: toFirestoreDate(toDateOrNull(body?.simExpireAt)),
    status,
    hospitalId,
    departmentId,
  };
}

// Helper function: populate hospital และ department สำหรับ sim
async function populateSimRelations(sim: any) {
  if (sim.hospitalId) {
    sim.hospital = await findById<any>("hospitals", sim.hospitalId);
  }
  if (sim.departmentId) {
    sim.department = await findById<any>("departments", sim.departmentId);
  }
  // แปลง Timestamp เป็น Date
  if (sim.activatedDate) sim.activatedDate = fromFirestoreDate(sim.activatedDate);
  if (sim.packageExpireAt) sim.packageExpireAt = fromFirestoreDate(sim.packageExpireAt);
  if (sim.simExpireAt) sim.simExpireAt = fromFirestoreDate(sim.simExpireAt);
  return sim;
}

function mapConnectionPayload(body: ConnectionRequestBody) {
  const hospitalId = String(body?.hospitalId ?? "");
  const pacsDetail = body?.pacsDetail ? String(body.pacsDetail).trim() : null;
  const emrDetail = body?.emrDetail ? String(body.emrDetail).trim() : null;
  const serverDetail = body?.serverDetail ? String(body.serverDetail).trim() : null;
  const otherDetail = body?.otherDetail ? String(body.otherDetail).trim() : null;

  return {
    hospitalId,
    pacsDetail,
    emrDetail,
    serverDetail,
    otherDetail,
  };
}

// validate SN ของอุปกรณ์ที่บังคับต้องมี SN
function validateMandatorySn(equipments: Array<{ equipmentType?: string; serialNumber?: string | null }>) {
  const mandatoryTypes = ["COMPUTER", "MONITOR"];

  const missing = equipments.filter(
    (eq) =>
      eq &&
      mandatoryTypes.includes(eq.equipmentType || "") &&
      (!eq.serialNumber || String(eq.serialNumber).trim() === "")
  );

  if (missing.length > 0) {
    const types = Array.from(
      new Set(missing.map((m) => m.equipmentType).filter(Boolean))
    ).join(", ");
    throw new Error(
      `อุปกรณ์ประเภทที่ต้องมี Serial Number (${types}) แต่ยังไม่ได้กรอก SN`
    );
  }
}

// Helper function to extract error message safely
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  return "เกิดข้อผิดพลาด";
}

// Helper function to check if error is Firestore error
function isFirestoreError(err: unknown): err is { code?: string; message?: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}

/* ------------------------------------------------
 *  APPLY AUTHENTICATION MIDDLEWARE TO ALL API ROUTES
 *  (ยกเว้น /api/login เท่านั้น)
 * ------------------------------------------------ */
app.use("/api", (req, res, next) => {
  // ข้าม authentication สำหรับ login และ upload-image (upload-image จะใช้ authentication ใน route definition เอง)
  if (req.path === "/login" || req.path === "/upload-image") {
    return next();
  }
  // ใช้ authentication middleware สำหรับ routes อื่นๆ
  authenticateToken(req, res, next);
});

/* ------------------------------------------------
 *  HOSPITAL CRUD
 * ------------------------------------------------ */
app.get("/api/hospitals", async (req, res) => {
  try {
    const search = typeof req.query?.search === "string" ? req.query.search.trim() : "";
    const limitRaw = req.query?.limit;
    const limit =
      limitRaw && !Array.isArray(limitRaw) && !isNaN(Number(limitRaw))
        ? Number(limitRaw)
        : undefined;

    let data;
    if (search.trim().length > 0) {
      // Firestore ไม่รองรับ full-text search โดยตรง ต้องดึงทั้งหมดแล้ว filter
      const allHospitals = await findAll<any>("hospitals", { field: "name", direction: "asc" });
      data = allHospitals.filter((h: any) => {
        const searchLower = search.toLowerCase();
        return (
          h.name?.toLowerCase().includes(searchLower) ||
          h.code?.toLowerCase().includes(searchLower) ||
          h.province?.toLowerCase().includes(searchLower) ||
          h.address?.toLowerCase().includes(searchLower)
        );
      });
      if (limit) data = data.slice(0, limit);
    } else {
      data = await findAll<any>("hospitals", { field: "name", direction: "asc" });
      if (limit) data = data.slice(0, limit);
    }

    res.json(data);
  } catch (err: unknown) {
    console.error("GET /api/hospitals error:", err);
    res.status(500).json({ error: "ดึงข้อมูลโรงพยาบาลไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

app.get("/api/hospitals/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const hospital = await findById<any>("hospitals", id);
    if (!hospital) return res.status(404).json({ error: "ไม่พบโรงพยาบาล" });
    res.json(hospital);
  } catch (err: unknown) {
    console.error("GET /api/hospitals/:id error:", err);
    res
      .status(500)
      .json({ error: "ดึงข้อมูลโรงพยาบาลไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

app.post("/api/hospitals", async (req, res) => {
  try {
    const payload = mapHospitalPayload(req.body);
    if (!payload.name) {
      return res.status(400).json({ error: "กรุณากรอกชื่อโรงพยาบาล" });
    }

    const id = await create("hospitals", payload as any);
    const created = await findById<any>("hospitals", id);
    res.status(201).json(created);
  } catch (err: unknown) {
    console.error("POST /api/hospitals error:", err);
    res
      .status(500)
      .json({ error: "สร้างโรงพยาบาลไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

app.put("/api/hospitals/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const payload = mapHospitalPayload(req.body);
    if (!payload.name) {
      return res.status(400).json({ error: "กรุณากรอกชื่อโรงพยาบาล" });
    }

    const existing = await findById<any>("hospitals", id);
    if (!existing) {
      return res.status(404).json({ error: "ไม่พบโรงพยาบาล" });
    }

    await update("hospitals", id, payload as any);
    const updated = await findById<any>("hospitals", id);
    res.json(updated);
  } catch (err: unknown) {
    console.error("PUT /api/hospitals/:id error:", err);
    res
      .status(500)
      .json({ error: "อัปเดตข้อมูลโรงพยาบาลไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

/* ------------------------------------------------
 *  DEPARTMENT CRUD
 * ------------------------------------------------ */
app.get("/api/departments", async (req, res) => {
  try {
    const search = typeof req.query?.search === "string" ? req.query.search.trim() : "";
    let data = await findAll<any>("departments", { field: "name", direction: "asc" });
    
    if (search.length > 0) {
      const searchLower = search.toLowerCase();
      data = data.filter((d: any) => d.name?.toLowerCase().includes(searchLower));
    }
    
    res.json(data);
  } catch (err: unknown) {
    console.error("GET /api/departments error:", err);
    res.status(500).json({ error: "ดึงข้อมูลแผนกไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

app.post("/api/departments", async (req, res) => {
  try {
    const payload = mapDepartmentPayload(req.body);
    if (!payload.name) {
      return res.status(400).json({ error: "กรุณากรอกชื่อแผนก" });
    }
    
    // ตรวจสอบว่ามีชื่อแผนกนี้แล้วหรือไม่
    const existing = await findOneByField<any>("departments", "name", payload.name);
    if (existing) {
      return res.status(400).json({ error: "มีชื่อแผนกนี้แล้ว" });
    }
    
    const id = await create("departments", payload as any);
    const created = await findById<any>("departments", id);
    res.status(201).json(created);
  } catch (err: unknown) {
    console.error("POST /api/departments error:", err);
    res.status(500).json({ error: "สร้างแผนกไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

app.get("/api/departments/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const department = await findById<any>("departments", id);
    if (!department) return res.status(404).json({ error: "ไม่พบแผนก" });
    res.json(department);
  } catch (err: unknown) {
    console.error("GET /api/departments/:id error:", err);
    res.status(500).json({ error: "ดึงข้อมูลแผนกไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

app.put("/api/departments/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const payload = mapDepartmentPayload(req.body);
    if (!payload.name) {
      return res.status(400).json({ error: "กรุณากรอกชื่อแผนก" });
    }

    // ตรวจสอบว่ามีแผนกอื่นที่ใช้ชื่อเดียวกันหรือไม่ (ไม่นับตัวเอง)
    const existing = await findOneByField<any>("departments", "name", payload.name);
    if (existing && existing.id !== id) {
      return res.status(400).json({ error: "มีชื่อแผนกนี้แล้ว" });
    }

    const current = await findById<any>("departments", id);
    if (!current) {
      return res.status(404).json({ error: "ไม่พบแผนก" });
    }

    await update("departments", id, payload as any);
    const updated = await findById<any>("departments", id);
    res.json(updated);
  } catch (err: unknown) {
    console.error("PUT /api/departments/:id error:", err);
    res.status(500).json({ error: "อัปเดตแผนกไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

/* ------------------------------------------------
 *  SIM CRUD
 * ------------------------------------------------ */
app.get("/api/sims", async (req, res) => {
  try {
    const search = typeof req.query?.search === "string" ? req.query.search.trim() : "";
    let data = await findAll<any>("sims", { field: "phoneNumber", direction: "asc" });
    
    // Filter by search
    if (search.length > 0) {
      const searchLower = search.toLowerCase();
      data = data.filter((s: any) => 
        s.phoneNumber?.toLowerCase().includes(searchLower) ||
        s.ownerName?.toLowerCase().includes(searchLower)
      );
    }

    // Populate relations
    data = await Promise.all(data.map((sim: any) => populateSimRelations(sim)));

    // ตรวจสอบและอัปเดตสถานะหมดอายุโดยอัตโนมัติ
    const updatePromises = data.map(async (sim: any) => {
      const autoStatus = checkSimExpirationStatus(sim);
      if (autoStatus === "expired" && sim.status !== "expired") {
        await update("sims", sim.id, { status: "expired" } as any);
        sim.status = "expired";
      }
    });

    await Promise.all(updatePromises);

    res.json(serializeDates(data));
  } catch (err: unknown) {
    console.error("GET /api/sims error:", err);
    res.status(500).json({ error: "ดึงข้อมูลซิมไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

app.get("/api/sims/:id", async (req, res) => {
  try {
    const id = req.params.id;
    let data = await findById<any>("sims", id);
    if (!data) return res.status(404).json({ error: "ไม่พบซิม" });

    data = await populateSimRelations(data);

    // ตรวจสอบและอัปเดตสถานะหมดอายุโดยอัตโนมัติ
    const autoStatus = checkSimExpirationStatus(data);
    if (autoStatus === "expired" && data.status !== "expired") {
      await update("sims", id, { status: "expired" } as any);
      data = await findById<any>("sims", id);
      data = await populateSimRelations(data!);
      return res.json(serializeDates(data));
    }

    res.json(serializeDates(data));
  } catch (err: unknown) {
    console.error("GET /api/sims/:id error:", err);
    res.status(500).json({ error: "ดึงข้อมูลซิมไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

app.post("/api/sims", async (req, res) => {
  try {
    const payload = mapSimPayload(req.body);
    
    // Debug logging
    console.log("POST /api/sims - Request body:", JSON.stringify(req.body, null, 2));
    console.log("POST /api/sims - Mapped payload:", JSON.stringify(payload, null, 2));
    
    if (!payload.phoneNumber) {
      return res.status(400).json({ error: "กรุณากรอกเบอร์โทร" });
    }
    if (!payload.networkFlags) {
      return res.status(400).json({ error: "กรุณาเลือกเครือข่าย" });
    }
    // ตรวจสอบ hospitalId และ departmentId อย่างชัดเจน
    // payload.hospitalId และ payload.departmentId ควรเป็น string หรือ null จาก mapSimPayload
    if (payload.hospitalId === null || payload.hospitalId === undefined || payload.hospitalId === "") {
      return res.status(400).json({ error: "กรุณาเลือกโรงพยาบาล" });
    }
    if (payload.departmentId === null || payload.departmentId === undefined || payload.departmentId === "") {
      return res.status(400).json({ error: "กรุณาเลือกแผนก" });
    }

    // ตรวจสอบว่าเบอร์ซ้ำหรือไม่
    const existing = await findOneByField<any>("sims", "phoneNumber", payload.phoneNumber);
    if (existing) {
      return res.status(400).json({ error: "เบอร์นี้มีในระบบแล้ว" });
    }

    const id = await create("sims", payload as any);
    let created = await findById<any>("sims", id);
    created = await populateSimRelations(created!);
    res.status(201).json(created);
  } catch (err: unknown) {
    console.error("POST /api/sims error:", err);
    res.status(500).json({ error: "บันทึกซิมไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

app.put("/api/sims/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const payload = mapSimPayload(req.body);
    
    // Debug logging
    console.log(`PUT /api/sims/${id} - Request body:`, JSON.stringify(req.body, null, 2));
    console.log(`PUT /api/sims/${id} - Mapped payload:`, JSON.stringify(payload, null, 2));
    
    if (!payload.phoneNumber) {
      return res.status(400).json({ error: "กรุณากรอกเบอร์โทร" });
    }
    if (!payload.networkFlags) {
      return res.status(400).json({ error: "กรุณาเลือกเครือข่าย" });
    }
    // ตรวจสอบ hospitalId และ departmentId อย่างชัดเจน
    if (payload.hospitalId === null || payload.hospitalId === undefined || payload.hospitalId === "") {
      return res.status(400).json({ error: "กรุณาเลือกโรงพยาบาล" });
    }
    if (payload.departmentId === null || payload.departmentId === undefined || payload.departmentId === "") {
      return res.status(400).json({ error: "กรุณาเลือกแผนก" });
    }

    const existing = await findById<any>("sims", id);
    if (!existing) {
      return res.status(404).json({ error: "ไม่พบซิม" });
    }

    // ตรวจสอบว่าเบอร์ซ้ำหรือไม่ (ไม่นับตัวเอง)
    const duplicate = await findOneByField<any>("sims", "phoneNumber", payload.phoneNumber);
    if (duplicate && duplicate.id !== id) {
      return res.status(400).json({ error: "เบอร์นี้มีในระบบแล้ว" });
    }

    await update("sims", id, payload as any);
    let updated = await findById<any>("sims", id);
    updated = await populateSimRelations(updated!);
    res.json(updated);
  } catch (err: unknown) {
    console.error("PUT /api/sims/:id error:", err);
    res.status(500).json({ error: "อัปเดตซิมไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

// Helper function: populate connection profile with relations
async function populateConnectionProfile(conn: any) {
  if (conn.hospitalId) {
    conn.hospital = await findById<any>("hospitals", conn.hospitalId);
  }
  if (conn.id) {
    conn.images = await findMany<any>("connectionImages", [
      { field: "connectionId", operator: "==", value: conn.id }
    ]);
  }
  // Convert Timestamps to Dates
  if (conn.createdAt) conn.createdAt = fromFirestoreDate(conn.createdAt);
  if (conn.updatedAt) conn.updatedAt = fromFirestoreDate(conn.updatedAt);
  return conn;
}

/* ------------------------------------------------
 *  CONNECTION PROFILE CRUD
 * ------------------------------------------------ */
app.get("/api/connections", async (req, res) => {
  try {
    const hospitalIdRaw = req.query?.hospitalId;
    const hospitalId =
      hospitalIdRaw && !Array.isArray(hospitalIdRaw) && !isNaN(Number(hospitalIdRaw))
        ? String(hospitalIdRaw)
        : undefined;

    let data;
    if (hospitalId) {
      data = await findMany<any>("connectionProfiles", [
        { field: "hospitalId", operator: "==", value: hospitalId }
      ]);
    } else {
      data = await findAll<any>("connectionProfiles");
    }

    // Populate relations
    data = await Promise.all(data.map((conn: any) => populateConnectionProfile(conn)));

    res.json(serializeDates(data));
  } catch (err: unknown) {
    console.error("GET /api/connections error:", err);
    const errorMsg = getErrorMessage(err);
    if (errorMsg.includes("not found") || errorMsg.includes("does not exist")) {
      return res.json([]);
    }
    res.status(500).json({ error: "ดึงข้อมูลการเชื่อมต่อไม่สำเร็จ", detail: errorMsg });
  }
});

app.get("/api/connections/:id", async (req, res) => {
  try {
    const id = req.params.id;
    let data = await findById<any>("connectionProfiles", id);
    if (!data) return res.status(404).json({ error: "ไม่พบข้อมูลการเชื่อมต่อ" });
    
    data = await populateConnectionProfile(data);
    res.json(serializeDates(data));
  } catch (err: unknown) {
    console.error("GET /api/connections/:id error:", err);
    res.status(500).json({ error: "ดึงข้อมูลการเชื่อมต่อไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

app.post("/api/connections", async (req, res) => {
  try {
    const payload = mapConnectionPayload(req.body);
    if (!payload.hospitalId) {
      return res.status(400).json({ error: "กรุณาเลือกโรงพยาบาล" });
    }

    const images: string[] = Array.isArray(req.body?.images)
      ? req.body.images.filter((u: any) => typeof u === "string" && u.trim() !== "")
      : [];

    // ใช้ batch write แทน transaction
    const batch = db.batch();
    
    // Upsert connection profile (หาโดย hospitalId)
    const existing = await findOneByField<any>("connectionProfiles", "hospitalId", payload.hospitalId);
    let connectionId: string;
    
    if (existing) {
      connectionId = existing.id;
      const connRef = db.collection("connectionProfiles").doc(connectionId);
      batch.update(connRef, {
        ...payload,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      const connRef = db.collection("connectionProfiles").doc();
      connectionId = connRef.id;
      batch.set(connRef, {
        ...payload,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // ลบ images เดิม
    const existingImages = await findMany<any>("connectionImages", [
      { field: "connectionId", operator: "==", value: connectionId }
    ]);
    existingImages.forEach((img: any) => {
      batch.delete(db.collection("connectionImages").doc(img.id));
    });

    // สร้าง images ใหม่
    images.forEach((url) => {
      const imgRef = db.collection("connectionImages").doc();
      batch.set(imgRef, {
        connectionId: connectionId,
        url,
        category: "connection",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    // ดึงข้อมูลที่สร้างแล้วพร้อม relations
    let result = await findById<any>("connectionProfiles", connectionId);
    result = await populateConnectionProfile(result!);
    
    res.status(201).json(serializeDates(result));
  } catch (err: unknown) {
    console.error("POST /api/connections error:", err);
    res.status(500).json({ error: "บันทึกการเชื่อมต่อไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

app.put("/api/connections/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const payload = mapConnectionPayload(req.body);
    if (!payload.hospitalId) {
      return res.status(400).json({ error: "กรุณาเลือกโรงพยาบาล" });
    }

    const existing = await findById<any>("connectionProfiles", id);
    if (!existing) {
      return res.status(404).json({ error: "ไม่พบข้อมูลการเชื่อมต่อ" });
    }

    const images: string[] = Array.isArray(req.body?.images)
      ? req.body.images.filter((u: unknown) => typeof u === "string" && u.trim() !== "")
      : [];

    // ใช้ batch write
    const batch = db.batch();
    
    // อัปเดต connection profile
    const connRef = db.collection("connectionProfiles").doc(id);
    batch.update(connRef, {
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // ลบ images เดิม
    const existingImages = await findMany<any>("connectionImages", [
      { field: "connectionId", operator: "==", value: id }
    ]);
    existingImages.forEach((img: any) => {
      batch.delete(db.collection("connectionImages").doc(img.id));
    });

    // สร้าง images ใหม่
    images.forEach((url) => {
      const imgRef = db.collection("connectionImages").doc();
      batch.set(imgRef, {
        connectionId: id,
        url,
        category: "connection",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    // ดึงข้อมูลที่อัปเดตแล้วพร้อม relations
    let result = await findById<any>("connectionProfiles", id);
    result = await populateConnectionProfile(result!);
    
    res.json(serializeDates(result));
  } catch (err: unknown) {
    console.error("PUT /api/connections/:id error:", err);
    res.status(500).json({ error: "อัปเดตการเชื่อมต่อไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

/* ------------------------------------------------
 *  POST /api/installations   (สร้างใหม่)
 * ------------------------------------------------ */
app.post("/api/installations", async (req, res) => {
  try {
    const form = req.body as InstallationRequestBody;

    // ---------------- HOSPITAL NAME ----------------
    const hospitalName: string =
      form.hospital?.name?.trim() || form.hospital?.hospitalName?.trim() || "โรงพยาบาลไม่ระบุชื่อ";

    // หา hospital จากชื่อที่กรอก ถ้ายังไม่มีให้ create ใหม่
    let hospital = await findOneByField<any>("hospitals", "name", hospitalName);
    if (!hospital) {
      const hospitalId = await create("hospitals", {
        name: hospitalName,
        code: "HOSP-DEMO",
        region: "ภาคเหนือ",
      } as any);
      hospital = await findById<any>("hospitals", hospitalId);
    }

    // ---------------- DEPARTMENT ----------------
    // ตรวจสอบและสร้างแผนกใหม่ถ้ายังไม่มี
    const departmentName: string = (form.hospital?.department ?? "").trim();
    if (departmentName) {
      await upsert("departments", "name", departmentName, { name: departmentName } as any);
    }

    const equipments = form.equipment ?? [];

    // validate SN ที่บังคับ
    validateMandatorySn(equipments);

    // ใช้ Firestore batch write แทน transaction
    const batch = db.batch();
      // 1) สร้าง Installation
      const installationRef = db.collection("installations").doc();
      const installationData = prepareInstallationData({
        hospital: hospitalName, // ใช้ชื่อโรงพยาบาลเป็น string แทน hospitalId
        systemType: form.hospital?.systemType ?? "",
        department: departmentName || null,
        floor: form.hospital?.floor ?? null,
        room: form.hospital?.room ?? null,
        building: form.hospital?.building ?? null,
        endoscopeBrand: form.hospital?.endoscopeBrand ?? null,
        systemMode: form.hospital?.systemMode ?? "",
        hospitalAssetCode: null,
        status: null,
        pmPerYear: form.fieldInfo?.pmPerYear != null ? Number(form.fieldInfo.pmPerYear) : null,
        warrantyMonths: form.fieldInfo?.warrantyMonths != null ? Number(form.fieldInfo.warrantyMonths) : null,
        warrantyExpireDate: toDateOrNull(form.fieldInfo?.warrantyExpireDate),
        installDate: toDateOrNull(form.fieldInfo?.installDate),
        inspectionDate: toDateOrNull(form.fieldInfo?.inspectionDate),
        lateWarrantyExtendDate: toDateOrNull(form.fieldInfo?.lateWarrantyExtendDate),
        technicianName: form.fieldInfo?.technicianName ?? null,
        technicianPhone: form.fieldInfo?.technicianPhone ?? null,
        additionalInfo: form.extra?.additionalInfo ?? null,
        hasSpareSet: !!form.fieldInfo?.hasSpareSet,
        spareNote: form.fieldInfo?.spareSetNote ?? form.fieldInfo?.spareNote ?? null,
      });
      batch.set(installationRef, {
        ...installationData,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      const installationId = installationRef.id;

      // 2) สร้าง Equipment ทั้งหมด ของ installation นี้
      const equipmentIds: string[] = [];
      if (equipments.length > 0) {
        for (const eq of equipments) {
          const eqRef = db.collection("equipments").doc();
          equipmentIds.push(eqRef.id);
          batch.set(eqRef, {
            installationId: installationId,
            equipmentType: eq.equipmentType ?? "",
            name: eq.name ?? null,
            quantity: eq.quantity != null ? Number(eq.quantity) : 0,
            unit: eq.unit ?? null,
            serialNumber: eq.serialNumber ?? null,
            lengthM: eq.lengthM != null && eq.lengthM !== "" ? Number(eq.lengthM) : null,
            connectionType: eq.connectionType ?? null,
            signalType: eq.signalType ?? null,
            footSwitchMode: eq.footSwitchMode ?? null,
            notes: eq.notes ?? null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      // 3) สร้าง NetworkConfig 1 ตัวผูกกับ installation นี้
      let networkConfigId: string | null = null;
      if (form.network) {
        const networkConfigRef = db.collection("networkConfigs").doc();
        networkConfigId = networkConfigRef.id;
        const networkData: any = {
          installationId: installationId,
          anydeskId: form.network.anydeskId ?? null,
          anydeskPassword: form.network.anydeskPassword ?? null,
          hospitalWifiSsid: form.network.hospitalWifiSsid || null,
          hospitalWifiPassword: form.network.hospitalWifiPassword ?? null,
          hospitalLanInfo: form.network.hospitalLanInfo || null,
          wifiUser: form.network.wifiUser || null,
          vpnDetail: form.network.vpnDetail ?? null,
          networkGateway: form.network.networkGateway ?? null,
          networkSubnet: form.network.networkSubnet ?? null,
        };
        if (form.network.connectionFlags !== undefined) {
          networkData.connectionFlags = form.network.connectionFlags || null;
        }
        batch.set(networkConfigRef, {
          ...networkData,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        // สร้าง Network Images
        if (form.network.images && Array.isArray(form.network.images)) {
          for (const url of form.network.images.filter((u: string) => u && typeof u === "string")) {
            const imgRef = db.collection("networkImages").doc();
            batch.set(imgRef, {
              networkConfigId: networkConfigId,
              url: url,
              category: "network",
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        }
      }

      // 4) สร้าง Installation Images (fieldInfo และ extra)
      if (form.fieldInfo?.images && Array.isArray(form.fieldInfo.images)) {
        for (const url of form.fieldInfo.images.filter((u: string) => u && typeof u === "string")) {
          const imgRef = db.collection("installationImages").doc();
          batch.set(imgRef, {
            installationId: installationId,
            url: url,
            category: "fieldInfo",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }
      
      if (form.extra?.images && Array.isArray(form.extra.images)) {
        for (const url of form.extra.images.filter((u: string) => u && typeof u === "string")) {
          const imgRef = db.collection("installationImages").doc();
          batch.set(imgRef, {
            installationId: installationId,
            url: url,
            category: "extra",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      // 5) สร้าง Equipment Images
      if (equipmentIds.length > 0 && form.equipmentImages && Array.isArray(form.equipmentImages)) {
        for (const url of form.equipmentImages.filter((u: string) => u && typeof u === "string")) {
          const imgRef = db.collection("equipmentImages").doc();
          batch.set(imgRef, {
            equipmentId: equipmentIds[0],
            url: url,
            category: "equipment",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      // Commit batch
      await batch.commit();

      // ดึงข้อมูล installation ที่สร้างแล้วพร้อม relations
      let result = await findById<any>("installations", installationId);
      result = await populateInstallation(result!);
      res.status(201).json(serializeDates(result));
  } catch (err: unknown) {
    console.error("POST /api/installations error:", err);
    const errorMsg = getErrorMessage(err);
    if (errorMsg.includes("Serial Number")) {
      return res.status(400).json({ error: errorMsg });
    }
    res
      .status(500)
      .json({ error: "สร้างข้อมูลไม่สำเร็จ", detail: errorMsg });
  }
});

/* ------------------------------------------------
 *  PUT /api/installations/:id   (แก้ไข)
 * ------------------------------------------------ */
app.put("/api/installations/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const form = req.body as InstallationRequestBody;

    const equipments = form.equipment ?? [];

    // validate SN ที่บังคับ
    validateMandatorySn(equipments);

    // ดึง installation ปัจจุบัน
    const current = await findById<any>("installations", id);
    if (!current) {
      return res.status(404).json({ error: "ไม่พบ installation ที่ต้องการแก้ไข" });
    }

    // หา hospital จากชื่อที่กรอก
    const hospitalName: string =
      form.hospital?.name?.trim() || form.hospital?.hospitalName?.trim() || (current.hospital || "โรงพยาบาลไม่ระบุชื่อ");
    
    let hospital = await findOneByField<any>("hospitals", "name", hospitalName);
    if (!hospital) {
      const hospitalId = await create("hospitals", {
        name: hospitalName,
        code: "HOSP-DEMO",
        region: "ภาคเหนือ",
      } as any);
      hospital = await findById<any>("hospitals", hospitalId);
    }

    // ตรวจสอบและสร้างแผนกใหม่ถ้ายังไม่มี
    const departmentName: string = (form.hospital?.department ?? "").trim();
    if (departmentName) {
      await upsert("departments", "name", departmentName, { name: departmentName } as any);
    }

    // ใช้ batch write
    const batch = db.batch();

    // 1) อัปเดต installation
    const installationRef = db.collection("installations").doc(id);
    const installationData = prepareInstallationData({
      hospital: hospitalName, // ใช้ชื่อโรงพยาบาลเป็น string แทน hospitalId
      systemType: form.hospital?.systemType ?? "",
      department: departmentName || null,
      floor: form.hospital?.floor ?? null,
      room: form.hospital?.room ?? null,
      building: form.hospital?.building ?? null,
      endoscopeBrand: form.hospital?.endoscopeBrand ?? null,
      systemMode: form.hospital?.systemMode ?? "",
      hospitalAssetCode: null,
      status: null,
      pmPerYear: form.fieldInfo?.pmPerYear != null ? Number(form.fieldInfo.pmPerYear) : null,
      warrantyMonths: form.fieldInfo?.warrantyMonths != null ? Number(form.fieldInfo.warrantyMonths) : null,
      warrantyExpireDate: toDateOrNull(form.fieldInfo?.warrantyExpireDate),
      installDate: toDateOrNull(form.fieldInfo?.installDate),
      inspectionDate: toDateOrNull(form.fieldInfo?.inspectionDate),
      lateWarrantyExtendDate: toDateOrNull(form.fieldInfo?.lateWarrantyExtendDate),
      technicianName: form.fieldInfo?.technicianName ?? null,
      technicianPhone: form.fieldInfo?.technicianPhone ?? null,
      additionalInfo: form.extra?.additionalInfo ?? null,
      hasSpareSet: !!form.fieldInfo?.hasSpareSet,
      spareNote: form.fieldInfo?.spareSetNote ?? form.fieldInfo?.spareNote ?? null,
    });
    batch.update(installationRef, {
      ...installationData,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 2) ลบ equipment เดิมและ images
    const existingEquipments = await findMany<any>("equipments", [
      { field: "installationId", operator: "==", value: id }
    ]);
    
    for (const eq of existingEquipments) {
      // ลบ equipment images
      const eqImages = await findMany<any>("equipmentImages", [
        { field: "equipmentId", operator: "==", value: eq.id }
      ]);
      eqImages.forEach((img: any) => {
        batch.delete(db.collection("equipmentImages").doc(img.id));
      });
      // ลบ equipment
      batch.delete(db.collection("equipments").doc(eq.id));
    }

    // สร้าง equipment ใหม่
    const equipmentIds: string[] = [];
    if (equipments.length > 0) {
      for (const eq of equipments) {
        const eqRef = db.collection("equipments").doc();
        equipmentIds.push(eqRef.id);
        batch.set(eqRef, {
          installationId: id,
          equipmentType: eq.equipmentType ?? "",
          name: eq.name ?? null,
          quantity: eq.quantity != null ? Number(eq.quantity) : 0,
          unit: eq.unit ?? null,
          serialNumber: eq.serialNumber ?? null,
          lengthM: eq.lengthM != null && eq.lengthM !== "" ? Number(eq.lengthM) : null,
          connectionType: eq.connectionType ?? null,
          signalType: eq.signalType ?? null,
          footSwitchMode: eq.footSwitchMode ?? null,
          notes: eq.notes ?? null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    // 3) Upsert NetworkConfig
    if (form.network) {
      const existingNetworkConfigs = await findMany<any>("networkConfigs", [
        { field: "installationId", operator: "==", value: id }
      ]);
      
      const networkData: any = {
        installationId: id,
        anydeskId: form.network.anydeskId ?? null,
        anydeskPassword: form.network.anydeskPassword ?? null,
        hospitalWifiSsid: form.network.hospitalWifiSsid || null,
        hospitalWifiPassword: form.network.hospitalWifiPassword ?? null,
        hospitalLanInfo: form.network.hospitalLanInfo || null,
        wifiUser: form.network.wifiUser || null,
        vpnDetail: form.network.vpnDetail ?? null,
        networkGateway: form.network.networkGateway ?? null,
        networkSubnet: form.network.networkSubnet ?? null,
      };
      if (form.network.connectionFlags !== undefined) {
        networkData.connectionFlags = form.network.connectionFlags || null;
      }

      if (existingNetworkConfigs.length > 0) {
        const networkRef = db.collection("networkConfigs").doc(existingNetworkConfigs[0].id);
        batch.update(networkRef, {
          ...networkData,
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        // ลบ network images เดิม
        const existingNetworkImages = await findMany<any>("networkImages", [
          { field: "networkConfigId", operator: "==", value: existingNetworkConfigs[0].id }
        ]);
        existingNetworkImages.forEach((img: any) => {
          batch.delete(db.collection("networkImages").doc(img.id));
        });
      } else {
        const networkRef = db.collection("networkConfigs").doc();
        batch.set(networkRef, {
          ...networkData,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // สร้าง network images ใหม่
      if (form.network.images && Array.isArray(form.network.images)) {
        const networkConfigId = existingNetworkConfigs.length > 0 ? existingNetworkConfigs[0].id : null;
        if (networkConfigId) {
          for (const url of form.network.images.filter((u: string) => u && typeof u === "string")) {
            const imgRef = db.collection("networkImages").doc();
            batch.set(imgRef, {
              networkConfigId: networkConfigId,
              url: url,
              category: "network",
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        }
      }
    }

    // 4) ลบและสร้าง Installation Images ใหม่
    const existingInstallationImages = await findMany<any>("installationImages", [
      { field: "installationId", operator: "==", value: id }
    ]);
    existingInstallationImages.forEach((img: any) => {
      batch.delete(db.collection("installationImages").doc(img.id));
    });

    if (form.fieldInfo?.images && Array.isArray(form.fieldInfo.images)) {
      for (const url of form.fieldInfo.images.filter((u: string) => u && typeof u === "string")) {
        const imgRef = db.collection("installationImages").doc();
        batch.set(imgRef, {
          installationId: id,
          url: url,
          category: "fieldInfo",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    if (form.extra?.images && Array.isArray(form.extra.images)) {
      for (const url of form.extra.images.filter((u: string) => u && typeof u === "string")) {
        const imgRef = db.collection("installationImages").doc();
        batch.set(imgRef, {
          installationId: id,
          url: url,
          category: "extra",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    // 5) สร้าง Equipment Images
    if (equipmentIds.length > 0 && form.equipmentImages && Array.isArray(form.equipmentImages)) {
      for (const url of form.equipmentImages.filter((u: string) => u && typeof u === "string")) {
        const imgRef = db.collection("equipmentImages").doc();
        batch.set(imgRef, {
          equipmentId: equipmentIds[0],
          url: url,
          category: "equipment",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    await batch.commit();

    // ดึงข้อมูลที่อัปเดตแล้วพร้อม relations
    let result = await findById<any>("installations", id);
    result = await populateInstallation(result!);
    
    res.json(serializeDates(result));
  } catch (err: unknown) {
    console.error("PUT /api/installations/:id error:", err);
    const errorMsg = getErrorMessage(err);
    if (errorMsg.includes("Serial Number")) {
      return res.status(400).json({ error: errorMsg });
    }
    res
      .status(500)
      .json({ error: "Failed to update installation", detail: errorMsg });
  }
});

// อัปเดตเฉพาะ networkConfig (สำหรับหน้าแก้ไข remote)
app.put("/api/installations/:id/network", async (req, res) => {
  try {
    const id = req.params.id;
    const network = req.body as NetworkUpdateRequestBody;

    // ตรวจสอบว่า installation มีอยู่จริง
    const installation = await findById<any>("installations", id);
    if (!installation) {
      return res.status(404).json({ error: "ไม่พบข้อมูลการติดตั้ง" });
    }

    // ใช้ batch write
    const batch = db.batch();

    // หา networkConfig ที่มีอยู่
    const existingNetworkConfigs = await findMany<any>("networkConfigs", [
      { field: "installationId", operator: "==", value: id }
    ]);

    const networkData: any = {
      installationId: id,
      anydeskId: network.anydeskId ?? null,
      anydeskPassword: network.anydeskPassword ?? null,
      hospitalWifiSsid: network.hospitalWifiSsid || null,
      hospitalWifiPassword: network.hospitalWifiPassword ?? null,
      hospitalLanInfo: network.hospitalLanInfo || null,
      wifiUser: network.wifiUser || null,
      vpnDetail: network.vpnDetail ?? null,
      networkGateway: network.networkGateway ?? null,
      networkSubnet: network.networkSubnet ?? null,
    };
    
    if (network.connectionFlags !== undefined) {
      networkData.connectionFlags = network.connectionFlags || null;
    }

    let networkConfigId: string;
    if (existingNetworkConfigs.length > 0) {
      networkConfigId = existingNetworkConfigs[0].id;
      const networkRef = db.collection("networkConfigs").doc(networkConfigId);
      batch.update(networkRef, {
        ...networkData,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      const networkRef = db.collection("networkConfigs").doc();
      networkConfigId = networkRef.id;
      batch.set(networkRef, {
        ...networkData,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // ลบ network images เดิม
    const existingNetworkImages = await findMany<any>("networkImages", [
      { field: "networkConfigId", operator: "==", value: networkConfigId }
    ]);
    existingNetworkImages.forEach((img: any) => {
      batch.delete(db.collection("networkImages").doc(img.id));
    });

    // สร้าง network images ใหม่
    if (network.images && Array.isArray(network.images)) {
      for (const url of network.images.filter((u: string) => u && typeof u === "string")) {
        const imgRef = db.collection("networkImages").doc();
        batch.set(imgRef, {
          networkConfigId: networkConfigId,
          url: url,
          category: "network",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    await batch.commit();

    // ดึงข้อมูล networkConfig ที่อัปเดตแล้วพร้อม images
    let result = await findById<any>("networkConfigs", networkConfigId);
    if (result) {
      result.networkImages = await findMany<any>("networkImages", [
        { field: "networkConfigId", operator: "==", value: networkConfigId }
      ]);
    }

    res.json(serializeDates(result));
  } catch (err: unknown) {
    console.error("PUT /api/installations/:id/network error:", err);
    res
      .status(500)
      .json({ error: "อัปเดตข้อมูลการรีโมตไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

/* ------------------------------------------------
 *  GET ต่าง ๆ
 * ------------------------------------------------ */

// List installation ทั้งหมด + hospital + networkConfig (เอาไว้โชว์ชื่อ รพ. ในหน้าหลัก)
app.get("/api/installations", async (_req, res) => {
  try {
    let data = await findAll<any>("installations", { field: "createdAt", direction: "asc" });
    
    // Populate relations
    data = await Promise.all(data.map((inst: any) => populateInstallation(inst)));
    
    res.json(serializeDates(data));
  } catch (err: unknown) {
    console.error("GET /api/installations error:", err);
    res
      .status(500)
      .json({ error: "ดึง list ไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

// ดึงตัวเดียว + equipment + networkConfig + hospital + images
app.get("/api/installations/:id", async (req, res) => {
  try {
    const id = req.params.id;
    let data = await findById<any>("installations", id);

    if (!data) return res.status(404).json({ error: "ไม่พบข้อมูล" });
    
    data = await populateInstallation(data);
    res.json(serializeDates(data));
  } catch (err: unknown) {
    console.error("GET /api/installations/:id error:", err);
    res
      .status(500)
      .json({ error: "ดึงข้อมูลไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

/* ------------------------------------------------
 *  GET /api/remote   (ดูการรีโมตทั้งหมด)
 * ------------------------------------------------ */
app.get("/api/remote", async (_req, res) => {
  try {
    // ดึง installations ทั้งหมด
    let allData = await findAll<any>("installations");
    
    // Populate relations
    allData = await Promise.all(allData.map(async (inst: any) => {
      inst = await populateInstallation(inst);
      
      // Populate VPN installations
      if (inst.id) {
        const vpnInstallations = await findMany<any>("vpnInstallations", [
          { field: "installationId", operator: "==", value: inst.id }
        ]);
        
        // Populate VPN สำหรับแต่ละ vpnInstallation
        inst.vpnInstallations = await Promise.all(vpnInstallations.map(async (vi: any) => {
          if (vi.vpnId) {
            const vpn = await findById<any>("vpns", vi.vpnId);
            if (vpn && vpn.hospitalId) {
              vpn.hospital = await findById<any>("hospitals", vpn.hospitalId);
            }
            vi.vpn = vpn;
          }
          return vi;
        }));
      }
      
      return inst;
    }));
    
    // กรองเฉพาะที่มี anydeskId หรือ anydeskPassword หรือมี VPN
    const data = allData.filter(
      (inst: any) =>
        (inst.networkConfig &&
          (inst.networkConfig.anydeskId || inst.networkConfig.anydeskPassword)) ||
        (inst.vpnInstallations && inst.vpnInstallations.length > 0)
    );
    
    res.json(serializeDates(data));
  } catch (err: unknown) {
    console.error("GET /api/remote error:", err);
    const errorMsg = getErrorMessage(err);
    // ถ้า collection ยังไม่มี ให้ return array ว่าง
    if (errorMsg.includes("not found") || 
        errorMsg.includes("does not exist") || 
        errorMsg.includes("index") ||
        errorMsg.includes("requires an index")) {
      return res.json([]);
    }
    res
      .status(500)
      .json({ error: "ดึงข้อมูลการรีโมตไม่สำเร็จ", detail: errorMsg });
  }
});

// Helper function: populate VPN with relations
async function populateVpn(vpn: any) {
  if (vpn.hospitalId) {
    vpn.hospital = await findById<any>("hospitals", vpn.hospitalId);
  }
  if (vpn.id) {
    const vpnInstallations = await findMany<any>("vpnInstallations", [
      { field: "vpnId", operator: "==", value: vpn.id }
    ]);
    
    vpn.installations = await Promise.all(vpnInstallations.map(async (vi: any) => {
      if (vi.installationId) {
        vi.installation = await findById<any>("installations", vi.installationId);
        if (vi.installation && vi.installation.hospitalId) {
          vi.installation.hospital = await findById<any>("hospitals", vi.installation.hospitalId);
        }
      }
      return vi;
    }));
  }
  // Convert Timestamps to Dates
  if (vpn.createdAt) vpn.createdAt = fromFirestoreDate(vpn.createdAt);
  if (vpn.updatedAt) vpn.updatedAt = fromFirestoreDate(vpn.updatedAt);
  return vpn;
}

/* ------------------------------------------------
 *  VPN APIs
 * ------------------------------------------------ */

// GET /api/vpns - ดึง VPN ทั้งหมด
app.get("/api/vpns", async (_req, res) => {
  try {
    let data = await findAll<any>("vpns");
    
    // Sort โดย createdAt desc (ใหม่สุดก่อน)
    data.sort((a: any, b: any) => {
      const dateA = a.createdAt ? (a.createdAt instanceof Date ? a.createdAt : fromFirestoreDate(a.createdAt)) : null;
      const dateB = b.createdAt ? (b.createdAt instanceof Date ? b.createdAt : fromFirestoreDate(b.createdAt)) : null;
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB.getTime() - dateA.getTime();
    });
    
    // Populate relations
    data = await Promise.all(data.map((vpn: any) => populateVpn(vpn)));
    
    res.json(serializeDates(data));
  } catch (err: unknown) {
    console.error("GET /api/vpns error:", err);
    const errorMsg = getErrorMessage(err);
    if (errorMsg.includes("not found") || errorMsg.includes("does not exist")) {
      return res.json([]);
    }
    res.status(500).json({ error: "ดึงข้อมูล VPN ไม่สำเร็จ", detail: errorMsg });
  }
});

// GET /api/vpns/:id - ดึง VPN ตัวเดียว
app.get("/api/vpns/:id", async (req, res) => {
  try {
    const id = req.params.id;
    let data = await findById<any>("vpns", id);
    if (!data) return res.status(404).json({ error: "ไม่พบข้อมูล VPN" });
    
    data = await populateVpn(data);
    res.json(serializeDates(data));
  } catch (err: unknown) {
    console.error("GET /api/vpns/:id error:", err);
    res.status(500).json({ error: "ดึงข้อมูล VPN ไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

// POST /api/vpns - สร้าง VPN ใหม่
app.post("/api/vpns", async (req, res) => {
  try {
    const { hospitalId, steps, additionalInfo, installationIds } = req.body;
    
    if (!hospitalId) {
      return res.status(400).json({ error: "กรุณาเลือกโรงพยาบาล" });
    }

    // ใช้ batch write
    const batch = db.batch();

    // สร้าง VPN
    const vpnRef = db.collection("vpns").doc();
    const vpnId = vpnRef.id;
    batch.set(vpnRef, {
      hospitalId: String(hospitalId),
      steps: steps || null,
      additionalInfo: additionalInfo || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // เพิ่ม installations ที่เลือก
    if (Array.isArray(installationIds) && installationIds.length > 0) {
      for (const instId of installationIds) {
        const viRef = db.collection("vpnInstallations").doc();
        batch.set(viRef, {
          vpnId: vpnId,
          installationId: String(instId),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    await batch.commit();

    // ดึงข้อมูลที่สร้างแล้วพร้อม relations
    let result = await findById<any>("vpns", vpnId);
    result = await populateVpn(result!);
    
    res.status(201).json(serializeDates(result));
  } catch (err: unknown) {
    console.error("POST /api/vpns error:", err);
    res.status(500).json({ error: "สร้าง VPN ไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

// PUT /api/vpns/:id - แก้ไข VPN
app.put("/api/vpns/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { hospitalId, steps, additionalInfo, installationIds } = req.body;

    if (!hospitalId) {
      return res.status(400).json({ error: "กรุณาเลือกโรงพยาบาล" });
    }

    const existing = await findById<any>("vpns", id);
    if (!existing) {
      return res.status(404).json({ error: "ไม่พบข้อมูล VPN" });
    }

    // ใช้ batch write
    const batch = db.batch();

    // อัปเดต VPN
    const vpnRef = db.collection("vpns").doc(id);
    batch.update(vpnRef, {
      hospitalId: String(hospitalId),
      steps: steps || null,
      additionalInfo: additionalInfo || null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // ลบ installations เดิม
    const existingVpnInstallations = await findMany<any>("vpnInstallations", [
      { field: "vpnId", operator: "==", value: id }
    ]);
    existingVpnInstallations.forEach((vi: any) => {
      batch.delete(db.collection("vpnInstallations").doc(vi.id));
    });

    // เพิ่ม installations ใหม่
    if (Array.isArray(installationIds) && installationIds.length > 0) {
      for (const instId of installationIds) {
        const viRef = db.collection("vpnInstallations").doc();
        batch.set(viRef, {
          vpnId: id,
          installationId: String(instId),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    await batch.commit();

    // ดึงข้อมูลที่อัปเดตแล้วพร้อม relations
    let result = await findById<any>("vpns", id);
    result = await populateVpn(result!);
    
    res.json(result);
  } catch (err: unknown) {
    console.error("PUT /api/vpns/:id error:", err);
    res.status(500).json({ error: "อัปเดต VPN ไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

// DELETE /api/vpns/:id - ลบ VPN
app.delete("/api/vpns/:id", async (req, res) => {
  try {
    const id = req.params.id;
    
    const existing = await findById<any>("vpns", id);
    if (!existing) {
      return res.status(404).json({ error: "ไม่พบข้อมูล VPN" });
    }

    // ใช้ batch write
    const batch = db.batch();

    // ลบ VPN
    batch.delete(db.collection("vpns").doc(id));

    // ลบ vpnInstallations ที่เกี่ยวข้อง
    const vpnInstallations = await findMany<any>("vpnInstallations", [
      { field: "vpnId", operator: "==", value: id }
    ]);
    vpnInstallations.forEach((vi: any) => {
      batch.delete(db.collection("vpnInstallations").doc(vi.id));
    });

    await batch.commit();
    
    res.json({ message: "ลบ VPN สำเร็จ" });
  } catch (err: unknown) {
    console.error("DELETE /api/vpns/:id error:", err);
    res.status(500).json({ error: "ลบ VPN ไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

/* ------------------------------------------------
 *  WARRANTY EXTENSION APIs
 * ------------------------------------------------ */

// POST /api/warranty-extensions - สร้างข้อมูลต่อประกันใหม่
app.post("/api/warranty-extensions", authenticateToken, async (req, res) => {
  try {
    const form = req.body as WarrantyExtensionRequestBody;

    // หา hospital จากชื่อที่กรอก
    const hospitalName: string =
      form.hospital?.name?.trim() || form.hospital?.hospitalName?.trim() || "โรงพยาบาลไม่ระบุชื่อ";

    let hospital = await findOneByField<any>("hospitals", "name", hospitalName);
    if (!hospital) {
      const hospitalId = await create("hospitals", {
        name: hospitalName,
        code: "HOSP-DEMO",
        region: "ภาคเหนือ",
      } as any);
      hospital = await findById<any>("hospitals", hospitalId);
    }

    // ตรวจสอบและสร้างแผนกใหม่ถ้ายังไม่มี
    const departmentName: string = (form.hospital?.department ?? "").trim();
    if (departmentName) {
      await upsert("departments", "name", departmentName, { name: departmentName } as any);
    }

    const equipments = form.equipment ?? [];
    const fieldInfoImages: string[] = form.fieldInfoImages ?? [];
    const equipmentImages: string[] = form.equipmentImages ?? [];
    const extraImages: string[] = form.extra?.images ?? [];

    // คำนวณ latestExtensionDate จาก warrantyExpireDate + warrantyMonths
    const warrantyExpireDate = toDateOrNull(form.fieldInfo?.warrantyExpireDate);
    const warrantyMonths = form.fieldInfo?.warrantyMonths != null ? Number(form.fieldInfo.warrantyMonths) : null;
    let latestExtensionDate: Date | null = null;
    if (warrantyExpireDate && warrantyMonths && !isNaN(warrantyMonths)) {
      const d = new Date(warrantyExpireDate);
      d.setMonth(d.getMonth() + warrantyMonths);
      latestExtensionDate = d;
    }

    // หา installation จากโรงพยาบาล (ถ้ามี)
    let installationId: string | null = null;
    if (form.installationId) {
      installationId = String(form.installationId);
    } else {
      // หา installation ล่าสุดของโรงพยาบาลนี้
      const allInstallations = await findMany<any>("installations", [
        { field: "hospitalId", operator: "==", value: hospital!.id }
      ]);
      if (allInstallations.length > 0) {
        // Sort โดย createdAt desc
        allInstallations.sort((a: any, b: any) => {
          const dateA = a.createdAt ? (a.createdAt instanceof Date ? a.createdAt : fromFirestoreDate(a.createdAt)) : null;
          const dateB = b.createdAt ? (b.createdAt instanceof Date ? b.createdAt : fromFirestoreDate(b.createdAt)) : null;
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateB.getTime() - dateA.getTime();
        });
        installationId = allInstallations[0].id;
      }
    }

    // ถ้าไม่มี installation ให้หาจาก installation แรกที่มี (fallback)
    if (!installationId) {
      const allInstallations = await findAll<any>("installations");
      if (allInstallations.length > 0) {
        installationId = allInstallations[0].id;
      }
    }

    // ถ้ายังไม่มี installation เลย ให้ throw error
    if (!installationId) {
      return res.status(400).json({ error: "ไม่พบข้อมูลการติดตั้ง กรุณาสร้างข้อมูลการติดตั้งก่อน" });
    }

    // ใช้ batch write
    const batch = db.batch();

    // สร้าง WarrantyExtension
    const weRef = db.collection("warrantyExtensions").doc();
    const weId = weRef.id;
    batch.set(weRef, {
      installationId: installationId,
      latestExtensionDate: toFirestoreDate(latestExtensionDate || new Date()),
      hospital: hospitalName, // ใช้ชื่อโรงพยาบาลเป็น string แทน hospitalId
      systemType: form.hospital?.systemType ?? "",
      department: departmentName || null,
      floor: form.hospital?.floor ?? null,
      room: form.hospital?.room ?? null,
      building: form.hospital?.building ?? null,
      endoscopeBrand: form.hospital?.endoscopeBrand ?? null,
      systemMode: form.hospital?.systemMode ?? "",
      hospitalAssetCode: null,
      status: null,
      pmPerYear: form.fieldInfo?.pmPerYear != null ? Number(form.fieldInfo.pmPerYear) : null,
      warrantyMonths: form.fieldInfo?.warrantyMonths != null ? Number(form.fieldInfo.warrantyMonths) : null,
      warrantyExpireDate: toFirestoreDate(toDateOrNull(form.fieldInfo?.warrantyExpireDate)),
      installDate: toFirestoreDate(toDateOrNull(form.fieldInfo?.installDate)),
      inspectionDate: toFirestoreDate(toDateOrNull(form.fieldInfo?.inspectionDate)),
      technicianName: form.fieldInfo?.technicianName ?? null,
      technicianPhone: form.fieldInfo?.technicianPhone ?? null,
      additionalInfo: form.extra?.additionalInfo ?? null,
      hasSpareSet: !!form.fieldInfo?.hasSpareSet,
      spareNote: form.fieldInfo?.spareSetNote ?? form.fieldInfo?.spareNote ?? null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // สร้าง Equipment
    if (equipments.length > 0) {
      for (const eq of equipments) {
        const eqRef = db.collection("warrantyExtensionEquipments").doc();
        batch.set(eqRef, {
          warrantyExtensionId: weId,
          equipmentType: eq.equipmentType ?? "",
          brand: eq.brand ?? null,
          model: eq.model ?? null,
          serialNumber: eq.serialNumber ?? null,
          quantity: eq.quantity != null ? Number(eq.quantity) : 1,
          lengthM: eq.lengthM != null && eq.lengthM !== "" ? Number(eq.lengthM) : null,
          connectionType: eq.connectionType ?? null,
          signalType: eq.signalType ?? null,
          footSwitchMode: eq.footSwitchMode ?? null,
          notes: eq.notes ?? null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    // สร้าง Images
    const allImages = [
      ...fieldInfoImages.map((url) => ({ url, category: "warrantyExtension" })),
      ...equipmentImages.map((url) => ({ url, category: "equipment" })),
      ...extraImages.map((url) => ({ url, category: "extra" })),
    ];

    for (const img of allImages) {
      const imgRef = db.collection("warrantyExtensionImages").doc();
      batch.set(imgRef, {
        warrantyExtensionId: weId,
        url: img.url,
        category: img.category,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    // ดึงข้อมูลที่สร้างแล้วพร้อม relations
    let result = await findById<any>("warrantyExtensions", weId);
    result = await populateWarrantyExtension(result!);
    
    res.status(201).json(serializeDates(result));
  } catch (err: unknown) {
    console.error("POST /api/warranty-extensions error:", err);
    res
      .status(500)
      .json({ error: "สร้างข้อมูลต่อประกันไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

// Helper function: populate warranty extension with relations
async function populateWarrantyExtension(we: any) {
  // Populate hospital - ตรวจสอบทั้ง hospitalId และ hospital (string)
  if (we.hospitalId) {
    we.hospital = await findById<any>("hospitals", we.hospitalId);
  } else if (we.hospital && typeof we.hospital === "string") {
    // ถ้า hospital เป็น string (ชื่อโรงพยาบาล) ให้หา hospital object จากชื่อ
    const hospitalName = we.hospital;
    const hospital = await findOneByField<any>("hospitals", "name", hospitalName);
    if (hospital) {
      we.hospital = hospital;
    } else {
      // ถ้าหาไม่เจอ ให้สร้าง object จากชื่อ
      we.hospital = { id: null, name: hospitalName };
    }
  }
  if (we.installationId) {
    we.installation = await findById<any>("installations", we.installationId);
    if (we.installation && we.installation.hospitalId) {
      we.installation.hospital = await findById<any>("hospitals", we.installation.hospitalId);
    }
  }
  if (we.id) {
    we.equipment = await findMany<any>("warrantyExtensionEquipments", [
      { field: "warrantyExtensionId", operator: "==", value: we.id }
    ]);
    we.warrantyExtensionImages = await findMany<any>("warrantyExtensionImages", [
      { field: "warrantyExtensionId", operator: "==", value: we.id }
    ]);
  }
  // Convert Timestamps to Dates
  if (we.latestExtensionDate) we.latestExtensionDate = fromFirestoreDate(we.latestExtensionDate);
  if (we.warrantyExpireDate) we.warrantyExpireDate = fromFirestoreDate(we.warrantyExpireDate);
  if (we.installDate) we.installDate = fromFirestoreDate(we.installDate);
  if (we.inspectionDate) we.inspectionDate = fromFirestoreDate(we.inspectionDate);
  return we;
}

// GET /api/warranty-extensions - รายการทั้งหมด
app.get("/api/warranty-extensions", authenticateToken, async (_req, res) => {
  try {
    // ใช้ findAll โดยไม่ใช้ orderBy ก่อน (เพื่อหลีกเลี่ยง index error)
    // แล้ว sort ใน JavaScript แทน
    let data = await findAll<any>("warrantyExtensions");
    
    // ถ้าไม่มีข้อมูล return array ว่าง
    if (!data || data.length === 0) {
      return res.json([]);
    }
    
    // Sort โดย latestExtensionDate (desc) ใน JavaScript
    data.sort((a: any, b: any) => {
      const dateA = a.latestExtensionDate ? (a.latestExtensionDate instanceof Date ? a.latestExtensionDate : fromFirestoreDate(a.latestExtensionDate)) : null;
      const dateB = b.latestExtensionDate ? (b.latestExtensionDate instanceof Date ? b.latestExtensionDate : fromFirestoreDate(b.latestExtensionDate)) : null;
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB.getTime() - dateA.getTime();
    });
    
    // Populate relations
    data = await Promise.all(data.map((we: any) => populateWarrantyExtension(we)));
    
    res.json(serializeDates(data));
  } catch (err: unknown) {
    console.error("GET /api/warranty-extensions error:", err);
    const errorMsg = getErrorMessage(err);
    // ถ้า collection ยังไม่มี หรือ error เกี่ยวกับ index ให้ return array ว่าง
    if (errorMsg.includes("not found") || 
        errorMsg.includes("does not exist") || 
        errorMsg.includes("index") ||
        errorMsg.includes("requires an index")) {
      return res.json([]);
    }
    res
      .status(500)
      .json({ error: "ดึงรายการไม่สำเร็จ", detail: errorMsg });
  }
});

// GET /api/warranty-extensions/:id - ดึงตัวเดียว
app.get("/api/warranty-extensions/:id", authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    let data = await findById<any>("warrantyExtensions", id);

    if (!data) {
      return res.status(404).json({ error: "ไม่พบข้อมูลต่อประกัน" });
    }

    data = await populateWarrantyExtension(data);
    res.json(serializeDates(data));
  } catch (err: unknown) {
    console.error("GET /api/warranty-extensions/:id error:", err);
    res
      .status(500)
      .json({ error: "ดึงข้อมูลไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

// PUT /api/warranty-extensions/:id - แก้ไข
app.put("/api/warranty-extensions/:id", authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const form = req.body as WarrantyExtensionRequestBody;

    const existing = await findById<any>("warrantyExtensions", id);
    if (!existing) {
      return res.status(404).json({ error: "ไม่พบข้อมูลต่อประกัน" });
    }

    // หา hospital
    const hospitalName: string =
      form.hospital?.name?.trim() || form.hospital?.hospitalName?.trim() || "โรงพยาบาลไม่ระบุชื่อ";

    let hospital = await findOneByField<any>("hospitals", "name", hospitalName);
    if (!hospital) {
      const hospitalId = await create("hospitals", {
        name: hospitalName,
        code: "HOSP-DEMO",
        region: "ภาคเหนือ",
      } as any);
      hospital = await findById<any>("hospitals", hospitalId);
    }

    // คำนวณ latestExtensionDate จาก warrantyExpireDate + warrantyMonths
    const warrantyExpireDate = toDateOrNull(form.fieldInfo?.warrantyExpireDate);
    const warrantyMonths = form.fieldInfo?.warrantyMonths != null ? Number(form.fieldInfo.warrantyMonths) : null;
    let latestExtensionDate: Date | null = null;
    if (warrantyExpireDate && warrantyMonths && !isNaN(warrantyMonths)) {
      const d = new Date(warrantyExpireDate);
      d.setMonth(d.getMonth() + warrantyMonths);
      latestExtensionDate = d;
    }

    // หา installation จากโรงพยาบาล (ถ้ามี)
    let installationId: string | null = null;
    if (form.installationId) {
      installationId = String(form.installationId);
    } else {
      const allInstallations = await findMany<any>("installations", [
        { field: "hospital", operator: "==", value: hospitalName }
      ]);
      if (allInstallations.length > 0) {
        allInstallations.sort((a: any, b: any) => {
          const dateA = a.createdAt ? (a.createdAt instanceof Date ? a.createdAt : fromFirestoreDate(a.createdAt)) : null;
          const dateB = b.createdAt ? (b.createdAt instanceof Date ? b.createdAt : fromFirestoreDate(b.createdAt)) : null;
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateB.getTime() - dateA.getTime();
        });
        installationId = allInstallations[0].id;
      }
    }

    if (!installationId) {
      const allInstallations = await findAll<any>("installations");
      if (allInstallations.length > 0) {
        installationId = allInstallations[0].id;
      }
    }

    if (!installationId) {
      return res.status(400).json({ error: "ไม่พบข้อมูลการติดตั้ง กรุณาสร้างข้อมูลการติดตั้งก่อน" });
    }

    const equipments = form.equipment ?? [];
    const fieldInfoImages: string[] = form.fieldInfoImages ?? [];
    const equipmentImages: string[] = form.equipmentImages ?? [];
    const extraImages: string[] = form.extra?.images ?? [];

    // ใช้ batch write
    const batch = db.batch();

    // ตรวจสอบและสร้างแผนกใหม่ถ้ายังไม่มี
    const departmentName: string = (form.hospital?.department ?? "").trim();
    if (departmentName) {
      await upsert("departments", "name", departmentName, { name: departmentName } as any);
    }

    // อัปเดต WarrantyExtension
    const weRef = db.collection("warrantyExtensions").doc(id);
    batch.update(weRef, {
      installationId: installationId,
      latestExtensionDate: toFirestoreDate(latestExtensionDate || new Date()),
      hospital: hospitalName, // ใช้ชื่อโรงพยาบาลเป็น string แทน hospitalId
      systemType: form.hospital?.systemType ?? "",
      department: departmentName || null,
      floor: form.hospital?.floor ?? null,
      room: form.hospital?.room ?? null,
      building: form.hospital?.building ?? null,
      endoscopeBrand: form.hospital?.endoscopeBrand ?? null,
      systemMode: form.hospital?.systemMode ?? "",
      pmPerYear: form.fieldInfo?.pmPerYear != null ? Number(form.fieldInfo.pmPerYear) : null,
      warrantyMonths: form.fieldInfo?.warrantyMonths != null ? Number(form.fieldInfo.warrantyMonths) : null,
      warrantyExpireDate: toFirestoreDate(toDateOrNull(form.fieldInfo?.warrantyExpireDate)),
      installDate: toFirestoreDate(toDateOrNull(form.fieldInfo?.installDate)),
      inspectionDate: toFirestoreDate(toDateOrNull(form.fieldInfo?.inspectionDate)),
      technicianName: form.fieldInfo?.technicianName ?? null,
      technicianPhone: form.fieldInfo?.technicianPhone ?? null,
      additionalInfo: form.extra?.additionalInfo ?? null,
      hasSpareSet: !!form.fieldInfo?.hasSpareSet,
      spareNote: form.fieldInfo?.spareSetNote ?? form.fieldInfo?.spareNote ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // ลบและสร้าง Equipment ใหม่
    const existingEquipments = await findMany<any>("warrantyExtensionEquipments", [
      { field: "warrantyExtensionId", operator: "==", value: id }
    ]);
    existingEquipments.forEach((eq: any) => {
      batch.delete(db.collection("warrantyExtensionEquipments").doc(eq.id));
    });

    if (equipments.length > 0) {
      for (const eq of equipments) {
        const eqRef = db.collection("warrantyExtensionEquipments").doc();
        batch.set(eqRef, {
          warrantyExtensionId: id,
          equipmentType: eq.equipmentType ?? "",
          brand: eq.brand ?? null,
          model: eq.model ?? null,
          serialNumber: eq.serialNumber ?? null,
          quantity: eq.quantity != null ? Number(eq.quantity) : 1,
          lengthM: eq.lengthM != null && eq.lengthM !== "" ? Number(eq.lengthM) : null,
          connectionType: eq.connectionType ?? null,
          signalType: eq.signalType ?? null,
          footSwitchMode: eq.footSwitchMode ?? null,
          notes: eq.notes ?? null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    // ลบและสร้าง Images ใหม่
    const existingImages = await findMany<any>("warrantyExtensionImages", [
      { field: "warrantyExtensionId", operator: "==", value: id }
    ]);
    existingImages.forEach((img: any) => {
      batch.delete(db.collection("warrantyExtensionImages").doc(img.id));
    });

    const allImages = [
      ...fieldInfoImages.map((url) => ({ url, category: "warrantyExtension" })),
      ...equipmentImages.map((url) => ({ url, category: "equipment" })),
      ...extraImages.map((url) => ({ url, category: "extra" })),
    ];

    for (const img of allImages) {
      const imgRef = db.collection("warrantyExtensionImages").doc();
      batch.set(imgRef, {
        warrantyExtensionId: id,
        url: img.url,
        category: img.category,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    // ดึงข้อมูลที่อัปเดตแล้วพร้อม relations
    let result = await findById<any>("warrantyExtensions", id);
    result = await populateWarrantyExtension(result!);
    
    res.json(serializeDates(result));
  } catch (err: unknown) {
    console.error("PUT /api/warranty-extensions/:id error:", err);
    res
      .status(500)
      .json({ error: "อัปเดตข้อมูลต่อประกันไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});

// DELETE /api/warranty-extensions/:id - ลบ
app.delete("/api/warranty-extensions/:id", authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    
    const existing = await findById<any>("warrantyExtensions", id);
    if (!existing) {
      return res.status(404).json({ error: "ไม่พบข้อมูลต่อประกัน" });
    }

    // ใช้ batch write
    const batch = db.batch();

    // ลบ WarrantyExtension
    batch.delete(db.collection("warrantyExtensions").doc(id));

    // ลบ Equipment ที่เกี่ยวข้อง
    const equipments = await findMany<any>("warrantyExtensionEquipments", [
      { field: "warrantyExtensionId", operator: "==", value: id }
    ]);
    equipments.forEach((eq: any) => {
      batch.delete(db.collection("warrantyExtensionEquipments").doc(eq.id));
    });

    // ลบ Images ที่เกี่ยวข้อง
    const images = await findMany<any>("warrantyExtensionImages", [
      { field: "warrantyExtensionId", operator: "==", value: id }
    ]);
    images.forEach((img: any) => {
      batch.delete(db.collection("warrantyExtensionImages").doc(img.id));
    });

    await batch.commit();
    
    res.json({ message: "ลบข้อมูลต่อประกันสำเร็จ" });
  } catch (err: unknown) {
    console.error("DELETE /api/warranty-extensions/:id error:", err);
    res.status(500).json({ error: "ลบข้อมูลต่อประกันไม่สำเร็จ", detail: getErrorMessage(err) });
  }
});


const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3005; // เปลี่ยนเป็น 3005 ตามที่ผู้ใช้ต้องการ
const HOST = process.env.HOST || "0.0.0.0"; // Bind ที่ 0.0.0.0 เพื่อให้เครื่องอื่นเชื่อมต่อได้

// เก็บ server instance เพื่อสามารถปิดได้เมื่อ restart
let server: any = null;

// ฟังก์ชันสำหรับ kill process ที่ใช้ port อยู่ (Windows)
async function killPortProcess(port: number): Promise<void> {
  try {
    // ใช้ netstat เพื่อหา PID ที่ใช้ port
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    const lines = stdout.trim().split('\n');
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      
      if (pid && !isNaN(Number(pid))) {
        try {
          console.log(`🔪 Killing process ${pid} using port ${port}...`);
          await execAsync(`taskkill /PID ${pid} /F`);
          console.log(`✅ Process ${pid} killed`);
        } catch (killErr: any) {
          // ถ้า kill ไม่ได้ (อาจจะ process ตัวเอง) ก็ข้ามไป
          if (!killErr.message?.includes('not found')) {
            console.log(`⚠️ Could not kill process ${pid}: ${killErr.message}`);
          }
        }
      }
    }
  } catch (err: any) {
    // ถ้าไม่เจอ process ที่ใช้ port อยู่ ก็ไม่เป็นไร
    if (!err.message?.includes('findstr')) {
      console.log(`ℹ️ No process found using port ${port}`);
    }
  }
}

// ฟังก์ชันสำหรับปิด server อย่าง graceful
function closeServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!server) {
      resolve();
      return;
    }
    
    console.log('🔄 Closing existing server...');
    server.close(() => {
      console.log('✅ Previous server closed');
      server = null;
      resolve();
    });
    
    // Force close after 2 seconds if graceful close fails
    setTimeout(() => {
      if (server) {
        console.log('⚠️ Force closing server...');
        server.closeAllConnections?.();
        server.close(() => {
          server = null;
          resolve();
        });
      }
    }, 2000);
  });
}

async function start() {
  try {
    // ตรวจสอบว่า Firebase Admin ถูก initialize แล้วหรือไม่
    const db = require('./firestoreClient').db;
    if (!db) {
      throw new Error('Firebase Admin not initialized');
    }
    
    await ensureSampleHospital();
    await ensureSampleDepartments();
    
    // ปิด server เก่าก่อน (ถ้ามี)
    await closeServer();
    
    // Kill process ที่ใช้ port อยู่ (ถ้ามี)
    await killPortProcess(PORT);
    
    // รอสักครู่เพื่อให้ port ปล่อยออกมา
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // สร้าง server ใหม่พร้อม SO_REUSEADDR option
    const serverOptions = {
      // ใช้ SO_REUSEADDR เพื่อให้สามารถ bind port ได้แม้ยังมี connection เก่าค้างอยู่
    };
    
    server = app.listen(PORT, HOST, () => {
      console.log(`✅ Server running at http://localhost:${PORT}`);
      console.log(`🌐 Server accessible from other devices at http://<your-ip>:${PORT}`);
      console.log(`📝 Make sure to update API_URL in web/lib/api.ts to use your machine's IP address`);
    });
    
    // ตั้งค่า SO_REUSEADDR เพื่อให้สามารถ bind port ได้แม้ยังมี connection เก่าค้างอยู่
    server.on('listening', () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        console.log(`🔌 Server bound to ${address.address}:${address.port}`);
      }
    });
    
    // จัดการ error เมื่อ port ถูกใช้อยู่
    server.on('error', async (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use.`);
        console.error(`🔄 Attempting to close existing server and retry...`);
        
        // ลองปิด server เก่าและ retry
        await closeServer();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          server = app.listen(PORT, HOST, () => {
            console.log(`✅ Server running at http://localhost:${PORT} (after retry)`);
          });
        } catch (retryErr: any) {
          console.error(`\n❌ Still cannot bind to port ${PORT} after retry.`);
          console.error(`💡 Try one of these solutions:`);
          console.error(`   1. Kill the process using port ${PORT}:`);
          console.error(`      Windows: netstat -ano | findstr :${PORT}`);
          console.error(`      Then: taskkill /PID <PID> /F`);
          console.error(`   2. Set PORT environment variable: PORT=7000 npm run dev:backend`);
          console.error(`   3. Wait a few seconds and restart\n`);
        }
      } else {
        throw err;
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    console.error('\n=== TROUBLESHOOTING ===');
    console.error('1. ตรวจสอบว่าไฟล์ serviceAccountKey.json อยู่ใน root directory');
    console.error('2. ตรวจสอบว่าไฟล์ serviceAccountKey.json เป็นของ Firebase project "medica-issuev2"');
    console.error('3. ตรวจสอบว่าไฟล์ .env มี FIREBASE_SERVICE_ACCOUNT_PATH หรือ FIREBASE_SERVICE_ACCOUNT_KEY');
    console.error('4. ดู SETUP_FIREBASE.md สำหรับคำแนะนำเพิ่มเติม');
    process.exit(1);
  }
}

// จัดการ graceful shutdown เมื่อ process ถูก terminate
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await closeServer();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await closeServer();
  process.exit(0);
});

start().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});

