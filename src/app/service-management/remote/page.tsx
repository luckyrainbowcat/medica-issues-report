import { Suspense } from "react";
import RemoteListClient from "@/components/service-management/RemoteListClient";
import { apiGetServer } from "@/lib/service-management/api";
import { Spin, Card, Space } from "antd";
import ErrorAlertClient from "@/components/service-management/ErrorAlertClient";

export const dynamic = "force-dynamic";

export default async function RemotePage() {
  let remoteData, hospitals, installations;
  
  try {
    [remoteData, hospitals, installations] = await Promise.all([
      apiGetServer("/api/remote"),
      apiGetServer("/api/hospitals"),
      apiGetServer("/api/installations"),
    ]);
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

  return (
    <Suspense fallback={
      <div style={{ padding: "48px", textAlign: "center" }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: "rgba(0, 0, 0, 0.65)" }}>กำลังโหลด...</div>
      </div>
    }>
      <RemoteListClient
        initialData={Array.isArray(remoteData) ? remoteData : []}
        hospitalOptions={Array.isArray(hospitals) ? hospitals : []}
        installationOptions={Array.isArray(installations) ? installations : []}
      />
    </Suspense>
  );
}
