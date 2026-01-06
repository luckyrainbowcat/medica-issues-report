import { redirect } from "next/navigation";
import SimForm from "@/components/service-management/SimForm";
import { apiGetServer, apiPostServer } from "@/lib/service-management/api";
import FormPageLayout from "@/components/service-management/FormPageLayout";

export const dynamic = "force-dynamic";

export default async function NewSimPage() {
  const [hospitals, departments] = await Promise.all([
    apiGetServer("/api/hospitals"),
    apiGetServer("/api/departments"),
  ]);

  async function create(data: any) {
    "use server";
    await apiPostServer("/api/sims", data);
    redirect("/service-management/sims");
  }

  return (
    <FormPageLayout
      title="ลงทะเบียนซิมการ์ด"
      backHref="/service-management/sims"
      backText="กลับ"
      showListButton={true}
      listHref="/service-management/sims"
    >
      <SimForm
        action={create}
        hospitalOptions={Array.isArray(hospitals) ? hospitals : []}
        departmentOptions={Array.isArray(departments) ? departments : []}
      />
    </FormPageLayout>
  );
}
