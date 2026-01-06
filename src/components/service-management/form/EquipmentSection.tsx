"use client";

import React from "react";

type Props = {
  form: any;
  setForm: (updater: any) => void;
  errors?: Record<string, string>;
  clearError?: (key: string) => void;
};

/* ---------- CONFIG ประเภทอุปกรณ์ ---------- */

const EQUIPMENT_TYPE_OPTIONS = [
  { value: "COMPUTER", label: "คอมพิวเตอร์ (COMPUTER)" },
  { value: "MONITOR", label: "จอภาพ (MONITOR)" },
  { value: "SPEAKER", label: "ลำโพง (SPEAKER)" },
  { value: "KEYBOARD", label: "คีย์บอร์ด (KEYBOARD)" },
  { value: "MOUSE", label: "เมาส์ (MOUSE)" },
  { value: "CAPTURE_CARD", label: "การ์ด Capture (CAPTURE_CARD)" },
  { value: "UPS", label: "UPS" },
  { value: "CABLE_SDI", label: "สาย SDI" },
  { value: "CABLE_HDMI", label: "สาย HDMI" },
  { value: "HAND_SWITCH_CABLE", label: "สาย Hand Switch" },
  { value: "FOOT_SWITCH", label: "Foot Switch" },
  { value: "PRINTER", label: "ปริ๊นเตอร์ (PRINTER)" },
  { value: "CART", label: "รถ/แคร่ (CART)" },
  { value: "SWITCHER", label: "Switcher" },
  { value: "ROUTER", label: "Router" },
  { value: "POWER_STRIP", label: "ปลั๊กพ่วง" },
  { value: "LAN_CABLE", label: "สาย LAN" },
  { value: "SPEEDTER", label: "Speedter" },
];

// ต้องมี SN ทุกเครื่อง (บังคับกรอก)
const SN_MANDATORY = ["COMPUTER", "MONITOR"];

// มี SN ได้ แต่ไม่บังคับ
const SN_OPTIONAL = [
  "UPS",
  "PRINTER",
  "CAPTURE_CARD",
  "CABLE_SDI",
  "CABLE_HDMI",
  "HAND_SWITCH_CABLE",
];

// สำหรับ flag รายละเอียด (ติ๊กได้หลายตัว)
const KEY_MOUSE_CONN_OPTIONS = ["USB", "WIRELESS"] as const;
const CAPTURE_SIGNAL_OPTIONS = ["SDI", "HDMI", "ALL_IN_ONE", "OTHER"] as const;
const FOOT_SWITCH_OPTIONS = ["SINGLE", "DOUBLE"] as const;

export default function EquipmentSection({ form, setForm, errors = {}, clearError }: Props) {
  const equipment: any[] = form.equipment || [];

  // helper เอา row ตาม type
  const findRow = (type: string) =>
    equipment.find((e) => e.equipmentType === type);

  // toggle เลือก / ยกเลิกอุปกรณ์ชนิดหนึ่ง (checkbox)
  const toggleEquipment = (type: string) => {
    setForm((prev: any) => {
      const list: any[] = prev.equipment || [];
      const idx = list.findIndex((e) => e.equipmentType === type);

      // ถ้ามีอยู่แล้ว → ยกเลิก (ลบออก)
      if (idx >= 0) {
        const next = [...list];
        next.splice(idx, 1);
        return { ...prev, equipment: next };
      }

      // ถ้ายังไม่มี → เพิ่ม row ใหม่ (quantity = 1, SN 1 ช่อง)
      const next = [
        ...list,
        {
          equipmentType: type,
          quantity: 1,
          // SN หลักเก็บเป็น string
          serialNumber: "",
          // SN array สำหรับ UI
          serialNumbers: [""],
          lengthM: null,
          connectionType: "", // ใช้เก็บ USB/WIRELESS (หลายตัวได้, comma-separated)
          signalType: "", // SDI/HDMI/ALL_IN_ONE (comma-separated)
          footSwitchMode: "", // SINGLE/DOUBLE (comma-separated)
          notes: "",
        },
      ];
      return { ...prev, equipment: next };
    });
  };

  const updateRow = (type: string, updater: (row: any) => any) => {
    setForm((prev: any) => {
      const list: any[] = prev.equipment || [];
      const idx = list.findIndex((e) => e.equipmentType === type);
      if (idx < 0) return prev;
      const row = list[idx];
      const updated = updater(row);
      const next = [...list];
      next[idx] = updated;
      return { ...prev, equipment: next };
    });
  };

  // ให้ array SN ตาม quantity
  const getSnArray = (row: any): string[] => {
    const q = Math.max(1, Number(row.quantity) || 1);
    let arr: string[] = [];

    if (Array.isArray(row.serialNumbers)) {
      arr = [...row.serialNumbers];
    } else if (typeof row.serialNumber === "string" && row.serialNumber) {
      arr = row.serialNumber.split(",").map((s: string) => s.trim());
    }

    while (arr.length < q) arr.push("");
    if (arr.length > q) arr = arr.slice(0, q);

    return arr;
  };

  const updateSnArray = (type: string, nextArr: string[]) => {
    clearError?.(`equipment.${type}.sn`);
    updateRow(type, (row) => {
      return {
        ...row,
        serialNumbers: nextArr,
        serialNumber: nextArr.join(",").trim(),
      };
    });
  };

  const toggleFlag = (
    type: string,
    field: "connectionType" | "signalType" | "footSwitchMode",
    value: string
  ) => {
    updateRow(type, (row) => {
      const raw: string = row[field] || "";
      const parts = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      let next: string[];
      if (parts.includes(value)) {
        next = parts.filter((x) => x !== value);
      } else {
        next = [...parts, value];
      }
      return {
        ...row,
        [field]: next.join(","),
      };
    });
  };

  return (
    <div className="space-y-4">
      {EQUIPMENT_TYPE_OPTIONS.map((opt) => {
        const row = findRow(opt.value);
        const checked = !!row;
        const isMandatory = SN_MANDATORY.includes(opt.value);
        const isOptionalSn = SN_OPTIONAL.includes(opt.value);

        const isCable = [
          "CABLE_SDI",
          "CABLE_HDMI",
          "HAND_SWITCH_CABLE",
          "LAN_CABLE",
        ].includes(opt.value);

        const isKeyMouse = ["KEYBOARD", "MOUSE"].includes(opt.value);
        const isCapture = opt.value === "CAPTURE_CARD";
        const isFoot = opt.value === "FOOT_SWITCH";

        const quantity = row ? Math.max(1, Number(row.quantity) || 1) : 1;
        const snArray = row ? getSnArray(row) : [];

        const connFlags = row?.connectionType
          ? row.connectionType
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [];

        const signalFlags = row?.signalType
          ? row.signalType
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [];

        const footFlags = row?.footSwitchMode
          ? row.footSwitchMode
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [];

        return (
          <div
            key={opt.value}
            className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors space-y-3"
          >
              {/* แถวหลัก: checkbox + ชื่ออุปกรณ์ + จำนวน + หน่วย */}
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleEquipment(opt.value)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="font-medium text-slate-700">{opt.label}</span>
                </label>

                {checked && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600 dark:text-slate-400">จำนวน</span>
                      <input
                        type="number"
                        min={1}
                        className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-1.5 w-20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={row?.quantity ?? 1}
                        onChange={(e) => {
                          const q = e.target.value
                            ? Number(e.target.value)
                            : 1;
                          updateRow(opt.value, (r) => {
                            const qFixed = Math.max(1, q);
                            const cur = { ...r, quantity: qFixed };
                            const arr = getSnArray(cur);
                            return {
                              ...cur,
                              serialNumbers: arr,
                              serialNumber: arr.join(",").trim(),
                            };
                          });
                        }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* ส่วนขยาย (SN + detail) เฉพาะตอนที่เลือกแล้ว */}
              {checked && (
                <div className="space-y-4 pl-6 border-l-2 border-blue-200 dark:border-blue-800">
                  {/* SN บังคับทุกตัว */}
                  {isMandatory && (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Serial Number <span className="text-red-600 dark:text-red-400">*</span> (ต้องกรอกให้ครบ {quantity} เครื่อง)
                      </div>
                      {errors[`equipment.${opt.value}.sn`] && (
                        <p className="text-sm text-red-600">
                          {errors[`equipment.${opt.value}.sn`]}
                        </p>
                      )}
                      <div className="space-y-2">
                        {Array.from({ length: quantity }).map((_, idx) => (
                          <input
                            key={idx}
                            className={`border ${
                              errors[`equipment.${opt.value}.sn`]
                                ? "border-red-500 focus:ring-red-500"
                                : "border-slate-300 dark:border-slate-600 focus:ring-blue-500"
                            } dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
                            placeholder={`SN เครื่องที่ ${idx + 1}`}
                            value={snArray[idx] || ""}
                            onChange={(e) => {
                              const next = [...snArray];
                              next[idx] = e.target.value;
                              updateSnArray(opt.value, next);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SN ไม่บังคับ แต่กรอกได้หลายตัว */}
                  {isOptionalSn && (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Serial Number (ถ้ามีให้กรอกได้หลายตัว)
                      </div>
                      <div className="space-y-2">
                        {Array.from({ length: quantity }).map((_, idx) => {
                          if (idx === 0) {
                            return (
                              <input
                                key={idx}
                                className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="SN ตัวแรก (ไม่บังคับ)"
                                value={snArray[idx] || ""}
                                onChange={(e) => {
                                  const next = [...snArray];
                                  next[idx] = e.target.value;
                                  updateSnArray(opt.value, next);
                                }}
                              />
                            );
                          }
                          // ช่องที่ 2 ขึ้นไป แสดงเฉพาะเมื่อช่องก่อนหน้ามีค่า
                          if (!snArray[idx - 1]?.trim()) return null;
                          return (
                            <input
                              key={idx}
                              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                              placeholder={`SN ตัวที่ ${idx + 1}`}
                              value={snArray[idx] || ""}
                              onChange={(e) => {
                                const next = [...snArray];
                                next[idx] = e.target.value;
                                updateSnArray(opt.value, next);
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ความยาวสาย สำหรับสายต่าง ๆ */}
                  {isCable && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600 dark:text-slate-400">ความยาวสายรวม</span>
                      <input
                        type="number"
                        className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-1.5 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="เมตร"
                        value={row?.lengthM ?? ""}
                        onChange={(e) =>
                          updateRow(opt.value, (r) => ({
                            ...r,
                            lengthM: e.target.value
                              ? Number(e.target.value)
                              : null,
                          }))
                        }
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">เมตร</span>
                    </div>
                  )}

                  {/* รายละเอียดยิบย่อย: Keyboard / Mouse → USB / Wireless (checkbox multi) */}
                  {isKeyMouse && (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        การเชื่อมต่อ (เลือกได้หลายแบบ)
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {KEY_MOUSE_CONN_OPTIONS.map((flag) => (
                          <label
                            key={flag}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={connFlags.includes(flag)}
                              onChange={() =>
                                toggleFlag(
                                  opt.value,
                                  "connectionType",
                                  flag as string
                                )
                              }
                              className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <span className="text-slate-700 dark:text-slate-300">{flag}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Capture card → SDI / HDMI / All-in-one / อื่นๆ */}
                  {isCapture && (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        ประเภทสัญญาณ (เลือกได้หลายแบบ)
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {CAPTURE_SIGNAL_OPTIONS.map((flag) => (
                          <label
                            key={flag}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={signalFlags.includes(flag)}
                              onChange={() =>
                                toggleFlag(
                                  opt.value,
                                  "signalType",
                                  flag as string
                                )
                              }
                              className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <span className="text-slate-700 dark:text-slate-300">
                              {flag === "OTHER" ? "อื่นๆ" : flag}
                            </span>
                          </label>
                        ))}
                      </div>
                      {signalFlags.includes("OTHER") && (
                        <div className="mt-2">
                          <input
                            type="text"
                            placeholder="ระบุประเภทสัญญาณอื่นๆ..."
                            value={row?.notes || ""}
                            onChange={(e) =>
                              updateRow(opt.value, (prev) => ({
                                ...prev,
                                notes: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-200"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Foot switch → เดี่ยว / คู่ */}
                  {isFoot && (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        ประเภท Foot Switch (เลือกได้หลายแบบ)
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {FOOT_SWITCH_OPTIONS.map((flag) => (
                          <label
                            key={flag}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={footFlags.includes(flag)}
                              onChange={() =>
                                toggleFlag(
                                  opt.value,
                                  "footSwitchMode",
                                  flag as string
                                )
                              }
                              className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <span className="text-slate-700 dark:text-slate-300">
                              {flag === "SINGLE" ? "เดี่ยว" : "คู่"}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* หมายเหตุ */}
                  <div>
                    <textarea
                      className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      rows={2}
                      placeholder="หมายเหตุเพิ่มเติมของอุปกรณ์นี้"
                      value={row?.notes || ""}
                      onChange={(e) =>
                        updateRow(opt.value, (r) => ({
                          ...r,
                          notes: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
  );
}
