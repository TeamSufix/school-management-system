import { getManagementContext } from "@/lib/auth/get-management-context";

type Enrollment = {
  id: string;
  enrolled_on: string;
  left_on: string | null;
  academic_sessions: { name: string } | { name: string }[] | null;
  classes: { name: string } | { name: string }[] | null;
  streams: { name: string } | { name: string }[] | null;
};

const one = <T,>(value: T | T[] | null | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function EnrollmentHistory({ studentId, schoolId }: { studentId: string; schoolId?: string }) {
  const context = await getManagementContext(schoolId);
  if (!context) return null;
  const result = await context.client
    .from("enrollments")
    .select("id, enrolled_on, left_on, academic_sessions(name), classes(name), streams(name)")
    .eq("student_id", studentId)
    .eq("school_id", context.schoolId)
    .order("enrolled_on", { ascending: false });
  if (result.error || !result.data?.length) return null;
  const rows = result.data as Enrollment[];
  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
        <h2 className="font-bold text-slate-950">Enrollment History</h2>
      </div>
      <ul className="divide-y divide-slate-100">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-6 py-4 text-sm sm:px-8">
            <span className="font-semibold text-slate-900">{one(row.academic_sessions)?.name ?? "Session"}</span>
            <span className="text-slate-700">{one(row.classes)?.name ?? "Class"}{one(row.streams) ? ` · Stream ${one(row.streams)?.name}` : ""}</span>
            <span className="text-slate-500">{row.enrolled_on}{row.left_on ? ` → ${row.left_on}` : " → present"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
