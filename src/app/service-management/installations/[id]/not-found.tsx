export default function InstallationNotFound() {
    return (
      <div className="p-6">
        <h1 className="font-bold text-xl mb-2">ไม่พบข้อมูลระบบ</h1>
        <p className="text-gray-600">
          ข้อมูลที่คุณพยายามเปิดอาจถูกลบไปแล้ว หรือยังไม่ได้ถูกบันทึกในระบบ
        </p>
        <a
          href="/"
          className="inline-block mt-4 px-4 py-2 rounded bg-blue-600 text-white"
        >
          กลับไปหน้าแรก
        </a>
      </div>
    );
  }
  