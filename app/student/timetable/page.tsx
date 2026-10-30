import { redirect } from "next/navigation";

import { getStudentContext } from "@/lib/auth/get-student-context";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const rel = (value: { name: string } | { name: string }[] | null) => (Array.isArray(value) ? value[0]?.name : value?.name) ?? "";

export default async function StudentTimetablePage() {
  const context = await getStudentContext();
  if (!context) redirect("/login");
  if (!context.classId) {
    return <main className="mx-auto max-w-4xl p-8"><h1 className="text-2xl font-bold">Timetable</h1><p className="mt-4 text-slate-500">You are not assigned to a class yet.</p></main>;
  }

  const { data: entries } = await context.client
    .from("timetable_entries")
    .select("id, weekday, starts_at, ends_at, subjects(name), teachers(first_name, last_name)")
    .eq("school_id", context.schoolId)
    .eq("class_id", context.classId)
    .order("weekday")
    .order("starts_at");

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
      <h1 className="text-3xl font-bold text-slate-900">My Timetable</h1>
      <div className="mt-6 space-y-6">
        {days.map((day, index) => {
          const items = (entries ?? []).filter((entry) => entry.weekday === index + 1);
          if (!items.length) return null;
          const teacher = (value: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null) => {
            const row = Array.isArray(value) ? value[0] : value;
            return row ? `${row.first_name} ${row.last_name}` : "";
          };
          return (
            <section key={day}>
              <h2 className="text-sm font-bold uppercase tracking-wide text-green-700">{day}</h2>
              <ul className="mt-2 space-y-2">
                {items.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                    <span className="font-semibold text-slate-800">{rel(entry.subjects)}</span>
                    <span className="text-slate-500">{teacher(entry.teachers)}</span>
                    <span className="text-slate-500">{entry.starts_at.slice(0, 5)} – {entry.ends_at.slice(0, 5)}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {!entries?.length && <p className="text-slate-500">No timetable entries yet.</p>}
      </div>
    </main>
  );
}
