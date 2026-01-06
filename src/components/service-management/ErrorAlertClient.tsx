"use client";

import { Alert, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

export default function ErrorAlertClient({ error }: { error: any }) {
  return (
    <Alert
      message="ไม่สามารถเชื่อมต่อกับ Backend Server"
      description={
        <div>
          <p style={{ marginBottom: 8 }}>
            {error?.message || "ไม่สามารถโหลดข้อมูลได้"}
          </p>
          <p style={{ margin: 0, fontSize: 14, color: "#8c8c8c" }}>
            กรุณารัน backend server โดยใช้คำสั่ง: <code style={{ background: "#f0f0f0", padding: "2px 6px", borderRadius: 4 }}>npm run dev:backend</code>
            <br />
            หรือรันทั้งสองพร้อมกัน: <code style={{ background: "#f0f0f0", padding: "2px 6px", borderRadius: 4 }}>npm run dev:all</code>
          </p>
        </div>
      }
      type="error"
      showIcon
      action={
        <Button
          icon={<ReloadOutlined />}
          onClick={() => window.location.reload()}
        >
          รีเฟรช
        </Button>
      }
    />
  );
}

