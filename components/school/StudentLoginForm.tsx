import { getManagementContext } from "@/lib/auth/get-management-context";
import { createStudentLogin, removeStudentLogin } from "@/actions/student-accounts";
import ConfigurationForm from "@/components/school/ConfigurationForm";

const input = "block w-full rounded-lg border border-slate-300 p-2";

export default async function StudentLoginForm({ studentId, hasLogin, schoolId }: {
  studentId: string;
  hasLogin: boolean;
  schoolId?: string;
}) {
  const context = await getManagementContext(schoolId ?? null);
  if (!context || !["school_admin", "super_admin"].includes(context.role)) return null;

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_15px_50px_-30px_rgba(15,23,42,0.25)] sm:p-8">
      <h2 className="font-bold text-slate-950">Student Portal Login</h2>
      <p className="mt-1 text-sm text-slate-500">
        Give this student access to assignments, quizzes, their timetable and records.
      </p>
      {hasLogin ? (
        <div className="mt-4">
          <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            A login account is linked to this student.
          </p>
          <ConfigurationForm action={removeStudentLogin} label="Remove login">
            {schoolId && <input type="hidden" name="school_id" value={schoolId} />}
            <input type="hidden" name="student_id" value={studentId} />
          </ConfigurationForm>
        </div>
      ) : (
        <ConfigurationForm action={createStudentLogin} label="Create login">
          {schoolId && <input type="hidden" name="school_id" value={schoolId} />}
          <input type="hidden" name="student_id" value={studentId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label>Email<input className={input} name="email" type="email" maxLength={254} required /></label>
            <label>Temporary password<input className={input} name="password" type="password" minLength={8} required /></label>
          </div>
        </ConfigurationForm>
      )}
    </section>
  );
}
