import { redirect } from "next/navigation";
import WarrantyExtensionForm from "@/components/service-management/WarrantyExtensionForm";
import { apiGetServer, apiPostServer } from "@/lib/service-management/api";
import FormPageLayout from "@/components/service-management/FormPageLayout";

export const dynamic = "force-dynamic";

export default async function NewWarrantyExtensionPage() {
  const [installations] = await Promise.all([
    apiGetServer("/api/installations"),
  ]);

  async function create(data: any) {
    "use server";
    try {
      console.log("[create warranty extension] Starting server action");
      console.log("[create warranty extension] Data:", JSON.stringify(data, null, 2));
      const result = await apiPostServer("/api/warranty-extensions", data);
      console.log("[create warranty extension] Success:", result);
      redirect("/service-management/warranty-extensions");
    } catch (error: any) {
      console.error("[create warranty extension] Error:", error);
      throw error;
    }
  }

  return (
    <FormPageLayout
      title="เพิ่มข้อมูลต่อประกันใหม่"
      backHref="/service-management/warranty-extensions"
      backText="กลับ"
      showListButton={true}
      listHref="/service-management/warranty-extensions"
    >
      <WarrantyExtensionForm
        action={create}
        installationOptions={Array.isArray(installations) ? installations : []}
      />
    </FormPageLayout>
  );
}

