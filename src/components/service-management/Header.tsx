"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layout, Menu, Avatar, Button, Space, Dropdown, Drawer } from "antd";
import { API_URL } from "@/lib/service-management/api";
import {
  UserOutlined,
  LogoutOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  HomeOutlined,
  BankOutlined,
  TeamOutlined,
  MobileOutlined,
  LinkOutlined,
  CloudOutlined,
  ToolOutlined,
  SafetyCertificateOutlined,
  MenuOutlined,
  FileTextOutlined,
} from "@ant-design/icons";

export default function Header() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  const router = useRouter();


  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // ตรวจสอบ fullscreen state เมื่อเปลี่ยน
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // ตรวจสอบขนาดหน้าจอ
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setWindowWidth(width);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // โหลดรูปโปรไฟล์และชื่อจาก localStorage (ใช้ currentUser เพื่อให้เชื่อมกับ Issues Tracker)
  useEffect(() => {
    const loadProfile = () => {
      // อ่านจาก currentUser ก่อน (ใช้ key เดียวกันกับ Issues Tracker)
      const savedUser = localStorage.getItem("currentUser");
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          if (user.profilePicture) {
            setProfileAvatar(user.profilePicture);
          } else {
            setProfileAvatar("");
          }
          if (user.name) {
            setUserName(user.name);
          } else {
            setUserName("");
          }
          return;
        } catch (e) {
          console.error("Error loading profile from currentUser:", e);
        }
      }
      
      // Fallback: อ่านจาก profile key (สำหรับข้อมูลเก่า)
      const saved = localStorage.getItem("profile");
      if (saved) {
        try {
          const profile = JSON.parse(saved);
          if (profile.avatar) {
            setProfileAvatar(profile.avatar);
          } else {
            setProfileAvatar("");
          }
          if (profile.name) {
            setUserName(profile.name);
          } else {
            setUserName("");
          }
        } catch (e) {
          console.error("Error loading profile:", e);
        }
      } else {
        setProfileAvatar("");
        setUserName("");
      }
    };

    loadProfile();
    // ฟังการเปลี่ยนแปลงใน localStorage (เมื่อบันทึกโปรไฟล์ใหม่)
    const handleStorageChange = () => {
      loadProfile();
    };
    // ฟัง custom event สำหรับการเปลี่ยนแปลงในแท็บเดียวกัน
    const handleCustomStorageChange = () => {
      loadProfile();
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("customStorageChange", handleCustomStorageChange);
    // ตรวจสอบทุก 1 วินาที (สำหรับการเปลี่ยนแปลงในแท็บเดียวกัน)
    const interval = setInterval(loadProfile, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("customStorageChange", handleCustomStorageChange);
      clearInterval(interval);
    };
  }, []);

  const menuItems = [
    {
      key: "/service-management/hospitals",
      icon: <BankOutlined />,
      label: <Link href="/service-management/hospitals/new">โรงพยาบาล</Link>,
    },
    {
      key: "/service-management/departments",
      icon: <TeamOutlined />,
      label: <Link href="/service-management/departments/new">แผนก</Link>,
    },
    {
      key: "/service-management/sims",
      icon: <MobileOutlined />,
      label: <Link href="/service-management/sims/new">ซิมการ์ด</Link>,
    },
    {
      key: "/service-management/connections/list",
      icon: <LinkOutlined />,
      label: <Link href="/service-management/connections/list">การเชื่อมต่อ</Link>,
    },
    {
      key: "/service-management/remote",
      icon: <CloudOutlined />,
      label: <Link href="/service-management/remote?addRemote=true">การรีโมต</Link>,
    },
    {
      key: "/service-management/installations",
      icon: <ToolOutlined />,
      label: <Link href="/service-management/installations/new">ข้อมูลอุปกรณ์</Link>,
    },
    {
      key: "/service-management/warranty-extensions",
      icon: <SafetyCertificateOutlined />,
      label: <Link href="/service-management/warranty-extensions/new">ข้อมูลต่อประกัน</Link>,
    },
  ];

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
      
      // Trigger custom event เพื่อให้ Header component รู้ว่ามีการ logout
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("customStorageChange"));
      }
      
      // Redirect ไปหน้า login
      window.location.href = "/login";
    }
  };

  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: <Link href="/service-management/profile">โปรไฟล์</Link>,
    },
    {
      type: "divider" as const,
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "ออกจากระบบ",
      danger: true,
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === "logout") {
      handleLogout();
    }
  };

  const mobileMenuItems = menuItems.map((item) => {
    const linkProps = typeof item.label === "object" && "props" in item.label ? item.label.props : {};
    const href = linkProps.href || "#";
    const children = linkProps.children || item.label;
    
    return {
      key: item.key,
      icon: item.icon,
      label: (
        <Link href={href} onClick={() => setMobileMenuOpen(false)}>
          {children}
        </Link>
      ),
    };
  });

  return (
    <>
      <Layout.Header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "0 12px" : "0 16px",
          background: "linear-gradient(to bottom, #ffffff, #fafafa)",
          boxShadow: "0 2px 8px rgba(59, 130, 246, 0.08)",
          borderBottom: "1px solid #e5e7eb",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <Link 
          href="/service-management" 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: isMobile ? 6 : 8, 
            textDecoration: "none",
            flex: isMobile ? 1 : "none",
            minWidth: 0,
            flexShrink: 1,
          }}
        >
          <HomeOutlined style={{ fontSize: isMobile ? 18 : 20, color: "#3b82f6", flexShrink: 0 }} />
          <h1 style={{ 
            margin: 0, 
            fontSize: isMobile ? 14 : windowWidth < 1024 ? 16 : 18, 
            fontWeight: "bold", 
            background: "linear-gradient(to right, #2563eb, #3b82f6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: windowWidth < 768 ? "150px" : windowWidth < 1024 ? "200px" : "none",
          }}>
            {isMobile ? "Service Management" : windowWidth < 1024 ? "Service Management" : "Service Management"}
          </h1>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : windowWidth < 1024 ? 8 : 16, marginLeft: "auto", flexShrink: 0 }}>
          {!isMobile ? (
            <>
              <div style={{ display: "flex", gap: windowWidth < 1024 ? 2 : 4, alignItems: "center", flexWrap: "nowrap" }}>
                {menuItems.map((item) => {
                  const linkProps = typeof item.label === "object" && "props" in item.label ? item.label.props : {};
                  const href = linkProps.href || "#";
                  const children = linkProps.children || item.label;
                  
                  return (
                    <Link
                      key={item.key}
                      href={href}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: windowWidth < 1024 ? "0 8px" : "0 12px",
                        height: 64,
                        textDecoration: "none",
                        color: "#262626",
                        fontSize: windowWidth < 1024 ? 12 : 14,
                        transition: "all 0.3s",
                        borderRadius: 4,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#3b82f6";
                        e.currentTarget.style.backgroundColor = "#eff6ff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#262626";
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {item.icon}
                      <span>{children}</span>
                    </Link>
                  );
                })}
              </div>
              <Space split={<div style={{ borderLeft: "1px solid #e5e7eb", height: 24 }} />} size={windowWidth < 1024 ? "small" : "middle"}>
                <Button
                  type="default"
                  icon={<FileTextOutlined />}
                  onClick={() => router.push("/")}
                  size={windowWidth < 1024 ? "small" : "middle"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    background: "linear-gradient(to right, #3b82f6, #2563eb)",
                    border: "none",
                    color: "white",
                    boxShadow: "0 2px 4px rgba(59, 130, 246, 0.2)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "linear-gradient(to right, #2563eb, #1d4ed8)";
                    e.currentTarget.style.boxShadow = "0 4px 8px rgba(59, 130, 246, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "linear-gradient(to right, #3b82f6, #2563eb)";
                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(59, 130, 246, 0.2)";
                  }}
                >
                  <span>{windowWidth < 1024 ? "Issue" : "Issue Report"}</span>
                </Button>
                <Dropdown menu={{ items: userMenuItems, onClick: handleMenuClick }} placement="bottomRight">
                  {profileAvatar ? (
                    <Avatar
                      src={profileAvatar.startsWith("http") ? profileAvatar : `${typeof window !== "undefined" ? window.location.origin : ""}${profileAvatar}`}
                      style={{ cursor: "pointer" }}
                      onError={() => {
                        // ถ้าโหลดรูปไม่สำเร็จ ให้ใช้ default avatar
                        setProfileAvatar("");
                        return false; // ป้องกันการแสดง broken image
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "linear-gradient(to bottom right, #3b82f6, #2563eb)",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                        border: "2px solid #dbeafe",
                        boxShadow: "0 2px 4px rgba(59, 130, 246, 0.2)",
                      }}
                    >
                      {userName ? userName.charAt(0).toUpperCase() : "?"}
                    </div>
                  )}
                </Dropdown>
                <Button
                  type="text"
                  icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                  onClick={toggleFullscreen}
                  title={isFullscreen ? "ออกจากเต็มจอ" : "เต็มจอ"}
                />
              </Space>
            </>
          ) : (
            <>
              <Button
                type="default"
                icon={<FileTextOutlined />}
                onClick={() => router.push("/")}
                size="small"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 12 }}>Issue</span>
              </Button>
              <Dropdown menu={{ items: userMenuItems, onClick: handleMenuClick }} placement="bottomRight">
                {profileAvatar ? (
                  <Avatar
                    src={`${profileAvatar.startsWith("http") ? profileAvatar : `${typeof window !== "undefined" ? window.location.origin : ""}${profileAvatar}`}${profileAvatar.includes('?') ? '&' : '?'}v=${Math.abs(profileAvatar.split('').reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0)).toString(36)}`}
                    style={{ cursor: "pointer" }}
                    key={profileAvatar} // Force re-render when URL changes
                    onError={() => {
                      // ถ้าโหลดรูปไม่สำเร็จ ให้ใช้ default avatar
                      setProfileAvatar("");
                      return false; // ป้องกันการแสดง broken image
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "linear-gradient(to bottom right, #3b82f6, #2563eb)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "2px solid #dbeafe",
                      boxShadow: "0 2px 4px rgba(59, 130, 246, 0.2)",
                    }}
                  >
                    {userName ? userName.charAt(0).toUpperCase() : "?"}
                  </div>
                )}
              </Dropdown>
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setMobileMenuOpen(true)}
                style={{ fontSize: 18 }}
              />
            </>
          )}
        </div>
      </Layout.Header>

      <Drawer
        title="เมนู"
        placement="right"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        styles={{ body: { padding: 0 } }}
      >
        <Menu
          mode="vertical"
          items={mobileMenuItems}
          style={{ border: "none" }}
        />
        <div style={{ padding: "16px", borderTop: "1px solid #f0f0f0", marginTop: "auto" }}>
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Button
              type="default"
              icon={<FileTextOutlined />}
              onClick={() => {
                router.push("/");
                setMobileMenuOpen(false);
              }}
              block
              style={{ textAlign: "left" }}
            >
              Issue Report
            </Button>
            <Button
              type="text"
              icon={<FullscreenOutlined />}
              onClick={() => {
                toggleFullscreen();
                setMobileMenuOpen(false);
              }}
              block
              style={{ textAlign: "left" }}
            >
              {isFullscreen ? "ออกจากเต็มจอ" : "เต็มจอ"}
            </Button>
          </Space>
        </div>
      </Drawer>
    </>
  );
}

