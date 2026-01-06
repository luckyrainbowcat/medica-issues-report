import { redirect } from "next/navigation";
import SimForm from "@/components/service-management/SimForm";
import { apiGetServer, apiPutServer } from "@/lib/service-management/api";
import FormPageLayout from "@/components/service-management/FormPageLayout";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditSimPage({ params }: PageProps) {
  const { id } = await params;
  const [existing, hospitals, departments] = await Promise.all([
    apiGetServer(`/api/sims/${id}`),
    apiGetServer("/api/hospitals"),
    apiGetServer("/api/departments"),
  ]);

  async function update(data: any) {
    "use server";
    await apiPutServer(`/api/sims/${id}`, data);
    redirect("/service-management/sims");
  }

  const mappedExisting = {
    ...existing,
    networkFlags: existing?.networkFlags
      ? String(existing.networkFlags)
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [],
  };

  return (
    <FormPageLayout
      title="แก้ไขข้อมูลซิม"
      backHref="/service-management/sims"
      backText="กลับหน้ารายการ"
    >
      <SimForm
        action={update}
        existing={mappedExisting}
        hospitalOptions={Array.isArray(hospitals) ? hospitals : []}
        departmentOptions={Array.isArray(departments) ? departments : []}
      />
    </FormPageLayout>
  );
}
