import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

import PrintButton from "@/components/school/PrintButton";
import { getManagementContext } from "@/lib/auth/get-management-context";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function StudentIdCardPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ school?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const context = await getManagementContext(typeof query.school === "string" ? query.school : null);
  if (!context || !["school_admin", "super_admin"].includes(context.role)) notFound();

  const { data: student } = await context.client
    .from("students")
    .select("id, first_name, last_name, student_id, photo_path, admission_date, classes(name)")
    .eq("id", id)
    .eq("school_id", context.schoolId)
    .maybeSingle();
  const { data: school } = await context.client
    .from("schools")
    .select("name, logo_path")
    .eq("id", context.schoolId)
    .maybeSingle();
  if (!student) notFound();

  const schoolClass = Array.isArray(student.classes) ? student.classes[0] : student.classes;
  const admin = createAdminClient();
  let photoUrl: string | null = null;
  if (typeof student.photo_path === "string" && student.photo_path.startsWith(`${context.schoolId}/students/${student.id}/`)) {
    photoUrl = (await admin.storage.from("schoolms-records").createSignedUrl(student.photo_path, 3600)).data?.signedUrl ?? null;
  }
  let logoUrl: string | null = null;
  if (typeof school?.logo_path === "string" && school.logo_path.startsWith(`${context.schoolId}/`)) {
    logoUrl = (await admin.storage.from("schoolms-branding").createSignedUrl(school.logo_path, 3600)).data?.signedUrl ?? null;
  }
  const qr = await QRCode.toDataURL(
    JSON.stringify({ type: "sms-student", id: student.id, student_id: student.student_id, school_id: context.schoolId }),
    { margin: 1, width: 200 },
  );

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/school/students/${student.id}`} className="text-sm font-medium text-green-700">← Student profile</Link>
        <PrintButton />
      </div>

      <section className="mx-auto mt-8 w-[400px] overflow-hidden rounded-2xl border border-slate-300 shadow print:shadow-none">
        <div className="flex items-center gap-3 bg-green-800 px-5 py-3 text-white">
          {logoUrl && <img src={logoUrl} alt="" className="h-8 w-8 rounded bg-white object-contain" />}
          <div>
            <p className="text-sm font-bold leading-tight">{school?.name ?? "School"}</p>
            <p className="text-[10px] uppercase tracking-widest text-green-200">Student Identification Card</p>
          </div>
        </div>

        <div className="flex gap-4 bg-white p-5">
          <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg font-bold text-slate-400">
            {photoUrl ? <img src={photoUrl} alt="" className="h-full w-full rounded-lg object-cover" /> : `${student.first_name?.[0] ?? ""}${student.last_name?.[0] ?? ""}`}
          </div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="text-base font-bold text-slate-950">{student.first_name} {student.last_name}</p>
            <dl className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Student ID</dt><dd className="font-semibold">{student.student_id}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Class</dt><dd className="font-semibold">{schoolClass?.name ?? "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Admitted</dt><dd className="font-semibold">{student.admission_date ?? "—"}</dd></div>
            </dl>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
          <img src={qr} alt={`QR code identifying ${student.first_name} ${student.last_name}`} className="h-16 w-16" />
          <p className="text-[9px] text-slate-400">Scan to verify student identity.<br />If found, please return to the school.</p>
        </div>
      </section>
    </main>
  );
}
