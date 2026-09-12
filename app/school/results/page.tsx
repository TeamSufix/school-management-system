import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSchool } from "@/lib/auth/get-user";

import ResultsForm from "@/components/school/ResultsForm";

export default async function ResultsPage() {
  const currentSchool = await getCurrentSchool();

  if (!currentSchool) {
    redirect("/login");
  }

  const supabase = await createClient();

  const [
    { data: classes, error: classesError },
    { data: subjects, error: subjectsError },
  ] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", currentSchool.schoolId)
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("subjects")
      .select("id, name")
      .eq("school_id", currentSchool.schoolId)
      .order("name", {
        ascending: true,
      }),
  ]);

  if (classesError) {
    console.error("Get result classes error:", classesError);
  }

  if (subjectsError) {
    console.error("Get result subjects error:", subjectsError);
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.2)]">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-green-100/60 blur-3xl" />

        <div className="relative p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-600">
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
                  d="M4 19.5V5.5A1.5 1.5 0 0 1 5.5 4H18a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.5.5H6a2 2 0 0 0-2 2"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 8h8M8 12h8M8 16h5"
                />
              </svg>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
                Academic Records
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Results
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Record and manage student academic results across your classes
                and subjects.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Classes
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                {classes?.length ?? 0}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Subjects
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                {subjects?.length ?? 0}
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">
                Record policy
              </p>
              <p className="mt-0.5 text-sm font-medium text-amber-800">
                Saved results are permanent
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_15px_50px_-30px_rgba(15,23,42,0.25)]">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
          <h2 className="font-semibold text-slate-950">
            Record student result
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select the class and subject, then enter the result information.
          </p>
        </div>

        <div className="p-6 sm:p-8">
          <ResultsForm classes={classes ?? []} subjects={subjects ?? []} schoolId={""} />
        </div>
      </section>
    </main>
  );
}
