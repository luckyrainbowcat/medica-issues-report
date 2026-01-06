"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet, getApiUrlInstance } from "@/lib/service-management/api";
import { Table, Input, Select, Button, Space, Card, Typography, Empty, Image, message, Modal } from "antd";
import { PlusOutlined, SearchOutlined, EditOutlined, DownloadOutlined } from "@ant-design/icons";
import { exportToExcel } from "@/lib/service-management/excelExport";

const { Title, Text } = Typography;

type ConnectionRow = {
  id: number;
  hospitalId: number;
  hospital?: { id: number; name: string };
  pacsDetail: string | null;
  emrDetail: string | null;
  serverDetail: string | null;
  otherDetail: string | null;
  images?: Array<{ url: string }>;
};

type Props = {
  initialData: ConnectionRow[];
};

export default function ConnectionListClient({ initialData }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showHospitalModal, setShowHospitalModal] = useState(false);
  const [hospitals, setHospitals] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [imageFallbacks, setImageFallbacks] = useState<Map<string, string>>(new Map());

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

  // อนุญาตให้ copy/paste ทำงานได้
  useEffect(() => {
    // ตรวจสอบว่า document object มีอยู่ (client-side only)
    if (typeof document === "undefined") return;
    
    // เพิ่ม global style เพื่อให้ copy/paste ทำงานได้
    const style = document.createElement('style');
    style.textContent = `
      .ant-table-tbody > tr > td {
        user-select: text !important;
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
      }
      .ant-table-tbody > tr > td * {
        user-select: text !important;
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Fetch hospitals when modal opens
  useEffect(() => {
    if (showHospitalModal && hospitals.length === 0) {
      apiGet("/api/hospitals")
        .then((data) => {
          if (Array.isArray(data)) {
            setHospitals(data);
          }
        })
        .catch((err) => {
          console.error("Error fetching hospitals:", err);
          message.error("ไม่สามารถโหลดรายชื่อโรงพยาบาลได้");
        });
    }
  }, [showHospitalModal, hospitals.length]);

  const filtered = useMemo(() => {
    if (!search.trim()) return initialData;
    const q = search.trim().toLowerCase();
    return initialData.filter((c) => {
      const hospitalName = (c.hospital?.name ?? "").toLowerCase();
      const pacs = (c.pacsDetail ?? "").toLowerCase();
      const emr = (c.emrDetail ?? "").toLowerCase();
      const server = (c.serverDetail ?? "").toLowerCase();
      const other = (c.otherDetail ?? "").toLowerCase();
      return (
        hospitalName.includes(q) ||
        pacs.includes(q) ||
        emr.includes(q) ||
        server.includes(q) ||
        other.includes(q)
      );
    });
  }, [initialData, search]);

  const paginatedData = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const columns = [
    {
      title: "โรงพยาบาล",
      key: "hospital",
      render: (_: any, record: ConnectionRow) => {
        const hospitalName = record.hospital?.name || null;
        return (
          <Text 
            strong={!!hospitalName}
            style={{ 
              userSelect: "text", 
              WebkitUserSelect: "text",
              MozUserSelect: "text",
              msUserSelect: "text",
              cursor: "text",
            }}
          >
            {hospitalName || "ไม่ระบุ"}
          </Text>
        );
      },
    },
    {
      title: "PACS",
      dataIndex: "pacsDetail",
      key: "pacs",
      render: (text: string | null) => (
        <Text 
          ellipsis={{ tooltip: text || undefined }} 
          style={{ 
            maxWidth: 200, 
            userSelect: "text", 
            WebkitUserSelect: "text",
            MozUserSelect: "text",
            msUserSelect: "text",
            cursor: "text",
          }}
        >
          {text || "-"}
        </Text>
      ),
    },
    {
      title: "EMR",
      dataIndex: "emrDetail",
      key: "emr",
      render: (text: string | null) => (
        <Text 
          ellipsis={{ tooltip: text || undefined }} 
          style={{ 
            maxWidth: 200, 
            userSelect: "text", 
            WebkitUserSelect: "text",
            MozUserSelect: "text",
            msUserSelect: "text",
            cursor: "text",
          }}
        >
          {text || "-"}
        </Text>
      ),
    },
    {
      title: "Server",
      dataIndex: "serverDetail",
      key: "server",
      render: (text: string | null) => (
        <Text 
          ellipsis={{ tooltip: text || undefined }} 
          style={{ 
            maxWidth: 200, 
            userSelect: "text", 
            WebkitUserSelect: "text",
            MozUserSelect: "text",
            msUserSelect: "text",
            cursor: "text",
          }}
        >
          {text || "-"}
        </Text>
      ),
    },
    {
      title: "อื่นๆ",
      dataIndex: "otherDetail",
      key: "other",
      render: (text: string | null) => (
        <Text 
          ellipsis={{ tooltip: text || undefined }} 
          style={{ 
            maxWidth: 200, 
            userSelect: "text", 
            WebkitUserSelect: "text",
            MozUserSelect: "text",
            msUserSelect: "text",
            cursor: "text",
          }}
        >
          {text || "-"}
        </Text>
      ),
    },
    {
      title: "รูปภาพ",
      key: "images",
      render: (_: any, record: ConnectionRow) => {
        if (!record.images || record.images.length === 0) return <Text type="secondary">-</Text>;
        
        // ใน mobile แสดงแค่ 1 รูปเพื่อลดการโหลด
        const showCount = mounted && isMobile ? 1 : 2;
        const visibleImages = record.images.slice(0, showCount);
        const remainingCount = record.images.length - showCount;
        
        // สร้าง preview images list สำหรับ PreviewGroup
        const previewImages = record.images.map(img => {
          let imgSrc = img.url;
          if (!imgSrc.startsWith("http://") && !imgSrc.startsWith("https://")) {
            if (!imgSrc.startsWith("/")) {
              imgSrc = "/" + imgSrc;
            }
            // ใช้ fallback URL สำหรับ SSR และ client-side
            // ใน SSR จะใช้ default URL, ใน client-side จะใช้ getApiUrlInstance()
            if (typeof window !== "undefined") {
              try {
                const apiUrl = getApiUrlInstance();
                imgSrc = `${apiUrl}${imgSrc}`;
              } catch (e) {
                // Fallback ถ้า getApiUrlInstance() มีปัญหา - ใช้ default URL
                imgSrc = `http://localhost:3005${imgSrc}`;
              }
            } else {
              // SSR: ใช้ default URL (จะถูก replace ด้วย API_URL เมื่อ render ใน client)
              imgSrc = `http://localhost:3005${imgSrc}`;
            }
          }
          return imgSrc;
        });
        
        return (
          <Image.PreviewGroup items={previewImages}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: mounted && isMobile ? 4 : 8, alignItems: "center" }}>
              {visibleImages.map((img, idx) => {
                // แปลง relative path เป็น absolute URL
                let imgSrc = img.url;
                
                // ตรวจสอบว่ามี fallback URL หรือไม่
                const fallbackUrl = imageFallbacks.get(img.url);
                if (fallbackUrl) {
                  imgSrc = fallbackUrl;
                } else if (!imgSrc.startsWith("http://") && !imgSrc.startsWith("https://")) {
                  // ถ้าไม่ขึ้นต้นด้วย / ให้เพิ่ม /
                  if (!imgSrc.startsWith("/")) {
                    imgSrc = "/" + imgSrc;
                  }
                  
                  // ลองใช้ window.location.origin ก่อน (Next.js serve static files)
                  // เพราะรูปภาพอาจจะถูกเก็บไว้ใน Next.js public/uploads
                  if (typeof window !== "undefined") {
                    imgSrc = `${window.location.origin}${imgSrc}`;
                  }
                }
                
                // Debug log สำหรับ mobile (เฉพาะรูปแรก)
                if (mounted && isMobile && idx === 0 && typeof window !== "undefined") {
                  try {
                    const apiUrl = getApiUrlInstance();
                    console.log('[ConnectionList] Original URL:', img.url);
                    console.log('[ConnectionList] Using URL:', imgSrc);
                    console.log('[ConnectionList] API_URL:', apiUrl);
                    console.log('[ConnectionList] window.location.origin:', window.location.origin);
                  } catch (e) {
                    // Ignore error in debug log
                  }
                }
                
                const hasError = imageErrors.has(imgSrc) && !fallbackUrl;
                
                if (hasError) {
                  return (
                    <div
                      key={idx}
                      style={{
                        width: mounted && isMobile ? 32 : 40,
                        height: mounted && isMobile ? 32 : 40,
                        background: "#f0f0f0",
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Text type="secondary" style={{ fontSize: 10 }}>?</Text>
                    </div>
                  );
                }
                
                return (
                  <Image
                    key={idx}
                    width={mounted && isMobile ? 32 : 40}
                    height={mounted && isMobile ? 32 : 40}
                    src={imgSrc}
                    alt={`Image ${idx + 1}`}
                    style={{ 
                      objectFit: "cover", 
                      borderRadius: 4, 
                      flexShrink: 0,
                      minWidth: mounted && isMobile ? 32 : 40,
                      minHeight: mounted && isMobile ? 32 : 40,
                    }}
                    loading="lazy"
                    placeholder={
                      <div style={{ 
                        width: mounted && isMobile ? 32 : 40, 
                        height: mounted && isMobile ? 32 : 40, 
                        background: "#f0f0f0",
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        <Text type="secondary" style={{ fontSize: 10 }}>...</Text>
                      </div>
                    }
                    preview={{
                      mask: <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: mounted && isMobile ? 10 : 12 }}>ดู</div>,
                    }}
                    onError={(e) => {
                      // บันทึก error เพื่อไม่ให้ลองโหลดอีก
                      console.error('[ConnectionList] Image load error:', imgSrc, e);
                      
                      // ถ้ายังไม่มี fallback URL ให้ลองใช้ API_URL
                      if (!fallbackUrl && typeof window !== "undefined" && imgSrc.includes(window.location.origin)) {
                        try {
                          const apiUrl = getApiUrlInstance();
                          const fallbackSrc = img.url.startsWith("/") 
                            ? `${apiUrl}${img.url}`
                            : `${apiUrl}/${img.url}`;
                          console.log('[ConnectionList] Trying fallback URL (API_URL):', fallbackSrc);
                          
                          // บันทึก fallback URL เพื่อให้ component re-render
                          setImageFallbacks(prev => {
                            const newMap = new Map(prev);
                            newMap.set(img.url, fallbackSrc);
                            return newMap;
                          });
                        } catch (e) {
                          // Ignore error, จะใช้ error state แทน
                          console.error('[ConnectionList] Error getting API URL:', e);
                        }
                      } else {
                        // ถ้า fallback ก็ไม่ได้ หรือไม่มี fallback ให้แสดง error
                        setImageErrors(prev => {
                          const newSet = new Set(prev);
                          newSet.add(imgSrc);
                          return newSet;
                        });
                      }
                    }}
                  />
                );
              })}
              {remainingCount > 0 && (
                <div
                  role="button"
                  tabIndex={0}
                  style={{
                    width: mounted && isMobile ? 32 : 40,
                    height: mounted && isMobile ? 32 : 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#f0f0f0",
                    borderRadius: 4,
                    fontSize: mounted && isMobile ? 10 : 12,
                    color: "#1890ff",
                    cursor: "pointer",
                    border: "1px solid #d9d9d9",
                    userSelect: "none",
                    flexShrink: 0,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // คลิกที่รูปแรกที่แสดงเพื่อเปิด preview (PreviewGroup จะแสดงรูปทั้งหมด)
                    const firstImage = e.currentTarget.parentElement?.querySelector('.ant-image') as HTMLElement;
                    if (firstImage) {
                      const previewMask = firstImage.querySelector('.ant-image-mask') as HTMLElement;
                      if (previewMask) {
                        previewMask.click();
                      } else {
                        firstImage.click();
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      (e.currentTarget as HTMLElement).click();
                    }
                  }}
                >
                  +{remainingCount}
                </div>
              )}
            </div>
          </Image.PreviewGroup>
        );
      },
    },
    {
      title: "จัดการ",
      key: "action",
      dataIndex: "action",
      render: (_: any, record: ConnectionRow) => (
        <Link href={`/service-management/connections?hospitalId=${record.hospitalId}`}>
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
                  รายการการเชื่อมต่อ
                </Title>
                <Text type="secondary" style={{ fontSize: mounted && isMobile ? 12 : 14 }}>
                  ดูและค้นหาข้อมูลการเชื่อมต่อทั้งหมด (PACS, EMR, Server และอื่นๆ)
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
                      exportToExcel(filtered, `รายการการเชื่อมต่อ_${new Date().toISOString().split("T")[0]}`, columns as any);
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
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  size="middle"
                  onClick={() => setShowHospitalModal(true)}
                  style={{ width: mounted && isMobile ? "100%" : "auto" }}
                >
                  เพิ่มการเชื่อมต่อ
                </Button>
              </div>
            </div>

            <Card>
              <Space direction="vertical" style={{ width: "100%" }} size="middle">
                <Input
                  placeholder="ค้นหา: ชื่อโรงพยาบาล, PACS, EMR, Server..."
                  prefix={<SearchOutlined />}
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ width: "100%" }}
                  size="large"
                />
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
                  </Select>
                  <Text style={{ fontSize: mounted && isMobile ? 12 : 14 }}>
                    พบทั้งหมด <Text strong>{filtered.length}</Text> รายการ
                    {search && (
                      <span style={{ marginLeft: 8 }}>
                        (ค้นหา: <Text strong>"{search}"</Text>)
                      </span>
                    )}
                  </Text>
                </Space>
              </Space>
            </Card>

            <div 
              style={{ 
                overflowX: "auto",
                userSelect: "text",
                WebkitUserSelect: "text",
                MozUserSelect: "text",
                msUserSelect: "text",
              }}
            >
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
                  showTotal: (total: number) => `แสดง ${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(currentPage * itemsPerPage, total)} จาก ${total} รายการ`,
                  responsive: true,
                }}
                locale={{
                  emptyText: search ? "ไม่พบข้อมูลที่ค้นหา" : "ยังไม่มีข้อมูลการเชื่อมต่อ",
                }}
                style={{
                  userSelect: "text",
                  WebkitUserSelect: "text",
                  MozUserSelect: "text",
                  msUserSelect: "text",
                }}
                components={{
                  body: {
                    cell: (props: any) => (
                      <td
                        {...props}
                        style={{
                          ...props.style,
                          userSelect: "text",
                          WebkitUserSelect: "text",
                          MozUserSelect: "text",
                          msUserSelect: "text",
                        }}
                      />
                    ),
                  },
                }}
              />
            </div>
          </Space>
        </Card>
      </div>

      {/* Modal สำหรับเลือกโรงพยาบาล */}
      <Modal
        title="เลือกโรงพยาบาล"
        open={showHospitalModal}
        onOk={() => {
          if (selectedHospitalId) {
            router.push(`/service-management/connections?hospitalId=${selectedHospitalId}`);
            setShowHospitalModal(false);
            setSelectedHospitalId(null);
          } else {
            message.warning("กรุณาเลือกโรงพยาบาล");
          }
        }}
        onCancel={() => {
          setShowHospitalModal(false);
          setSelectedHospitalId(null);
        }}
        okText="ต่อไป"
        cancelText="ยกเลิก"
      >
        <Select
          placeholder="เลือกโรงพยาบาล"
          style={{ width: "100%" }}
          size="large"
          value={selectedHospitalId}
          onChange={(value) => setSelectedHospitalId(value)}
          showSearch
          filterOption={(input, option) => {
            const children = option?.children as any;
            if (typeof children === 'string') {
              return children.toLowerCase().includes(input.toLowerCase());
            }
            if (Array.isArray(children)) {
              return children.some((item: any) => String(item).toLowerCase().includes(input.toLowerCase()));
            }
            const childrenStr = String(children || '');
            return childrenStr.toLowerCase().includes(input.toLowerCase());
          }}
        >
          {hospitals.map((hospital) => (
            <Select.Option key={hospital.id} value={hospital.id}>
              {hospital.name}
            </Select.Option>
          ))}
        </Select>
      </Modal>
    </div>
  );
}
