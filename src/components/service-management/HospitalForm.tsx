"use client";

import { useEffect, useState } from "react";
import { Form, Input, Button, message, AutoComplete } from "antd";

type HospitalPayload = {
  name: string;
  province: string;
  address: string;
  code: string;
  region?: string;
};

const PROVINCES = [
  "กรุงเทพมหานคร", "กระบี่", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร", "ขอนแก่น",
  "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ชัยนาท", "ชัยภูมิ", "ชุมพร",
  "เชียงราย", "เชียงใหม่", "ตรัง", "ตราด", "ตาก", "นครนายก",
  "นครปฐม", "นครพนม", "นครราชสีมา", "นครศรีธรรมราช", "นครสวรรค์", "นนทบุรี",
  "นราธิวาส", "น่าน", "บึงกาฬ", "บุรีรัมย์", "ปทุมธานี", "ประจวบคีรีขันธ์",
  "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา", "พังงา", "พัทลุง", "พิจิตร",
  "พิษณุโลก", "เพชรบุรี", "เพชรบูรณ์", "แพร่", "ภูเก็ต", "มหาสารคาม",
  "มุกดาหาร", "แม่ฮ่องสอน", "ยะลา", "ยโสธร", "ร้อยเอ็ด", "ระนอง",
  "ระยอง", "ราชบุรี", "ลพบุรี", "ลำปาง", "ลำพูน", "เลย",
  "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล", "สมุทรปราการ", "สมุทรสงคราม",
  "สมุทรสาคร", "สระแก้ว", "สระบุรี", "สิงห์บุรี", "สุโขทัย", "สุพรรณบุรี",
  "สุราษฎร์ธานี", "สุรินทร์", "หนองคาย", "หนองบัวลำภู", "อ่างทอง", "อำนาจเจริญ",
  "อุดรธานี", "อุตรดิตถ์", "อุทัยธานี", "อุบลราชธานี",
];

export default function HospitalForm({
  action,
  existing,
}: {
  action: (data: HospitalPayload) => Promise<void>;
  existing?: Partial<HospitalPayload>;
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
      form.setFieldsValue({
        name: existing.name ?? "",
        province: existing.province ?? "",
        address: existing.address ?? "",
        code: existing.code ?? "",
      });
    }
  }, [existing, form]);

  async function onFinish(values: HospitalPayload) {
    try {
      await action(values);
      message.success("บันทึกข้อมูลสำเร็จ");
    } catch (err: any) {
      message.error(err?.message || "บันทึกข้อมูลไม่สำเร็จ");
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{
        name: "",
        province: "",
        address: "",
        code: "",
      }}
    >
      <Form.Item
        name="name"
        label={
          <span>
            ชื่อโรงพยาบาล <span style={{ color: "#ff4d4f" }}>*</span>
          </span>
        }
        rules={[{ required: true, message: "กรุณากรอกชื่อโรงพยาบาล" }]}
      >
        <Input placeholder="เช่น โรงพยาบาลเชียงใหม่" size={isMobile ? "large" : "middle"} />
      </Form.Item>

      <Form.Item
        name="province"
        label={
          <span>
            จังหวัด <span style={{ color: "#ff4d4f" }}>*</span>
          </span>
        }
        rules={[{ required: true, message: "กรุณากรอกจังหวัด" }]}
      >
        <AutoComplete
          options={PROVINCES.map((province) => ({ value: province }))}
          placeholder="พิมพ์เพื่อค้นหาหรือเลือกจังหวัด"
          filterOption={(inputValue, option) =>
            option?.value?.toLowerCase().includes(inputValue.toLowerCase()) ?? false
          }
          allowClear
          size={isMobile ? "large" : "middle"}
        />
      </Form.Item>

      <Form.Item name="code" label="รหัสโรงพยาบาล">
        <Input placeholder="เช่น HOSP-001" size={isMobile ? "large" : "middle"} />
      </Form.Item>

      <Form.Item name="address" label="ที่อยู่">
        <Input.TextArea rows={3} placeholder="เลขที่ / ถนน / ตำบล / อำเภอ" />
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
            บันทึกข้อมูลโรงพยาบาล
          </Button>
        </div>
      </Form.Item>
    </Form>
  );
}
