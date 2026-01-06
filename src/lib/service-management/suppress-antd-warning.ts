// Suppress antd compatibility warning สำหรับ React 19
// ไฟล์นี้ต้องถูก import ก่อน antd components

if (typeof window !== "undefined") {
  const originalWarn = console.warn;
  const originalError = console.error;
  
  const shouldSuppress = (...args: any[]): boolean => {
    // ตรวจสอบทุก arguments
    for (const arg of args) {
      const message = typeof arg === "string" 
        ? arg 
        : arg?.toString?.() || JSON.stringify(arg) || "";
      if (
        message.includes("antd: compatible") || 
        message.includes("antd v5 support React") ||
        message.includes("see https://u.ant.design/v5-for-19") ||
        message.includes("[antd: compatible]")
      ) {
        return true;
      }
    }
    return false;
  };
  
  console.warn = (...args: any[]) => {
    if (shouldSuppress(...args)) {
      return; // ไม่แสดง warning นี้
    }
    originalWarn.apply(console, args);
  };
  
  console.error = (...args: any[]) => {
    if (shouldSuppress(...args)) {
      return; // ไม่แสดง error นี้
    }
    originalError.apply(console, args);
  };
}

