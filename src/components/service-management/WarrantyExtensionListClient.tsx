"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Table, Input, Select, Button, Space, Card, Typography, Tag, message } from "antd";
import { PlusOutlined, SearchOutlined, DownloadOutlined, EditOutlined } from "@ant-design/icons";
import { exportToExcel } from "@/lib/service-management/excelExport";

const { Title, Text } = Typography;

type Hospital = {
  id: number;
  name: string | null;
};

type Installation = {
  id: number;
  hospital?: Hospital | null;
  department: string | null;
  room?: string | null;
  floor?: string | null;
};

type WarrantyExtensionRow = {
  id: number;
  installationId: number;
  latestExtensionDate: string | null;
  warrantyMonths: number | null;
  installDate: string | null;
  inspectionDate: string | null;
  warrantyExpireDate: string | null;
  hospital?: Hospital | null;
};

export default function WarrantyExtensionListClient({
  initialData,
}: {
  initialData: WarrantyExtensionRow[];
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
      const name = item.hospital?.name ?? "";
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [initialData]);

  const filtered = useMemo(() => {
    let list = [...initialData];

    if (hospitalFilter) {
      list = list.filter((item) => (item.hospital?.name ?? "") === hospitalFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((item) => {
        const hospitalName = (item.hospital?.name ?? "").toLowerCase();
        
        // ค้นหาจากวันที่ต่างๆ (แปลงเป็น string format yyyy-mm-dd)
        const latestExtensionDateStr = item.latestExtensionDate 
          ? String(item.latestExtensionDate).slice(0, 10).toLowerCase()
          : "";
        const installDateStr = item.installDate 
          ? String(item.installDate).slice(0, 10).toLowerCase()
          : "";
        const inspectionDateStr = item.inspectionDate 
          ? String(item.inspectionDate).slice(0, 10).toLowerCase()
          : "";
        const warrantyExpireDateStr = item.warrantyExpireDate 
          ? String(item.warrantyExpireDate).slice(0, 10).toLowerCase()
          : "";
        
        // ค้นหาจากวันที่ในรูปแบบ dd/mm/yyyy หรือ dd-mm-yyyy ด้วย
        const formatDateForSearch = (dateStr: string) => {
          if (!dateStr) return "";
          const parts = dateStr.split("-");
          if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`; // dd/mm/yyyy
          }
          return dateStr;
        };
        
        const latestExtensionDateFormatted = formatDateForSearch(latestExtensionDateStr);
        const installDateFormatted = formatDateForSearch(installDateStr);
        const inspectionDateFormatted = formatDateForSearch(inspectionDateStr);
        const warrantyExpireDateFormatted = formatDateForSearch(warrantyExpireDateStr);
        
        return (
          hospitalName.includes(q) ||
          latestExtensionDateStr.includes(q) ||
          latestExtensionDateFormatted.includes(q) ||
          installDateStr.includes(q) ||
          installDateFormatted.includes(q) ||
          inspectionDateStr.includes(q) ||
          inspectionDateFormatted.includes(q) ||
          warrantyExpireDateStr.includes(q) ||
          warrantyExpireDateFormatted.includes(q)
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

  const columns = [
    {
      title: "วันที่ต่อประกันล่าสุด",
      dataIndex: "latestExtensionDate",
      key: "latestExtensionDate",
      render: (text: string | null) => {
        if (!text) return <Text>-</Text>;
        return <Text>{String(text).slice(0, 10)}</Text>;
      },
    },
    {
      title: "โรงพยาบาล",
      key: "hospital",
      render: (_: any, record: WarrantyExtensionRow) => {
        const hospitalName = record.hospital?.name || null;
        return <Text strong>{hospitalName || "-"}</Text>;
      },
    },
    {
      title: "ประกัน (เดือน)",
      dataIndex: "warrantyMonths",
      key: "warrantyMonths",
      align: "center" as const,
      render: (text: number | null) => <Text>{text ?? "-"}</Text>,
    },
    {
      title: "วันที่ติดตั้งระบบ",
      dataIndex: "installDate",
      key: "installDate",
      render: (text: string | null) => {
        if (!text) return <Text>-</Text>;
        return <Text>{String(text).slice(0, 10)}</Text>;
      },
    },
    {
      title: "วันที่ตรวจรับ",
      dataIndex: "inspectionDate",
      key: "inspectionDate",
      render: (text: string | null) => {
        if (!text) return <Text>-</Text>;
        return <Text>{String(text).slice(0, 10)}</Text>;
      },
    },
    {
      title: "วันที่หมดประกัน",
      dataIndex: "warrantyExpireDate",
      key: "warrantyExpireDate",
      render: (text: string | null) => {
        if (!text) return <Text>-</Text>;
        return <Text>{String(text).slice(0, 10)}</Text>;
      },
    },
    {
      title: "จัดการ",
      key: "action",
      align: "center" as const,
      render: (_: any, record: WarrantyExtensionRow) => (
        <Link href={`/service-management/warranty-extensions/${record.id}`}>
          <Button type="link" icon={<EditOutlined />}>
            แก้ไข
          </Button>
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
                  ข้อมูลต่อประกัน
                </Title>
                <Text type="secondary" style={{ fontSize: mounted && isMobile ? 12 : 14 }}>
                  ดูและจัดการข้อมูลการต่อประกันทั้งหมด
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
                      exportToExcel(filtered, `รายการข้อมูลต่อประกัน_${new Date().toISOString().split("T")[0]}`, columns);
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
                <Link href="/service-management/warranty-extensions/new" style={{ width: mounted && isMobile ? "100%" : "auto" }}>
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
                  placeholder="ค้นหา (ชื่อโรงพยาบาล / วันที่)"
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

