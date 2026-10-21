import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PlatformDashboard() {
  const supabase = await createAdminClient();

  const [
    { count: schools },
    { count: activeSchools },
    { count: students },
    { count: teachers },
    { count: parents },
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
      .select("id, name, code, status, city, country, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8 lg:px-10">

      <section className="relative overflow-hidden rounded-[28px] bg-[#07130d] px-6 py-8 text-white shadow-xl shadow-slate-200/40 sm:px-9 sm:py-10">
        <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-green-500/10 blur-3xl" />

        <div className="absolute -bottom-32 right-1/4 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-green-400/10 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />

              <span className="text-xs font-medium text-green-300">
                Platform is operational
              </span>
            </div>

            <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              Good to see you,
              <span className="text-green-400"> Super Admin.</span>
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
              Manage schools, monitor platform activity and oversee your entire
              SchoolMS ecosystem from one place.
            </p>
          </div>

          <Link
            href="/platform/schools/new"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-green-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-green-900/20 transition hover:bg-green-400"
          >
            <span className="text-lg leading-none">+</span>
            Add New School
          </Link>
        </div>
      </section>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Schools"
          value={schools ?? 0}
          description="Schools on platform"
          icon="school"
        />

        <StatCard
          label="Active Schools"
          value={activeSchools ?? 0}
          description="Currently operational"
          icon="activity"
        />

        <StatCard
          label="Students"
          value={students ?? 0}
          description="Student records"
          icon="students"
        />

        <StatCard
          label="Teachers"
          value={teachers ?? 0}
          description="Teacher records"
          icon="teacher"
        />

        <StatCard
          label="Parents"
          value={parents ?? 0}
          description="Parent accounts"
          icon="parent"
        />
      </section>


      <section className="mt-7 grid gap-7 xl:grid-cols-[1fr_340px]">

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="font-bold text-slate-900">Recent Schools</h2>

              <p className="mt-1 text-xs text-slate-500">
                Most recently added schools
              </p>
            </div>

            <Link
              href="/platform/schools"
              className="text-xs font-semibold text-green-600 transition hover:text-green-700"
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
                  className="group flex items-center justify-between gap-4 px-6 py-5 transition hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-sm font-bold text-green-700 transition group-hover:bg-green-100">
                      {getInitials(school.name)}
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-900">
                        {school.name}
                      </h3>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {school.code || "No school code"}
                        {school.city ? ` • ${school.city}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`hidden rounded-full px-2.5 py-1 text-[10px] font-semibold sm:inline-flex ${
                        school.status === "active"
                          ? "bg-green-50 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {school.status}
                    </span>

                    <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-green-500">
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </div>


        <div className="space-y-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="font-bold text-slate-900">Quick Actions</h2>

              <p className="mt-1 text-xs text-slate-500">
                Common platform tasks
              </p>
            </div>

            <div className="mt-5 space-y-2">
              <QuickAction
                href="/platform/schools/new"
                icon="+"
                title="Create School"
                description="Add a new school"
              />

              <QuickAction
                href="/platform/schools"
                icon="⌂"
                title="Manage Schools"
                description="View all schools"
              />
            </div>
          </div>

          {/* PLATFORM HEALTH */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Platform Health</h2>

                <p className="mt-1 text-xs text-slate-500">
                  Current system status
                </p>
              </div>

              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 text-green-600">
                ✓
              </span>
            </div>

            <div className="mt-5 rounded-xl bg-green-50 p-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                </span>

                <div>
                  <p className="text-sm font-semibold text-green-800">
                    All systems operational
                  </p>

                  <p className="mt-0.5 text-xs text-green-700/70">
                    SchoolMS is running normally
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section className="mt-7 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            SchoolMS Platform
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Central administration and school management
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Secure</span>
          <span>•</span>
          <span>Reliable</span>
          <span>•</span>
          <span>Simple</span>
        </div>
      </section>
    </div>
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
  icon: "school" | "activity" | "students" | "teacher" | "parent";
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 transition group-hover:bg-green-50 group-hover:text-green-600">
          <StatIcon type={icon} />
        </div>

        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
          Live
        </span>
      </div>

      <p className="mt-5 text-xs font-medium text-slate-500">{label}</p>

      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
        {value.toLocaleString()}
      </p>

      <p className="mt-1 text-[11px] text-slate-400">{description}</p>
    </div>
  );
}


function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-transparent p-3 transition hover:border-slate-100 hover:bg-slate-50"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-lg font-bold text-green-600 transition group-hover:bg-green-100">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800">{title}</p>

        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>

      <span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-green-500">
        →
      </span>
    </Link>
  );
}


function EmptyState() {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-xl">
        🏫
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-900">
        No schools yet
      </p>

      <p className="mt-1 text-xs text-slate-500">
        Create your first school to get started.
      </p>

      <Link
        href="/platform/schools/new"
        className="mt-4 inline-flex text-xs font-semibold text-green-600 hover:text-green-700"
      >
        Create school →
      </Link>
    </div>
  );
}


function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function StatIcon({
  type,
}: {
  type: "school" | "activity" | "students" | "teacher" | "parent";
}) {
  if (type === "school") return <span>⌂</span>;
  if (type === "activity") return <span>↗</span>;
  if (type === "students") return <span>◉</span>;
  if (type === "teacher") return <span>✦</span>;
  return <span>♙</span>;
}
