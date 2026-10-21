import Link from "next/link";

import { createAdminClient } from "@/lib/supabase/admin";

export default async function PlatformDashboard() {
  const supabase = await createAdminClient();

  const [
    { count: schoolsCount },
    { count: activeSchoolsCount },
    { count: studentsCount },
    { count: teachersCount },
    { count: parentsCount },
    { data: recentSchools },
  ] = await Promise.all([
    supabase.from("schools").select("id", { count: "exact", head: true }),

    supabase
      .from("schools")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),

    supabase.from("students").select("id", { count: "exact", head: true }),

    supabase.from("teachers").select("id", { count: "exact", head: true }),

    supabase
      .from("school_memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "parent"),

    supabase
      .from("schools")
      .select("id, name, code, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const stats = [
    {
      label: "Total Schools",
      value: schoolsCount ?? 0,
      description: "Schools on platform",
      icon: "school",
    },
    {
      label: "Active Schools",
      value: activeSchoolsCount ?? 0,
      description: "Currently operational",
      icon: "check",
    },
    {
      label: "Students",
      value: studentsCount ?? 0,
      description: "Student records",
      icon: "student",
    },
    {
      label: "Teachers",
      value: teachersCount ?? 0,
      description: "Teaching staff",
      icon: "teacher",
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">

      <section className="relative overflow-hidden rounded-[28px] bg-[#07130d] px-6 py-8 text-white shadow-xl shadow-slate-900/5 sm:px-8 sm:py-10">
        {/* Decorative shapes */}

        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-green-500/10 blur-3xl" />

        <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-green-400/10 blur-3xl" />

        <div className="relative">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-green-400/10 px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />

                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-green-300">
                  Platform Overview
                </span>
              </div>

              <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
                Good to see you,{" "}
                <span className="text-green-400">Super Admin.</span>
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
                Monitor schools, people, and academic operations across the
                entire SchoolMS platform from one place.
              </p>
            </div>

            <Link
              href="/platform/schools/new"
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-green-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-green-900/30 transition hover:bg-green-400"
            >
              <span className="text-lg leading-none">+</span>
              Add School
            </Link>
          </div>
        </div>
      </section>


      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            description={stat.description}
            icon={stat.icon}
          />
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
        {/* Recent Schools */}

        <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-green-600">
                Directory
              </p>

              <h2 className="mt-1 text-lg font-bold text-slate-900">
                Recent Schools
              </h2>
            </div>

            <Link
              href="/platform/schools"
              className="text-xs font-bold text-green-600 transition hover:text-green-700"
            >
              View all →
            </Link>
          </div>

          {recentSchools && recentSchools.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentSchools.map((school) => (
                <Link
                  key={school.id}
                  href={`/platform/schools/${school.id}`}
                  className="group flex items-center gap-4 px-6 py-4 transition hover:bg-slate-50"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-sm font-bold text-green-700">
                    {school.name?.charAt(0)?.toUpperCase() ?? "S"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900 group-hover:text-green-700">
                      {school.name}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {school.code || "No school code"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={school.status} />

                    <span className="hidden text-slate-300 transition group-hover:text-green-500 sm:block">
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="font-semibold text-slate-900">No schools yet</p>

              <p className="mt-1 text-sm text-slate-500">
                Add your first school to get started.
              </p>

              <Link
                href="/platform/schools/new"
                className="mt-5 inline-flex rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
              >
                Add School
              </Link>
            </div>
          )}
        </div>

        {/* Platform Summary */}

        <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-green-600">
              Platform Health
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-900">
              System Overview
            </h2>
          </div>

          <div className="mt-6 rounded-2xl bg-green-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-green-600"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>

              <div>
                <p className="text-sm font-bold text-green-900">
                  Platform operational
                </p>

                <p className="mt-0.5 text-xs text-green-700">
                  Core services are available
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-1">
            <SummaryRow label="Schools" value={schoolsCount ?? 0} />

            <SummaryRow label="Students" value={studentsCount ?? 0} />

            <SummaryRow label="Teachers" value={teachersCount ?? 0} />

            <SummaryRow label="Parents" value={parentsCount ?? 0} />
          </div>
        </div>
      </section>


      <section className="mt-8">
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-green-600">
            Quick Access
          </p>

          <h2 className="mt-1 text-lg font-bold text-slate-900">
            Platform Management
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction
            href="/platform/schools"
            title="Manage Schools"
            description="View and administer all schools."
            icon="school"
          />

          <QuickAction
            href="/platform/schools/new"
            title="Add School"
            description="Register a new school."
            icon="plus"
          />

          <QuickAction
            href="/platform/schools"
            title="School Records"
            description="Access students, teachers and records."
            icon="records"
          />
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: string;
}) {
  return (
    <div className="group rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
          <SmallIcon type={icon} />
        </div>

        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
          SchoolMS
        </span>
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>

      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
        {value.toLocaleString()}
      </p>

      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}


function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>

      <span className="text-sm font-bold text-slate-900">
        {value.toLocaleString()}
      </span>
    </div>
  );
}


function QuickAction({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-slate-600 transition group-hover:bg-green-50 group-hover:text-green-600">
          <SmallIcon type={icon} />
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>

          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>

        <span className="ml-auto text-slate-300 transition group-hover:text-green-600">
          →
        </span>
      </div>
    </Link>
  );
}


function StatusBadge({ status }: { status: string | null }) {
  const active = status === "active";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
        active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}


function SmallIcon({ type }: { type: string }) {
  if (type === "school") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M3 21h18" />
        <path d="M5 21V8l7-4 7 4v13" />
        <path d="M9 21v-6h6v6" />
      </svg>
    );
  }

  if (type === "student") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="9" cy="7" r="4" />
        <path d="M3 21v-2a6 6 0 0 1 12 0v2" />
        <path d="M16 11h5" />
        <path d="M18.5 8.5v5" />
      </svg>
    );
  }

  if (type === "teacher") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21a7 7 0 0 1 14 0" />
      </svg>
    );
  }

  if (type === "check") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  if (type === "records") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M4 4h16v16H4z" />
        <path d="M8 8h8" />
        <path d="M8 12h8" />
        <path d="M8 16h5" />
      </svg>
    );
  }

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
