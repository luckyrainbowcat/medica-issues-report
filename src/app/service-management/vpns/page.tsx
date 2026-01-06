import VpnListClient from "@/components/service-management/VpnListClient";
import { apiGetServer } from "@/lib/service-management/api";

export const dynamic = "force-dynamic";

export default async function VpnsPage() {
  const vpnData = await apiGetServer("/api/vpns");

  return (
    <VpnListClient
      initialData={Array.isArray(vpnData) ? vpnData : []}
    />
  );
}
