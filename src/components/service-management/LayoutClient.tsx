"use client";

import { useEffect, useState } from "react";
import ServiceManagementSidebar from "./ServiceManagementSidebar";

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Suppress antd warning
    if (typeof window !== "undefined") {
      const originalError = console.error;
      console.error = (...args: any[]) => {
        const message = args[0]?.toString?.() || args[0] || "";
        if (
          message.includes("antd: compatible") || 
          message.includes("antd v5 support React") ||
          message.includes("[antd: compatible]")
        ) {
          return;
        }
        originalError.apply(console, args);
      };
    }

    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="min-h-screen flex">
      <ServiceManagementSidebar onCollapseChange={setSidebarCollapsed} />
      <div 
        className="flex-1 transition-all duration-300"
        style={{
          marginLeft: isMobile 
            ? '0' 
            : (sidebarCollapsed ? '80px' : '280px'),
          padding: '0.5rem',
        }}
      >
        <main style={{ padding: 0 }}>{children}</main>
      </div>
    </div>
  );
}
