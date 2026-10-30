import { notFound, redirect } from "next/navigation";
import StudentRecords from "@/components/school/StudentRecords";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSchool } from "@/lib/auth/get-user";

import AttendanceForm from "@/components/school/AttendanceForm";

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ student?: string | string[] }> }) {
  const currentSchool = await getCurrentSchool();

  if (!currentSchool) {
    redirect("/login");
  }

  const { student } = await searchParams;
  if (student !== undefined && (typeof student !== "string" || !student.trim())) notFound();
  if (student) return <main className="mx-auto max-w-6xl px-6 py-8"><StudentRecords studentId={student} view="attendance" /></main>;

  const supabase = await createClient();

  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id, name")
    .eq("school_id", currentSchool.schoolId)
    .order("name", {
      ascending: true,
    });

  if (classesError) {
    console.error("Get attendance classes error:", classesError);
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
      {/* Header */}

      <div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />

          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-green-600">
            School Administration
          </p>
        </div>

        <div className="mt-2 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Attendance
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Record daily student attendance for each class. Once attendance is
              saved, it cannot be changed.
            </p>
          </div>

          <div className="flex w-fit items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="m5 12 4 4L19 6" />
              </svg>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-900">
                Daily Attendance
              </p>

              <p className="text-[11px] text-slate-400">
                {classes?.length ?? 0} classes available
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace */}

      <section className="mt-8 overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Attendance Workspace
          </p>

          <h2 className="mt-1 text-base font-bold text-slate-900">
            Record Today&apos;s Attendance
          </h2>
        </div>

        <div className="p-5 sm:p-7">
          <AttendanceForm classes={classes ?? []} schoolId={""} />
        </div>
      </section>
    </main>
  );
}
