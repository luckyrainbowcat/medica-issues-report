/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // สีหลัก - น้ำเงินอ่อนสวยงาม (ใช้: 50, 200, 300, 500, 600, 700, 800)
        primary: {
          50: '#eff6ff',   // hover backgrounds
          200: '#bfdbfe',  // shadow, border
          300: '#93c5fd',  // border
          500: '#3b82f6',  // buttons, gradients
          600: '#2563eb',  // text, gradients, hover
          700: '#1d4ed8',  // hover
          800: '#1e40af',  // text hover
        },
        // สีเขียว - สำหรับปุ่มเพิ่ม (ใช้: 300, 400, 500, 600, 700)
        success: {
          300: '#86efac',  // shadow
          400: '#4ade80',  // shadow
          500: '#22c55e',  // buttons, gradients
          600: '#16a34a',  // buttons, gradients
          700: '#15803d',  // hover
        },
        // สีแดง - สำหรับปุ่มลบ (ใช้: 100, 500, 600, 700)
        danger: {
          100: '#fee2e2',  // status colors
          500: '#ef4444',  // buttons
          600: '#dc2626',  // hover
          700: '#b91c1c',  // text
        },
        // สีส้ม - สำหรับปุ่มเรียงลำดับ (ใช้: 100, 200, 500, 600, 700, 800)
        warning: {
          100: '#fef3c7',  // priority, urgency colors
          200: '#fde68a',  // priority, urgency colors
          500: '#f59e0b',  // buttons
          600: '#d97706',  // hover
          700: '#b45309',  // text
          800: '#92400e',  // text
        },
        // สีเทา - สำหรับพื้นหลังและ border (ใช้: 50, 100, 200, 500, 600, 700, 800, 900)
        neutral: {
          50: '#fafafa',   // backgrounds
          100: '#f5f5f5',  // backgrounds, borders
          200: '#e5e5e5',  // borders, shadows
          500: '#737373',  // text
          600: '#525252',  // text, borders
          700: '#404040',  // text
          800: '#262626',  // text
          900: '#171717',  // text
        },
      },
    },
  },
  plugins: [],
}

