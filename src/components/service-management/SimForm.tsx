"use client";

import { useEffect, useState } from "react";
import { Form, Input, Select, DatePicker, Radio, Button, Space, message } from "antd";
import dayjs from "dayjs";

type Option = { id: string | number; name: string };

type SimPayload = {
  phoneNumber: string;
  networkFlags: string | string[];
  networkOther?: string;
  ownerName?: string;
  activatedDate?: string | null;
  packageDetail?: string;
  packageExpireAt?: string | null;
  simExpireAt?: string | null;
  status: "active" | "expired";
  hospitalId: string | null; // Changed to string (Firestore IDs are strings)
  departmentId: string | null; // Changed to string (Firestore IDs are strings)
};

const NETWORK_OPTIONS = [
  { value: "AIS", label: "AIS" },
  { value: "TRUE", label: "TRUE" },
  { value: "OTHER", label: "อื่นๆ" },
];

export default function SimForm({
  action,
  existing,
  hospitalOptions,
  departmentOptions,
}: {
  action: (data: SimPayload) => Promise<void>;
  existing?: Partial<SimPayload>;
  hospitalOptions: Option[];
  departmentOptions: Option[];
}) {
  const [form] = Form.useForm();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // ตรวจสอบว่า window object มีอยู่ (client-side only)
    if (typeof window === "undefined") return;
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (existing) {
      let networkFlag = "";
      if (existing.networkFlags) {
        if (Array.isArray(existing.networkFlags)) {
          networkFlag = existing.networkFlags[0] || "";
        } else {
          const flags = String(existing.networkFlags)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          networkFlag = flags[0] || "";
        }
      }

      form.setFieldsValue({
        phoneNumber: existing.phoneNumber ?? "",
        networkFlags: networkFlag,
        networkOther: existing.networkOther ?? "",
        ownerName: existing.ownerName ?? "",
        activatedDate: existing.activatedDate ? dayjs(existing.activatedDate) : null,
        packageDetail: existing.packageDetail ?? "",
        packageExpireAt: existing.packageExpireAt ? dayjs(existing.packageExpireAt) : null,
        simExpireAt: existing.simExpireAt ? dayjs(existing.simExpireAt) : null,
        status: existing.status === "expired" ? "expired" : "active",
        hospitalId: existing.hospitalId ?? undefined,
        departmentId: existing.departmentId ?? undefined,
      });
    }
  }, [existing, form]);

  async function onFinish(values: any) {
    try {
      // ตรวจสอบว่า hospitalId และ departmentId ถูกเลือกหรือไม่
      if (!values.hospitalId) {
        message.error("กรุณาเลือกโรงพยาบาล");
        return;
      }
      if (!values.departmentId) {
        message.error("กรุณาเลือกแผนก");
        return;
      }

      const payload: SimPayload = {
        phoneNumber: values.phoneNumber,
        networkFlags: values.networkFlags,
        networkOther: values.networkOther,
        ownerName: values.ownerName,
        activatedDate: values.activatedDate ? values.activatedDate.format("YYYY-MM-DD") : null,
        packageDetail: values.packageDetail,
        packageExpireAt: values.packageExpireAt ? values.packageExpireAt.format("YYYY-MM-DD") : null,
        simExpireAt: values.simExpireAt ? values.simExpireAt.format("YYYY-MM-DD") : null,
        status: values.status,
        // แปลงเป็น string (Firestore IDs เป็น string) หรือ null
        hospitalId: values.hospitalId != null && values.hospitalId !== "" ? String(values.hospitalId) : null,
        departmentId: values.departmentId != null && values.departmentId !== "" ? String(values.departmentId) : null,
      };
      
      console.log("SimForm - Sending payload:", JSON.stringify(payload, null, 2));
      await action(payload);
      message.success("บันทึกข้อมูลสำเร็จ");
    } catch (err: any) {
      console.error("SimForm - Error:", err);
      message.error(err?.message || "บันทึกข้อมูลไม่สำเร็จ");
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{
        status: "active",
      }}
    >
        <Form.Item
          name="phoneNumber"
          label={
            <span>
              เบอร์โทร <span style={{ color: "#ff4d4f" }}>*</span>
            </span>
          }
          rules={[{ required: true, message: "กรุณากรอกเบอร์โทร" }]}
        >
          <Input placeholder="เช่น 0812345678" />
        </Form.Item>

        <Form.Item
          name="networkFlags"
          label={
            <span>
              เครือข่าย <span style={{ color: "#ff4d4f" }}>*</span>
            </span>
          }
          rules={[{ required: true, message: "กรุณาเลือกเครือข่าย" }]}
        >
          <Radio.Group>
            {NETWORK_OPTIONS.map((opt) => (
              <Radio key={opt.value} value={opt.value}>
                {opt.label}
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) =>
            prevValues.networkFlags !== currentValues.networkFlags
          }
        >
          {({ getFieldValue }) =>
            getFieldValue("networkFlags") === "OTHER" ? (
              <Form.Item
                name="networkOther"
                label="กรอกชื่อเครือข่ายอื่นๆ"
              >
                <Input placeholder="เช่น DTAC" size={isMobile ? "large" : "middle"} />
              </Form.Item>
            ) : null
          }
        </Form.Item>

        <Form.Item name="ownerName" label="ชื่อผู้เปิดซิม">
          <Input placeholder="เช่น นายทดสอบ ระบบ" size={isMobile ? "large" : "middle"} />
        </Form.Item>

        <Form.Item name="activatedDate" label="วันที่เปิดซิม">
          <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" size={isMobile ? "large" : "middle"} />
        </Form.Item>

        <Form.Item name="packageDetail" label="แพ็คเกจ (รายละเอียด)">
          <Input.TextArea rows={isMobile ? 3 : 4} placeholder="เช่น 5G Unlimited" size={isMobile ? "large" : "middle"} />
        </Form.Item>

        <Form.Item name="packageExpireAt" label="วันที่หมดแพ็คเกจ">
          <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" size={isMobile ? "large" : "middle"} />
        </Form.Item>

        <Form.Item name="simExpireAt" label="วันที่ซิมหมดอายุ">
          <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" size={isMobile ? "large" : "middle"} />
        </Form.Item>

        <Form.Item name="status" label="สถานะซิม">
          <Radio.Group>
            <Radio value="active">ใช้งาน</Radio>
            <Radio value="expired">หมดอายุ</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="hospitalId"
          label={
            <span>
              โรงพยาบาล <span style={{ color: "#ff4d4f" }}>*</span>
            </span>
          }
          rules={[{ required: true, message: "กรุณาเลือกโรงพยาบาล" }]}
        >
          <Select placeholder="เลือกโรงพยาบาล" size={isMobile ? "large" : "middle"}>
            {hospitalOptions.map((h) => (
              <Select.Option key={h.id} value={h.id}>
                {h.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="departmentId"
          label={
            <span>
              แผนก <span style={{ color: "#ff4d4f" }}>*</span>
            </span>
          }
          rules={[{ required: true, message: "กรุณาเลือกแผนก" }]}
        >
          <Select placeholder="เลือกแผนก" size={isMobile ? "large" : "middle"}>
            {departmentOptions.map((d) => (
              <Select.Option key={d.id} value={d.id}>
                {d.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item>
          <div style={{ display: "flex", justifyContent: isMobile ? "stretch" : "flex-end" }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              size={isMobile ? "large" : "large"} 
              style={{ minWidth: isMobile ? "100%" : 150 }}
              block={isMobile}
            >
              บันทึกข้อมูลซิม
            </Button>
          </div>
        </Form.Item>
      </Form>
  );
}
