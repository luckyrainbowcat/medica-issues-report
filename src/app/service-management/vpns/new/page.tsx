import VpnFormClient from "@/components/service-management/VpnFormClient";
import { apiGetServer } from "@/lib/service-management/api";
import FormPageLayout from "@/components/service-management/FormPageLayout";

export const dynamic = "force-dynamic";

export default async function NewVpnPage() {
  const [hospitals, installations] = await Promise.all([
    apiGetServer("/api/hospitals"),
    apiGetServer("/api/installations"),
  ]);

  return (
    <FormPageLayout
      title="เพิ่ม VPN ใหม่"
      backHref="/service-management/vpns"
      backText="กลับ"
    >
      <VpnFormClient
        hospitalOptions={Array.isArray(hospitals) ? hospitals : []}
        installationOptions={Array.isArray(installations) ? installations : []}
      />
    </FormPageLayout>
  );
}
