"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiDelete } from "@/lib/service-management/api";
import { useRouter } from "next/navigation";
import { Card, Button, Space, Typography, Empty, Modal, message } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

type Hospital = {
  id: number;
  name: string | null;
};

type Installation = {
  id: number;
  hospital?: Hospital | null;
  department: string;
  room: string | null;
  floor: string | null;
};

type VpnRow = {
  id: number;
  hospital?: Hospital | null;
  steps: string | null;
  additionalInfo: string | null;
  installations: Array<{
    installation: Installation;
  }>;
};

type Props = {
  initialData: VpnRow[];
};

export default function VpnListClient({ initialData }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<number | null>(null);
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

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: "ยืนยันการลบ",
      content: "คุณต้องการลบ VPN นี้หรือไม่?",
      okText: "ลบ",
      cancelText: "ยกเลิก",
      okType: "danger",
      onOk: async () => {
        setDeletingId(id);
        try {
          await apiDelete(`/api/vpns/${id}`);
          message.success("ลบ VPN สำเร็จ");
          router.refresh();
        } catch (err: any) {
          message.error(err?.message || "ลบ VPN ไม่สำเร็จ");
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  return (
    <div style={{ padding: "12px", background: "#f0f2f5", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
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
                  จัดการ VPN
                </Title>
                <Text type="secondary" style={{ fontSize: mounted && isMobile ? 12 : 14 }}>
                  ดูและจัดการข้อมูล VPN ทั้งหมด
                </Text>
              </div>
              <div style={{ 
                display: "flex", 
                flexDirection: mounted && isMobile ? "column" : "row",
                flexWrap: mounted && isMobile ? "wrap" : "nowrap",
                gap: 8,
                alignItems: mounted && isMobile ? "stretch" : "center"
              }}>
                <Link href="/vpns/new" style={{ width: mounted && isMobile ? "100%" : "auto" }}>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    size="middle"
                    style={{ width: mounted && isMobile ? "100%" : "auto" }}
                  >
                    เพิ่ม VPN ใหม่
                  </Button>
                </Link>
              </div>
            </div>

            {initialData.length === 0 ? (
              <Empty
                description="ยังไม่มีข้อมูล VPN"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Link href="/vpns/new">
                  <Button type="primary" icon={<PlusOutlined />}>
                    เพิ่ม VPN ใหม่
                  </Button>
                </Link>
              </Empty>
            ) : (
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                {initialData.map((vpn) => (
                  <Card
                    key={vpn.id}
                    title={
                      <Space>
                        <Text strong>{vpn.hospital?.name || "ไม่ระบุโรงพยาบาล"}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          VPN ID: {vpn.id}
                        </Text>
                      </Space>
                    }
                    extra={
                      <Space direction={mounted && isMobile ? "vertical" : "horizontal"} style={{ width: mounted && isMobile ? "100%" : "auto" }}>
                        <Link href={`/vpns/${vpn.id}`} style={{ width: mounted && isMobile ? "100%" : "auto" }}>
                          <Button icon={<EditOutlined />} block={mounted && isMobile} size={mounted && isMobile ? "middle" : undefined}>
                            แก้ไข
                          </Button>
                        </Link>
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          loading={deletingId === vpn.id}
                          onClick={() => handleDelete(vpn.id)}
                          block={mounted && isMobile}
                          size={mounted && isMobile ? "middle" : undefined}
                        >
                          ลบ
                        </Button>
                      </Space>
                    }
                  >
                    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                      {vpn.steps && (
                        <div>
                          <Text strong style={{ display: "block", marginBottom: 8 }}>
                            สเต็ปการ VPN:
                          </Text>
                          <Card size="small" style={{ background: "#fafafa" }}>
                            <Text style={{ whiteSpace: "pre-wrap" }}>{vpn.steps}</Text>
                          </Card>
                        </div>
                      )}

                      {vpn.additionalInfo && (
                        <div>
                          <Text strong style={{ display: "block", marginBottom: 8 }}>
                            รายละเอียดเพิ่มเติม:
                          </Text>
                          <Card size="small" style={{ background: "#fafafa" }}>
                            <Text style={{ whiteSpace: "pre-wrap" }}>{vpn.additionalInfo}</Text>
                          </Card>
                        </div>
                      )}

                      {vpn.installations.length > 0 && (
                        <div>
                          <Text strong style={{ display: "block", marginBottom: 8 }}>
                            เครื่องที่ใช้ VPN ({vpn.installations.length} เครื่อง):
                          </Text>
                          <Card size="small" style={{ background: "#fafafa" }}>
                            <Space direction="vertical" size="small" style={{ width: "100%" }}>
                              {vpn.installations.map((item) => (
                                <Text key={item.installation.id} style={{ display: "block" }}>
                                  • {item.installation.hospital?.name || "ไม่ระบุ"} - {item.installation.department}
                                  {item.installation.room && ` (${item.installation.room})`}
                                  {item.installation.floor && ` ชั้น ${item.installation.floor}`}
                                </Text>
                              ))}
                            </Space>
                          </Card>
                        </div>
                      )}
                    </Space>
                  </Card>
                ))}
              </Space>
            )}
          </Space>
        </Card>
      </div>
    </div>
  );
}
