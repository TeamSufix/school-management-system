import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSchool } from "@/lib/auth/get-user";

import CreateSubjectForm from "@/components/school/CreateSubjectForm";
import SubjectActions from "@/components/school/SubjectActions";

export default async function SubjectsPage() {
  const current = await getCurrentSchool();

  if (!current) {
    redirect("/login");
  }

  const supabase = await createClient();

  const { data: subjects, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("school_id", current.schoolId)
    .order("name");

  if (error) {
    console.error("Subjects fetch error:", error);
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.2)]">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-green-100/70 blur-3xl" />

        <div className="relative p-6 sm:p-8">
          <Link
            href="/school/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-green-600"
          >
            <span>←</span>
            Dashboard
          </Link>

          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
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
                      d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 7h8M8 11h8M8 15h5"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
                    Academic Setup
                  </p>

                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                    Subjects
                  </h1>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-500">
                Manage subjects for{" "}
                <span className="font-medium text-slate-700">
                  {current.school.name}
                </span>
                .
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Total subjects
              </p>
              <p className="mt-1 text-xl font-bold text-slate-950">
                {subjects?.length ?? 0}
              </p>
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
                New Subject
              </p>

              <h2 className="mt-1 text-lg font-bold text-slate-950">
                Add Subject
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Create a subject for your school.
              </p>
            </div>

            <div className="p-6">
              <CreateSubjectForm />
            </div>
          </aside>
        )}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_15px_50px_-30px_rgba(15,23,42,0.25)]">
          {subjects && subjects.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="group flex items-center justify-between gap-5 p-5 transition hover:bg-slate-50/70 sm:px-6"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-sm font-bold text-green-700">
                      {subject.name?.charAt(0)?.toUpperCase() ?? "S"}
                    </div>

                    <div className="min-w-0">
                      <h2 className="font-semibold text-slate-950">
                        {subject.name}
                      </h2>

                      {subject.code && (
                        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                          {subject.code}
                        </p>
                      )}
                    </div>
                  </div>

                  {current.role === "school_admin" && (
                    <SubjectActions
                      id={subject.id}
                      name={subject.name}
                      code={subject.code}
                    />
                  )}
                </div>
              ))}
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 8h8M8 12h5"
                  />
                </svg>
              </div>

              <p className="mt-5 font-semibold text-slate-950">
                No subjects yet
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Create your first subject using the form.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
