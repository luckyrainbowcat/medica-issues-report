"use client";

type Props = {
  form: any;
  setForm: (updater: any) => void;
};

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

export default function FieldInfoSection({ form, setForm }: Props) {
  const fieldInfo = form.fieldInfo || {};

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

  return (
    <section className="border p-4 rounded">
      <h2 className="font-bold mb-4">หมวดข้อมูลติดตั้ง / ภาคสนาม</h2>

      {/* มีชุดสำรอง + free text ถ้าติ๊ก */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={!!fieldInfo.hasSpareSet}
          onChange={(e) =>
            update("fieldInfo.hasSpareSet", e.target.checked)
          }
        />
        <span>มีชุดสำรอง</span>
        {fieldInfo.hasSpareSet && (
          <input
            className="border p-2 rounded flex-1"
            placeholder="รายละเอียดชุดสำรอง เช่น เก็บไว้ที่ห้องไหน / จำนวนเท่าใด ฯลฯ"
            value={fieldInfo.spareSetNote || ""}
            onChange={(e) =>
              update("fieldInfo.spareSetNote", e.target.value)
            }
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* PM/year */}
        <div className="flex flex-col gap-1">
          <label className="font-semibold mb-1">PM ต่อปี (ครั้ง/ปี)</label>
          <input
            type="number"
            className="border p-2 rounded"
            value={fieldInfo.pmPerYear ?? ""}
            onChange={(e) =>
              update(
                "fieldInfo.pmPerYear",
                e.target.value ? Number(e.target.value) : null
              )
            }
          />
        </div>

        {/* Warranty months */}
        <div className="flex flex-col gap-1">
          <label className="font-semibold mb-1">ประกัน (เดือน)</label>
          <input
            type="number"
            className="border p-2 rounded"
            value={fieldInfo.warrantyMonths ?? ""}
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

        {/* วันที่ติดตั้งระบบ */}
        <div className="flex flex-col gap-1">
          <label className="font-semibold mb-1">วันที่ติดตั้งระบบ</label>
          <input
            type="date"
            className="border p-2 rounded"
            value={
              fieldInfo.installDate
                ? String(fieldInfo.installDate).slice(0, 10)
                : ""
            }
            onChange={(e) => {
              const value = e.target.value || null;
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

        {/* วันที่ตรวจรับ */}
        <div className="flex flex-col gap-1">
          <label className="font-semibold mb-1">วันที่ตรวจรับ</label>
          <input
            type="date"
            className="border p-2 rounded"
            value={
              fieldInfo.inspectionDate
                ? String(fieldInfo.inspectionDate).slice(0, 10)
                : ""
            }
            onChange={(e) =>
              update(
                "fieldInfo.inspectionDate",
                e.target.value ? e.target.value : null
              )
            }
          />
        </div>

        {/* วันที่หมดประกัน (auto) */}
        <div className="flex flex-col gap-1">
          <label className="font-semibold mb-1">วันที่หมดประกัน (คำนวณอัตโนมัติ)</label>
          <input
            type="date"
            className="border p-2 rounded bg-gray-100 cursor-not-allowed"
            readOnly
            value={
              fieldInfo.warrantyExpireDate
                ? String(fieldInfo.warrantyExpireDate).slice(0, 10)
                : ""
            }
          />
        </div>
      </div>
    </section>
  );
}
