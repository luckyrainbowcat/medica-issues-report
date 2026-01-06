import ConnectionListClient from "@/components/service-management/ConnectionListClient";
import { apiGetServer } from "@/lib/service-management/api";

export const dynamic = "force-dynamic";

export default async function ConnectionsListPage() {
  const data = await apiGetServer("/api/connections");
  return (
    <ConnectionListClient
      initialData={Array.isArray(data) ? data : []}
    />
  );
}

