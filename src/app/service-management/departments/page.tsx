import DepartmentListClient from "@/components/service-management/DepartmentListClient";
import { apiGetServer } from "@/lib/service-management/api";
import { Card, Space } from "antd";
import ErrorAlertClient from "@/components/service-management/ErrorAlertClient";

export default async function DepartmentsPage() {
  let data;
  try {
    data = await apiGetServer("/api/departments");
  } catch (error: any) {
    return (
      <div style={{ padding: "24px", background: "#f0f2f5", minHeight: "100vh" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Card>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <ErrorAlertClient error={error} />
            </Space>
          </Card>
        </div>
      </div>
    );
  }
  
  return <DepartmentListClient initialData={Array.isArray(data) ? data : []} variant="full" />;
}

