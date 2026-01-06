"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost, apiPut } from "@/lib/service-management/api";
import {
  Table,
  Input,
  Select,
  Button,
  Space,
  Card,
  Typography,
  Empty,
  Modal,
  message,
  Tag,
  Form,
  Checkbox,
  Alert,
  Spin,
} from "antd";
import { SearchOutlined, PlusOutlined, EditOutlined, ArrowLeftOutlined, DownloadOutlined, CloseOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { exportToExcel } from "@/lib/service-management/excelExport";

const { Title, Text } = Typography;
const { TextArea } = Input;

type Hospital = {
  id: number;
  name: string | null;
};

type NetworkConfig = {
  id: number;
  anydeskId: string | null;
  anydeskPassword: string | null;
};

type VpnInfo = {
  id: number;
  steps: string | null;
  additionalInfo: string | null;
  hospital?: Hospital | null;
};

type RemoteRow = {
  id: string | number;
  hospital?: Hospital | null;
  department: string;
  room: string | null;
  floor: string | null;
  networkConfig?: NetworkConfig | null;
  vpnInstallations?: Array<{
    vpn: VpnInfo;
  }>;
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
  initialData: RemoteRow[];
  hospitalOptions: HospitalOption[];
  installationOptions: InstallationOption[];
};

export default function RemoteListClient({
  initialData,
  hospitalOptions,
  installationOptions,
}: Props) {
  const router = useRouter();
  const [vpnForm] = Form.useForm();

  const [search, setSearch] = useState("");
  const [hospitalFilter, setHospitalFilter] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [showVpnForm, setShowVpnForm] = useState(false);
  const [editingVpn, setEditingVpn] = useState<VpnInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState<number>(0);
  const [showInstallationModal, setShowInstallationModal] = useState(false);
  const [selectedInstallationId, setSelectedInstallationId] = useState<number | null>(null);
  const [showVpnSelectModal, setShowVpnSelectModal] = useState(false);
  const [allVpns, setAllVpns] = useState<VpnInfo[]>([]);
  const [loadingVpns, setLoadingVpns] = useState(false);
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

  // ดึง VPN ทั้งหมดเมื่อเปิด modal เลือก VPN
  useEffect(() => {
    if (showVpnSelectModal) {
      const fetchVpns = async () => {
        setLoadingVpns(true);
        try {
          const data = await apiGet("/api/vpns");
          setAllVpns(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error("Error fetching VPNs:", err);
          message.error("ไม่สามารถโหลดรายการ VPN ได้");
          setAllVpns([]);
        } finally {
          setLoadingVpns(false);
        }
      };
      fetchVpns();
    }
  }, [showVpnSelectModal]);

  const hospitalFilterOptions = useMemo(() => {
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
        const department = (item.department ?? "").toLowerCase();
        const room = (item.room ?? "").toLowerCase();
        const floor = (item.floor ?? "").toLowerCase();
        const anydeskId = (item.networkConfig?.anydeskId ?? "").toLowerCase();
        const vpnSteps = (item.vpnInstallations?.map((vi) => vi.vpn.steps).join(" ") ?? "").toLowerCase();
        const vpnInfo = (item.vpnInstallations?.map((vi) => vi.vpn.additionalInfo).join(" ") ?? "").toLowerCase();
        return (
          hospitalName.includes(q) ||
          department.includes(q) ||
          room.includes(q) ||
          floor.includes(q) ||
          anydeskId.includes(q) ||
          vpnSteps.includes(q) ||
          vpnInfo.includes(q)
        );
      });
    }

    return list;
  }, [initialData, search, hospitalFilter]);

  const paginatedData = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, hospitalFilter, itemsPerPage]);

  const filteredInstallations = useMemo(() => {
    if (!selectedHospitalId) return [];
    return installationOptions.filter((inst) => inst.hospitalId === selectedHospitalId);
  }, [selectedHospitalId, installationOptions]);

  const handleOpenVpnForm = (vpn?: VpnInfo) => {
    if (vpn) {
      apiGet(`/api/vpns/${vpn.id}`).then((data: any) => {
        vpnForm.setFieldsValue({
          hospitalId: data.hospitalId || undefined,
          steps: data.steps || "",
          additionalInfo: data.additionalInfo || "",
          installationIds: data.installations?.map((item: any) => item.installation.id) || [],
        });
        setSelectedHospitalId(data.hospitalId || 0);
        setEditingVpn(vpn);
        setShowVpnForm(true);
      });
    } else {
      vpnForm.resetFields();
      setSelectedHospitalId(0);
      setEditingVpn(null);
      setShowVpnForm(true);
    }
  };

  const handleCloseVpnForm = () => {
    setShowVpnForm(false);
    setEditingVpn(null);
    vpnForm.resetFields();
    setSelectedHospitalId(0);
  };

  const handleSelectVpn = (vpn: VpnInfo) => {
    handleOpenVpnForm(vpn);
    setShowVpnSelectModal(false);
  };

  const handleSubmitVpn = async (values: any) => {
    if (!values.hospitalId) {
      message.error("กรุณาเลือกโรงพยาบาล");
      return;
    }

    setSubmitting(true);
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

      router.refresh();
      handleCloseVpnForm();
    } catch (err: any) {
      message.error(err?.message || "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: "โรงพยาบาล",
      key: "hospital",
      render: (_: any, record: RemoteRow) => {
        const hospitalName = record.hospital?.name;
        return <Text strong={!!hospitalName}>{hospitalName || "ไม่ระบุ"}</Text>;
      },
    },
    {
      title: "แผนก",
      dataIndex: "department",
      key: "department",
      render: (text: string) => <Text>{text || "-"}</Text>,
    },
    {
      title: "ห้อง",
      dataIndex: "room",
      key: "room",
      render: (text: string | null) => <Text>{text || "-"}</Text>,
    },
    {
      title: "ชั้น",
      dataIndex: "floor",
      key: "floor",
      render: (text: string | null) => <Text>{text || "-"}</Text>,
    },
    {
      title: "AnyDesk ID",
      key: "anydeskId",
      render: (_: any, record: RemoteRow) => {
        const anydeskId = record.networkConfig?.anydeskId || null;
        return <Text code>{anydeskId || "-"}</Text>;
      },
    },
    {
      title: "AnyDesk Password",
      key: "anydeskPassword",
      render: (_: any, record: RemoteRow) => {
        const anydeskPassword = record.networkConfig?.anydeskPassword || null;
        return <Text code>{anydeskPassword || "-"}</Text>;
      },
    },
    {
      title: "VPN",
      key: "vpn",
      render: (_: any, record: RemoteRow) => {
        const vpns = record.vpnInstallations?.map((vi) => vi.vpn) || [];
        if (vpns.length === 0) return <Text type="secondary">-</Text>;
        return (
          <Space direction="vertical" size="small">
            {vpns.map((vpn) => (
              <Space key={vpn.id} size="small">
                <Text>VPN</Text>
                {vpn.steps && (
                  <Tag color="blue" style={{ fontSize: 10 }}>มีสเต็ป</Tag>
                )}
              </Space>
            ))}
          </Space>
        );
      },
    },
    {
      title: "จัดการ",
      key: "action",
      align: "center" as const,
      render: (_: any, record: RemoteRow) => (
        <Link href={`/service-management/remote/${record.id}`}>
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
                  การรีโมต
                </Title>
                <Text type="secondary" style={{ fontSize: mounted && isMobile ? 12 : 14 }}>
                  ข้อมูลการเชื่อมต่อ AnyDesk และ VPN สำหรับรีโมต
                </Text>
              </div>
              <div style={{ 
                display: "flex", 
                flexDirection: mounted && isMobile ? "column" : "row",
                flexWrap: mounted && isMobile ? "wrap" : "nowrap",
                gap: 8,
                alignItems: mounted && isMobile ? "stretch" : "center"
              }}>
                {showVpnForm ? (
                  <Button 
                    onClick={handleCloseVpnForm}
                    size="middle"
                    style={{ width: mounted && isMobile ? "100%" : "auto" }}
                  >
                    ยกเลิก
                  </Button>
                ) : (
                  <>
                    <Button
                      type="default"
                      icon={<DownloadOutlined />}
                      size="middle"
                      onClick={() => {
                        try {
                          exportToExcel(filtered, `รายการการรีโมต_${new Date().toISOString().split("T")[0]}`, columns);
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
                      type="default"
                      icon={<CheckCircleOutlined />}
                      size="middle"
                      onClick={() => setShowVpnSelectModal(true)}
                      style={{ width: mounted && isMobile ? "100%" : "auto" }}
                    >
                      เลือก VPN
                    </Button>
                    <Button
                      type="default"
                      icon={<PlusOutlined />}
                      size="middle"
                      onClick={() => handleOpenVpnForm()}
                      style={{ width: mounted && isMobile ? "100%" : "auto" }}
                    >
                      เพิ่ม VPN ใหม่
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      size="middle"
                      onClick={() => setShowInstallationModal(true)}
                      style={{ width: mounted && isMobile ? "100%" : "auto" }}
                    >
                      เพิ่มข้อมูลการรีโมตใหม่
                    </Button>
                  </>
                )}
                <Link href="/service-management" style={{ width: mounted && isMobile ? "100%" : "auto" }}>
                  <Button icon={<ArrowLeftOutlined />} size="middle" style={{ width: mounted && isMobile ? "100%" : "auto" }}>
                    กลับ
                  </Button>
                </Link>
              </div>
            </div>

            {showVpnForm && (
              <Card
                title={editingVpn ? "แก้ไข VPN" : "เพิ่ม VPN ใหม่"}
                extra={
                  <Button
                    type="text"
                    icon={<CloseOutlined />}
                    onClick={handleCloseVpnForm}
                  />
                }
              >
                <Form
                  form={vpnForm}
                  layout="vertical"
                  onFinish={handleSubmitVpn}
                  initialValues={{
                    hospitalId: undefined,
                    steps: "",
                    additionalInfo: "",
                    installationIds: [],
                  }}
                >
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
                      placeholder="-- เลือกหรือค้นหาโรงพยาบาล --"
                      showSearch
                      filterOption={(input, option) =>
                        (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                      }
                      onChange={(value) => {
                        setSelectedHospitalId(value);
                        vpnForm.setFieldsValue({ installationIds: [] });
                      }}
                    >
                      {hospitalOptions.map((h) => (
                        <Select.Option key={h.id} value={h.id}>
                          {h.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item name="steps" label="สเต็ปการ VPN">
                    <TextArea rows={4} placeholder="ระบุขั้นตอนการเชื่อมต่อ VPN..." />
                  </Form.Item>

                  <Form.Item name="additionalInfo" label="รายละเอียดเพิ่มเติม">
                    <TextArea rows={4} placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับ VPN..." />
                  </Form.Item>

                  <Form.Item name="installationIds" label="เลือกเครื่องที่จะใช้ VPN">
                    {!selectedHospitalId ? (
                      <Alert message="กรุณาเลือกโรงพยาบาลก่อน" type="info" showIcon />
                    ) : filteredInstallations.length === 0 ? (
                      <Alert message="ไม่พบเครื่องในโรงพยาบาลนี้" type="warning" showIcon />
                    ) : (
                      <Card size="small" style={{ maxHeight: 300, overflowY: "auto" }}>
                        <Form.Item name="installationIds" noStyle>
                          <Checkbox.Group style={{ width: "100%" }}>
                            <Space direction="vertical" style={{ width: "100%" }}>
                              {filteredInstallations.map((inst) => (
                                <Checkbox key={inst.id} value={inst.id}>
                                  <Space direction="vertical" size={0}>
                                    <Text strong>
                                      {inst.hospital?.name || "ไม่ระบุ"} - {inst.department}
                                    </Text>
                                    {(inst.room || inst.floor) && (
                                      <Text type="secondary" style={{ fontSize: 12 }}>
                                        {inst.room && `ห้อง ${inst.room}`}
                                        {inst.room && inst.floor && " • "}
                                        {inst.floor && `ชั้น ${inst.floor}`}
                                      </Text>
                                    )}
                                  </Space>
                                </Checkbox>
                              ))}
                            </Space>
                          </Checkbox.Group>
                        </Form.Item>
                      </Card>
                    )}
                  </Form.Item>

                  <Form.Item>
                    <Space>
                      <Button onClick={handleCloseVpnForm} size="large">ยกเลิก</Button>
                      <Button type="primary" htmlType="submit" loading={submitting} size="large" style={{ minWidth: 150 }}>
                        {submitting ? "กำลังบันทึก..." : "บันทึก"}
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
            )}

            {!showVpnForm && (
              <>
                <Card>
                  <Space direction="vertical" style={{ width: "100%" }} size="middle">
                    <Input
                      placeholder="ค้นหา: โรงพยาบาล, แผนก, ห้อง, ชั้น, AnyDesk ID, VPN..."
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
                        value={hospitalFilter}
                        onChange={(value: string) => {
                          setHospitalFilter(value);
                          setCurrentPage(1);
                        }}
                        style={{ flex: 1, minWidth: 200 }}
                        size="large"
                        placeholder="โรงพยาบาลทั้งหมด"
                        allowClear
                      >
                        {hospitalFilterOptions.map((name) => (
                          <Select.Option key={name} value={name}>
                            {name}
                          </Select.Option>
                        ))}
                      </Select>
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
                      emptyText: search ? "ไม่พบข้อมูลที่ค้นหา" : "ยังไม่มีข้อมูลการรีโมต",
                    }}
                  />
                </div>
              </>
            )}
          </Space>
        </Card>
      </div>

      {/* Modal เลือก Installation เพื่อเพิ่มข้อมูลการรีโมต */}
      <Modal
        title="เลือกเครื่องที่ต้องการเพิ่มข้อมูลการรีโมต"
        open={showInstallationModal}
        onCancel={() => {
          setShowInstallationModal(false);
          setSelectedInstallationId(null);
          // ลบ query parameter addRemote เมื่อปิด modal
          router.push("/service-management/remote", { scroll: false });
        }}
        onOk={() => {
          if (selectedInstallationId) {
            router.push(`/service-management/remote/${selectedInstallationId}`);
          } else {
            message.warning("กรุณาเลือกเครื่อง");
          }
        }}
        okText="ไปหน้าตั้งค่า"
        cancelText="ยกเลิก"
        width={mounted && isMobile ? "90%" : 600}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Text type="secondary">
            เลือกเครื่องที่ต้องการเพิ่มหรือแก้ไขข้อมูลการรีโมต (AnyDesk, VPN, Network)
          </Text>
          <Select
            placeholder="-- เลือกเครื่อง --"
            style={{ width: "100%" }}
            size="large"
            showSearch
            filterOption={(input, option) => {
              const label = option?.children as string;
              return label?.toLowerCase().includes(input.toLowerCase()) ?? false;
            }}
            value={selectedInstallationId}
            onChange={(value) => setSelectedInstallationId(value)}
          >
            {installationOptions.map((inst) => (
              <Select.Option key={inst.id} value={inst.id}>
                {inst.hospital?.name || "ไม่ระบุ"} - {inst.department}
                {inst.room && ` (ห้อง ${inst.room})`}
                {inst.floor && ` (ชั้น ${inst.floor})`}
              </Select.Option>
            ))}
          </Select>
        </Space>
      </Modal>

      {/* Modal เลือก VPN จากที่มีอยู่ */}
      <Modal
        title="เลือก VPN ที่ต้องการแก้ไข"
        open={showVpnSelectModal}
        onCancel={() => {
          setShowVpnSelectModal(false);
        }}
        footer={null}
        width={mounted && isMobile ? "90%" : 700}
      >
        {loadingVpns ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: "rgba(0, 0, 0, 0.65)" }}>กำลังโหลด...</div>
          </div>
        ) : allVpns.length === 0 ? (
          <Empty description="ยังไม่มี VPN ในระบบ" />
        ) : (
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Text type="secondary">
              เลือก VPN ที่ต้องการแก้ไขจากรายการด้านล่าง
            </Text>
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {allVpns.map((vpn) => (
                <Card
                  key={vpn.id}
                  size="small"
                  style={{ marginBottom: 12, cursor: "pointer" }}
                  hoverable
                  onClick={() => handleSelectVpn(vpn)}
                >
                  <Space direction="vertical" size="small" style={{ width: "100%" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Text strong>
                        {vpn.hospital?.name || "ไม่ระบุโรงพยาบาล"}
                      </Text>
                      {vpn.steps && (
                        <Tag color="blue" style={{ fontSize: 11 }}>มีสเต็ป</Tag>
                      )}
                    </div>
                    {vpn.steps && (
                      <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                        {vpn.steps.substring(0, 100)}
                        {vpn.steps.length > 100 ? "..." : ""}
                      </Text>
                    )}
                    {vpn.additionalInfo && (
                      <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                        {vpn.additionalInfo.substring(0, 100)}
                        {vpn.additionalInfo.length > 100 ? "..." : ""}
                      </Text>
                    )}
                  </Space>
                </Card>
              ))}
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
}
