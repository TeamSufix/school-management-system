import { getManagementContext } from "@/lib/auth/get-management-context";
import { importStudentsCsv, promoteClass } from "@/actions/bulk";
import ConfigurationForm from "@/components/school/ConfigurationForm";

const input = "block w-full rounded-lg border border-slate-300 p-2 text-sm";

export default async function BulkTools({ schoolId }: { schoolId?: string }) {
  const context = await getManagementContext(schoolId ?? null);
  if (!context || !["school_admin", "super_admin"].includes(context.role)) return null;

  const [{ data: classes }, { data: sessions }] = await Promise.all([
    context.client.from("classes").select("id, name").eq("school_id", context.schoolId).order("name"),
    context.client.from("academic_sessions").select("id, name, is_current").eq("school_id", context.schoolId).order("name", { ascending: false }),
  ]);
  if (!classes?.length) return null;
  const currentSession = (sessions ?? []).find((session) => session.is_current) ?? sessions?.[0];

  return (
    <section className="mt-6 grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_15px_50px_-30px_rgba(15,23,42,0.25)] sm:p-8 lg:grid-cols-2">
      <div>
        <h2 className="font-bold text-slate-950">Bulk student import</h2>
        <p className="mt-1 text-sm text-slate-500">
          CSV columns: first_name, last_name, student_id, gender (optional), date_of_birth (optional, YYYY-MM-DD).
        </p>
        <ConfigurationForm action={importStudentsCsv} label="Import students">
          {schoolId && <input type="hidden" name="school_id" value={schoolId} />}
          <label className="block text-sm">Assign to class (optional)
            <select className={input} name="class_id" defaultValue=""><option value="">No class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          </label>
          <label className="block text-sm">CSV file<input className={input} name="csv_file" type="file" accept=".csv,text/csv" required /></label>
        </ConfigurationForm>
      </div>
      <div>
        <h2 className="font-bold text-slate-950">Promote a class</h2>
        <p className="mt-1 text-sm text-slate-500">
          Move every active student into another class and record the enrollment for a session.
        </p>
        <ConfigurationForm action={promoteClass} label="Promote students">
          {schoolId && <input type="hidden" name="school_id" value={schoolId} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">From class
              <select className={input} name="from_class_id" required defaultValue=""><option value="" disabled>Select</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            </label>
            <label className="block text-sm">To class
              <select className={input} name="to_class_id" required defaultValue=""><option value="" disabled>Select</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            </label>
          </div>
          <label className="block text-sm">Enrollment session
            <select className={input} name="session_id" required defaultValue={currentSession?.id ?? ""}>
              <option value="" disabled>Select session</option>
              {(sessions ?? []).map((session) => <option key={session.id} value={session.id}>{session.name}{session.is_current ? " (current)" : ""}</option>)}
            </select>
          </label>
        </ConfigurationForm>
      </div>
    </section>
  );
}
