'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  BankOutlined,
  TeamOutlined,
  MobileOutlined,
  LinkOutlined,
  CloudOutlined,
  ToolOutlined,
  SafetyCertificateOutlined,
  HomeOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

interface User {
  _id: string;
  username: string;
  name: string;
  profilePicture?: string;
}

// Helper function to create a simple hash from URL for cache busting
const getUrlHash = (url: string): string => {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

interface ServiceManagementSidebarProps {
  onCollapseChange?: (collapsed: boolean) => void;
}

export default function ServiceManagementSidebar({ onCollapseChange }: ServiceManagementSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState<string>("");
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      const isMobileWidth = window.innerWidth < 768;
      setIsMobile(isMobileWidth);
      // ใน mobile ให้ซ่อน sidebar โดย default
      if (isMobileWidth) {
        setIsCollapsed(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Notify parent about collapse state
    onCollapseChange?.(isCollapsed);
  }, [isCollapsed, onCollapseChange]);

  useEffect(() => {
    // Load user from localStorage
    const loadProfile = () => {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setUserName(parsedUser.name || '');
          setProfileAvatar(parsedUser.profilePicture || '');
        } catch (e) {
          console.error('Error loading profile:', e);
        }
      }
    };
    
    loadProfile();
    
    // Listen for localStorage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'currentUser') {
        loadProfile();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically for changes in same tab
    const interval = setInterval(loadProfile, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    const confirmed = window.confirm("คุณต้องการออกจากระบบหรือไม่?");
    if (confirmed) {
      // ลบ cookie
      if (typeof document !== "undefined") {
        document.cookie = "authToken=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;";
        document.cookie = "isLoggedIn=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;";
      }
      
      // ลบ localStorage
      localStorage.removeItem("currentUser");
      localStorage.removeItem("profile");
      
      // Redirect ไปหน้า login
      window.location.href = "/login";
    }
  };

  const sidebarWidth = isCollapsed ? (isMobile ? '0' : '80px') : '280px';

  const menuItems = [
    {
      key: "/service-management/hospitals",
      href: "/service-management/hospitals/new",
      icon: <BankOutlined style={{ fontSize: 20, flexShrink: 0 }} />,
      label: "โรงพยาบาล",
    },
    {
      key: "/service-management/departments",
      href: "/service-management/departments/new",
      icon: <TeamOutlined style={{ fontSize: 20, flexShrink: 0 }} />,
      label: "แผนก",
    },
    {
      key: "/service-management/sims",
      href: "/service-management/sims/new",
      icon: <MobileOutlined style={{ fontSize: 20, flexShrink: 0 }} />,
      label: "ซิมการ์ด",
    },
    {
      key: "/service-management/connections/list",
      href: "/service-management/connections/list",
      icon: <LinkOutlined style={{ fontSize: 20, flexShrink: 0 }} />,
      label: "การเชื่อมต่อ",
    },
    {
      key: "/service-management/remote",
      href: "/service-management/remote?addRemote=true",
      icon: <CloudOutlined style={{ fontSize: 20, flexShrink: 0 }} />,
      label: "การรีโมต",
    },
    {
      key: "/service-management/installations",
      href: "/service-management/installations/new",
      icon: <ToolOutlined style={{ fontSize: 20, flexShrink: 0 }} />,
      label: "ข้อมูลอุปกรณ์",
    },
    {
      key: "/service-management/warranty-extensions",
      href: "/service-management/warranty-extensions/new",
      icon: <SafetyCertificateOutlined style={{ fontSize: 20, flexShrink: 0 }} />,
      label: "ข้อมูลต่อประกัน",
    },
  ];

  const isActive = (href: string) => {
    if (href === '/service-management') {
      return pathname === '/service-management';
    }
    return pathname?.startsWith(href);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {!isCollapsed && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-white border-r border-neutral-200 shadow-lg z-50 transition-all duration-300 ${
          isMobile ? (isCollapsed ? '-translate-x-full' : 'translate-x-0') : ''
        }`}
        style={{ 
          width: isMobile ? (isCollapsed ? '0' : '280px') : sidebarWidth,
          ...(isMobile && isCollapsed ? { 
            borderRight: 'none',
            boxShadow: 'none',
            pointerEvents: 'none',
            visibility: 'hidden',
            opacity: 0,
            overflow: 'hidden'
          } : {
            visibility: 'visible',
            opacity: 1,
            overflow: 'visible'
          })
        }}
      >
        <div className="flex flex-col h-full bg-gradient-to-b from-white to-neutral-50">
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 bg-white flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex flex-col">
                <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "#8c8c8c", fontWeight: 600 }}>
                  ยินดีต้อนรับเข้าสู่
                </span>
                <h2 className="text-lg font-bold text-neutral-800 bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                  ระบบจัดการเซอร์วิส
                </h2>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 hover:bg-primary-50 rounded-lg transition-colors text-neutral-600 hover:text-primary-600"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {/* Home Link */}
            <div className="space-y-2">
              {!isCollapsed && (
                <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-2 mb-2">
                  เมนูหลัก
                </div>
              )}
              <Link
                href="/service-management"
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  pathname === '/service-management'
                    ? 'bg-primary-500 text-white shadow-md shadow-primary-200'
                    : 'text-neutral-700 hover:bg-primary-50 hover:text-primary-600'
                }`}
                title={isCollapsed ? 'หน้าหลัก' : undefined}
              >
                <HomeOutlined style={{ fontSize: 20, flexShrink: 0 }} />
                {!isCollapsed && <span>หน้าหลัก</span>}
              </Link>
            </div>

            {/* Form Menu Items */}
            <div className="space-y-2 pt-4 border-t border-neutral-200">
              {!isCollapsed && (
                <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-2 mb-2">
                  แบบฟอร์มการเก็บข้อมูล
                </div>
              )}
              {menuItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    isActive(item.key)
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-200'
                      : 'text-neutral-700 hover:bg-primary-50 hover:text-primary-600'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  {item.icon}
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              ))}
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4 border-t border-neutral-200">
              {!isCollapsed && (
                <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-2 mb-2">
                  การจัดการ
                </div>
              )}
              <button
                onClick={() => router.push('/')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-sm hover:shadow-md"
                title={isCollapsed ? 'Issue Report' : undefined}
              >
                <FileTextOutlined style={{ fontSize: 20, flexShrink: 0 }} />
                {!isCollapsed && <span>ระบบจัดการปัญหา</span>}
              </button>
            </div>
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-neutral-200 bg-white">
            {user ? (
              <div className="space-y-2">
                <Link
                  href="/service-management/profile"
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary-50 transition-all duration-200"
                >
                  {profileAvatar ? (
                    <img
                      src={`${profileAvatar}${profileAvatar.includes('?') ? '&' : '?'}v=${getUrlHash(profileAvatar)}`}
                      alt={userName}
                      className="w-8 h-8 rounded-full object-cover border-2 border-primary-200 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0 shadow-sm">
                      {userName ? userName.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-medium text-neutral-900 truncate">{userName}</div>
                      <div className="text-xs text-neutral-500 truncate">{user.username}</div>
                    </div>
                  )}
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-danger-500 text-white hover:bg-danger-600 transition-all duration-200 shadow-sm hover:shadow-md"
                  title={isCollapsed ? 'ออกจากระบบ' : undefined}
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {!isCollapsed && <span>ออกจากระบบ</span>}
                </button>
              </div>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-all duration-200 shadow-sm hover:shadow-md"
                title={isCollapsed ? 'เข้าสู่ระบบ' : undefined}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                {!isCollapsed && <span>เข้าสู่ระบบ</span>}
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Menu Button - แสดงเฉพาะเมื่อ sidebar ซ่อนอยู่ - อยู่ด้านล่างซ้าย */}
      {isMobile && isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="fixed bottom-6 left-6 z-[60] p-3 bg-white rounded-full shadow-lg border border-neutral-200 hover:bg-primary-50 hover:border-primary-300 transition-all duration-200 text-neutral-600 hover:text-primary-600"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}
    </>
  );
}

