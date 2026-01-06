import { redirect } from "next/navigation";
import HospitalForm from "@/components/service-management/HospitalForm";
import { apiPostServer } from "@/lib/service-management/api";
import FormPageLayout from "@/components/service-management/FormPageLayout";

export const dynamic = "force-dynamic";

export default function NewHospitalPage() {
  async function create(data: any) {
    "use server";
    await apiPostServer("/api/hospitals", data);
    redirect("/service-management/hospitals");
  }

  return (
    <FormPageLayout
      title="ลงทะเบียนโรงพยาบาล"
      backHref="/service-management/hospitals"
      backText="กลับ"
      showListButton={true}
      listHref="/service-management/hospitals"
    >
      <HospitalForm action={create} />
    </FormPageLayout>
  );
}
