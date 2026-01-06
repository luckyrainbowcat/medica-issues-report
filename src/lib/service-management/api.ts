// web/lib/api.ts

// ใช้ environment variable หรือ window.location.hostname สำหรับเครื่องอื่น
// ไม่ต้องตรวจสอบ localhost - ใช้ hostname ของหน้าปัจจุบันเสมอ
function getApiUrl(): string {
  // ตรวจสอบว่าเป็น browser หรือไม่
  if (typeof window === "undefined") {
    // Server-side: ใช้ environment variable หรือ default
    const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005";
    console.log(`[getApiUrl] Server-side API_URL: ${url} (from env: ${process.env.NEXT_PUBLIC_API_URL || 'default'})`);
    return url;
  }

  // Client-side: ใช้ environment variable หรือ window.location
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    console.log(`[getApiUrl] Client-side API_URL from env: ${envUrl}`);
    return envUrl;
  }

  // ใช้ hostname ของหน้าปัจจุบันเสมอ (ไม่ต้องตรวจสอบ localhost)
  // ถ้าเป็น localhost จะได้ localhost:3005
  // ถ้าเป็นเครื่องอื่นจะได้ <ip>:3005
  const url = `http://${window.location.hostname}:3005`;
  console.log(`[getApiUrl] Client-side API_URL from hostname: ${url}`);
  return url;
}

// Lazy evaluation สำหรับ API_URL เพื่อป้องกันปัญหา module initialization
let _apiUrl: string | null = null;
export function getApiUrlInstance(): string {
  if (_apiUrl === null) {
    _apiUrl = getApiUrl();
  }
  return _apiUrl;
}

// สำหรับ backward compatibility - ใช้ lazy getter
export const API_URL = (() => {
  if (typeof window !== "undefined") {
    // Client-side: เรียก getApiUrl() ทันที
    return getApiUrl();
  }
  // Server-side: ใช้ environment variable หรือ default
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005";
})();


// ฟังก์ชันสำหรับสร้าง headers (client-side)
function getHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
  };
}

// ฟังก์ชันสำหรับสร้าง headers สำหรับ server-side (รับ token จาก parameter)
function getServerHeaders(token?: string | null): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return headers;
}


// Client-side API functions
export async function apiGet(path: string) {
  const res = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    headers: getHeaders(),
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData?.error || `GET ${path} failed with status ${res.status}`;
    throw new Error(errorMessage);
  }
  return res.json();
}

// Server-side API functions (รับ token จาก parameter หรือไม่ใช้ token)
export async function apiGetServer(path: string, token?: string | null) {
  try {
    console.log(`[apiGetServer] Attempting to fetch: ${API_URL}${path}`);
    const res = await fetch(`${API_URL}${path}`, {
      cache: "no-store",
      headers: getServerHeaders(token),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const errorMessage = errorData?.error || `GET ${path} failed with status ${res.status}`;
      throw new Error(errorMessage);
    }
    return res.json();
  } catch (error: any) {
    // ถ้าเป็น network error ให้แสดงข้อความที่ชัดเจน
    if (error.message?.includes("fetch failed") || error.code === "ECONNREFUSED" || error.cause?.code === "ECONNREFUSED") {
      console.error(`[apiGetServer] Connection failed to ${API_URL}${path}:`, error);
      throw new Error(`ไม่สามารถเชื่อมต่อกับ backend server ที่ ${API_URL} กรุณาตรวจสอบว่า backend server กำลังรันอยู่ (npm run dev:backend)`);
    }
    throw error;
  }
}

// Client-side API functions
export async function apiPost(path: string, data: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData?.error || `POST ${path} failed with status ${res.status}`;
    throw new Error(errorMessage);
  }
  return res.json();
}

// Server-side API functions
export async function apiPostServer(path: string, data: any, token?: string | null) {
  const fullUrl = `${API_URL}${path}`;
  console.log(`[apiPostServer] Attempting to POST: ${fullUrl}`);
  console.log(`[apiPostServer] API_URL: ${API_URL}, path: ${path}`);
  try {
    const res = await fetch(fullUrl, {
      method: "POST",
      headers: getServerHeaders(token),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      let errorData: any = {};
      try {
        const text = await res.text();
        errorData = text ? JSON.parse(text) : {};
      } catch (e) {
        console.error(`[apiPostServer] Failed to parse error response:`, e);
      }
      const errorMessage = errorData?.error || errorData?.detail || errorData?.message || `POST ${path} failed with status ${res.status}`;
      console.error(`[apiPostServer] Error response (${res.status}):`, errorData);
      const fullErrorMessage = errorData?.detail 
        ? `${errorMessage}\nรายละเอียด: ${errorData.detail}` 
        : errorMessage;
      throw new Error(fullErrorMessage);
    }
    return res.json();
  } catch (error: any) {
    console.error(`[apiPostServer] Fetch error:`, error);
    // ถ้าเป็น network error ให้แสดงข้อความที่ชัดเจน
    if (error.message?.includes("fetch failed") || error.code === "ECONNREFUSED" || error.cause?.code === "ECONNREFUSED") {
      throw new Error(`ไม่สามารถเชื่อมต่อกับ backend server ที่ ${API_URL} กรุณาตรวจสอบว่า backend server กำลังรันอยู่ (npm run dev:backend)`);
    }
    throw error;
  }
}

// Client-side API functions
export async function apiPut(path: string, data: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData?.error || `PUT ${path} failed with status ${res.status}`;
    throw new Error(errorMessage);
  }
  return res.json();
}

// Server-side API functions
export async function apiPutServer(path: string, data: any, token?: string | null) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "PUT",
      headers: getServerHeaders(token),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const errorMessage = errorData?.error || `PUT ${path} failed with status ${res.status}`;
      throw new Error(errorMessage);
    }
    return res.json();
  } catch (error: any) {
    // ถ้าเป็น network error ให้แสดงข้อความที่ชัดเจน
    if (error.message?.includes("fetch failed") || error.code === "ECONNREFUSED") {
      throw new Error(`ไม่สามารถเชื่อมต่อกับ backend server ที่ ${API_URL} กรุณาตรวจสอบว่า backend server กำลังรันอยู่ (npm run dev:backend)`);
    }
    throw error;
  }
}

export async function apiDelete(path: string) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData?.error || `DELETE ${path} failed with status ${res.status}`;
    throw new Error(errorMessage);
  }
  return res.json();
}
