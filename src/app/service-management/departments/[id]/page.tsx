import { redirect } from "next/navigation";
import DepartmentForm from "@/components/service-management/DepartmentForm";
import { apiGetServer, apiPutServer } from "@/lib/service-management/api";
import FormPageLayout from "@/components/service-management/FormPageLayout";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditDepartmentPage({ params }: PageProps) {
  const { id } = await params;
  const existing = await apiGetServer(`/api/departments/${id}`);

  async function update(data: any) {
    "use server";
    await apiPutServer(`/api/departments/${id}`, data);
    redirect("/service-management/departments");
  }

  return (
    <FormPageLayout
      title="แก้ไขแผนก"
      backHref="/service-management/departments"
      backText="กลับหน้ารายการ"
    >
      <DepartmentForm action={update} existing={existing} />
    </FormPageLayout>
  );
}
