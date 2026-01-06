// Utility function สำหรับ export ข้อมูลเป็น Excel
import * as XLSX from "xlsx";

// ฟังก์ชันสำหรับดึง text จาก React element ที่ซับซ้อน
function extractTextFromReactElement(element: any): string {
  if (element === null || element === undefined) {
    return "";
  }

  // ถ้าเป็น string หรือ number ให้ return เลย
  if (typeof element === "string" || typeof element === "number") {
    return String(element);
  }

  // ถ้าเป็น object (React element)
  if (typeof element === "object") {
    // ถ้ามี props.children
    if (element.props?.children) {
      const children = element.props.children;
      
      // ถ้า children เป็น array (เช่น Space component ที่มี Tag หลายตัว)
      if (Array.isArray(children)) {
        return children
          .map((child: any) => extractTextFromReactElement(child))
          .filter((text: string) => text.trim() !== "")
          .join(", ");
      }
      
      // ถ้า children เป็น object เดียว
      return extractTextFromReactElement(children);
    }
    
    // ถ้าไม่มี children แต่มี value หรือ text
    if (element.props?.value !== undefined) {
      return String(element.props.value);
    }
    if (element.props?.text !== undefined) {
      return String(element.props.text);
    }
  }

  return "";
}

export function exportToExcel(
  data: any[],
  filename: string,
  columns: { title: string; dataIndex: string | string[]; render?: (value: any, record: any) => any; key?: string }[]
) {
  // กรองคอลัมน์ที่ไม่อยากให้ export (เช่น คอลัมน์ "จัดการ", "แก้ไข", หรือ "รูปภาพ")
  const exportableColumns = columns.filter((col) => {
    const title = col.title?.toLowerCase() || "";
    const key = col.key?.toLowerCase() || "";
    // ข้ามคอลัมน์ที่มี title หรือ key เป็น "จัดการ", "แก้ไข", "action", "รูปภาพ", "ภาพ", "image", "images"
    return (
      !title.includes("จัดการ") &&
      !title.includes("แก้ไข") &&
      !title.includes("รูปภาพ") &&
      !title.includes("ภาพ") &&
      !key.includes("action") &&
      !key.includes("จัดการ") &&
      !key.includes("แก้ไข") &&
      !key.includes("image") &&
      !key.includes("images")
    );
  });

  // สร้าง header
  const headers = exportableColumns.map((col) => col.title);

  // สร้าง rows
  const rows = data.map((record) => {
    return exportableColumns.map((col) => {
      let value: any;
      
      if (Array.isArray(col.dataIndex)) {
        // สำหรับ nested data เช่น ["hospital", "name"]
        value = col.dataIndex.reduce((obj: any, key: string) => obj?.[key], record);
      } else {
        value = record[col.dataIndex as string];
      }

      // ถ้ามี render function ให้ใช้ render
      if (col.render) {
        try {
          const rendered = col.render(value, record);
          
          // ถ้าเป็น React element หรือ object ให้ดึง text
          if (typeof rendered === "object" && rendered !== null) {
            const extractedText = extractTextFromReactElement(rendered);
            if (extractedText) {
              return extractedText;
            }
            // ถ้าไม่สามารถดึง text ได้ ให้ใช้ค่าเดิม
            return String(value || "");
          }
          
          // ถ้าเป็น string หรือ number
          return String(rendered || "");
        } catch (e) {
          // ถ้ามี error ให้ใช้ค่าเดิม
          return String(value || "");
        }
      }

      // แปลงค่าเป็น string
      if (value === null || value === undefined) {
        return "";
      }
      if (typeof value === "object") {
        return JSON.stringify(value);
      }
      return String(value);
    });
  });

  // สร้าง worksheet
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  // สร้าง workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  // Export เป็นไฟล์ Excel
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}


