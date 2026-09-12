import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-user";
import { getManagementContext } from "@/lib/auth/get-management-context";

import CreateTeacherForm from "@/components/school/CreateTeacherForm";
import TeacherActions from "@/components/school/TeacherActions";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PlatformTeachersPage({ params }: Props) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "super_admin") {
    redirect("/school/dashboard");
  }

  const { id } = await params;
  const schoolId = id;

  if (!schoolId) {
    notFound();
  }

  const context = await getManagementContext(schoolId);

  if (!context || context.role !== "super_admin") {
    notFound();
  }

  const [{ data: school, error: schoolError }, { data: teachers, error }] =
    await Promise.all([
      context.client
        .from("schools")
        .select("id, name")
        .eq("id", schoolId)
        .maybeSingle(),

      context.client
        .from("teachers")
        .select("*")
        .eq("school_id", schoolId)
        .order("first_name"),
    ]);

  if (schoolError || !school) {
    notFound();
  }

  if (error) {
    console.error("Platform teachers fetch error:", error);
  }

  const teacherCount = teachers?.length ?? 0;
  const activeCount =
    teachers?.filter((teacher) => teacher.status === "active").length ?? 0;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/platform/schools"
            className="font-medium text-slate-400 hover:text-slate-700"
          >
            Schools
          </Link>

          <span className="text-slate-300">/</span>

          <Link
            href={`/platform/schools/${schoolId}`}
            className="max-w-[180px] truncate font-medium text-slate-500 hover:text-green-600"
          >
            {school.name}
          </Link>

          <span className="text-slate-300">/</span>

          <span className="font-medium text-slate-800">Teachers</span>
        </div>

        <section className="relative mt-8 overflow-hidden rounded-3xl bg-[#07130d] shadow-xl shadow-slate-200/60">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-green-500/10 blur-3xl" />

          <div className="relative px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-400">
                  Staff Management
                </p>

                <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Teachers
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                  Manage teacher accounts and staff records for {school.name}.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                  <p className="text-xs text-slate-500">Teachers</p>
                  <p className="mt-1 text-2xl font-bold text-white">
                    {teacherCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                  <p className="text-xs text-slate-500">Active</p>
                  <p className="mt-1 text-2xl font-bold text-green-400">
                    {activeCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
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
                  <circle cx="9" cy="7" r="4" />
                  <path d="M3 21v-2a6 6 0 0 1 12 0v2M19 8v6M16 11h6" />
                </svg>
              </div>

              <h2 className="mt-4 text-lg font-bold text-slate-900">
                Add teacher
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Create a teacher account for this school.
              </p>
            </div>

            <CreateTeacherForm schoolId={schoolId} />
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-bold text-slate-900">Teacher directory</h2>

              <p className="mt-1 text-xs text-slate-500">
                {teacherCount}{" "}
                {teacherCount === 1 ? "teacher account" : "teacher accounts"}{" "}
                registered
              </p>
            </div>

            {teachers && teachers.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {teachers.map((teacher) => {
                  const initials = `${teacher.first_name?.[0] ?? ""}${
                    teacher.last_name?.[0] ?? ""
                  }`.toUpperCase();

                  return (
                    <div
                      key={teacher.id}
                      className="group flex flex-col gap-4 p-6 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xs font-bold text-slate-600 group-hover:bg-green-50 group-hover:text-green-700">
                          {initials}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-900">
                              {teacher.first_name} {teacher.last_name}
                            </h3>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                teacher.status === "active"
                                  ? "bg-green-50 text-green-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {teacher.status}
                            </span>
                          </div>

                          <div className="mt-1.5 space-y-0.5 text-xs text-slate-500">
                            {teacher.email && <p>{teacher.email}</p>}
                            {teacher.phone && <p>{teacher.phone}</p>}
                          </div>
                        </div>
                      </div>

                      <TeacherActions
                        id={teacher.id}
                        firstName={teacher.first_name}
                        lastName={teacher.last_name}
                        email={teacher.email}
                        phone={teacher.phone}
                        status={teacher.status}
                        schoolId={schoolId}
                      />
                    </div>
                  );
                })}
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
                    <circle cx="9" cy="7" r="4" />
                    <path d="M3 21v-2a6 6 0 0 1 12 0v2" />
                  </svg>
                </div>

                <h3 className="mt-5 font-semibold text-slate-900">
                  {error ? "Unable to load teachers" : "No teachers yet"}
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  {error
                    ? "There was a problem loading the teacher records."
                    : "Create the first teacher using the form."}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
