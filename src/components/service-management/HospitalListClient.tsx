"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Table, Input, Select, Button, Space, Card, Typography, Pagination, message } from "antd";
import { PlusOutlined, SearchOutlined, UnorderedListOutlined, DownloadOutlined } from "@ant-design/icons";
import { exportToExcel } from "@/lib/service-management/excelExport";

const { Title, Text } = Typography;

type HospitalRow = {
  id: number;
  name: string | null;
  code?: string | null;
  province?: string | null;
  address?: string | null;
  region?: string | null;
};

type Props = {
  initialData: HospitalRow[];
  variant?: "full" | "compact";
  compactLimit?: number;
};

export default function HospitalListClient({
  initialData,
  variant = "full",
  compactLimit = 6,
}: Props) {
  const [search, setSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
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
    return initialData.filter((h) => {
      const name = (h.name ?? "").toLowerCase();
      const code = (h.code ?? "").toLowerCase();
      const province = (h.province ?? "").toLowerCase();
      const address = (h.address ?? "").toLowerCase();
      return (
        name.includes(q) ||
        code.includes(q) ||
        province.includes(q) ||
        address.includes(q)
      );
    });
  }, [initialData, search]);

  const data = variant === "compact" ? filtered.slice(0, compactLimit) : filtered;

  const columns = [
    {
      title: "ชื่อโรงพยาบาล",
      dataIndex: "name",
      key: "name",
      render: (text: string | null) => <Text strong={!!text}>{text || "-"}</Text>,
    },
    {
      title: "จังหวัด",
      dataIndex: "province",
      key: "province",
      render: (_: any, record: HospitalRow) => record.province || record.region || "-",
    },
    {
      title: "รหัสโรงพยาบาล",
      dataIndex: "code",
      key: "code",
      render: (text: string | null) => <Text>{text || "-"}</Text>,
    },
    {
      title: "ที่อยู่",
      dataIndex: "address",
      key: "address",
      render: (text: string | null) => (
        <Text ellipsis={{ tooltip: text || undefined }} style={{ maxWidth: 300 }}>
          {text || "-"}
        </Text>
      ),
    },
    {
      title: "จัดการ",
      key: "action",
      align: "center" as const,
      render: (_: any, record: HospitalRow) => (
        <Link href={`/service-management/hospitals/${record.id}`}>
          <Button type="link">แก้ไข</Button>
        </Link>
      ),
    },
  ];

  const paginatedData =
    variant === "full"
      ? data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
      : data;

  return (
    <div style={{ padding: variant === "full" ? "12px" : "0", background: "#f0f2f5", minHeight: variant === "full" ? "100vh" : "auto" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
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
                  ลงทะเบียนโรงพยาบาล
                </Title>
                <Text type="secondary" style={{ fontSize: mounted && isMobile ? 12 : 14 }}>
                  กรอกชื่อโรงพยาบาล จังหวัด ที่อยู่ และรหัสโรงพยาบาล พร้อมค้นหา/แก้ไขได้
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
                        exportToExcel(filtered, `รายการโรงพยาบาล_${new Date().toISOString().split("T")[0]}`, columns);
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
                <Link href="/service-management/hospitals/new" style={{ width: mounted && isMobile ? "100%" : "auto" }}>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    size="middle"
                    style={{ width: mounted && isMobile ? "100%" : "auto" }}
                  >
                    ลงทะเบียนโรงพยาบาล
                  </Button>
                </Link>
                {variant !== "full" && (
                  <Link href="/service-management/hospitals" style={{ width: mounted && isMobile ? "100%" : "auto" }}>
                    <Button icon={<UnorderedListOutlined />} size="middle" style={{ width: mounted && isMobile ? "100%" : "auto" }}>
                      แสดงทั้งหมด
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            <Card>
              <Space direction="vertical" style={{ width: "100%" }} size="middle">
                <Input
                  placeholder="ค้นหา (ชื่อ / จังหวัด / รหัส)"
                  prefix={<SearchOutlined />}
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ width: "100%" }}
                  size="large"
                />
                {variant === "full" && (
                  <Space style={{ width: "100%" }} size="middle" wrap>
                    <Select
                      value={itemsPerPage}
                      onChange={(value: number) => {
                        setItemsPerPage(value);
                        setCurrentPage(1);
                      }}
                      style={{ width: 120 }}
                      size="large"
                    >
                      <Select.Option value={10}>10</Select.Option>
                      <Select.Option value={20}>20</Select.Option>
                      <Select.Option value={50}>50</Select.Option>
                      <Select.Option value={100}>100</Select.Option>
                      <Select.Option value={filtered.length}>ทั้งหมด</Select.Option>
                    </Select>
                    <Text strong style={{ fontSize: mounted && isMobile ? 12 : 14 }}>
                      แสดง {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filtered.length)} จาก {filtered.length} โรงพยาบาล
                    </Text>
                  </Space>
                )}
                {variant !== "full" && (
                  <Text strong style={{ fontSize: mounted && isMobile ? 12 : 14 }}>
                    ทั้งหมด {filtered.length} โรงพยาบาล
                  </Text>
                )}
              </Space>
            </Card>

            <div style={{ overflowX: "auto" }}>
              <Table
                columns={columns}
                dataSource={paginatedData}
                rowKey="id"
                scroll={{ x: "max-content" }}
                pagination={
                  variant === "full"
                    ? {
                        current: currentPage,
                        pageSize: itemsPerPage,
                        total: filtered.length,
                        showSizeChanger: false,
                        onChange: (page: number) => setCurrentPage(page),
                        showTotal: (total: number) => `ทั้งหมด ${total} รายการ`,
                        responsive: true,
                      }
                    : false
                }
                locale={{
                  emptyText: "ไม่พบข้อมูลโรงพยาบาล",
                }}
              />
            </div>
          </Space>
        </Card>
      </div>
    </div>
  );
}
