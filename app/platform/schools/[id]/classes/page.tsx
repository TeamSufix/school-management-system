import Link from "next/link";
import { notFound } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { getManagementContext } from "@/lib/auth/get-management-context";

import CreateClassForm from "@/components/school/CreateClassForm";
import ClassActions from "@/components/school/ClassActions";

type PlatformClassesPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PlatformClassesPage({
  params,
}: PlatformClassesPageProps) {
  const { id: schoolId } = await params;

  const context = await getManagementContext(schoolId);

  if (!context) {
    notFound();
  }

  if (context.role !== "super_admin") {
    notFound();
  }

  const verifiedSchoolId = context.schoolId;

  const supabase = await createAdminClient();

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("id, name, code")
    .eq("id", verifiedSchoolId)
    .maybeSingle();

  if (schoolError) {
    console.error("Platform classes school fetch error:", schoolError);
  }

  if (!school) {
    notFound();
  }

  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("*")
    .eq("school_id", verifiedSchoolId)
    .order("name", {
      ascending: true,
    });

  if (classesError) {
    console.error("Platform classes fetch error:", classesError);
  }

  const classCount = classes?.length ?? 0;

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
            href={`/platform/schools/${verifiedSchoolId}`}
            className="max-w-[180px] truncate font-medium text-slate-500 transition hover:text-green-600"
          >
            {school.name}
          </Link>

          <span className="text-slate-300">/</span>

          <span className="font-medium text-slate-800">Classes</span>
        </div>

        {/* Hero */}
        <section className="mt-8 overflow-hidden rounded-3xl bg-[#07130d] shadow-xl shadow-slate-200/60">
          <div className="relative px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-green-500/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
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
                      <path d="M4 5h16v14H4z" />
                      <path d="M8 9h8M8 13h5" />
                    </svg>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-400">
                      Academic Structure
                    </p>

                    <p className="mt-1 text-sm text-slate-400">{school.name}</p>
                  </div>
                </div>

                <h1 className="mt-7 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Classes
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                  Create and manage the academic classes belonging to this
                  school.
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-right">
                  <p className="text-xs text-slate-500">Total classes</p>
                  <p className="text-2xl font-bold text-white">{classCount}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* Create */}
          <section className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-700">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>

              <h2 className="mt-4 text-lg font-bold text-slate-900">
                Add class
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Create a new class for {school.name}.
              </p>
            </div>

            <CreateClassForm schoolId={verifiedSchoolId} />
          </section>

          {/* List */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="font-bold text-slate-900">All classes</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {classCount}{" "}
                  {classCount === 1 ? "class registered" : "classes registered"}
                </p>
              </div>

              {school.code && (
                <div className="hidden rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 sm:block">
                  {school.code}
                </div>
              )}
            </div>

            {classesError ? (
              <div className="p-10">
                <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
                  <h3 className="font-semibold text-red-900">
                    Failed to load classes
                  </h3>
                  <p className="mt-1 text-sm text-red-700">
                    Please refresh the page and try again.
                  </p>
                </div>
              </div>
            ) : classes && classes.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {classes.map((item, index) => (
                  <div
                    key={item.id}
                    className="group flex flex-col gap-4 px-6 py-5 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-500 transition group-hover:bg-green-50 group-hover:text-green-700">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900">
                          {item.name}
                        </h3>

                        {item.level ? (
                          <p className="mt-1 text-sm text-slate-500">
                            {item.level}
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-slate-400">
                            No level specified
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      <ClassActions
                        id={item.id}
                        name={item.name}
                        level={item.level}
                        schoolId={verifiedSchoolId}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <svg
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <path d="M4 5h16v14H4z" />
                    <path d="M8 9h8M8 13h5" />
                  </svg>
                </div>

                <h3 className="mt-5 font-semibold text-slate-900">
                  No classes yet
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Create the first class using the form on the left.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
