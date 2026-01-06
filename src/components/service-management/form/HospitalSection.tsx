"use client";

import { useEffect, useState, useRef } from "react";
import ImageUploader from "./ImageUploader";

type Props = {
  form: any;
  setForm: (updater: any) => void;
  hospitalOptions?: Array<{ id?: string; name: string }>;
  departmentOptions?: Array<{ id?: string; name: string }>;
  errors?: Record<string, string>;
};

/** ประเภทระบบหลัก (เลือกจาก select อย่างเดียว, พิมพ์เพิ่มเองไม่ได้) */
const SYSTEM_TYPE_OPTIONS = [
  "EndoCAPTURE",
  "EndoINDEX",
  "RINX",
  "LUMINA",
  "EndoCapture V5",
];

/** checkbox ยี่ห้อกล้อง 3 ตัวหลัก */
const BRAND_OPTIONS = ["Olympus", "Fujifilm", "Pentax"] as const;
type BrandKey = (typeof BRAND_OPTIONS)[number];

/** ประเภทการติดตั้ง server/client/stand alone (checkbox multi) */
const MODE_OPTIONS = [
  { value: "server", label: "Server" },
  { value: "client", label: "Client" },
  { value: "standalone", label: "Stand alone" },
] as const;

/** LAN / Wifi / Wifi User / VPN (select single) */
const CONNECTION_OPTIONS = [
  { value: "LAN", label: "LAN โรงพยาบาล" },
  { value: "HOSPITAL_WIFI", label: "WiFi โรงพยาบาล" },
  { value: "WIFI_USER", label: "WiFi User" },
  { value: "VPN", label: "VPN" },
] as const;

export default function HospitalSection({
  form,
  setForm,
  hospitalOptions = [],
  departmentOptions = [],
  errors = {},
}: Props) {
  const hospital = form.hospital || {};
  const network = form.network || {};
  const [hospitalSelect, setHospitalSelect] = useState<string>(hospital.name || "");
  const [departmentSelect, setDepartmentSelect] = useState<string>(hospital.department || "");
  const [customHospital, setCustomHospital] = useState<string>("");
  const [customDepartment, setCustomDepartment] = useState<string>("");
  
  // ใช้ ref เพื่อเก็บค่า customHospital และ customDepartment ที่ user กำลังกรอก
  const customHospitalRef = useRef<string>("");
  const customDepartmentRef = useRef<string>("");
  const isUpdatingFromUserRef = useRef<boolean>(false);
  const lastUserInputTimeRef = useRef<number>(0);

  // sync dropdown with existing value/options (เฉพาะเมื่อโหลดครั้งแรกหรือ hospital.name เปลี่ยนจากภายนอก)
  useEffect(() => {
    // ถ้ากำลัง update จาก user input ให้ข้าม sync
    if (isUpdatingFromUserRef.current) {
      isUpdatingFromUserRef.current = false;
      return;
    }

    // ถ้า user เพิ่งกรอกไปเมื่อไม่กี่วินาทีที่แล้ว (ภายใน 1000ms) ให้ไม่ sync
    const timeSinceLastInput = Date.now() - lastUserInputTimeRef.current;
    if (timeSinceLastInput < 1000) {
      return;
    }

    const matchedHospital = hospitalOptions.find((h) => h.name === hospital.name);
    if (hospital.name) {
      if (matchedHospital) {
        // ถ้า hospital.name ตรงกับ dropdown ให้ sync
        if (hospitalSelect !== hospital.name) {
          setHospitalSelect(hospital.name);
          setCustomHospital("");
          customHospitalRef.current = "";
        }
      } else {
        // ถ้า hospital.name ไม่ตรงกับ dropdown
        // ถ้า customHospital state ตรงกับ hospital.name แสดงว่า sync แล้ว ไม่ต้อง sync อีก
        if (hospitalSelect === "__custom__" && customHospital === hospital.name) {
          return;
        }
        // ถ้า customHospitalRef มีค่าและไม่ตรงกับ hospital.name แสดงว่า user กำลังกรอกอยู่ ให้ไม่ sync
        if (customHospitalRef.current && customHospitalRef.current !== hospital.name) {
          // ไม่ sync เพราะ user กำลังกรอกอยู่
          return;
        }
        // ถ้า customHospital state ไม่ว่างและไม่ตรงกับ hospital.name แสดงว่า user กำลังกรอกอยู่ ให้ไม่ sync
        if (customHospital && customHospital.trim() !== "" && customHospital !== hospital.name) {
          // ไม่ sync เพราะ user กำลังกรอกอยู่
          return;
        }
        // ถ้า customHospitalRef ว่างหรือตรงกับ hospital.name ให้ sync
        setHospitalSelect("__custom__");
        setCustomHospital(hospital.name);
        customHospitalRef.current = hospital.name;
      }
    } else {
      // ถ้า hospital.name เป็นค่าว่าง
      if (!customHospitalRef.current && hospitalSelect !== "") {
        setHospitalSelect("");
        setCustomHospital("");
      }
    }

    const matchedDepartment = departmentOptions.find((d) => d.name === hospital.department);
    if (hospital.department) {
      if (matchedDepartment) {
        // ถ้า hospital.department ตรงกับ dropdown ให้ sync
        setDepartmentSelect(hospital.department);
        setCustomDepartment("");
        customDepartmentRef.current = "";
      } else {
        // ถ้า hospital.department ไม่ตรงกับ dropdown
        // ถ้า customDepartment state ตรงกับ hospital.department แสดงว่า sync แล้ว ไม่ต้อง sync อีก
        if (departmentSelect === "__custom__" && customDepartment === hospital.department) {
          return;
        }
        // ถ้า customDepartmentRef มีค่าและไม่ตรงกับ hospital.department แสดงว่า user กำลังกรอกอยู่ ให้ไม่ sync
        if (customDepartmentRef.current && customDepartmentRef.current !== hospital.department) {
          // ไม่ sync เพราะ user กำลังกรอกอยู่
          return;
        }
        // ถ้า customDepartment state ไม่ว่างและไม่ตรงกับ hospital.department แสดงว่า user กำลังกรอกอยู่ ให้ไม่ sync
        if (customDepartment && customDepartment.trim() !== "" && customDepartment !== hospital.department) {
          // ไม่ sync เพราะ user กำลังกรอกอยู่
          return;
        }
        // ถ้า customDepartmentRef ว่างหรือตรงกับ hospital.department ให้ sync
        setDepartmentSelect("__custom__");
        setCustomDepartment(hospital.department);
        customDepartmentRef.current = hospital.department;
      }
    } else {
      // ถ้า hospital.department เป็นค่าว่าง
      if (!customDepartmentRef.current) {
        setDepartmentSelect("");
        setCustomDepartment("");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospital.name, hospital.department, hospitalOptions, departmentOptions]);

  /* ---------- helper update form ตาม path เช่น "hospital.department" ---------- */
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
  };

  /* ---------- ยี่ห้อกล้อง Endoscope (checkbox + อื่นๆ) ---------- */

  type BrandState = {
    olympus: boolean;
    fujifilm: boolean;
    pentax: boolean;
    other: boolean;
    otherText: string;
  };

  const [brands, setBrands] = useState<BrandState>({
    olympus: false,
    fujifilm: false,
    pentax: false,
    other: false,
    otherText: "",
  });

  // parse string จาก hospital.endoscopeBrand → state checkbox
  useEffect(() => {
    const raw: string = hospital.endoscopeBrand || "";
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const next: BrandState = {
      olympus: parts.includes("Olympus"),
      fujifilm: parts.includes("Fujifilm"),
      pentax: parts.includes("Pentax"),
      other: false,
      otherText: "",
    };

    const otherPart = parts.find((p) => p.startsWith("อื่น: "));
    if (otherPart) {
      next.other = true;
      next.otherText = otherPart.replace("อื่น: ", "");
    }

    setBrands(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospital.endoscopeBrand]);

  const syncBrandToForm = (next: BrandState) => {
    const selected: string[] = [];
    if (next.olympus) selected.push("Olympus");
    if (next.fujifilm) selected.push("Fujifilm");
    if (next.pentax) selected.push("Pentax");
    if (next.other && next.otherText.trim()) {
      selected.push(`อื่น: ${next.otherText.trim()}`);
    }
    update("hospital.endoscopeBrand", selected.join(","));
  };

  const toggleBrand = (key: BrandKey) => {
    const mapKey =
      key === "Olympus" ? "olympus" : key === "Fujifilm" ? "fujifilm" : "pentax";
    const next = { ...brands, [mapKey]: !brands[mapKey as keyof BrandState] };
    setBrands(next);
    syncBrandToForm(next);
  };

  const toggleBrandOther = () => {
    const next = { ...brands, other: !brands.other };
    if (!next.other) {
      next.otherText = "";
    }
    setBrands(next);
    syncBrandToForm(next);
  };

  const changeBrandOtherText = (text: string) => {
    const next = { ...brands, otherText: text };
    setBrands(next);
    syncBrandToForm(next);
  };

  /* ---------- ประเภทการติดตั้ง (server/client/standalone) เป็น radio button (เลือกได้อันเดียว) ---------- */

  const currentMode = hospital.systemMode || "";

  /* ---------- การเชื่อมต่อ LAN / WiFi / WiFi User / VPN (checkbox single) ---------- */

  const [connectionFlag, setConnectionFlag] = useState<string>("");

  useEffect(() => {
    const raw: string = network.connectionFlags || "";
    // รับค่าแรกจาก CSV หรือใช้ค่า string โดยตรง
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setConnectionFlag(parts[0] || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network.connectionFlags]);

  const handleConnectionFlagChange = (value: string) => {
    // ถ้าเลือกอันเดิมอีกครั้ง ให้ยกเลิกการเลือก
    if (connectionFlag === value) {
      setConnectionFlag("");
      update("network.connectionFlags", "");
    } else {
      // เลือกอันใหม่ (จะยกเลิกอันเก่าอัตโนมัติ)
      setConnectionFlag(value);
      update("network.connectionFlags", value || "");
    }
  };

  /* ---------- UI ---------- */

  return (
    <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6 pb-3 border-b border-slate-200 dark:border-slate-700">
        หมวดข้อมูลโรงพยาบาล &amp; การเชื่อมต่อ
      </h2>

      {/* แถวหลัก: โรงพยาบาล / แผนก / อาคาร / ชั้น / ห้อง / ประเภทระบบ */}
      <div className="grid grid-cols-2 gap-6">
        {/* ประเภทระบบหลัก (select) */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">ประเภทระบบ</label>
          <select
            className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
            value={hospital.systemType || ""}
            onChange={(e) => update("hospital.systemType", e.target.value)}
          >
            <option value="">-- เลือกประเภทระบบ --</option>
            {SYSTEM_TYPE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* ชื่อโรงพยาบาล (dropdown + กรอกเอง) */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">ชื่อโรงพยาบาล</label>
          <select
            className={`border ${
              errors["hospital.name"]
                ? "border-red-500 focus:ring-red-500"
                : "border-slate-300 dark:border-slate-600 focus:ring-blue-500"
            } dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:border-transparent transition-all bg-white`}
            value={hospitalSelect}
            onChange={(e) => {
              const value = e.target.value;
              setHospitalSelect(value);
              if (value === "__custom__") {
                // ถ้าเลือก custom ให้ใช้ค่าจาก customHospitalRef หรือ customHospital
                const currentCustomValue = customHospitalRef.current || customHospital;
                isUpdatingFromUserRef.current = true;
                lastUserInputTimeRef.current = Date.now();
                customHospitalRef.current = currentCustomValue;
                setCustomHospital(currentCustomValue);
                update("hospital.name", currentCustomValue);
              } else {
                isUpdatingFromUserRef.current = true;
                lastUserInputTimeRef.current = Date.now();
                setCustomHospital("");
                customHospitalRef.current = "";
                update("hospital.name", value || "");
              }
            }}
          >
            <option value="">-- เลือกโรงพยาบาล --</option>
            {hospitalOptions.map((h) => (
              <option key={h.id || h.name} value={h.name}>
                {h.name}
              </option>
            ))}
            <option value="__custom__">อื่น ๆ (กรอกเอง)</option>
          </select>
          {hospitalSelect === "__custom__" && (
            <input
              className={`border ${
                errors["hospital.name"]
                  ? "border-red-500 focus:ring-red-500"
                  : "border-slate-300 dark:border-slate-600 focus:ring-blue-500"
              } dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
              placeholder="ระบุชื่อโรงพยาบาล"
              value={customHospital}
              onChange={(e) => {
                const newValue = e.target.value;
                isUpdatingFromUserRef.current = true;
                lastUserInputTimeRef.current = Date.now();
                customHospitalRef.current = newValue;
                setCustomHospital(newValue);
                update("hospital.name", newValue);
              }}
            />
          )}
          {errors["hospital.name"] && (
            <p className="text-sm text-red-600">{errors["hospital.name"]}</p>
          )}
        </div>

        {/* แผนก (dropdown + กรอกเอง) */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">แผนก</label>
          <select
            className={`border ${
              errors["hospital.department"]
                ? "border-red-500 focus:ring-red-500"
                : "border-slate-300 dark:border-slate-600 focus:ring-blue-500"
            } dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:border-transparent transition-all bg-white`}
            value={departmentSelect}
            onChange={(e) => {
              const value = e.target.value;
              setDepartmentSelect(value);
              if (value === "__custom__") {
                // ถ้าเลือก custom ให้ใช้ค่าจาก customDepartmentRef หรือ customDepartment
                const currentCustomValue = customDepartmentRef.current || customDepartment;
                isUpdatingFromUserRef.current = true;
                customDepartmentRef.current = currentCustomValue;
                setCustomDepartment(currentCustomValue);
                update("hospital.department", currentCustomValue);
              } else {
                isUpdatingFromUserRef.current = true;
                setCustomDepartment("");
                customDepartmentRef.current = "";
                update("hospital.department", value || "");
              }
            }}
          >
            <option value="">-- เลือกแผนก --</option>
            {departmentOptions.map((d) => (
              <option key={d.id || d.name} value={d.name}>
                {d.name}
              </option>
            ))}
            <option value="__custom__">อื่น ๆ (กรอกเอง)</option>
          </select>
          {departmentSelect === "__custom__" && (
            <input
              className={`border ${
                errors["hospital.department"]
                  ? "border-red-500 focus:ring-red-500"
                  : "border-slate-300 dark:border-slate-600 focus:ring-blue-500"
              } dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
              placeholder="ศัลยกรรม / อายุรกรรม ฯลฯ"
              value={customDepartment}
              onChange={(e) => {
                const newValue = e.target.value;
                isUpdatingFromUserRef.current = true;
                customDepartmentRef.current = newValue;
                setCustomDepartment(newValue);
                update("hospital.department", newValue);
              }}
            />
          )}
          {errors["hospital.department"] && (
            <p className="text-sm text-red-600">{errors["hospital.department"]}</p>
          )}
        </div>

        {/* อาคาร */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">อาคาร</label>
          <input
            className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={hospital.building || ""}
            onChange={(e) => update("hospital.building", e.target.value)}
          />
        </div>

        {/* ชั้น */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">ชั้น</label>
          <input
            className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={hospital.floor || ""}
            onChange={(e) => update("hospital.floor", e.target.value)}
          />
        </div>

        {/* ห้อง */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">ห้อง</label>
          <input
            className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={hospital.room || ""}
            onChange={(e) => update("hospital.room", e.target.value)}
          />
        </div>
      </div>

      {/* ยี่ห้อกล้อง Endoscope (checkbox) */}
      <div className="mt-6 space-y-3 pt-6 border-t border-slate-100 dark:border-slate-700">
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          ยี่ห้อกล้อง Endoscope <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(เลือกได้หลายตัว)</span>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={brands.olympus}
              onChange={() => toggleBrand("Olympus")}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-slate-700 dark:text-slate-300">Olympus</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={brands.fujifilm}
              onChange={() => toggleBrand("Fujifilm")}
              className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-slate-700 dark:text-slate-300">Fujifilm</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={brands.pentax}
              onChange={() => toggleBrand("Pentax")}
              className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-slate-700 dark:text-slate-300">Pentax</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={brands.other}
              onChange={toggleBrandOther}
              className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-slate-700 dark:text-slate-300">อื่น ๆ</span>
          </label>
          {brands.other && (
            <input
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="ระบุยี่ห้ออื่น ๆ"
              value={brands.otherText}
              onChange={(e) => changeBrandOtherText(e.target.value)}
            />
          )}
        </div>
      </div>

      {/* ประเภทการติดตั้ง (server / client / stand alone) เป็น radio button (เลือกได้อันเดียว) */}
      <div className="mt-6 space-y-3 pt-6 border-t border-slate-100 dark:border-slate-700">
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          ประเภทการติดตั้งระบบ <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(เลือกได้อันเดียว)</span>
        </div>
        <div className="flex flex-wrap gap-4">
          {MODE_OPTIONS.map((m) => (
            <label key={m.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="systemMode"
                checked={currentMode === m.value}
                onChange={() => update("hospital.systemMode", m.value)}
                className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-slate-700 dark:text-slate-300">{m.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* AnyDesk + การเชื่อมต่อ LAN/WiFi/WiFi User + VPN */}
      <div id="network" className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-6">
        {/* AnyDesk */}
        <div className="space-y-3">
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">AnyDesk</div>
          <input
            className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="AnyDesk ID"
            value={network.anydeskId || ""}
            onChange={(e) => update("network.anydeskId", e.target.value)}
          />
          <input
            className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="AnyDesk Password"
            value={network.anydeskPassword || ""}
            onChange={(e) =>
              update("network.anydeskPassword", e.target.value)
            }
          />
        </div>

        {/* การเชื่อมต่อ + VPN */}
        <div className="space-y-3">
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            การเชื่อมต่อเครือข่าย
          </div>
          <div className="flex flex-col gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
            {CONNECTION_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="connectionFlag"
                  checked={connectionFlag === opt.value}
                  onChange={() => handleConnectionFlagChange(opt.value)}
                  className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-slate-700 dark:text-slate-300">{opt.label}</span>
              </label>
            ))}
          </div>

          {/* แสดงช่อง VPN เฉพาะเมื่อเลือก VPN */}
          {connectionFlag === "VPN" && (
            <div className="mt-2">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">รายละเอียด VPN</div>
              <input
                className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="รายละเอียด VPN"
                value={network.vpnDetail || ""}
                onChange={(e) => update("network.vpnDetail", e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* รูปภาพการเชื่อมต่อ */}
      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
        <ImageUploader
          images={network.images || []}
          onImagesChange={(images) => {
            const keys = "network.images".split(".");
            setForm((prev: any) => {
              const clone = structuredClone(prev);
              let ref: any = clone;
              for (let i = 0; i < keys.length - 1; i++) {
                ref = ref[keys[i]];
              }
              ref[keys[keys.length - 1]] = images;
              return clone;
            });
          }}
          sectionName="การเชื่อมต่อ"
        />
      </div>
    </section>
  );
}
