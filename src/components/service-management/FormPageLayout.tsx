"use client";

import { useState, useEffect } from "react";
import { Card, Space, Button, Typography } from "antd";
import { ArrowLeftOutlined, UnorderedListOutlined } from "@ant-design/icons";
import Link from "next/link";

const { Title } = Typography;

type FormPageLayoutProps = {
  title: string;
  backHref: string;
  backText?: string;
  showListButton?: boolean;
  listHref?: string;
  children: React.ReactNode;
};

export default function FormPageLayout({
  title,
  backHref,
  backText = "กลับ",
  showListButton = false,
  listHref,
  children,
}: FormPageLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // ตรวจสอบว่า window object มีอยู่ (client-side only)
    if (typeof window === "undefined") return;
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ใช้ default value สำหรับ SSR
  const padding = mounted ? (isMobile ? "12px" : "24px") : "24px";
  const fontSize = mounted ? (isMobile ? 20 : 24) : 24;
  const flexDirection = mounted ? (isMobile ? "column" : "row") : "row";
  const justifyContent = mounted ? (isMobile ? "stretch" : "flex-end") : "flex-end";
  const spaceDirection = mounted ? (isMobile ? "vertical" : "horizontal") : "horizontal";
  const buttonSize = mounted ? (isMobile ? "large" : "middle") : "middle";
  const buttonBlock = mounted && isMobile;
  const spaceWidth = mounted && isMobile ? "100%" : "auto";

  return (
    <div style={{ padding: padding, background: "#f0f2f5", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Card>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            {/* หัวข้ออยู่ด้านบนสุด */}
            <div>
              <Title level={2} style={{ margin: 0, fontSize, wordBreak: "break-word", whiteSpace: "normal", lineHeight: 1.4 }}>
                {title}
              </Title>
            </div>

            {/* ปุ่มอยู่แถวล่าง */}
            <div style={{ 
              display: "flex", 
              flexDirection,
              justifyContent,
              gap: 12,
            }}>
              <Space direction={spaceDirection} style={{ width: spaceWidth }}>
                {showListButton && listHref && (
                  <Link href={listHref} style={{ width: spaceWidth }}>
                    <Button icon={<UnorderedListOutlined />} block={buttonBlock} size={buttonSize}>
                      ดูรายการทั้งหมด
                    </Button>
                  </Link>
                )}
                <Link href={backHref} style={{ width: spaceWidth }}>
                  <Button icon={<ArrowLeftOutlined />} block={buttonBlock} size={buttonSize}>
                    {backText}
                  </Button>
                </Link>
              </Space>
            </div>

            {children}
          </Space>
        </Card>
      </div>
    </div>
  );
}

