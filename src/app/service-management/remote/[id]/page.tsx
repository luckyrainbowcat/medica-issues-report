import { apiGetServer } from "@/lib/service-management/api";
import RemoteFormClient from "@/components/service-management/RemoteFormClient";
import FormPageLayout from "@/components/service-management/FormPageLayout";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function EditRemotePage({ params }: PageProps) {
  const { id } = await params;
  const installationId = id;

  const raw = await apiGetServer(`/api/installations/${installationId}`);

  const networkImages =
    raw.networkConfig?.networkImages?.map((img: any) => img.url) ?? [];

  const remoteData = await apiGetServer("/api/remote");
  const currentRemote = Array.isArray(remoteData)
    ? remoteData.find((r: any) => String(r.id) === String(installationId))
    : null;
  const vpns = currentRemote?.vpnInstallations?.map((vi: any) => vi.vpn) || [];

  const [hospitals, installations] = await Promise.all([
    apiGetServer("/api/hospitals"),
    apiGetServer("/api/installations"),
  ]);

  // ดึง hospitalId จาก raw.hospital.id หรือ raw.hospitalId (legacy)
  const currentHospitalId = raw.hospital?.id || raw.hospitalId || null;

  const existing = {
    anydeskId: raw.networkConfig?.anydeskId ?? "",
    anydeskPassword: raw.networkConfig?.anydeskPassword ?? "",
    hospitalWifiSsid: raw.networkConfig?.hospitalWifiSsid ?? "",
    hospitalLanInfo: raw.networkConfig?.hospitalLanInfo ?? "",
    wifiUser: raw.networkConfig?.wifiUser ?? "",
    vpnDetail: raw.networkConfig?.vpnDetail ?? "",
    connectionFlags: raw.networkConfig?.connectionFlags ?? "",
    images: networkImages,
  };

  return (
    <FormPageLayout
      title="แก้ไขข้อมูลการรีโมต"
      backHref="/service-management/remote"
      backText="กลับหน้ารายการ"
    >
      <RemoteFormClient
        installationId={installationId}
        existing={existing}
        vpns={vpns}
        currentHospitalId={currentHospitalId}
        hospitalOptions={Array.isArray(hospitals) ? hospitals : []}
        installationOptions={Array.isArray(installations) ? installations : []}
      />
    </FormPageLayout>
  );
}
