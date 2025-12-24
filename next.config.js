/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // เพิ่ม body size limit เป็น 50MB
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: '50mb',
  },
}

module.exports = nextConfig

