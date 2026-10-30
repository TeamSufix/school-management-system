import Link from "next/link";
import { redirect } from "next/navigation";

import { getStudentContext } from "@/lib/auth/get-student-context";

export default async function StudentDashboard() {
  const context = await getStudentContext();
  if (!context) redirect("/login");

  const [{ data: schoolClass }, { data: assessments }, { data: submissions }, { data: announcements }, { count: unread }] = await Promise.all([
    context.classId
      ? context.client.from("classes").select("name").eq("id", context.classId).maybeSingle()
      : Promise.resolve({ data: null }),
    context.classId
      ? context.client.from("assessments").select("id, name, due_at, subjects(name)").eq("school_id", context.schoolId).eq("class_id", context.classId).order("due_at", { ascending: true, nullsFirst: false })
      : Promise.resolve({ data: [] }),
    context.client.from("assessment_submissions").select("assessment_id").eq("student_id", context.studentId),
    context.client.from("announcements").select("id, title, publish_on").eq("school_id", context.schoolId).order("publish_on", { ascending: false }).limit(5),
    context.client.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", context.userId).is("read_at", null),
  ]);

  const submitted = new Set((submissions ?? []).map((row) => row.assessment_id));
  const pending = (assessments ?? []).filter((item) => !submitted.has(item.id) && (!item.due_at || new Date(item.due_at) >= new Date()));

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Welcome, {context.student.first_name}
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        {schoolClass?.name ?? "No class assigned"} · Student ID {context.student.student_id}
      </p>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        <Link href="/student/assessments" className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm transition hover:border-green-200">
          <h2 className="font-bold text-slate-900">Assignments &amp; Quizzes</h2>
          <p className="mt-2 text-3xl font-bold text-green-700">{pending.length}</p>
          <p className="text-sm text-slate-500">awaiting submission</p>
        </Link>
        <Link href="/student/notifications" className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm transition hover:border-green-200">
          <h2 className="font-bold text-slate-900">Notifications</h2>
          <p className="mt-2 text-3xl font-bold text-green-700">{unread ?? 0}</p>
          <p className="text-sm text-slate-500">unread</p>
        </Link>
        <Link href="/student/records" className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm transition hover:border-green-200">
          <h2 className="font-bold text-slate-900">My Records</h2>
          <p className="mt-2 text-sm text-slate-500">Attendance, results, fees and statements.</p>
        </Link>
      </section>

      <section className="mt-8 rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-slate-900">Upcoming deadlines</h2>
        {!pending.length ? (
          <p className="mt-2 text-sm text-slate-500">Nothing due right now.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {pending.slice(0, 5).map((item) => (
              <li key={item.id} className="flex items-center justify-between py-3 text-sm">
                <Link href={`/student/assessments/${item.id}`} className="font-semibold text-slate-800 hover:text-green-700">
                  {item.name}
                </Link>
                <span className="text-slate-500">
                  {item.due_at ? `Due ${new Date(item.due_at).toLocaleString()}` : "No deadline"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-slate-900">Announcements</h2>
        {!announcements?.length ? (
          <p className="mt-2 text-sm text-slate-500">No announcements yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {announcements.map((item) => (
              <li key={item.id} className="text-sm">
                <p className="font-semibold text-slate-800">{item.title}</p>
                <p className="text-xs text-slate-400">{item.publish_on}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
