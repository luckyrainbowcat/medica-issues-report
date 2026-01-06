import { redirect } from "next/navigation";
import DepartmentForm from "@/components/service-management/DepartmentForm";
import { apiPostServer } from "@/lib/service-management/api";
import FormPageLayout from "@/components/service-management/FormPageLayout";

export const dynamic = "force-dynamic";

export default function NewDepartmentPage() {
  async function create(data: any) {
    "use server";
    await apiPostServer("/api/departments", data);
    redirect("/service-management/departments");
  }

  return (
    <FormPageLayout
      title="เพิ่มแผนก"
      backHref="/service-management/departments"
      backText="กลับ"
      showListButton={true}
      listHref="/service-management/departments"
    >
      <DepartmentForm action={create} />
    </FormPageLayout>
  );
}
