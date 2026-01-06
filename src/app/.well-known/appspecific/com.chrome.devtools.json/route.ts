import { NextResponse } from "next/server";

// Route handler สำหรับ Chrome DevTools request
// เพื่อป้องกัน error 500 เมื่อ Chrome DevTools ส่ง request มาที่ path นี้
export async function GET() {
  return NextResponse.json({}, { status: 404 });
}

