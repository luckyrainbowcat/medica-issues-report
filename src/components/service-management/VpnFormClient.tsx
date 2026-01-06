"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, apiPut } from "@/lib/service-management/api";
import { Form, Input, Select, Checkbox, Button, Space, Typography, message, Alert } from "antd";

const { Title, Text } = Typography;
const { TextArea } = Input;

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

type VpnData = {
  id?: number;
  hospitalId: number;
  steps: string | null;
  additionalInfo: string | null;
  installations: Array<{
    installation: InstallationOption;
  }>;
};

type Props = {
  existing?: VpnData;
  hospitalOptions: HospitalOption[];
  installationOptions: InstallationOption[];
  onFinish?: (values: any) => Promise<void>;
  hideButtons?: boolean;
  formRef?: (form: any) => void;
  initialHospitalId?: number;
  initialInstallationIds?: number[];
};

export default function VpnFormClient({
  existing,
  hospitalOptions,
  installationOptions,
  onFinish: customOnFinish,
  hideButtons = false,
  formRef,
  initialHospitalId,
  initialInstallationIds,
}: Props) {
  const router = useRouter();
  const [form] = Form.useForm();

  // ส่ง form instance หลังจาก Form component mount แล้ว
  useEffect(() => {
    if (formRef) {
      // ใช้ setTimeout เพื่อรอให้ Form component render เสร็จก่อน
      const timer = setTimeout(() => {
        formRef(form);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [form, formRef]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState<number>(
    existing?.hospitalId || initialHospitalId || 0
  );

  const filteredInstallations = useMemo(() => {
    if (!selectedHospitalId) return [];
    return installationOptions.filter((inst) => inst.hospitalId === selectedHospitalId);
  }, [selectedHospitalId, installationOptions]);

  useEffect(() => {
    if (existing) {
      const initialInstallationIds = existing.installations.map((item) => item.installation.id);
      form.setFieldsValue({
        hospitalId: existing.hospitalId || undefined,
        steps: existing.steps || "",
        additionalInfo: existing.additionalInfo || "",
        installationIds: initialInstallationIds,
      });
      setSelectedHospitalId(existing.hospitalId || 0);
    } else if (initialHospitalId) {
      // เมื่อเพิ่ม VPN ใหม่ และมี initialHospitalId
      form.setFieldsValue({
        hospitalId: initialHospitalId,
        steps: "",
        additionalInfo: "",
        installationIds: initialInstallationIds || [],
      });
      setSelectedHospitalId(initialHospitalId);
    }
  }, [existing, form, initialHospitalId, initialInstallationIds]);

  const onFinish = async (values: any) => {
    if (customOnFinish) {
      await customOnFinish(values);
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

      if (existing?.id) {
        await apiPut(`/api/vpns/${existing.id}`, payload);
        message.success("อัปเดตข้อมูลสำเร็จ");
      } else {
        await apiPost("/api/vpns", payload);
        message.success("บันทึกข้อมูลสำเร็จ");
      }

      router.push("/vpns");
      router.refresh();
    } catch (err: any) {
      message.error(err?.message || "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          hospitalId: existing?.hospitalId || initialHospitalId || undefined,
          steps: existing?.steps || "",
          additionalInfo: existing?.additionalInfo || "",
          installationIds: existing?.installations.map((item) => item.installation.id) || initialInstallationIds || [],
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
            placeholder="-- เลือกโรงพยาบาล --"
            onChange={(value) => {
              setSelectedHospitalId(value);
              form.setFieldsValue({ installationIds: [] });
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
          <TextArea
            rows={6}
            placeholder="ระบุขั้นตอนการเชื่อมต่อ VPN..."
          />
        </Form.Item>

        <Form.Item name="additionalInfo" label="รายละเอียดเพิ่มเติม">
          <TextArea
            rows={6}
            placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับ VPN..."
          />
        </Form.Item>

        <Form.Item name="installationIds" label="เลือกเครื่องที่จะใช้ VPN">
          {!selectedHospitalId ? (
            <Alert message="กรุณาเลือกโรงพยาบาลก่อน" type="info" showIcon />
          ) : filteredInstallations.length === 0 ? (
            <Alert message="ไม่พบเครื่องในโรงพยาบาลนี้" type="warning" showIcon />
          ) : (
            <Card size="small" style={{ maxHeight: 400, overflowY: "auto" }}>
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

        {!hideButtons && (
          <Form.Item>
            <Space>
              <Button onClick={() => router.back()} size="large">ยกเลิก</Button>
              <Button type="primary" htmlType="submit" loading={submitting} size="large" style={{ minWidth: 150 }}>
                {submitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
              </Button>
            </Space>
          </Form.Item>
        )}
      </Form>
  );
}
