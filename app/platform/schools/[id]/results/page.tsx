import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-user";
import { getManagementContext } from "@/lib/auth/get-management-context";

import ResultsForm from "@/components/school/AcademicResultsForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PlatformResultsPage({ params }: Props) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "super_admin") {
    redirect("/school/dashboard");
  }

  const { id: schoolId } = await params;

  if (!schoolId) {
    notFound();
  }

  const context = await getManagementContext(schoolId);

  if (!context || context.role !== "super_admin") {
    notFound();
  }

  const [
    { data: school, error: schoolError },
    { data: classes, error: classesError },
    { data: subjects, error: subjectsError },
  ] = await Promise.all([
    context.client
      .from("schools")
      .select("id, name")
      .eq("id", schoolId)
      .maybeSingle(),

    context.client
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("name", {
        ascending: true,
      }),

    context.client
      .from("subjects")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("name", {
        ascending: true,
      }),
  ]);

  if (schoolError || !school) {
    notFound();
  }

  if (classesError) {
    console.error("Platform results classes error:", classesError);
  }

  if (subjectsError) {
    console.error("Platform results subjects error:", subjectsError);
  }

  const classCount = classes?.length ?? 0;
  const subjectCount = subjects?.length ?? 0;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/platform/schools"
            className="font-medium text-slate-400 transition hover:text-slate-700"
          >
            Schools
          </Link>

          <span className="text-slate-300">/</span>

          <Link
            href={`/platform/schools/${schoolId}`}
            className="max-w-[180px] truncate font-medium text-slate-500 transition hover:text-green-600"
          >
            {school.name}
          </Link>

          <span className="text-slate-300">/</span>

          <span className="font-medium text-slate-800">Results</span>
        </div>

        {/* Hero */}
        <section className="relative mt-8 overflow-hidden rounded-3xl bg-[#07130d] shadow-xl shadow-slate-200/60">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-green-500/10 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-500/10 text-green-400 ring-1 ring-green-400/10">
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M4 4h16v16H4z" />
                      <path d="M8 8h8M8 12h8M8 16h5" />
                    </svg>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-400">
                      Academic Performance
                    </p>

                    <p className="mt-1 text-sm text-slate-400">{school.name}</p>
                  </div>
                </div>

                <h1 className="mt-7 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Results
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                  Record and manage academic results across classes and
                  subjects.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                  <p className="text-xs text-slate-500">Classes</p>
                  <p className="mt-1 text-2xl font-bold text-white">
                    {classCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                  <p className="text-xs text-slate-500">Subjects</p>
                  <p className="mt-1 text-2xl font-bold text-white">
                    {subjectCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Form */}
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-7 flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                Enter academic results
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select a class and subject, then record the results.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Results module
            </div>
          </div>

          <ResultsForm
            classes={classes ?? []}
            subjects={subjects ?? []}
            schoolId={schoolId}
          />
        </section>
      </div>
    </main>
  );
}
