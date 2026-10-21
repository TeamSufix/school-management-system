import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSchool } from "@/lib/auth/get-user";

import CreateTeacherForm from "@/components/school/CreateTeacherForm";
import TeacherActions from "@/components/school/TeacherActions";

export default async function TeachersPage() {
  const current = await getCurrentSchool();

  if (!current) {
    redirect("/login");
  }

  if (!current.schoolId) {
    redirect("/school/dashboard");
  }

  const supabase = await createClient();

  const { data: teachers, error } = await supabase
    .from("teachers")
    .select("*")
    .eq("school_id", current.schoolId)
    .order("first_name");

  if (error) {
    console.error("Teachers fetch error:", error);
  }

  const activeCount =
    teachers?.filter((teacher) => teacher.status === "active").length ?? 0;

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.2)]">
        <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-green-100/70 blur-3xl" />

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
                    <circle cx="9" cy="7" r="4" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2 21a7 7 0 0 1 14 0M16 4.5a4 4 0 0 1 0 7.75M17 14.5a6 6 0 0 1 5 6.5"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
                    School Administration
                  </p>

                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                    Teachers
                  </h1>
                </div>
              </div>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
                Manage teachers and their accounts for{" "}
                <span className="font-medium text-slate-700">
                  {current.school.name}
                </span>
                .
              </p>
            </div>

            <div className="flex gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Teachers
                </p>
                <p className="mt-1 text-xl font-bold text-slate-950">
                  {teachers?.length ?? 0}
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

      {/* Content */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
        {current.role === "school_admin" && (
          <aside className="h-fit overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_15px_50px_-30px_rgba(15,23,42,0.25)]">
            <div className="border-b border-slate-100 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-green-600">
                New Account
              </p>

              <h2 className="mt-1 text-lg font-bold text-slate-950">
                Add Teacher
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Create a teacher account for your school.
              </p>
            </div>

            <div className="p-6">
              <CreateTeacherForm schoolId={current.schoolId} />
            </div>
          </aside>
        )}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_15px_50px_-30px_rgba(15,23,42,0.25)]">
          {teachers && teachers.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {teachers.map((teacher) => {
                const initials =
                  `${teacher.first_name?.charAt(0) ?? ""}${teacher.last_name?.charAt(0) ?? ""}`.toUpperCase();

                return (
                  <div
                    key={teacher.id}
                    className="flex flex-col gap-5 p-5 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-sm font-bold text-green-700">
                        {initials || "T"}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold text-slate-950">
                            {teacher.first_name} {teacher.last_name}
                          </h2>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                              teacher.status === "active"
                                ? "bg-green-50 text-green-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {teacher.status}
                          </span>
                        </div>

                        <div className="mt-1.5 flex flex-col gap-1 text-sm text-slate-500">
                          {teacher.email && <span>{teacher.email}</span>}
                          {teacher.phone && <span>{teacher.phone}</span>}
                        </div>
                      </div>
                    </div>

                    {current.role === "school_admin" && (
                      <TeacherActions
                        id={teacher.id}
                        firstName={teacher.first_name}
                        lastName={teacher.last_name}
                        email={teacher.email}
                        phone={teacher.phone}
                        status={teacher.status}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
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
                    d="M2 21a7 7 0 0 1 14 0"
                  />
                </svg>
              </div>

              <p className="mt-5 font-semibold text-slate-950">
                No teachers yet
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Add your first teacher using the form.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
