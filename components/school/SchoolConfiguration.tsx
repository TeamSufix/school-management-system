import { redirect } from "next/navigation";
import { getManagementContext } from "@/lib/auth/get-management-context";
import { defaultAcademicPeriod } from "@/lib/academics/period";
import { saveAcademicSettings, saveTeacherAssignment, removeTeacherAssignment, linkTeacherLogin } from "@/actions/configuration";
import ConfigurationForm from "@/components/school/ConfigurationForm";

const input = "block w-full rounded-lg border border-slate-300 p-2";

export default async function SchoolConfiguration({ schoolId }: { schoolId?: string }) {
  const context = await getManagementContext(schoolId);
  if (!context || !["school_admin", "super_admin"].includes(context.role)) redirect("/unauthorized");
  const client = context.client;
  const [settings, teachers, classes, subjects, assignments] = await Promise.all([
    client.from("school_academic_settings").select("academic_year, term").eq("school_id", context.schoolId).maybeSingle(),
    client.from("teachers").select("id, first_name, last_name, user_id, status").eq("school_id", context.schoolId).order("first_name"),
    client.from("classes").select("id, name").eq("school_id", context.schoolId).order("name"),
    client.from("subjects").select("id, name").eq("school_id", context.schoolId).order("name"),
    client.from("teacher_assignments").select("id, teacher_id, class_id, subject_id").eq("school_id", context.schoolId).order("created_at"),
  ]);
  if ([settings, teachers, classes, subjects, assignments].some((result) => result.error)) {
    return <main className="mx-auto max-w-4xl p-8"><h1 className="text-2xl font-bold">School configuration unavailable</h1><p className="mt-4">Verify that the reviewed database proposals have been applied and that you have access to this school. No settings were changed.</p></main>;
  }
  const period = settings.data ?? defaultAcademicPeriod();
  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <h1 className="text-3xl font-bold">Academic settings and teacher assignments</h1>
      <section className="space-y-4"><h2 className="text-xl font-bold">Current academic period</h2><p>These defaults are used for new results and fee records. Historical records are not changed.</p>
        <ConfigurationForm action={saveAcademicSettings} label="Save academic period">
          <input type="hidden" name="school_id" value={context.schoolId} />
          <label className="block">Academic year<input className={input} name="academic_year" defaultValue={period.academic_year} pattern="[0-9]{4}/[0-9]{4}" required /></label>
          <label className="block">Term<select name="term" className={input} defaultValue={period.term}><option value="term_1">Term 1</option><option value="term_2">Term 2</option><option value="term_3">Term 3</option></select></label>
        </ConfigurationForm>
      </section>
      <section className="space-y-4"><h2 className="text-xl font-bold">Assign a teacher</h2><p>Teachers can access students and attendance in their assigned classes, and results only for their assigned class/subject pairs.</p>
        <ConfigurationForm action={saveTeacherAssignment} label="Add assignment">
          <input type="hidden" name="school_id" value={context.schoolId} />
          <label className="block">Teacher<select className={input} name="teacher_id" required defaultValue=""><option value="" disabled>Select teacher</option>{teachers.data?.filter((teacher) => teacher.user_id && teacher.status === "active").map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.first_name} {teacher.last_name}</option>)}</select></label>
          <label className="block">Class<select className={input} name="class_id" required defaultValue=""><option value="" disabled>Select class</option>{classes.data?.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}</select></label>
          <label className="block">Subject<select className={input} name="subject_id" required defaultValue=""><option value="" disabled>Select subject</option>{subjects.data?.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
        </ConfigurationForm>
        {!assignments.data?.length && <p>No assignments yet. Teachers without assignments cannot access academic records.</p>}
        {assignments.data?.map((assignment) => {
          const teacher = teachers.data?.find((item) => item.id === assignment.teacher_id);
          return <ConfigurationForm key={assignment.id} action={removeTeacherAssignment} label="Remove assignment"><input type="hidden" name="school_id" value={context.schoolId} /><input type="hidden" name="assignment_id" value={assignment.id} /><p>{teacher?.first_name} {teacher?.last_name} · {classes.data?.find((item) => item.id === assignment.class_id)?.name} · {subjects.data?.find((item) => item.id === assignment.subject_id)?.name}</p></ConfigurationForm>;
        })}
      </section>
      {teachers.data?.some((teacher) => !teacher.user_id) && <section className="space-y-4"><h2 className="text-xl font-bold">Link legacy teacher records</h2><p>Enter the existing teacher login user ID. It must already have a teacher membership in this school. Existing login links cannot be replaced here.</p>{teachers.data?.filter((teacher) => !teacher.user_id).map((teacher) => <ConfigurationForm key={teacher.id} action={linkTeacherLogin} label="Link existing login"><p>{teacher.first_name} {teacher.last_name}</p><input type="hidden" name="school_id" value={context.schoolId} /><input type="hidden" name="teacher_id" value={teacher.id} /><label className="block">Login user ID<input name="user_id" className={input} required /></label></ConfigurationForm>)}</section>}
    </main>
  );
}
