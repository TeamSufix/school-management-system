import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-user";
import { getManagementContext } from "@/lib/auth/get-management-context";

import AttendanceForm from "@/components/school/AttendanceForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PlatformAttendancePage({ params }: Props) {
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
  ]);

  if (schoolError || !school) {
    notFound();
  }

  if (classesError) {
    console.error("Platform attendance classes error:", classesError);
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
            href={`/platform/schools/${schoolId}`}
            className="max-w-[180px] truncate font-medium text-slate-500 transition hover:text-green-600"
          >
            {school.name}
          </Link>

          <span className="text-slate-300">/</span>

          <span className="font-medium text-slate-800">Attendance</span>
        </div>

        {/* Header */}
        <section className="mt-8 overflow-hidden rounded-3xl bg-[#07130d] shadow-xl shadow-slate-200/60">
          <div className="relative px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-green-500/10 blur-3xl" />
            <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-green-400">
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
                      <path d="m8 15 2 2 5-5" />
                    </svg>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-400">
                      School Administration
                    </p>
                    <p className="mt-1 text-sm text-slate-400">{school.name}</p>
                  </div>
                </div>

                <h1 className="mt-7 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Attendance
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                  Record and manage student attendance across classes for{" "}
                  <span className="font-medium text-white">{school.name}</span>.
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/10 text-green-400">
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 19V5M4 19h16" />
                    <path d="M8 16v-4M12 16V8M16 16v-6" />
                  </svg>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Available classes</p>
                  <p className="text-sm font-semibold text-white">
                    {classCount} {classCount === 1 ? "class" : "classes"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main content */}
        <section className="mt-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-7 flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  Record attendance
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Select a class and record attendance for the selected date.
                </p>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Attendance module
              </div>
            </div>

            {classesError ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                    !
                  </div>

                  <div>
                    <h3 className="font-semibold text-red-900">
                      Unable to load classes
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-red-700">
                      We could not load the classes for this school. Please
                      refresh the page and try again.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <AttendanceForm classes={classes ?? []} schoolId={schoolId} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
