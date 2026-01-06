"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/service-management/api";
import EquipmentSection from "./form/EquipmentSection";
import HospitalSection from "./form/HospitalSection";
import FieldInfoSection from "./form/FieldSection";
import ImageUploader from "./form/ImageUploader";
import { Card, Space, Typography, Input, DatePicker, Checkbox, Button, message } from "antd";
import dayjs from "dayjs";

const { Title } = Typography;
const { TextArea } = Input;

/* ---------- HELPERS ---------- */

function calcWarrantyExpireDate(
  installDate: string | null,
  warrantyMonths: number | null
): string | null {
  if (!installDate || !warrantyMonths || isNaN(warrantyMonths)) return null;
  const d = new Date(installDate);
  if (isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + warrantyMonths);
  return d.toISOString().slice(0, 10); // yyyy-mm-dd
}

/* ---------- MAIN FORM COMPONENT ---------- */

export default function Form({
  action,
  existing,
}: {
  action: (data: any) => Promise<void>;
  existing?: any;
}) {
  const [options, setOptions] = useState<{
    hospitals: Array<{ id?: string; name: string }>;
    departments: Array<{ id?: string; name: string }>;
  }>({ hospitals: [], departments: [] });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState(
    existing || {
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
      network: {
        anydeskId: "",
        anydeskPassword: "",
        hospitalWifiSsid: "",
        hospitalLanInfo: "",
        connectionFlags: "",
        vpnDetail: "",
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

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.hospital?.name?.trim()) {
      nextErrors["hospital.name"] = "กรุณาเลือก/กรอกชื่อโรงพยาบาล";
    }
    if (!form.hospital?.department?.trim()) {
      nextErrors["hospital.department"] = "กรุณาเลือก/กรอกแผนก";
    }

    const equipments: any[] = form.equipment || [];
    equipments.forEach((row: any) => {
      if (!mandatoryEquipmentTypes.includes(row?.equipmentType)) return;
      const qty = Math.max(1, Number(row?.quantity) || 1);
      let snArr: string[] = [];
      if (Array.isArray(row?.serialNumbers)) {
        snArr = row.serialNumbers.map((s: any) => String(s ?? "").trim());
      } else if (typeof row?.serialNumber === "string") {
        snArr = row.serialNumber
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
      // Ensure length matches qty
      while (snArr.length < qty) snArr.push("");
      const missing = snArr.slice(0, qty).some((s) => !s);
      if (missing) {
        nextErrors[`equipment.${row.equipmentType}.sn`] = `กรอก SN ให้ครบ ${qty} เครื่อง`;
      }
    });

    setErrors(nextErrors);
    return nextErrors;
  };

  const clearError = (key: string) => {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const update = (path: string, value: any) => {
    clearError(path);
    const keys = path.split(".");
    setForm((prev: any) => {
      const clone = structuredClone(prev);
      let ref = clone;
      for (let i = 0; i < keys.length - 1; i++) {
        ref = ref[keys[i]];
      }
      ref[keys[keys.length - 1]] = value;
      return clone;
    });
  };

  async function onSubmit(e: any) {
    e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      message.error("กรุณาตรวจสอบข้อมูลที่กรอก");
      return;
    }

    try {
      await action(form);
      message.success("บันทึกข้อมูลสำเร็จ");
    } catch (err: any) {
      message.error(err?.message || "บันทึกข้อมูลไม่สำเร็จ");
    }
  }

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div style={{ padding: "12px", background: "#f0f2f5", minHeight: "100vh" }}>
      <form onSubmit={onSubmit} style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* ---------- หมวดข้อมูลโรงพยาบาล + การเชื่อมต่อ ---------- */}
          <HospitalSection
            form={form}
            setForm={setForm}
            hospitalOptions={options.hospitals}
            departmentOptions={options.departments}
            errors={errors}
          />

          {/* ---------- หมวดอุปกรณ์ ---------- */}
          <Card
            title={<Title level={3} style={{ margin: 0 }}>หมวดอุปกรณ์</Title>}
          >
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <EquipmentSection
                form={form}
                setForm={setForm}
                errors={errors}
                clearError={clearError}
              />
              <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 24 }}>
                <ImageUploader
                  images={form.equipmentImages || []}
                  onImagesChange={(images) => update("equipmentImages", images)}
                  sectionName="อุปกรณ์"
                />
              </div>
            </Space>
          </Card>

          {/* ---------- หมวดข้อมูลติดตั้ง / ภาคสนาม ---------- */}
          <Card
            title={<Title level={3} style={{ margin: 0 }}>หมวดข้อมูลติดตั้ง / ภาคสนาม</Title>}
          >
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <Card size="small" style={{ background: "#e6f7ff", borderColor: "#91d5ff" }}>
                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                  <Checkbox
                    checked={form.fieldInfo.hasSpareSet}
                    onChange={(e) => update("fieldInfo.hasSpareSet", e.target.checked)}
                  >
                    มีชุดสำรอง
                  </Checkbox>
                  {form.fieldInfo.hasSpareSet && (
                    <TextArea
                      placeholder="รายละเอียดชุดสำรอง เช่น อยู่ที่ไหน / จำนวนเท่าใด"
                      value={form.fieldInfo.spareSetNote || ""}
                      onChange={(e) => update("fieldInfo.spareSetNote", e.target.value)}
                      rows={4}
                      style={{ width: "100%" }}
                    />
                  )}
                </Space>
              </Card>

              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                <div style={{ 
                  display: "flex", 
                  flexDirection: isMobile ? "column" : "row",
                  gap: 16,
                  width: "100%",
                }}>
                  <div style={{ flex: 1, width: isMobile ? "100%" : "auto" }}>
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
                  <div style={{ flex: 1, width: isMobile ? "100%" : "auto" }}>
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
                            clone.fieldInfo.installDate,
                            months
                          );
                          return clone;
                        });
                      }}
                    />
                  </div>
                </div>
                <div style={{ 
                  display: "flex", 
                  flexDirection: isMobile ? "column" : "row",
                  gap: 16,
                  width: "100%",
                }}>
                  <div style={{ flex: 1, width: isMobile ? "100%" : "auto" }}>
                    <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                      วันที่ติดตั้งระบบ
                    </Typography.Text>
                    <DatePicker
                      placeholder="วันที่ติดตั้งระบบ"
                      style={{ width: "100%" }}
                      value={form.fieldInfo.installDate ? dayjs(form.fieldInfo.installDate) : null}
                      onChange={(date) => {
                        const value = date ? date.format("YYYY-MM-DD") : null;
                        setForm((prev: any) => {
                          const clone = structuredClone(prev);
                          clone.fieldInfo.installDate = value;
                          clone.fieldInfo.warrantyExpireDate = calcWarrantyExpireDate(
                            value,
                            clone.fieldInfo.warrantyMonths
                          );
                          return clone;
                        });
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, width: isMobile ? "100%" : "auto" }}>
                    <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                      วันที่ตรวจรับ
                    </Typography.Text>
                    <DatePicker
                      placeholder="วันที่ตรวจรับ"
                      style={{ width: "100%" }}
                      value={form.fieldInfo.inspectionDate ? dayjs(form.fieldInfo.inspectionDate) : null}
                      onChange={(date) =>
                        update(
                          "fieldInfo.inspectionDate",
                          date ? date.format("YYYY-MM-DD") : null
                        )
                      }
                    />
                  </div>
                </div>
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
              </Space>

              <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 24 }}>
                <ImageUploader
                  images={form.fieldInfo.images || []}
                  onImagesChange={(images) => update("fieldInfo.images", images)}
                  sectionName="ข้อมูลติดตั้ง/ภาคสนาม"
                />
              </div>
            </Space>
          </Card>

          {/* ---------- รายละเอียดเพิ่มเติม ---------- */}
          <Card>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <div>
                <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                  รายละเอียดเพิ่มเติม
                </Typography.Text>
                <TextArea
                  rows={4}
                  placeholder="กรอกรายละเอียดเพิ่มเติม..."
                  value={form.extra.additionalInfo || ""}
                  onChange={(e) => update("extra.additionalInfo", e.target.value)}
                />
              </div>
              <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 24 }}>
                <ImageUploader
                  images={form.extra.images || []}
                  onImagesChange={(images) => update("extra.images", images)}
                  sectionName="รายละเอียดเพิ่มเติม"
                />
              </div>
            </Space>
          </Card>

          {/* Submit Button */}
          <div style={{ display: "flex", justifyContent: isMobile ? "stretch" : "flex-end", paddingTop: 16 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              size={isMobile ? "large" : "large"} 
              style={{ minWidth: isMobile ? "100%" : 150 }}
              block={isMobile}
            >
              บันทึกข้อมูล
            </Button>
          </div>
        </Space>
      </form>
    </div>
  );
}
