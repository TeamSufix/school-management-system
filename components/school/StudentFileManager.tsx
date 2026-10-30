import Link from "next/link";
import { getManagementContext } from "@/lib/auth/get-management-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteStudentDocument, uploadStudentDocument, uploadStudentPhoto } from "@/actions/student-files";
import ConfigurationForm from "@/components/school/ConfigurationForm";

const input = "block w-full rounded-lg border border-slate-300 p-2";

type DocumentRow = {
  id: string;
  file_name: string;
  file_path: string;
  description: string | null;
  created_at: string;
};

export default async function StudentFileManager({ studentId, schoolId }: { studentId: string; schoolId?: string }) {
  const context = await getManagementContext(schoolId);
  if (!context || !["school_admin", "super_admin"].includes(context.role)) return null;
  const documents = await context.client
    .from("student_documents")
    .select("id, file_name, file_path, description, created_at")
    .eq("student_id", studentId)
    .eq("school_id", context.schoolId)
    .order("created_at", { ascending: false });
  if (documents.error) {
    return <section role="status" className="mt-6 rounded-xl border border-amber-200 p-5"><h2 className="font-bold">Student files unavailable</h2><p>Verify that the student records migration has been installed.</p></section>;
  }
  const admin = createAdminClient();
  const rows = (documents.data ?? []) as DocumentRow[];
  const urls = new Map<string, string>();
  for (const row of rows) {
    if (!row.file_path.startsWith(`${context.schoolId}/students/`)) continue;
    const signed = await admin.storage.from("schoolms-records").createSignedUrl(row.file_path, 600);
    if (signed.data?.signedUrl) urls.set(row.id, signed.data.signedUrl);
  }
  return (
    <section className="mt-6 space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="font-bold text-slate-950">Photo and documents</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <ConfigurationForm action={uploadStudentPhoto} label="Upload photo">
          <input type="hidden" name="student_id" value={studentId} />
          {schoolId && <input type="hidden" name="school_id" value={schoolId} />}
          <label className="block text-sm font-semibold text-slate-700">Student photo
            <input type="file" name="photo" accept="image/png,image/jpeg" required className="mt-1 block w-full rounded-lg border p-2 text-sm font-normal" />
          </label>
          <p className="text-xs text-slate-500">PNG or JPEG, at most 512 KB and 4096 × 4096 pixels.</p>
        </ConfigurationForm>
        <ConfigurationForm action={uploadStudentDocument} label="Upload document">
          <input type="hidden" name="student_id" value={studentId} />
          {schoolId && <input type="hidden" name="school_id" value={schoolId} />}
          <label className="block text-sm font-semibold text-slate-700">Document
            <input type="file" name="document" accept="application/pdf,image/png,image/jpeg" required className="mt-1 block w-full rounded-lg border p-2 text-sm font-normal" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Description
            <input name="description" maxLength={1000} className={input} />
          </label>
          <p className="text-xs text-slate-500">PDF, PNG or JPEG, at most 5 MB.</p>
        </ConfigurationForm>
      </div>
      {rows.length === 0 && <p className="text-sm text-slate-500">No documents uploaded yet.</p>}
      {rows.map((row) => (
        <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
          <div>
            {urls.get(row.id)
              ? <Link href={urls.get(row.id)!} target="_blank" className="font-semibold text-green-700 underline">{row.file_name}</Link>
              : <p className="font-semibold text-slate-800">{row.file_name}</p>}
            {row.description && <p className="text-sm text-slate-500">{row.description}</p>}
            <p className="text-xs text-slate-400">{new Date(row.created_at).toLocaleString()}</p>
          </div>
          <ConfigurationForm action={deleteStudentDocument} label="Delete">
            <input type="hidden" name="student_id" value={studentId} />
            {schoolId && <input type="hidden" name="school_id" value={schoolId} />}
            <input type="hidden" name="document_id" value={row.id} />
          </ConfigurationForm>
        </div>
      ))}
    </section>
  );
}
