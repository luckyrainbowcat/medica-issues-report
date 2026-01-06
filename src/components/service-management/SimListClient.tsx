"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Table, Input, Select, Button, Space, Card, Typography, Tag, message } from "antd";
import { PlusOutlined, SearchOutlined, DownloadOutlined } from "@ant-design/icons";
import { exportToExcel } from "@/lib/service-management/excelExport";

const { Title, Text } = Typography;

type SimRow = {
  id: number;
  phoneNumber: string;
  networkFlags: string;
  networkOther?: string | null;
  ownerName?: string | null;
  status?: string | null;
  activatedDate?: string | null;
  packageExpireAt?: string | null;
  simExpireAt?: string | null;
  hospital?: { id: number; name: string | null } | null;
  department?: { id: number; name: string | null } | null;
};

export default function SimListClient({ initialData }: { initialData: SimRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "expired">("");
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
    let list = [...initialData];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) => {
        const phone = (s.phoneNumber ?? "").toLowerCase();
        const owner = (s.ownerName ?? "").toLowerCase();
        const hosp = (s.hospital?.name ?? "").toLowerCase();
        const dept = (s.department?.name ?? "").toLowerCase();
        return phone.includes(q) || owner.includes(q) || hosp.includes(q) || dept.includes(q);
      });
    }
    if (statusFilter) {
      list = list.filter((s) => (s.status || "active") === statusFilter);
    }
    return list;
  }, [initialData, search, statusFilter]);

  const columns = [
    {
      title: "เบอร์",
      dataIndex: "phoneNumber",
      key: "phoneNumber",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "เครือข่าย",
      dataIndex: "networkFlags",
      key: "networkFlags",
      render: (flags: string, record: SimRow) => {
        const networks = flags
          ? flags
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean)
              .map((p) => (p === "OTHER" && record.networkOther ? `อื่นๆ: ${record.networkOther}` : p))
              .join(", ")
          : "-";
        return <Text>{networks || "-"}</Text>;
      },
    },
    {
      title: "โรงพยาบาล",
      key: "hospital",
      render: (_: any, record: SimRow) => {
        const hospitalName = record.hospital?.name || null;
        return <Text>{hospitalName ?? "-"}</Text>;
      },
    },
    {
      title: "แผนก",
      key: "department",
      render: (_: any, record: SimRow) => {
        const departmentName = record.department?.name || null;
        return <Text>{departmentName ?? "-"}</Text>;
      },
    },
    {
      title: "วันที่เปิดซิม",
      dataIndex: "activatedDate",
      key: "activatedDate",
      render: (date: string) => <Text>{date ? String(date).slice(0, 10) : "-"}</Text>,
    },
    {
      title: "แพ็คเกจถึง",
      dataIndex: "packageExpireAt",
      key: "packageExpireAt",
      render: (date: string) => <Text>{date ? String(date).slice(0, 10) : "-"}</Text>,
    },
    {
      title: "ซิมหมดอายุ",
      dataIndex: "simExpireAt",
      key: "simExpireAt",
      render: (date: string) => <Text>{date ? String(date).slice(0, 10) : "-"}</Text>,
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      key: "status",
      align: "center" as const,
      render: (status: string) => (
        <Tag color={status === "expired" ? "error" : "success"}>
          {status === "expired" ? "หมดอายุ" : "ใช้งาน"}
        </Tag>
      ),
    },
    {
      title: "จัดการ",
      key: "action",
      align: "center" as const,
      render: (_: any, record: SimRow) => (
        <Link href={`/service-management/sims/${record.id}`}>
          <Button type="link">แก้ไข</Button>
        </Link>
      ),
    },
  ];

  return (
    <div style={{ padding: "12px", background: "#f0f2f5", minHeight: "100vh" }}>
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
                  ดูรายการซิมการ์ด
                </Title>
                <Text type="secondary" style={{ fontSize: mounted && isMobile ? 12 : 14 }}>
                  กรอกเบอร์ เครือข่าย โรงพยาบาล และแผนก พร้อมค้นหา/แก้ไขได้
                </Text>
              </div>
              <div style={{ 
                display: "flex", 
                flexDirection: mounted && isMobile ? "column" : "row",
                flexWrap: mounted && isMobile ? "wrap" : "nowrap",
                gap: 8,
                alignItems: mounted && isMobile ? "stretch" : "center"
              }}>
                <Button
                  type="default"
                  icon={<DownloadOutlined />}
                  size="middle"
                  onClick={() => {
                    try {
                      exportToExcel(filtered, `รายการซิมการ์ด_${new Date().toISOString().split("T")[0]}`, columns);
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
                <Link href="/service-management/sims/new" style={{ width: mounted && isMobile ? "100%" : "auto" }}>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    size="middle"
                    style={{ width: mounted && isMobile ? "100%" : "auto" }}
                  >
                    เพิ่มซิม
                  </Button>
                </Link>
              </div>
            </div>

            <Card>
              <Space direction="vertical" style={{ width: "100%" }} size="middle">
                <Input
                  placeholder="ค้นหา (เบอร์ / ผู้เปิด / โรงพยาบาล / แผนก)"
                  prefix={<SearchOutlined />}
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  style={{ width: "100%" }}
                  size="large"
                />
                <Space style={{ width: "100%" }} size="middle" wrap>
                  <Select
                    value={statusFilter}
                    onChange={(value: string) => setStatusFilter(value as "" | "active" | "expired")}
                    style={{ flex: 1, minWidth: 150 }}
                    size="large"
                    placeholder="สถานะทั้งหมด"
                  >
                    <Select.Option value="">สถานะทั้งหมด</Select.Option>
                    <Select.Option value="active">ใช้งาน</Select.Option>
                    <Select.Option value="expired">หมดอายุ</Select.Option>
                  </Select>
                  <Text strong style={{ fontSize: mounted && isMobile ? 12 : 14 }}>
                    ทั้งหมด {filtered.length} ซิม
                  </Text>
                </Space>
              </Space>
            </Card>

            <div style={{ overflowX: "auto" }}>
              <Table
                columns={columns}
                dataSource={filtered}
                rowKey="id"
                scroll={{ x: "max-content" }}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total: number) => `ทั้งหมด ${total} รายการ`,
                  responsive: true,
                }}
                locale={{
                  emptyText: "ไม่พบข้อมูลซิม",
                }}
              />
            </div>
          </Space>
        </Card>
      </div>
    </div>
  );
}

