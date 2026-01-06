"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/service-management/api";
import EquipmentSection from "./form/EquipmentSection";
import HospitalSection from "./form/HospitalSection";
import FieldInfoSection from "./form/FieldSection";
import ImageUploader from "./form/ImageUploader";
import { Card, Space, Typography, Input, DatePicker, Checkbox, Button, message, Select } from "antd";
import dayjs from "dayjs";

const { Title } = Typography;
const { TextArea } = Input;

/* ---------- HELPERS ---------- */

function calcWarrantyExpireDate(
  inspectionDate: string | null,
  warrantyMonths: number | null
): string | null {
  if (!inspectionDate || !warrantyMonths || isNaN(warrantyMonths)) return null;
  const d = new Date(inspectionDate);
  if (isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + warrantyMonths);
  return d.toISOString().slice(0, 10); // yyyy-mm-dd
}

function calcLatestExtensionDate(
  warrantyExpireDate: string | null,
  warrantyMonths: number | null
): string | null {
  if (!warrantyExpireDate || !warrantyMonths || isNaN(warrantyMonths)) return null;
  const d = new Date(warrantyExpireDate);
  if (isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + warrantyMonths);
  return d.toISOString().slice(0, 10); // yyyy-mm-dd
}

/* ---------- MAIN FORM COMPONENT ---------- */

export default function WarrantyExtensionForm({
  action,
  existing,
  installationOptions = [],
}: {
  action: (data: any) => Promise<void>;
  existing?: any;
  installationOptions?: Array<{ id: number; hospital?: { name: string }; department: string; room?: string; floor?: string }>;
}) {
  const [options, setOptions] = useState<{
    hospitals: Array<{ id?: string; name: string }>;
    departments: Array<{ id?: string; name: string }>;
  }>({ hospitals: [], departments: [] });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState(
    existing || {
      latestExtensionDate: null,
      hospital: {
        systemType: "",
        name: "",
        department: "",
        building: "",
        floor: "",
        room: "",
        endoscopeBrand: "",
        systemMode: "",
      },
      equipment: [],
      fieldInfo: {
        hasSpareSet: false,
        spareSetNote: "",
        pmPerYear: null,
        warrantyMonths: null,
        installDate: null,
        inspectionDate: null,
        warrantyExpireDate: null,
        images: [],
      },
      equipmentImages: [],
      extra: {
        additionalInfo: "",
        images: [],
      },
    }
  );

  // preload dropdown options
  useEffect(() => {
    let cancelled = false;
    async function fetchOptions() {
      try {
        const [hospitals, departments] = await Promise.all([
          apiGet("/api/hospitals"),
          apiGet("/api/departments"),
        ]);
        if (!cancelled) {
          setOptions({
            hospitals: Array.isArray(hospitals) ? hospitals : [],
            departments: Array.isArray(departments) ? departments : [],
          });
        }
      } catch (err) {
        console.error("loadOptions error", err);
      }
    }
    fetchOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const mandatoryEquipmentTypes = useMemo(() => ["COMPUTER", "MONITOR"], []);

  const update = (path: string, value: any) => {
    const keys = path.split(".");
    setForm((prev: any) => {
      const clone = structuredClone(prev);
      let ref: any = clone;
      for (let i = 0; i < keys.length - 1; i++) {
        ref = ref[keys[i]];
      }
      ref[keys[keys.length - 1]] = value;
      return clone;
    });
    // Clear error when user updates field
    if (errors[path]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[path];
        return next;
      });
    }
  };

  const clearError = (path: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!form.hospital?.name) {
      newErrors["hospital.name"] = "กรุณากรอกชื่อโรงพยาบาล";
    }


    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      message.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      // ส่งข้อมูลพร้อม fieldInfoImages และ equipmentImages
      const payload = {
        ...form,
        fieldInfoImages: form.fieldInfo?.images || [],
        equipmentImages: form.equipmentImages || [],
      };
      console.log("[WarrantyExtensionForm] Submitting payload:", JSON.stringify(payload, null, 2));
      await action(payload);
      message.success("บันทึกข้อมูลสำเร็จ");
    } catch (err: any) {
      console.error("[WarrantyExtensionForm] Error:", err);
      message.error(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
            {/* ---------- ข้อมูลพื้นฐาน ---------- */}
            <Card title={<Title level={3} style={{ margin: 0 }}>ข้อมูลพื้นฐาน</Title>}>
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                <div>
                  <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                    ชื่อโรงพยาบาล <span style={{ color: "red" }}>*</span>
                  </Typography.Text>
                  <Select
                    placeholder="-- เลือกโรงพยาบาล --"
                    style={{ width: "100%" }}
                    value={form.hospital?.name || undefined}
                    onChange={(value) => update("hospital.name", value || "")}
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    status={errors["hospital.name"] ? "error" : undefined}
                    allowClear
                  >
                    {options.hospitals.map((h) => (
                      <Select.Option key={h.id || h.name} value={h.name} label={h.name}>
                        {h.name}
                      </Select.Option>
                    ))}
                  </Select>
                  {errors["hospital.name"] && (
                    <Typography.Text type="danger" style={{ fontSize: 12 }}>
                      {errors["hospital.name"]}
                    </Typography.Text>
                  )}
                </div>
              </Space>
            </Card>

            {/* ---------- ข้อมูลประกันและวันที่ ---------- */}
            <Card title={<Title level={3} style={{ margin: 0 }}>ข้อมูลประกัน</Title>}>
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                <Space style={{ width: "100%" }} size="middle">
                  <div style={{ flex: 1 }}>
                    <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                      PM ต่อปี (ครั้ง/ปี)
                    </Typography.Text>
                    <Input
                      type="number"
                      placeholder="PM ต่อปี (ครั้ง/ปี)"
                      value={form.fieldInfo.pmPerYear ?? ""}
                      onChange={(e) =>
                        update(
                          "fieldInfo.pmPerYear",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                      ประกัน (เดือน)
                    </Typography.Text>
                    <Input
                      type="number"
                      placeholder="ประกัน (เดือน)"
                      value={form.fieldInfo.warrantyMonths ?? ""}
                      onChange={(e) => {
                        const months = e.target.value ? Number(e.target.value) : null;
                        setForm((prev: any) => {
                          const clone = structuredClone(prev);
                          clone.fieldInfo.warrantyMonths = months;
                          clone.fieldInfo.warrantyExpireDate = calcWarrantyExpireDate(
                            clone.fieldInfo.inspectionDate,
                            months
                          );
                          clone.latestExtensionDate = calcLatestExtensionDate(
                            clone.fieldInfo.warrantyExpireDate,
                            months
                          );
                          return clone;
                        });
                      }}
                    />
                  </div>
                </Space>
                <Space style={{ width: "100%" }} size="middle">
                  <div style={{ flex: 1 }}>
                    <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                      วันที่ติดตั้งระบบ
                    </Typography.Text>
                    <DatePicker
                      placeholder="วันที่ติดตั้งระบบ"
                      style={{ width: "100%" }}
                      value={form.fieldInfo.installDate ? dayjs(form.fieldInfo.installDate) : null}
                      onChange={(date) =>
                        update(
                          "fieldInfo.installDate",
                          date ? date.format("YYYY-MM-DD") : null
                        )
                      }
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                      วันที่ตรวจรับ
                    </Typography.Text>
                    <DatePicker
                      placeholder="วันที่ตรวจรับ"
                      style={{ width: "100%" }}
                      value={form.fieldInfo.inspectionDate ? dayjs(form.fieldInfo.inspectionDate) : null}
                      onChange={(date) => {
                        const value = date ? date.format("YYYY-MM-DD") : null;
                        setForm((prev: any) => {
                          const clone = structuredClone(prev);
                          clone.fieldInfo.inspectionDate = value;
                          clone.fieldInfo.warrantyExpireDate = calcWarrantyExpireDate(
                            value,
                            clone.fieldInfo.warrantyMonths
                          );
                          clone.latestExtensionDate = calcLatestExtensionDate(
                            clone.fieldInfo.warrantyExpireDate,
                            clone.fieldInfo.warrantyMonths
                          );
                          return clone;
                        });
                      }}
                    />
                  </div>
                </Space>
                <div>
                  <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                    วันที่หมดประกัน (คำนวณอัตโนมัติ)
                  </Typography.Text>
                  <Input
                    placeholder="วันที่หมดประกัน (คำนวณอัตโนมัติ)"
                    readOnly
                    disabled
                    value={
                      form.fieldInfo.warrantyExpireDate
                        ? String(form.fieldInfo.warrantyExpireDate).slice(0, 10)
                        : ""
                    }
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                    วันที่ต่อประกันล่าสุด (คำนวณอัตโนมัติ)
                  </Typography.Text>
                  <Input
                    placeholder="วันที่ต่อประกันล่าสุด (คำนวณอัตโนมัติ)"
                    readOnly
                    disabled
                    value={
                      form.latestExtensionDate
                        ? String(form.latestExtensionDate).slice(0, 10)
                        : ""
                    }
                    style={{ width: "100%" }}
                  />
                </div>
              </Space>
            </Card>

            {/* Submit Button */}
            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 16 }}>
              <Button type="primary" htmlType="submit" size="large" style={{ minWidth: 150 }}>
                บันทึกข้อมูล
              </Button>
            </div>
          </Space>
        </form>
  );
}

