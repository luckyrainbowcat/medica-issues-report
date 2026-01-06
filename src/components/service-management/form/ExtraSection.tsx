// web/components/form/ExtraSection.tsx
"use client";

export default function ExtraSection({
  form,
  update,
}: {
  form: any;
  update: (path: string, value: any) => void;
}) {
  const extra = form.extra || {};

  return (
    <section className="border p-4 rounded">
      <h2 className="font-bold mb-4">รายละเอียดเพิ่มเติม</h2>
      <textarea
        className="border p-2 rounded w-full"
        rows={4}
        value={extra.additionalInfo || ""}
        onChange={(e) => update("extra.additionalInfo", e.target.value)}
      />
    </section>
  );
}
