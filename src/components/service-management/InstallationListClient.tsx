"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Table, Input, Select, Button, Space, Card, Typography, Tag, message, Tooltip } from "antd";
import { PlusOutlined, SearchOutlined, DownloadOutlined } from "@ant-design/icons";
import { exportToExcel } from "@/lib/service-management/excelExport";

const { Title, Text } = Typography;

type Hospital = {
  id: number;
  name: string | null;
  code?: string | null;
  region?: string | null;
  address?: string | null;
  province?: string | null;
  createdAt?: any;
  updatedAt?: any;
};

type NetworkConfig = {
  id: number;
  anydeskId: string | null;
  connectionFlags?: string | null;
};

type InstallationRow = {
  id: number;
  systemType: string | null;
  department: string | null;
  room: string | null;
  systemMode: string | null;
  hospital?: string | Hospital | null; // รองรับทั้ง string และ object
  hospitalObj?: Hospital | null; // เก็บ object ไว้สำหรับแสดงผล (ถ้ามี)
  networkConfig?: NetworkConfig | null;
};

export default function InstallationListClient({
  initialData,
}: {
  initialData: InstallationRow[];
}) {
  const [search, setSearch] = useState("");
  const [hospitalFilter, setHospitalFilter] = useState("");
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

  const hospitalOptions = useMemo(() => {
    const set = new Set<string>();
    initialData.forEach((item) => {
      const hospitalName = typeof item.hospital === 'string' 
        ? item.hospital 
        : (item.hospital as any)?.name || item.hospitalObj?.name || "";
      if (hospitalName) set.add(hospitalName);
    });
    return Array.from(set).sort();
  }, [initialData]);

  const filtered = useMemo(() => {
    let list = [...initialData];

    if (hospitalFilter) {
      list = list.filter((item) => {
        const hospitalName = typeof item.hospital === 'string' 
          ? item.hospital 
          : (item.hospital as any)?.name || item.hospitalObj?.name || "";
        return hospitalName === hospitalFilter;
      });
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((item) => {
        const hospitalName = typeof item.hospital === 'string' 
          ? item.hospital 
          : (item.hospital as any)?.name || item.hospitalObj?.name || "";
        const hospitalNameLower = hospitalName.toLowerCase();
        const systemType = (item.systemType ?? "").toLowerCase();
        const department = (item.department ?? "").toLowerCase();
        const anydeskId = (item.networkConfig?.anydeskId ?? "").toLowerCase();
        return (
          hospitalNameLower.includes(q) ||
          systemType.includes(q) ||
          department.includes(q) ||
          anydeskId.includes(q)
        );
      });
    }

    return list;
  }, [initialData, search, hospitalFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, hospitalFilter, itemsPerPage]);

  const paginatedData = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const connectionLabels: Record<string, string> = {
    LAN: "LAN โรงพยาบาล",
    HOSPITAL_WIFI: "WiFi โรงพยาบาล",
    WIFI_USER: "WiFi User",
    VPN: "VPN",
  };

  const columns = [
    {
      title: "ระบบ",
      dataIndex: "systemType",
      key: "systemType",
      render: (text: string | null) => <Text strong={!!text}>{text || "-"}</Text>,
    },
    {
      title: "ชื่อโรงพยาบาล",
      key: "hospital",
      render: (_: any, record: InstallationRow) => {
        // ตรวจสอบว่า hospital เป็น object หรือ string
        const hospitalName = typeof record.hospital === 'string' 
          ? record.hospital 
          : (record.hospital as any)?.name || record.hospitalObj?.name || null;
        return <Text>{hospitalName || "-"}</Text>;
      },
    },
    {
      title: "เลข AnyDesk",
      key: "anydeskId",
      render: (_: any, record: InstallationRow) => {
        const anydeskId = record.networkConfig?.anydeskId || null;
        return <Text>{anydeskId || "-"}</Text>;
      },
    },
    {
      title: "แผนก",
      dataIndex: "department",
      key: "department",
      render: (text: string | null) => <Text>{text || "-"}</Text>,
    },
    {
      title: "ห้อง",
      dataIndex: "room",
      key: "room",
      render: (text: string | null) => <Text>{text || "-"}</Text>,
    },
    {
      title: "สถานะการเชื่อมต่อ",
      dataIndex: "connection",
      key: "connection",
      align: "center" as const,
      render: (_: any, record: InstallationRow) => {
        // ตรวจสอบว่ามี networkConfig หรือไม่
        if (!record.networkConfig) {
          return <Text type="secondary" style={{ fontStyle: "italic" }}>ยังไม่ได้ตั้งค่า</Text>;
        }
        
        // ตรวจสอบ connectionFlags
        const connectionFlags = record.networkConfig.connectionFlags;
        if (!connectionFlags || connectionFlags.trim() === "") {
          return <Text type="secondary" style={{ fontStyle: "italic" }}>ยังไม่ได้ตั้งค่า</Text>;
        }
        
        // แยก connectionFlags ด้วย comma และแสดงเป็นข้อความธรรมดา
        const connections = connectionFlags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        
        if (connections.length === 0) {
          return <Text type="secondary" style={{ fontStyle: "italic" }}>ยังไม่ได้ตั้งค่า</Text>;
        }
        
        return (
          <Text>
            {connections.map((c) => connectionLabels[c] || c).join(", ")}
          </Text>
        );
      },
    },
    {
      title: "ประเภทการติดตั้ง",
      dataIndex: "systemMode",
      key: "systemMode",
      align: "center" as const,
      render: (text: string | null) => {
        if (!text) return <Text>-</Text>;
        const modes = text
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        return (
          <Space size="small" wrap>
            {modes.map((m) => (
              <Tag key={m}>{m}</Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: "จัดการ",
      dataIndex: "action",
      key: "action",
      align: "center" as const,
      render: (_: any, record: InstallationRow) => (
        <Link href={`/service-management/installations/${record.id}`}>
          <Button type="link">ดู / แก้ไข</Button>
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
                  รายการติดตั้งทั้งหมด
                </Title>
                <Text type="secondary" style={{ fontSize: mounted && isMobile ? 12 : 14 }}>
                  ดูและค้นหาข้อมูลการติดตั้งทั้งหมด พร้อมกรองตามโรงพยาบาล
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
                      exportToExcel(filtered, `รายการข้อมูลอุปกรณ์_${new Date().toISOString().split("T")[0]}`, columns);
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
                <Link href="/service-management/installations/new" style={{ width: mounted && isMobile ? "100%" : "auto" }}>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    size="middle"
                    style={{ width: mounted && isMobile ? "100%" : "auto" }}
                  >
                    เพิ่มข้อมูลใหม่
                  </Button>
                </Link>
              </div>
            </div>

            <Card>
              <Space direction="vertical" style={{ width: "100%" }} size="middle">
                <Input
                  placeholder="ค้นหา (ชื่อโรงพยาบาล / ระบบ / แผนก)"
                  prefix={<SearchOutlined />}
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  style={{ width: "100%" }}
                  size="large"
                />
                <Space style={{ width: "100%" }} size="middle" wrap>
                  <Select
                    value={hospitalFilter}
                    onChange={(value: string) => setHospitalFilter(value)}
                    style={{ flex: 1, minWidth: 200 }}
                    size="large"
                    placeholder="โรงพยาบาลทั้งหมด"
                    allowClear
                  >
                    {hospitalOptions.map((name) => (
                      <Select.Option key={name} value={name}>
                        {name}
                      </Select.Option>
                    ))}
                  </Select>
                  <Select
                    value={itemsPerPage}
                    onChange={(value: number) => setItemsPerPage(value)}
                    style={{ width: 120 }}
                    size="large"
                  >
                    <Select.Option value={10}>10</Select.Option>
                    <Select.Option value={20}>20</Select.Option>
                    <Select.Option value={50}>50</Select.Option>
                    <Select.Option value={100}>100</Select.Option>
                    <Select.Option value={filtered.length}>ทั้งหมด</Select.Option>
                  </Select>
                </Space>
                <Text strong style={{ fontSize: mounted && isMobile ? 12 : 14 }}>
                  แสดง {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filtered.length)} จากทั้งหมด {filtered.length} รายการ
                </Text>
              </Space>
            </Card>

            <div style={{ overflowX: "auto" }}>
              <Table
                columns={columns}
                dataSource={paginatedData}
                rowKey="id"
                scroll={{ x: "max-content" }}
                pagination={{
                  current: currentPage,
                  pageSize: itemsPerPage,
                  total: filtered.length,
                  showSizeChanger: false,
                  onChange: (page: number) => setCurrentPage(page),
                  showTotal: (total: number) => `ทั้งหมด ${total} รายการ`,
                  responsive: true,
                }}
                locale={{
                  emptyText: "ไม่พบข้อมูลที่ตรงเงื่อนไข",
                }}
              />
            </div>
          </Space>
        </Card>
      </div>
    </div>
  );
}
