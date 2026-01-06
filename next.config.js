/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ใน Next.js App Router ไม่ต้องใช้ api config แล้ว
  // การจัดการ body size limit ทำใน route handler โดยตรง
  // ปรับ CSS loading behavior เพื่อลด preload warnings
  experimental: {
    optimizeCss: true,
  },
}

module.exports = nextConfig

