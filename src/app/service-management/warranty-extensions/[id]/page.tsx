import { redirect } from "next/navigation";
import WarrantyExtensionForm from "@/components/service-management/WarrantyExtensionForm";
import { apiGetServer, apiPutServer } from "@/lib/service-management/api";
import FormPageLayout from "@/components/service-management/FormPageLayout";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditWarrantyExtensionPage({ params }: PageProps) {
  const { id } = await params;

  const [raw, installations] = await Promise.all([
    apiGetServer(`/api/warranty-extensions/${id}`),
    apiGetServer("/api/installations"),
  ]);

  const fieldInfoImages =
    raw.warrantyExtensionImages
      ?.filter((img: any) => img.category === "warrantyExtension")
      .map((img: any) => img.url) ?? [];
  const extraImages =
    raw.warrantyExtensionImages
      ?.filter((img: any) => img.category === "extra")
      .map((img: any) => img.url) ?? [];
  const equipmentImages =
    raw.warrantyExtensionImages
      ?.filter((img: any) => img.category === "equipment")
      .map((img: any) => img.url) ?? [];

  const existing = {
    latestExtensionDate: raw.latestExtensionDate
      ? String(raw.latestExtensionDate).slice(0, 10)
      : null,
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
    equipmentImages: equipmentImages,
    extra: {
      additionalInfo: raw.additionalInfo ?? "",
      images: extraImages,
    },
  };

  async function update(data: any) {
    "use server";
    await apiPutServer(`/api/warranty-extensions/${id}`, data);
    redirect("/service-management/warranty-extensions");
  }

  return (
    <FormPageLayout
      title="แก้ไขข้อมูลต่อประกัน"
      backHref="/service-management/warranty-extensions"
      backText="กลับ"
      showListButton={true}
      listHref="/service-management/warranty-extensions"
    >
      <WarrantyExtensionForm
        action={update}
        existing={existing}
        installationOptions={Array.isArray(installations) ? installations : []}
      />
    </FormPageLayout>
  );
}

