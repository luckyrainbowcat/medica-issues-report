import VpnFormClient from "@/components/service-management/VpnFormClient";
import { apiGetServer } from "@/lib/service-management/api";
import FormPageLayout from "@/components/service-management/FormPageLayout";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function EditVpnPage({ params }: PageProps) {
  const { id } = await params;
  const [vpn, hospitals, installations] = await Promise.all([
    apiGetServer(`/api/vpns/${id}`),
    apiGetServer("/api/hospitals"),
    apiGetServer("/api/installations"),
  ]);

  return (
    <FormPageLayout
      title="แก้ไข VPN"
      backHref="/service-management/vpns"
      backText="กลับ"
    >
      <VpnFormClient
        existing={vpn}
        hospitalOptions={Array.isArray(hospitals) ? hospitals : []}
        installationOptions={Array.isArray(installations) ? installations : []}
      />
    </FormPageLayout>
  );
}
