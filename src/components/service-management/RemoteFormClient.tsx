"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPut, apiPost, apiDelete } from "@/lib/service-management/api";
import ImageUploader from "./form/ImageUploader";
import VpnFormClient from "./VpnFormClient";
import {
  Form,
  Input,
  Button,
  Space,
  Typography,
  Checkbox,
  Radio,
  message,
  Tag,
  Popconfirm,
  Modal,
  Divider,
  Select,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";

const { TextArea } = Input;

const CONNECTION_OPTIONS = [
  { value: "LAN", label: "LAN" },
  { value: "HOSPITAL_WIFI", label: "WiFi โรงพยาบาล" },
  { value: "WIFI_USER", label: "WiFi User" },
  { value: "VPN", label: "VPN" },
];

type VpnInfo = {
  id: string | number;
  steps: string | null;
  additionalInfo: string | null;
  hospitalId: number;
  hospital?: { id: number; name: string | null } | null;
};

type HospitalOption = {
  id: number;
  name: string;
};

type InstallationOption = {
  id: number;
  hospitalId: number;
  hospital?: { id: number; name: string | null } | null;
  department: string;
  room: string | null;
  floor: string | null;
};

type Props = {
  installationId: string | number;
  existing?: {
    anydeskId?: string | null;
    anydeskPassword?: string | null;
    hospitalWifiSsid?: string | null;
    hospitalLanInfo?: string | null;
    wifiUser?: string | null;
    vpnDetail?: string | null;
    connectionFlags?: string | null;
    images?: string[];
  };
  vpns?: VpnInfo[];
  currentHospitalId?: number;
  hospitalOptions?: HospitalOption[];
  installationOptions?: InstallationOption[];
};

export default function RemoteFormClient({
  installationId,
  existing,
  vpns = [],
  currentHospitalId,
  hospitalOptions = [],
  installationOptions = [],
}: Props) {
  const router = useRouter();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [connectionFlag, setConnectionFlag] = useState<string>("");
  const [images, setImages] = useState<string[]>(existing?.images || []);
  const [showVpnForm, setShowVpnForm] = useState(false);
  const [editingVpn, setEditingVpn] = useState<VpnInfo | null>(null);
  const [submittingVpn, setSubmittingVpn] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState<number>(0);
  const [vpnsList, setVpnsList] = useState<VpnInfo[]>(vpns);
  const [allVpns, setAllVpns] = useState<VpnInfo[]>([]);
  const [selectedVpnId, setSelectedVpnId] = useState<string | number | null>(null);
  const [vpnFormRef, setVpnFormRef] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (existing) {
      // รับค่าแรกจาก CSV หรือใช้ค่า string โดยตรง
      const flags = existing.connectionFlags
        ? existing.connectionFlags.split(",").map((f) => f.trim()).filter(Boolean)
        : [];
      setConnectionFlag(flags[0] || "");
      form.setFieldsValue({
        anydeskId: existing.anydeskId || "",
        anydeskPassword: existing.anydeskPassword || "",
        hospitalWifiSsid: existing.hospitalWifiSsid || "",
        hospitalLanInfo: existing.hospitalLanInfo || "",
        wifiUser: existing.wifiUser || "",
        vpnDetail: existing.vpnDetail || "",
      });
      setImages(existing.images || []);
    }
  }, [existing, form]);

  useEffect(() => {
    setVpnsList(vpns);
  }, [vpns]);

  // ดึง VPN ทั้งหมดเมื่อ component mount
  useEffect(() => {
    const fetchAllVpns = async () => {
      try {
        const data = await apiGet("/api/vpns");
        const vpns = Array.isArray(data) ? data : [];
        setAllVpns(vpns);
      } catch (err) {
        console.error("Error fetching VPNs:", err);
        setAllVpns([]);
      }
    };
    fetchAllVpns();
  }, []);

  // เมื่อเลือก VPN จาก dropdown ให้แสดงรายละเอียดใน TextArea และ sync กับ vpnsList
  const handleVpnSelect = async (value: number | string | undefined) => {
    if (value === "" || value === undefined || value === null) {
      // เมื่อเลือก "-- พิมพ์เอง --" หรือ clear
      setSelectedVpnId(null);
      form.setFieldsValue({ vpnDetail: "" });
      return;
    }
    
    // รองรับทั้ง string และ number ID
    const vpnId = value;
    setSelectedVpnId(vpnId);
    const selectedVpn = allVpns.find(v => String(v.id) === String(vpnId));
    
    if (selectedVpn) {
      let detail = "";
      if (selectedVpn.steps) {
        detail += `สเต็ปการ VPN:\n${selectedVpn.steps}`;
      }
      if (selectedVpn.additionalInfo) {
        if (detail) detail += `\n\n`;
        detail += `รายละเอียดเพิ่มเติม:\n${selectedVpn.additionalInfo}`;
      }
      form.setFieldsValue({ vpnDetail: detail.trim() || "" });

      // ตรวจสอบว่า VPN นี้อยู่ใน vpnsList หรือยัง (ไม่ต้องเชื่อมซ้ำ)
      const isVpnInList = vpnsList.some(v => String(v.id) === String(vpnId));
      
      if (!isVpnInList) {
        // ถ้ายังไม่มี ให้เชื่อม VPN กับ installation นี้
        try {
          // ดึงข้อมูล VPN ปัจจุบันเพื่อดู installationIds
          const vpnData = await apiGet(`/api/vpns/${vpnId}`);
          const currentInstallationIds = vpnData.installations?.map((item: any) => 
            typeof item.installation?.id !== 'undefined' ? item.installation.id : item.installationId
          ) || [];
          
          // ตรวจสอบว่า installation ปัจจุบันอยู่ในรายการหรือไม่
          const installationIdStr = String(installationId);
          const isAlreadyLinked = currentInstallationIds.some((id: any) => String(id) === installationIdStr);
          
          if (!isAlreadyLinked) {
            // เพิ่ม installation ปัจจุบันเข้าไป
            const updatedInstallationIds = [...currentInstallationIds, installationId];
            
            // อัปเดต VPN โดยเพิ่ม installation นี้เข้าไป
            await apiPut(`/api/vpns/${vpnId}`, {
              hospitalId: vpnData.hospitalId,
              steps: vpnData.steps,
              additionalInfo: vpnData.additionalInfo,
              installationIds: updatedInstallationIds,
            });

            // รีเฟรช vpnsList
            const remoteData = await apiGet("/api/remote");
            const currentRemote = Array.isArray(remoteData)
              ? remoteData.find((r: any) => String(r.id) === String(installationId))
              : null;
            const updatedVpns = currentRemote?.vpnInstallations?.map((vi: any) => vi.vpn) || [];
            setVpnsList(updatedVpns);
          }
        } catch (err: any) {
          console.error("Error linking VPN:", err);
          // ไม่แสดง error message เพื่อไม่รบกวนผู้ใช้ (เพราะอาจจะเชื่อมแล้ว)
        }
      }
    }
  };

  const handleConnectionFlagChange = (value: string) => {
    // ถ้าเลือกอันเดิมอีกครั้ง ให้ยกเลิกการเลือก
    if (connectionFlag === value) {
      setConnectionFlag("");
    } else {
      // เลือกอันใหม่ (จะยกเลิกอันเก่าอัตโนมัติ)
      setConnectionFlag(value);
    }
  };

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      const payload = {
        anydeskId: values.anydeskId || null,
        anydeskPassword: values.anydeskPassword || null,
        hospitalWifiSsid: values.hospitalWifiSsid || null,
        hospitalLanInfo: values.hospitalLanInfo || null,
        wifiUser: values.wifiUser || null,
        vpnDetail: values.vpnDetail || null,
        connectionFlags: connectionFlag || null,
        images: images,
      };

      await apiPut(`/api/installations/${installationId}/network`, payload);
      message.success("อัปเดตข้อมูลการรีโมตสำเร็จ");
      router.push("/service-management/remote");
      router.refresh();
    } catch (err: any) {
      message.error(err?.message || "อัปเดตข้อมูลไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenVpnForm = (vpn?: VpnInfo) => {
    if (vpn) {
      apiGet(`/api/vpns/${vpn.id}`).then((data: any) => {
        if (vpnFormRef) {
          vpnFormRef.setFieldsValue({
            hospitalId: data.hospitalId || undefined,
            steps: data.steps || "",
            additionalInfo: data.additionalInfo || "",
            installationIds: data.installations?.map((item: any) => item.installation.id) || [],
          });
        }
        setSelectedHospitalId(data.hospitalId || 0);
        setEditingVpn(vpn);
        setShowVpnForm(true);
      });
    } else {
      // เมื่อเพิ่ม VPN ใหม่ ให้ตั้งค่า hospitalId และเลือก installationId ปัจจุบันให้อัตโนมัติ
      if (vpnFormRef && currentHospitalId) {
        vpnFormRef.setFieldsValue({
          hospitalId: currentHospitalId,
          steps: "",
          additionalInfo: "",
          installationIds: [installationId], // เลือก installation ปัจจุบันให้อัตโนมัติ
        });
        setSelectedHospitalId(currentHospitalId);
      } else if (vpnFormRef) {
        vpnFormRef.resetFields();
        setSelectedHospitalId(0);
      }
      setEditingVpn(null);
      setShowVpnForm(true);
    }
  };

  const handleCloseVpnForm = () => {
    setShowVpnForm(false);
    setEditingVpn(null);
    if (vpnFormRef) {
      vpnFormRef.resetFields();
    }
    setSelectedHospitalId(0);
  };

  const handleSubmitVpn = async (values: any) => {
    if (!values.hospitalId) {
      message.error("กรุณาเลือกโรงพยาบาล");
      return;
    }

    setSubmittingVpn(true);
    try {
      const payload = {
        hospitalId: values.hospitalId,
        steps: values.steps || null,
        additionalInfo: values.additionalInfo || null,
        installationIds: values.installationIds || [],
      };

      if (editingVpn?.id) {
        await apiPut(`/api/vpns/${editingVpn.id}`, payload);
        message.success("อัปเดตข้อมูลสำเร็จ");
      } else {
        await apiPost("/api/vpns", payload);
        message.success("บันทึกข้อมูลสำเร็จ");
      }

      handleCloseVpnForm();
      // รีเฟรชข้อมูล VPN ทั้งหมด
      const allVpnData = await apiGet("/api/vpns");
      setAllVpns(Array.isArray(allVpnData) ? allVpnData : []);
      // รีเฟรชข้อมูล VPN ที่เชื่อมกับ installation นี้
      const remoteData = await apiGet("/api/remote");
      const currentRemote = Array.isArray(remoteData)
        ? remoteData.find((r: any) => String(r.id) === String(installationId))
        : null;
      const updatedVpns = currentRemote?.vpnInstallations?.map((vi: any) => vi.vpn) || [];
      setVpnsList(updatedVpns);
      router.refresh();
    } catch (err: any) {
      message.error(err?.message || "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSubmittingVpn(false);
    }
  };

  const handleDeleteVpn = async (vpnId: string | number) => {
    try {
      await apiDelete(`/api/vpns/${vpnId}`);
      message.success("ลบ VPN สำเร็จ");
      // รีเฟรชข้อมูล VPN ทั้งหมด
      const allVpnData = await apiGet("/api/vpns");
      setAllVpns(Array.isArray(allVpnData) ? allVpnData : []);
      // รีเฟรชข้อมูล VPN ที่เชื่อมกับ installation นี้
      const remoteData = await apiGet("/api/remote");
      const currentRemote = Array.isArray(remoteData)
        ? remoteData.find((r: any) => String(r.id) === String(installationId))
        : null;
      const updatedVpns = currentRemote?.vpnInstallations?.map((vi: any) => vi.vpn) || [];
      setVpnsList(updatedVpns);
      router.refresh();
    } catch (err: any) {
      message.error(err?.message || "ลบ VPN ไม่สำเร็จ");
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      style={{ maxWidth: "100%" }}
    >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* AnyDesk */}
          <div>
            <Typography.Title level={5}>AnyDesk</Typography.Title>
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Form.Item label="AnyDesk ID" name="anydeskId">
                <Input placeholder="AnyDesk ID" />
              </Form.Item>
              <Form.Item label="AnyDesk Password" name="anydeskPassword">
                <Input.Password placeholder="AnyDesk Password" />
              </Form.Item>
            </Space>
          </div>

          {/* การเชื่อมต่อเครือข่าย */}
          <div>
            <Typography.Title level={5}>การเชื่อมต่อเครือข่าย</Typography.Title>
            <Radio.Group
              value={connectionFlag}
              onChange={(e) => handleConnectionFlagChange(e.target.value)}
            >
              <Space direction="vertical" size="small">
                {CONNECTION_OPTIONS.map((opt) => (
                  <Radio key={opt.value} value={opt.value}>
                    {opt.label}
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          </div>

          {/* WiFi SSID */}
          <Form.Item label="WiFi SSID" name="hospitalWifiSsid">
            <Input placeholder="WiFi SSID" />
          </Form.Item>

          {/* LAN Info */}
          <Form.Item label="ข้อมูล LAN" name="hospitalLanInfo">
            <TextArea
              rows={3}
              placeholder="ข้อมูล LAN (เช่น Switch 3 / Port 10 / VLAN 20)"
            />
          </Form.Item>

          {/* WiFi User */}
          <Form.Item label="WiFi User" name="wifiUser">
            <Input placeholder="WiFi User" />
          </Form.Item>

          {/* VPN Detail */}
          {connectionFlag === "VPN" && (
            <>
              <Form.Item label="เลือก VPN ที่สร้างไว้แล้ว" name="selectedVpnId">
                <Select
                  placeholder="-- เลือก VPN หรือพิมพ์เอง --"
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                  onChange={(value) => handleVpnSelect(value)}
                >
                  <Select.Option value="">-- พิมพ์เอง --</Select.Option>
                  {allVpns.map((vpn) => {
                    const displayText = `${vpn.hospital?.name || "ไม่ระบุโรงพยาบาล"}${vpn.steps ? " - มีสเต็ป" : ""}`;
                    return (
                      <Select.Option key={String(vpn.id)} value={String(vpn.id)}>
                        {displayText}
                      </Select.Option>
                    );
                  })}
                </Select>
              </Form.Item>
              <Form.Item label="รายละเอียด VPN" name="vpnDetail">
                <TextArea
                  rows={6}
                  placeholder="รายละเอียด VPN (เช่น L2TP vpn.example.com user:endo_support) หรือจะเลือก VPN จาก dropdown ด้านบนก็ได้"
                  onChange={(e) => {
                    // ถ้าผู้ใช้แก้ไขเอง ให้ล้าง selection
                    const currentDetail = form.getFieldValue("vpnDetail");
                    if (selectedVpnId && e.target.value !== currentDetail) {
                      setSelectedVpnId(null);
                      form.setFieldsValue({ selectedVpnId: undefined });
                    }
                  }}
                />
              </Form.Item>
            </>
          )}

          {/* รูปภาพการเชื่อมต่อ */}
          <div>
            <Typography.Title level={5}>รูปภาพการเชื่อมต่อ</Typography.Title>
            <ImageUploader
              images={images}
              onImagesChange={setImages}
              sectionName="การเชื่อมต่อ"
            />
          </div>

          {/* VPN Management */}
          <Divider />
          <div>
            <div style={{ 
              display: "flex", 
              flexDirection: isMobile ? "column" : "row",
              justifyContent: "space-between", 
              alignItems: isMobile ? "flex-start" : "center", 
              marginBottom: 16,
              gap: 16,
            }}>
              <Typography.Title level={5} style={{ margin: 0, fontSize: isMobile ? 16 : undefined }}>VPN</Typography.Title>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleOpenVpnForm()}
                block={isMobile}
                size={isMobile ? "middle" : undefined}
              >
                เพิ่ม VPN ใหม่
              </Button>
            </div>
            {vpnsList.length === 0 ? (
              <Typography.Text type="secondary">ยังไม่มี VPN</Typography.Text>
            ) : (
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                {vpnsList.map((vpn) => (
                  <Card key={vpn.id} size="small">
                    <Space direction="vertical" size="small" style={{ width: "100%" }}>
                      <div style={{ 
                        display: "flex", 
                        flexDirection: isMobile ? "column" : "row",
                        justifyContent: "space-between", 
                        alignItems: isMobile ? "flex-start" : "center",
                        gap: 8,
                      }}>
                        <Space>
                          <Typography.Text strong style={{ fontSize: isMobile ? 14 : undefined }}>VPN</Typography.Text>
                          {vpn.steps && (
                            <Tag color="blue" style={{ fontSize: isMobile ? 10 : 10 }}>มีสเต็ป</Tag>
                          )}
                        </Space>
                        <Space direction={isMobile ? "vertical" : "horizontal"} style={{ width: isMobile ? "100%" : "auto" }}>
                          <Button
                            type="link"
                            size={isMobile ? "middle" : "small"}
                            icon={<EditOutlined />}
                            onClick={() => handleOpenVpnForm(vpn)}
                            block={isMobile}
                          >
                            แก้ไข
                          </Button>
                          <Popconfirm
                            title="ยืนยันการลบ"
                            description="คุณต้องการลบ VPN นี้หรือไม่?"
                            onConfirm={() => handleDeleteVpn(vpn.id)}
                            okText="ลบ"
                            cancelText="ยกเลิก"
                            okType="danger"
                          >
                            <Button
                              type="link"
                              danger
                              size={isMobile ? "middle" : "small"}
                              icon={<DeleteOutlined />}
                              block={isMobile}
                            >
                              ลบ
                            </Button>
                          </Popconfirm>
                        </Space>
                      </div>
                      {vpn.steps && (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {vpn.steps.substring(0, 100)}
                          {vpn.steps.length > 100 ? "..." : ""}
                        </Typography.Text>
                      )}
                    </Space>
                  </Card>
                ))}
              </Space>
            )}
          </div>

          {/* ปุ่ม */}
          <Form.Item>
            <Space direction={isMobile ? "vertical" : "horizontal"} style={{ width: isMobile ? "100%" : "auto" }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                size={isMobile ? "large" : "large"}
                style={{ minWidth: isMobile ? "100%" : 150 }}
                block={isMobile}
              >
                บันทึก
              </Button>
              <Button 
                onClick={() => router.push("/service-management/remote")} 
                size={isMobile ? "large" : "large"}
                block={isMobile}
              >
                ยกเลิก
              </Button>
            </Space>
          </Form.Item>
        </Space>
      </Form>

      {/* VPN Form Modal */}
      <Modal
        title={editingVpn ? "แก้ไข VPN" : "เพิ่ม VPN ใหม่"}
        open={showVpnForm}
        onCancel={handleCloseVpnForm}
        footer={null}
        width={isMobile ? "90%" : 800}
      >
        <VpnFormClient
          existing={editingVpn ? {
            id: editingVpn.id,
            hospitalId: editingVpn.hospitalId,
            steps: editingVpn.steps,
            additionalInfo: editingVpn.additionalInfo || null,
            installations: [],
          } : undefined}
          hospitalOptions={hospitalOptions}
          installationOptions={installationOptions}
          onFinish={handleSubmitVpn}
          hideButtons={true}
          formRef={setVpnFormRef}
          initialHospitalId={!editingVpn && currentHospitalId ? currentHospitalId : undefined}
          initialInstallationIds={!editingVpn ? [installationId] : undefined}
        />
        <div style={{ marginTop: 16, textAlign: isMobile ? "left" : "right" }}>
          <Space direction={isMobile ? "vertical" : "horizontal"} style={{ width: isMobile ? "100%" : "auto" }}>
            <Button 
              onClick={handleCloseVpnForm} 
              size="large"
              block={isMobile}
            >
              ยกเลิก
            </Button>
            <Button
              type="primary"
              loading={submittingVpn}
              size="large"
              style={{ minWidth: isMobile ? "100%" : 150 }}
              block={isMobile}
              onClick={() => {
                if (vpnFormRef) {
                  vpnFormRef.submit();
                }
              }}
            >
              {editingVpn ? "อัปเดต" : "บันทึก"}
            </Button>
          </Space>
        </div>
      </Modal>
  );
}

