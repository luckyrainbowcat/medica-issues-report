import { redirect } from "next/navigation";
import { apiGetServer, apiPutServer } from "@/lib/service-management/api";
import Form from "@/components/service-management/Form";
import FormPageLayout from "@/components/service-management/FormPageLayout";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditInstallationPage({ params }: PageProps) {
  const { id } = await params;

  const raw = await apiGetServer(`/api/installations/${id}`);

  const fieldInfoImages =
    raw.installationImages
      ?.filter((img: any) => img.category === "fieldInfo")
      .map((img: any) => img.url) ?? [];
  const extraImages =
    raw.installationImages
      ?.filter((img: any) => img.category === "extra")
      .map((img: any) => img.url) ?? [];
  const networkImages =
    raw.networkConfig?.networkImages?.map((img: any) => img.url) ?? [];
  const equipmentImages =
    raw.equipment
      ?.flatMap((eq: any) => eq.equipmentImages?.map((img: any) => img.url) ?? [])
      .filter(Boolean) ?? [];

  const existing = {
    hospital: {
      systemType: raw.systemType ?? "",
      name: raw.hospital?.name ?? "",
      department: raw.department ?? "",
      building: raw.building ?? "",
      floor: raw.floor ?? "",
      room: raw.room ?? "",
      endoscopeBrand: raw.endoscopeBrand ?? "",
      systemMode: raw.systemMode ?? "server",
    },
    equipment: raw.equipment ?? [],
    fieldInfo: {
      hasSpareSet: raw.hasSpareSet ?? false,
      spareSetNote: raw.spareNote ?? "",
      pmPerYear: raw.pmPerYear ?? null,
      warrantyMonths: raw.warrantyMonths ?? null,
      warrantyExpireDate: raw.warrantyExpireDate
        ? String(raw.warrantyExpireDate).slice(0, 10)
        : null,
      installDate: raw.installDate
        ? String(raw.installDate).slice(0, 10)
        : null,
      inspectionDate: raw.inspectionDate
        ? String(raw.inspectionDate).slice(0, 10)
        : null,
      images: fieldInfoImages,
    },
    network: {
      anydeskId: raw.networkConfig?.anydeskId ?? "",
      anydeskPassword: raw.networkConfig?.anydeskPassword ?? "",
      hospitalWifiSsid: raw.networkConfig?.hospitalWifiSsid ?? "",
      hospitalLanInfo: raw.networkConfig?.hospitalLanInfo ?? "",
      wifiUser: raw.networkConfig?.wifiUser ?? "",
      vpnDetail: raw.networkConfig?.vpnDetail ?? "",
      connectionFlags: raw.networkConfig?.connectionFlags ?? "",
      images: networkImages,
    },
    equipmentImages: equipmentImages,
    extra: {
      additionalInfo: raw.additionalInfo ?? "",
      images: extraImages,
    },
  };

  async function update(data: any) {
    "use server";
    await apiPutServer(`/api/installations/${id}`, data);
    redirect("/service-management/installations");
  }

  return (
    <FormPageLayout
      title="แก้ไขข้อมูลระบบ"
      backHref="/service-management/installations"
      backText="กลับหน้ารายการ"
    >
      <Form action={update} existing={existing} />
    </FormPageLayout>
  );
}
