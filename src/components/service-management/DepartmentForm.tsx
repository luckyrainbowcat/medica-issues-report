"use client";

import { useEffect, useState } from "react";
import { Form, Input, Button, message } from "antd";

type DepartmentPayload = {
  name: string;
};

export default function DepartmentForm({
  action,
  existing,
}: {
  action: (data: DepartmentPayload) => Promise<void>;
  existing?: Partial<DepartmentPayload>;
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (existing) {
      form.setFieldsValue({
        name: existing.name ?? "",
      });
    }
  }, [existing, form]);

  async function onFinish(values: DepartmentPayload) {
    try {
      await action(values);
      message.success("บันทึกข้อมูลสำเร็จ");
    } catch (err: any) {
      message.error(err?.message || "บันทึกไม่สำเร็จ");
    }
  }

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

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{
        name: "",
      }}
    >
      <Form.Item
        name="name"
        label={
          <span>
            ชื่อแผนก <span style={{ color: "#ff4d4f" }}>*</span>
          </span>
        }
        rules={[{ required: true, message: "กรุณากรอกชื่อแผนก" }]}
      >
        <Input placeholder="เช่น GI / OR / ENT" size={isMobile ? "large" : "middle"} />
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
            บันทึกแผนก
          </Button>
        </div>
      </Form.Item>
    </Form>
  );
}
