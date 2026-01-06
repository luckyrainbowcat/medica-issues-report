"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost, apiPut } from "@/lib/service-management/api";
import ImageUploader from "./form/ImageUploader";
import { Form, Input, Select, Button, Space, Card, Typography, Spin, Alert, message, Tag } from "antd";
import { ArrowLeftOutlined, UnorderedListOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const { TextArea } = Input;

type HospitalOption = { id: number; name: string };
type Connection = {
  id?: string; // Firestore ID เป็น string
  hospitalId: number | string | null; // รองรับทั้ง number และ string (Firestore ID)
  hospitalName?: string; // เก็บชื่อโรงพยาบาลไว้ด้วย
  pacsDetail: string;
  emrDetail: string;
  serverDetail: string;
  otherDetail: string;
  images: string[];
};

export default function ConnectionManagerClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hospitalIdParam = searchParams.get("hospitalId");
  const [form] = Form.useForm();
  
  const [hospitals, setHospitals] = useState<HospitalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isFetchingConnection, setIsFetchingConnection] = useState(false);
  const [connection, setConnection] = useState<Connection>({
    hospitalId: null,
    pacsDetail: "",
    emrDetail: "",
    serverDetail: "",
    otherDetail: "",
    images: [],
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const hospitalMap = useMemo(() => {
    // ใช้ string เป็น key เพื่อรองรับ Firestore IDs
    const map: Record<string, string> = {};
    hospitals.forEach((h) => {
      map[String(h.id)] = h.name;
    });
    return map;
  }, [hospitals]);

  const fetchConnection = async (hospitalId: number | string) => {
    setIsFetchingConnection(true);
    try {
      // แปลง hospitalId เป็น string สำหรับ query parameter
      const hospitalIdStr = String(hospitalId);
      const data = await apiGet(`/api/connections?hospitalId=${hospitalIdStr}`);
      
      // ต้องรอให้ hospitals โหลดเสร็จก่อนเพื่อให้หา hospital name ได้
      if (hospitals.length === 0) {
        // ถ้ายังไม่มี hospitals ให้รอสักครู่
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (Array.isArray(data) && data.length > 0) {
        const c = data[0];
        // เก็บ id เป็น string (Firestore ID)
        const connectionId: string | undefined = c.id ? String(c.id) : undefined;
        
        // เก็บ hospitalId เป็น string (backend ส่งมาเป็น string)
        const connectionHospitalId: string | null = c.hospitalId ? String(c.hospitalId) : null;
        
        // เก็บชื่อโรงพยาบาลจาก backend (backend populate hospital object มาแล้ว)
        // หรือหาใน hospitals array ถ้าไม่มี
        let hospitalName: string | undefined = undefined;
        if (c.hospital?.name) {
          hospitalName = c.hospital.name;
        } else if (connectionHospitalId && hospitals.length > 0) {
          // ถ้าไม่มี hospital object ให้หาใน hospitals array
          const hospital = hospitals.find(h => String(h.id) === connectionHospitalId);
          hospitalName = hospital?.name;
        }
        
        const connectionData = {
          id: connectionId,
          hospitalId: connectionHospitalId,
          hospitalName: hospitalName,
          pacsDetail: c.pacsDetail || "",
          emrDetail: c.emrDetail || "",
          serverDetail: c.serverDetail || "",
          otherDetail: c.otherDetail || "",
          images: Array.isArray(c.images) ? c.images.map((img: any) => img.url) : [],
        };
        console.log("fetchConnection - c:", c); // Debug log
        console.log("fetchConnection - hospitals:", hospitals); // Debug log
        console.log("fetchConnection - connectionData:", connectionData); // Debug log
        setConnection(connectionData);
        form.setFieldsValue(connectionData);
      } else {
        const newConnection = {
          id: undefined,
          hospitalId,
          pacsDetail: "",
          emrDetail: "",
          serverDetail: "",
          otherDetail: "",
          images: [],
        };
        setConnection(newConnection);
        form.setFieldsValue(newConnection);
      }
    } catch (err) {
      console.error("fetch connection error", err);
    } finally {
      setIsFetchingConnection(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoadError(null);
        const hospitalData = await apiGet("/api/hospitals");
        if (!cancelled) {
          const hospitalsList = Array.isArray(hospitalData) ? hospitalData : [];
          setHospitals(hospitalsList);
          
          if (hospitalIdParam) {
            // hospitalIdParam อาจจะเป็น string (Firestore ID) หรือ number
            // รอให้ hospitals โหลดเสร็จก่อนแล้วค่อยเรียก fetchConnection
            await fetchConnection(hospitalIdParam);
          }
        }
      } catch (err) {
        console.error("load hospitals error", err);
        if (!cancelled) setLoadError("โหลดข้อมูลล้มเหลว กรุณาลองใหม่");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [hospitalIdParam, form]);

  // อัปเดต form field value เมื่อ connection.hospitalName เปลี่ยน
  useEffect(() => {
    if (connection.hospitalName && hospitalIdParam) {
      // Force update form field value เพื่อให้ Input แสดงชื่อโรงพยาบาล
      form.setFieldValue('hospitalId', connection.hospitalId);
    }
  }, [connection.hospitalName, connection.hospitalId, hospitalIdParam, form]);

  const onFinish = async (values: Connection) => {
    setSubmitting(true);
    try {
      const payload = {
        hospitalId: values.hospitalId,
        pacsDetail: values.pacsDetail,
        emrDetail: values.emrDetail,
        serverDetail: values.serverDetail,
        otherDetail: values.otherDetail,
        images: connection.images,
      };

      if (connection.id) {
        await apiPut(`/api/connections/${connection.id}`, payload);
        message.success("อัปเดตข้อมูลสำเร็จ");
      } else {
        await apiPost("/api/connections", payload);
        message.success("บันทึกข้อมูลสำเร็จ");
      }

      if (values.hospitalId) {
        await fetchConnection(values.hospitalId);
      }
      // ใช้ router.push และ refresh เพื่อให้ข้อมูลถูก refresh
      router.push("/service-management/connections/list");
      router.refresh();
    } catch (err: any) {
      message.error(err?.message || "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "48px", textAlign: "center" }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: "#8c8c8c" }}>กำลังโหลดข้อมูลโรงพยาบาล...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "12px", background: "#f0f2f5", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Card>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div style={{ 
              display: "flex", 
              flexDirection: isMobile ? "column" : "row",
              justifyContent: "space-between", 
              alignItems: isMobile ? "flex-start" : "center",
              gap: 16,
            }}>
              <div style={{ flex: 1 }}>
                <Title level={2} style={{ margin: 0, fontSize: isMobile ? 20 : 24 }}>
                  การจัดการการเชื่อมต่อ
                </Title>
                {connection.id && (
                  <Tag color="blue" style={{ marginTop: 8, fontSize: isMobile ? 12 : 14 }}>
                    แก้ไข: {connection.hospitalId ? hospitalMap[String(connection.hospitalId)] || "" : (hospitalIdParam ? hospitalMap[String(hospitalIdParam)] || "" : "")}
                  </Tag>
                )}
              </div>
              <Space direction={isMobile ? "vertical" : "horizontal"} style={{ width: isMobile ? "100%" : "auto" }}>
                <Link href="/service-management/connections/list" style={{ width: isMobile ? "100%" : "auto" }}>
                  <Button icon={<UnorderedListOutlined />} block={isMobile} size={isMobile ? "middle" : undefined}>
                    ดูรายการทั้งหมด
                  </Button>
                </Link>
                <Link href="/service-management/connections/list" style={{ width: isMobile ? "100%" : "auto" }}>
                  <Button icon={<ArrowLeftOutlined />} block={isMobile} size={isMobile ? "middle" : undefined}>
                    กลับ
                  </Button>
                </Link>
              </Space>
            </div>

            {loadError && (
              <Alert message={loadError} type="error" showIcon />
            )}

            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
            >
              {(() => {
                // ถ้ามี hospitalIdParam แสดงว่าเป็นโหมดแก้ไข (ไม่ว่าจะมี connection.id หรือไม่)
                const isEditMode = !!hospitalIdParam || !!connection.id;
                console.log("Form render - connection.id:", connection.id, "hospitalIdParam:", hospitalIdParam, "isFetchingConnection:", isFetchingConnection, "isEditMode:", isEditMode); // Debug log
                
                if (isEditMode) {
                  // โหมดแก้ไข: แสดงชื่อโรงพยาบาลแบบ read-only เท่านั้น (ไม่มี dropdown)
                  // ใช้ชื่อโรงพยาบาลจาก connection.hospitalName (ที่ได้จาก backend) หรือหาจาก hospitalMap
                  let hospitalName = "ไม่ระบุ";
                  
                  if (connection.hospitalName) {
                    // ใช้ชื่อจาก backend โดยตรง
                    hospitalName = connection.hospitalName;
                  } else {
                    // หาจาก hospitalMap
                    const hospitalIdStr = connection.hospitalId 
                      ? String(connection.hospitalId) 
                      : (hospitalIdParam ? String(hospitalIdParam) : null);
                    
                    if (hospitalIdStr) {
                      // ลองหาใน hospitalMap ก่อน
                      if (hospitalMap[hospitalIdStr]) {
                        hospitalName = hospitalMap[hospitalIdStr];
                      } else {
                        // ถ้าไม่เจอใน hospitalMap ให้หาใน hospitals array
                        const hospital = hospitals.find(h => String(h.id) === hospitalIdStr);
                        if (hospital) {
                          hospitalName = hospital.name;
                        }
                      }
                    }
                  }
                  
                  console.log("Display hospital - connection.hospitalName:", connection.hospitalName, "hospitalName:", hospitalName, "connection:", connection); // Debug log
                  
                  // Hidden field เพื่อเก็บ hospitalId สำหรับ form submission
                  return (
                    <>
                      <Form.Item
                        name="hospitalId"
                        style={{ marginBottom: 0, display: "none" }}
                      >
                        <Input
                          type="hidden"
                          value={connection.hospitalId || hospitalIdParam || ""}
                        />
                      </Form.Item>
                      <Form.Item
                        label={
                          <span>
                            โรงพยาบาล <span style={{ color: "#ff4d4f" }}>*</span>
                          </span>
                        }
                        style={{ marginBottom: 0 }}
                      >
                        {isFetchingConnection ? (
                          <Input
                            value="กำลังโหลด..."
                            disabled
                            style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed", color: "#000" }}
                          />
                        ) : (
                          <Input
                            key={`hospital-input-${connection.hospitalName || connection.hospitalId || hospitalIdParam || 'default'}`} // Force re-render when hospitalName changes
                            value={hospitalName}
                            disabled
                            readOnly
                            style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed", color: "#000" }}
                          />
                        )}
                      </Form.Item>
                    </>
                  );
                } else {
                  // โหมดสร้างใหม่: ให้เลือกโรงพยาบาลได้
                  return (
                    <Form.Item
                      name="hospitalId"
                      label={
                        <span>
                          โรงพยาบาล <span style={{ color: "#ff4d4f" }}>*</span>
                        </span>
                      }
                      rules={[{ required: true, message: "กรุณาเลือกโรงพยาบาล" }]}
                    >
                      <Select
                        placeholder="-- เลือกโรงพยาบาล --"
                        onChange={(value) => {
                          if (value) {
                            fetchConnection(value);
                          }
                        }}
                      >
                        {hospitals.map((h) => (
                          <Select.Option key={h.id} value={h.id}>
                            {h.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  );
                }
              })()}

              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                <Form.Item name="pacsDetail" label="รายละเอียด PACS">
                  <TextArea
                    rows={4}
                    placeholder="เช่น IP/Port PACS, วิธีเชื่อมต่อ, Credential"
                  />
                </Form.Item>

                <Form.Item name="emrDetail" label="รายละเอียด EMR">
                  <TextArea
                    rows={4}
                    placeholder="เช่น วิธีเชื่อมต่อ EMR, HL7/REST, Credential"
                  />
                </Form.Item>

                <Form.Item name="serverDetail" label="รายละเอียด Server">
                  <TextArea
                    rows={4}
                    placeholder="เช่น IP/Port Server, OS, Credential"
                  />
                </Form.Item>

                <Form.Item name="otherDetail" label="รายละเอียดอื่น ๆ">
                  <TextArea
                    rows={4}
                    placeholder="อื่น ๆ ที่เกี่ยวข้องกับการเชื่อมต่อ"
                  />
                </Form.Item>
              </Space>

              <Form.Item label="รูปภาพ">
                <ImageUploader
                  images={connection.images}
                  onImagesChange={(imgs) => setConnection((prev) => ({ ...prev, images: imgs }))}
                  sectionName="การเชื่อมต่อ"
                />
              </Form.Item>

              <Form.Item>
                <div style={{ display: "flex", justifyContent: isMobile ? "stretch" : "flex-end" }}>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={submitting} 
                    size={isMobile ? "large" : "large"} 
                    style={{ minWidth: isMobile ? "100%" : 150 }}
                    block={isMobile}
                  >
                    {submitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </Space>
        </Card>
      </div>
    </div>
  );
}
