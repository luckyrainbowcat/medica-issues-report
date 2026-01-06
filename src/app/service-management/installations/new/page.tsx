import { redirect } from "next/navigation";
import Form from "@/components/service-management/Form";
import { apiPostServer } from "@/lib/service-management/api";
import FormPageLayout from "@/components/service-management/FormPageLayout";

export const dynamic = "force-dynamic";

export default function NewInstallationPage() {
  async function create(data: any) {
    "use server";
    await apiPostServer("/api/installations", data);
    redirect("/service-management/installations");
  }

  return (
    <FormPageLayout
      title="เพิ่มข้อมูลระบบใหม่"
      backHref="/service-management/installations"
      backText="กลับ"
      showListButton={true}
      listHref="/service-management/installations"
    >
      <Form action={create} />
    </FormPageLayout>
  );
}
