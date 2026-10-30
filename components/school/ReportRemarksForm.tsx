import { getCurrentUser } from "@/lib/auth/get-user";
import { saveTermRemarks } from "@/actions/report-remarks";
import ConfigurationForm from "@/components/school/ConfigurationForm";

const input = "block w-full rounded-lg border border-slate-300 p-2 text-sm";

export default async function ReportRemarksForm({ studentId, year, term, schoolId, remarks }: {
  studentId: string;
  year: string;
  term: string;
  schoolId?: string;
  remarks: { class_teacher_remark: string | null; head_teacher_remark: string | null } | null;
}) {
  const user = await getCurrentUser();
  if (!user || !["school_admin", "super_admin", "teacher"].includes(user.role ?? "")) return null;

  return (
    <section className="print:hidden">
      <ConfigurationForm action={saveTermRemarks} label="Save remarks">
        {schoolId && <input type="hidden" name="school_id" value={schoolId} />}
        <input type="hidden" name="student_id" value={studentId} />
        <input type="hidden" name="academic_year" value={year} />
        <input type="hidden" name="term" value={term} />
        <p className="text-sm font-bold text-slate-800">Report card remarks</p>
        <label className="block text-sm">Class teacher remark<textarea className={input} name="class_teacher_remark" rows={2} maxLength={1000} defaultValue={remarks?.class_teacher_remark ?? ""} /></label>
        <label className="block text-sm">Head teacher remark<textarea className={input} name="head_teacher_remark" rows={2} maxLength={1000} defaultValue={remarks?.head_teacher_remark ?? ""} /></label>
      </ConfigurationForm>
    </section>
  );
}
