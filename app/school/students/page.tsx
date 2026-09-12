import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSchool } from "@/lib/auth/get-user";

import CreateStudentForm from "@/components/school/CreateStudentForm";
import StudentActions from "@/components/school/StudentActions";

type Props = {
  searchParams: Promise<{
    search?: string;
  }>;
};

export default async function StudentsPage({ searchParams }: Props) {
  const current = await getCurrentSchool();

  if (!current) {
    redirect("/login");
  }

  const params = await searchParams;
  const search = params.search?.trim() ?? "";

  const supabase = await createClient();

  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id, name")
    .eq("school_id", current.schoolId)
    .order("name");

  if (classesError) {
    console.error("Classes fetch error:", classesError);
  }

  let studentsQuery = supabase
    .from("students")
    .select(
      `
        id,
        first_name,
        last_name,
        student_id,
        gender,
        date_of_birth,
        class_id,
        phone,
        address,
        status,
        classes (
          id,
          name
        )
      `,
    )
    .eq("school_id", current.schoolId)
    .order("first_name");

  if (search) {
    studentsQuery = studentsQuery.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,student_id.ilike.%${search}%`,
    );
  }

  const { data: students, error: studentsError } = await studentsQuery;

  if (studentsError) {
    console.error("Students fetch error:", studentsError);
  }

  const activeCount =
    students?.filter((student) => student.status === "active").length ?? 0;

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
      {/* =========================================================
          HEADER
      ========================================================== */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.2)]">
        <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-green-100/70 blur-3xl" />

        <div className="relative p-6 sm:p-8">
          <Link
            href="/school/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-green-600"
          >
            <span>←</span>
            Dashboard
          </Link>

          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-6 w-6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                    />
                    <circle cx="9" cy="7" r="4" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
                    School Administration
                  </p>

                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                    Students
                  </h1>
                </div>
              </div>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
                Manage student records, classes and student status for{" "}
                <span className="font-medium text-slate-700">
                  {current.school.name}
                </span>
                .
              </p>
            </div>

            <div className="flex gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Students
                </p>
                <p className="mt-1 text-xl font-bold text-slate-950">
                  {students?.length ?? 0}
                </p>
              </div>

              <div className="rounded-2xl border border-green-100 bg-green-50 px-5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-green-600">
                  Active
                </p>
                <p className="mt-1 text-xl font-bold text-green-800">
                  {activeCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          CONTENT
      ========================================================== */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Create */}
        {current.role === "school_admin" && (
          <aside className="h-fit overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_15px_50px_-30px_rgba(15,23,42,0.25)]">
            <div className="border-b border-slate-100 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-green-600">
                New Record
              </p>

              <h2 className="mt-1 text-lg font-bold text-slate-950">
                Add Student
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Create a new student profile.
              </p>
            </div>

            <div className="p-6">
              <CreateStudentForm classes={classes ?? []} />
            </div>
          </aside>
        )}

        {/* Student list */}
        <section className="min-w-0">
          {/* Search */}
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_10px_35px_-25px_rgba(15,23,42,0.25)]">
            <form method="GET" className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path strokeLinecap="round" d="m20 20-4-4" />
                </svg>

                <input
                  name="search"
                  defaultValue={search}
                  placeholder="Search by name or student ID..."
                  className="w-full rounded-xl border border-transparent bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-300 focus:bg-white focus:ring-4 focus:ring-green-50"
                />
              </div>

              <button
                type="submit"
                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Search
              </button>

              {search && (
                <Link
                  href="/school/students"
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Clear
                </Link>
              )}
            </form>
          </div>

          {/* List */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_15px_50px_-30px_rgba(15,23,42,0.25)]">
            {students && students.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {students.map((student) => {
                  const studentClass = Array.isArray(student.classes)
                    ? student.classes[0]
                    : student.classes;

                  const status = student.status;

                  const initials =
                    `${student.first_name?.charAt(0) ?? ""}${student.last_name?.charAt(0) ?? ""}`.toUpperCase();

                  return (
                    <div
                      key={student.id}
                      className="group flex flex-col gap-5 p-5 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-sm font-bold text-green-700 ring-1 ring-green-100">
                          {initials || "ST"}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-semibold text-slate-950">
                              {student.first_name} {student.last_name}
                            </h2>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                                status === "active"
                                  ? "bg-green-50 text-green-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {status}
                            </span>
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span>
                              ID{" "}
                              <span className="font-medium text-slate-700">
                                {student.student_id}
                              </span>
                            </span>

                            <span>
                              {studentClass?.name ?? "No class assigned"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="sm:pl-4">
                        <StudentActions id={student.id} status={status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-6 py-16 text-center sm:px-10">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-7 w-7"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <circle cx="9" cy="7" r="4" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2 21v-1a7 7 0 0 1 14 0v1M19 8v6M22 11h-6"
                    />
                  </svg>
                </div>

                <p className="mt-5 font-semibold text-slate-950">
                  {studentsError
                    ? "Unable to load students"
                    : search
                      ? "No students found"
                      : "No students yet"}
                </p>

                <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
                  {studentsError
                    ? "There was a problem loading the student records."
                    : search
                      ? "Try another name or student ID."
                      : "Add your first student using the form on the left."}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
