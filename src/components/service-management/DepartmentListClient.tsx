"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Table, Input, Button, Space, Card, Typography, message } from "antd";
import { PlusOutlined, SearchOutlined, UnorderedListOutlined, DownloadOutlined } from "@ant-design/icons";
import { exportToExcel } from "@/lib/service-management/excelExport";

const { Title, Text } = Typography;

type DepartmentRow = {
  id: number;
  name: string;
};

export default function DepartmentListClient({
  initialData,
  variant = "full",
}: {
  initialData: DepartmentRow[];
  variant?: "full" | "compact";
}) {
  const [search, setSearch] = useState("");
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

  const filtered = useMemo(() => {
    if (!search.trim()) return initialData;
    const q = search.trim().toLowerCase();
    return initialData.filter((d) => d.name.toLowerCase().includes(q));
  }, [initialData, search]);

  const data = variant === "compact" ? filtered.slice(0, 6) : filtered;

  const columns = [
    {
      title: "ชื่อแผนก",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "จัดการ",
      key: "action",
      align: "center" as const,
      render: (_: any, record: DepartmentRow) => (
        <Link href={`/service-management/departments/${record.id}`}>
          <Button type="link">แก้ไข</Button>
        </Link>
      ),
    },
  ];

  return (
    <div style={{ padding: variant === "full" ? "12px" : "0", background: "#f0f2f5", minHeight: variant === "full" ? "100vh" : "auto" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <Card>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div style={{ 
              display: "flex", 
              flexDirection: mounted && isMobile ? "column" : "row",
              justifyContent: "space-between", 
              alignItems: mounted && isMobile ? "flex-start" : "flex-start",
              gap: 16,
            }}>
              <div style={{ flex: 1 }}>
                <Title level={2} style={{ margin: 0, fontSize: mounted && isMobile ? 20 : 24 }}>
                  จัดการแผนก
                </Title>
                <Text type="secondary" style={{ fontSize: mounted && isMobile ? 12 : 14 }}>
                  ค้นหา เพิ่ม และแก้ไขชื่อแผนก
                </Text>
              </div>
              <div style={{ 
                display: "flex", 
                flexDirection: mounted && isMobile ? "column" : "row",
                flexWrap: mounted && isMobile ? "wrap" : "nowrap",
                gap: 8,
                alignItems: mounted && isMobile ? "stretch" : "center"
              }}>
                {variant === "full" && (
                  <Button
                    type="default"
                    icon={<DownloadOutlined />}
                    size="middle"
                    onClick={() => {
                      try {
                        exportToExcel(filtered, `รายการแผนก_${new Date().toISOString().split("T")[0]}`, columns);
                        message.success("ส่งออก Excel สำเร็จ");
                      } catch (err) {
                        message.error("ส่งออก Excel ไม่สำเร็จ");
                        console.error(err);
                      }
                    }}
                    style={{ width: mounted && isMobile ? "100%" : "auto" }}
                  >
                    ส่งออก Excel
                  </Button>
                )}
                <Link href="/service-management/departments/new" style={{ width: mounted && isMobile ? "100%" : "auto" }}>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    size="middle"
                    style={{ width: mounted && isMobile ? "100%" : "auto" }}
                  >
                    เพิ่มแผนก
                  </Button>
                </Link>
                {variant !== "full" && (
                  <Link href="/service-management/departments" style={{ width: mounted && isMobile ? "100%" : "auto" }}>
                    <Button icon={<UnorderedListOutlined />} size="middle" style={{ width: mounted && isMobile ? "100%" : "auto" }}>
                      แสดงทั้งหมด
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            <Card>
              <Space style={{ width: "100%" }} size="middle">
                <Input
                  placeholder="ค้นหาชื่อแผนก"
                  prefix={<SearchOutlined />}
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  style={{ flex: 1 }}
                  size="large"
                />
                <Text strong style={{ fontSize: mounted && isMobile ? 12 : 14, whiteSpace: "nowrap" }}>
                  ทั้งหมด {filtered.length} แผนก
                </Text>
              </Space>
            </Card>

            <div style={{ overflowX: "auto" }}>
              <Table
                columns={columns}
                dataSource={data}
                rowKey="id"
                scroll={{ x: "max-content" }}
                pagination={false}
                locale={{
                  emptyText: "ไม่พบแผนก",
                }}
              />
            </div>
          </Space>
        </Card>
      </div>
    </div>
  );
}
