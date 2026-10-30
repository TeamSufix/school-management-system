import Link from "next/link";
import { notFound } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import CreateSchoolAdminForm from "@/components/platform/CreateSchoolAdminForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const iconPaths: Record<string, React.ReactNode> = {
  students: (
    <>
      <circle cx="9" cy="7" r="4" />
      <path d="M3 21v-2a6 6 0 0 1 12 0v2" />
      <path d="M19 8v6M16 11h6" />
    </>
  ),
  teachers: (
    <>
      <circle cx="9" cy="7" r="4" />
      <path d="M3 21v-2a6 6 0 0 1 12 0v2" />
      <path d="m16 11 2 2 4-4" />
    </>
  ),
  classes: (
    <>
      <path d="M4 5h16v14H4z" />
      <path d="M8 9h8M8 13h5" />
    </>
  ),
  subjects: (
    <>
      <path d="M4 5h16v14H4z" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </>
  ),
  attendance: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8M8 12l2 2 4-4" />
    </>
  ),
  results: (
    <>
      <path d="M4 19V5M4 19h16" />
      <path d="M8 16v-4M12 16V8M16 16v-6" />
    </>
  ),
  fees: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </>
  ),
  parents: (
    <>
      <circle cx="9" cy="7" r="4" />
      <path d="M3 21v-2a6 6 0 0 1 12 0v2" />
      <path d="M16 8h6M19 5v6" />
    </>
  ),
};

function StatIcon({ type }: { type: string }) {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      {iconPaths[type]}
    </svg>
  );
}

export default async function PlatformSchoolPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createAdminClient();

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (schoolError || !school) {
    notFound();
  }

  const [
    studentsResult,
    teachersResult,
    classesResult,
    subjectsResult,
    attendanceResult,
    resultsResult,
    feesResult,
    paymentsResult,
    parentsResult,
    adminsResult,
  ] = await Promise.all([
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("school_id", id),

    supabase
      .from("teachers")
      .select("id", { count: "exact", head: true })
      .eq("school_id", id),

    supabase
      .from("classes")
      .select("id", { count: "exact", head: true })
      .eq("school_id", id),

    supabase
      .from("subjects")
      .select("id", { count: "exact", head: true })
      .eq("school_id", id),

    supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("school_id", id),

    supabase
      .from("results")
      .select("id", { count: "exact", head: true })
      .eq("school_id", id),

    supabase
      .from("fees")
      .select("id", { count: "exact", head: true })
      .eq("school_id", id),

    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("school_id", id),

    supabase
      .from("school_memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("school_id", id)
      .eq("role", "parent"),

    supabase
      .from("school_memberships")
      .select(
        `
        user_id,
        role,
        profiles (
          first_name,
          last_name
        )
      `,
      )
      .eq("school_id", id)
      .eq("role", "school_admin"),
  ]);

  if (adminsResult.error) {
    console.error("Get school administrators error:", adminsResult.error);
  }

  const stats = [
    {
      key: "students",
      label: "Students",
      value: studentsResult.count ?? 0,
      href: `/platform/schools/${id}/students`,
    },
    {
      key: "teachers",
      label: "Teachers",
      value: teachersResult.count ?? 0,
      href: `/platform/schools/${id}/teachers`,
    },
    {
      key: "classes",
      label: "Classes",
      value: classesResult.count ?? 0,
      href: `/platform/schools/${id}/classes`,
    },
    {
      key: "subjects",
      label: "Subjects",
      value: subjectsResult.count ?? 0,
      href: `/platform/schools/${id}/subjects`,
    },
    {
      key: "attendance",
      label: "Attendance",
      value: attendanceResult.count ?? 0,
      href: `/platform/schools/${id}/attendance`,
    },
    {
      key: "results",
      label: "Results",
      value: resultsResult.count ?? 0,
      href: `/platform/schools/${id}/results`,
    },
    {
      key: "fees",
      label: "Fee Records",
      value: feesResult.count ?? 0,
      href: `/platform/schools/${id}/fees`,
    },
    {
      key: "parents",
      label: "Parents",
      value: parentsResult.count ?? 0,
      href: `/platform/schools/${id}/parents`,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <Link href={`/platform/schools/${id}/settings`} className="mx-auto block max-w-7xl px-6 pt-6 font-semibold text-green-700">Academic settings and teacher assignments</Link>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/platform/schools"
            className="font-medium text-slate-400 hover:text-slate-700"
          >
            Schools
          </Link>

          <span className="text-slate-300">/</span>

          <span className="max-w-[220px] truncate font-medium text-slate-800">
            {school.name}
          </span>
        </div>

        {/* Hero */}
        <section className="relative mt-8 overflow-hidden rounded-3xl bg-[#07130d] shadow-2xl shadow-slate-200/70">
          <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-green-500/10 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-lg font-bold text-green-400 ring-1 ring-white/10">
                    {school.name?.charAt(0)?.toUpperCase() ?? "S"}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-400">
                      School Overview
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      {school.code || "School management"}
                    </p>
                  </div>
                </div>

                <h1 className="mt-7 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {school.name}
                </h1>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      school.status === "active"
                        ? "bg-green-500/10 text-green-400 ring-1 ring-green-400/20"
                        : "bg-red-500/10 text-red-400 ring-1 ring-red-400/20"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {school.status}
                  </span>

                  {school.city && (
                    <span className="text-sm text-slate-500">
                      {school.city}
                      {school.country ? `, ${school.country}` : ""}
                    </span>
                  )}
                </div>
              </div>

              <Link
                href={`/platform/schools/${id}/edit`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-slate-100"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                </svg>
                Edit school
              </Link>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition group-hover:bg-green-50 group-hover:text-green-700">
                  <StatIcon type={stat.key} />
                </div>

                <span className="text-slate-300 transition group-hover:text-green-500">
                  →
                </span>
              </div>

              <p className="mt-5 text-sm font-medium text-slate-500">
                {stat.label}
              </p>

              <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                {stat.value}
              </p>

              <p className="mt-3 text-xs font-semibold text-green-700">
                Manage {stat.label.toLowerCase()}
              </p>
            </Link>
          ))}
        </section>

        {/* School information */}
        <section className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 sm:px-7">
              <div>
                <h2 className="font-bold text-slate-900">School information</h2>

                <p className="mt-1 text-xs text-slate-500">
                  Basic information and contact details.
                </p>
              </div>

              <Link
                href={`/platform/schools/${id}/edit`}
                className="text-sm font-semibold text-green-700 hover:text-green-800"
              >
                Edit
              </Link>
            </div>

            <div className="grid gap-x-8 gap-y-6 p-6 sm:grid-cols-2 sm:p-7">
              {[
                ["School code", school.code],
                ["Phone", school.phone],
                ["Email", school.email],
                ["Address", school.address],
                ["City", school.city],
                ["Country", school.country],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {label}
                  </p>

                  <p className="mt-2 text-sm font-medium text-slate-800">
                    {value || "Not provided"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Admin */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-bold text-slate-900">School administrator</h2>

              <p className="mt-1 text-xs text-slate-500">
                Person responsible for managing this school.
              </p>
            </div>

            <div className="p-6">
              {adminsResult.data && adminsResult.data.length > 0 ? (
                <div className="space-y-3">
                  {adminsResult.data.map((admin) => {
                    const profile = Array.isArray(admin.profiles)
                      ? admin.profiles[0]
                      : admin.profiles;

                    const initials = `${profile?.first_name?.[0] ?? ""}${
                      profile?.last_name?.[0] ?? ""
                    }`.toUpperCase();

                    return (
                      <div
                        key={admin.user_id}
                        className="flex items-center gap-4 rounded-2xl border border-green-100 bg-green-50/60 p-4"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-sm font-bold text-green-700">
                          {initials || "A"}
                        </div>

                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {profile?.first_name || ""}{" "}
                            {profile?.last_name || ""}
                          </p>

                          <p className="mt-1 text-xs font-medium text-green-700">
                            School Administrator
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900">
                      No administrator assigned
                    </p>

                    <p className="mt-1 text-xs leading-5 text-amber-700">
                      Create an administrator account to allow the school to
                      manage its own records.
                    </p>
                  </div>

                  <div className="mt-5">
                    <CreateSchoolAdminForm schoolId={school.id} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Finance summary */}
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
                Finance overview
              </p>

              <h2 className="mt-1 text-lg font-bold text-slate-900">
                Fees & payments
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Monitor school financial records.
              </p>
            </div>

            <Link
              href={`/platform/schools/${id}/fees`}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Open finance →
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-medium text-slate-500">Fee records</p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {feesResult.count ?? 0}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-medium text-slate-500">
                Payment records
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {paymentsResult.count ?? 0}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
