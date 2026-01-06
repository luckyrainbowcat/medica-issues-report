import { redirect } from "next/navigation";
import HospitalForm from "@/components/service-management/HospitalForm";
import { apiGetServer, apiPutServer } from "@/lib/service-management/api";
import FormPageLayout from "@/components/service-management/FormPageLayout";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditHospitalPage({ params }: PageProps) {
  const { id } = await params;
  
  let existing;
  try {
    existing = await apiGetServer(`/api/hospitals/${id}`);
  } catch (error: any) {
    return (
      <FormPageLayout
        title="เกิดข้อผิดพลาด"
        backHref="/service-management/hospitals"
        backText="กลับหน้ารายการ"
      >
        <div>
          <p style={{ color: "#595959", fontSize: 16 }}>
            {error.message || "ไม่สามารถโหลดข้อมูลได้"}
          </p>
          <p style={{ color: "#8c8c8c", fontSize: 14 }}>
            กรุณาตรวจสอบว่า backend server กำลังรันอยู่โดยรันคำสั่ง: <code style={{ background: "#f0f0f0", padding: "2px 6px", borderRadius: 4 }}>npm run dev:backend</code>
          </p>
        </div>
      </FormPageLayout>
    );
  }

  async function update(data: any) {
    "use server";
    try {
      await apiPutServer(`/api/hospitals/${id}`, data);
      redirect("/service-management/hospitals");
    } catch (error: any) {
      throw new Error(error.message || "ไม่สามารถบันทึกข้อมูลได้");
    }
  }

  return (
    <FormPageLayout
      title="แก้ไขข้อมูลโรงพยาบาล"
      backHref="/service-management/hospitals"
      backText="กลับหน้ารายการ"
    >
      <HospitalForm action={update} existing={existing} />
    </FormPageLayout>
  );
}
