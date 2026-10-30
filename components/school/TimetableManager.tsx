import Link from "next/link";
import { redirect } from "next/navigation";
import { getManagementContext } from "@/lib/auth/get-management-context";
import { canAccessTeachingScope } from "@/lib/auth/teacher-scope";
import { saveTimetableEntry, deleteTimetableEntry } from "@/actions/communication";
import ConfigurationForm from "@/components/school/ConfigurationForm";

const input = "block w-full rounded-lg border border-slate-300 p-2";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type Entry = {
  id: string;
  class_id: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
  subjects: { name: string } | { name: string }[] | null;
  teachers: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
};

const one = <T,>(value: T | T[] | null | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function TimetableManager({ schoolId, classId }: { schoolId?: string; classId?: string }) {
  const context = await getManagementContext(schoolId);
  if (!context || !["super_admin", "school_admin", "teacher", "accountant"].includes(context.role)) redirect("/unauthorized");
  const [classes, subjects, teachers] = await Promise.all([
    context.client.from("classes").select("id, name").eq("school_id", context.schoolId).order("name"),
    context.client.from("subjects").select("id, name").eq("school_id", context.schoolId).order("name"),
    context.client.from("teachers").select("id, first_name, last_name").eq("school_id", context.schoolId).eq("status", "active").order("first_name"),
  ]);
  if ([classes, subjects, teachers].some((result) => result.error)) {
    return <main className="mx-auto max-w-5xl p-8"><h1 className="text-2xl font-bold">Timetable unavailable</h1></main>;
  }
  const canManage = ["school_admin", "super_admin"].includes(context.role);
  const visibleClasses = (classes.data ?? []).filter((item) => canManage || canAccessTeachingScope(context, item.id));
  const selected = visibleClasses.find((item) => item.id === classId) ?? visibleClasses[0];
  const entries = selected
    ? await context.client.from("timetable_entries").select("id, class_id, weekday, starts_at, ends_at, subjects(name), teachers(first_name, last_name)").eq("school_id", context.schoolId).eq("class_id", selected.id).order("weekday").order("starts_at")
    : { data: [], error: null };
  if (entries.error) {
    return <main className="mx-auto max-w-5xl p-8"><h1 className="text-2xl font-bold">Timetable unavailable</h1><p className="mt-4">Verify that the communication migration has been installed.</p></main>;
  }
  const rows = (entries.data ?? []) as Entry[];
  const base = schoolId ? `/platform/schools/${schoolId}/timetable` : "/school/timetable";
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-3xl font-bold">Timetable</h1>
      <nav className="flex flex-wrap gap-2">
        {visibleClasses.map((item) => (
          <Link key={item.id} href={`${base}?class=${item.id}`} className={`rounded-lg border px-3 py-1.5 text-sm ${item.id === selected?.id ? "border-green-600 bg-green-50 font-semibold" : "border-slate-200"}`}>{item.name}</Link>
        ))}
        {!visibleClasses.length && <p>No classes available.</p>}
      </nav>
      {canManage && selected && (
        <ConfigurationForm action={saveTimetableEntry} label="Add timetable entry">
          {schoolId && <input type="hidden" name="school_id" value={schoolId} />}
          <input type="hidden" name="class_id" value={selected.id} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label>Subject<select className={input} name="subject_id" required defaultValue=""><option value="" disabled>Select subject</option>{(subjects.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Teacher<select className={input} name="teacher_id" defaultValue=""><option value="">Unassigned</option>{(teachers.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.first_name} {item.last_name}</option>)}</select></label>
            <label>Day<select className={input} name="weekday" required>{DAYS.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}</select></label>
            <label>Starts<input className={input} name="starts_at" type="time" required /></label>
            <label>Ends<input className={input} name="ends_at" type="time" required /></label>
          </div>
        </ConfigurationForm>
      )}
      {selected && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">{selected.name}</h2>
          {!rows.length && <p>No timetable entries for this class.</p>}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {DAYS.map((day, index) => {
              const dayRows = rows.filter((row) => row.weekday === index + 1);
              return (
                <div key={day} className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="font-semibold">{day}</h3>
                  {!dayRows.length && <p className="mt-2 text-sm text-slate-400">No lessons</p>}
                  <ul className="mt-2 space-y-2">
                    {dayRows.map((row) => {
                      const teacher = one(row.teachers);
                      return (
                        <li key={row.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                          <p className="font-semibold">{one(row.subjects)?.name}</p>
                          <p className="text-slate-500">{row.starts_at.slice(0, 5)} – {row.ends_at.slice(0, 5)}{teacher ? ` · ${teacher.first_name} ${teacher.last_name}` : ""}</p>
                          {canManage && <ConfigurationForm action={deleteTimetableEntry} label="Remove">{schoolId && <input type="hidden" name="school_id" value={schoolId} />}<input type="hidden" name="entry_id" value={row.id} /></ConfigurationForm>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
