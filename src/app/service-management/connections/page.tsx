import { Suspense } from "react";
import { redirect } from "next/navigation";
import ConnectionManagerClient from "@/components/service-management/ConnectionManagerClient";
import { Spin } from "antd";

export const dynamic = "force-dynamic";

export default function ConnectionsPage({
  searchParams,
}: {
  searchParams: { hospitalId?: string };
}) {
  // ถ้าไม่มี hospitalId ให้ redirect ไปที่ list page
  if (!searchParams?.hospitalId) {
    redirect("/service-management/connections/list");
  }

  return (
    <Suspense fallback={
      <div style={{ padding: "48px", textAlign: "center" }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: "rgba(0, 0, 0, 0.65)" }}>กำลังโหลด...</div>
      </div>
    }>
      <ConnectionManagerClient />
    </Suspense>
  );
}
