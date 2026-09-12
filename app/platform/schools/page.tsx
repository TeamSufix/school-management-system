import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import SchoolStatusButton from "@/components/platform/SchoolStatusButton";

export default async function SchoolsPage() {
  const supabase = await createClient();

  const { data: schools, error } = await supabase
    .from("schools")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  const schoolCount = schools?.length ?? 0;
  const activeCount =
    schools?.filter((school) => school.status === "active").length ?? 0;
  const inactiveCount = schoolCount - activeCount;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl bg-[#07130d] shadow-xl shadow-slate-200/60">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-green-500/10 blur-3xl" />

          <div className="relative px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-400">
                  Platform Administration
                </p>

                <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Schools
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                  Manage every school on the SchoolMS platform and access its
                  complete records.
                </p>
              </div>

              <Link
                href="/platform/schools/new"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-500 px-5 py-3 text-sm font-bold text-[#07130d] transition hover:bg-green-400"
              >
                <span className="text-lg leading-none">+</span>
                Add school
              </Link>
            </div>
          </div>
        </section>

        {/* Summary */}
        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Total schools
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {schoolCount}
            </p>
          </div>

          <div className="rounded-2xl border border-green-100 bg-green-50/50 p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-green-600">
              Active
            </p>

            <p className="mt-2 text-3xl font-bold text-green-700">
              {activeCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Inactive
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-700">
              {inactiveCount}
            </p>
          </div>
        </section>

        {/* Error */}
        {error ? (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-6">
            <h2 className="font-semibold text-red-900">
              Unable to load schools
            </h2>

            <p className="mt-1 text-sm text-red-700">
              There was a problem loading the school directory.
            </p>
          </div>
        ) : schools && schools.length > 0 ? (
          <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {/* Desktop header */}
            <div className="hidden border-b border-slate-100 bg-slate-50/70 px-6 py-4 md:grid md:grid-cols-[2fr_1fr_1fr_2fr] md:gap-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                School
              </p>

              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Code
              </p>

              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Status
              </p>

              <p className="text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Actions
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {schools.map((school) => (
                <div
                  key={school.id}
                  className="group p-6 transition hover:bg-slate-50/60 md:grid md:grid-cols-[2fr_1fr_1fr_2fr] md:items-center md:gap-4"
                >
                  {/* School */}
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-sm font-bold text-green-700 transition group-hover:bg-green-100">
                      {school.name?.charAt(0)?.toUpperCase() ?? "S"}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate font-semibold text-slate-900">
                        {school.name}
                      </h2>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {school.email ||
                          school.phone ||
                          "No contact information"}
                      </p>
                    </div>
                  </div>

                  {/* Code */}
                  <div className="mt-4 md:mt-0">
                    <p className="text-xs text-slate-400 md:hidden">Code</p>

                    <span className="text-sm font-medium text-slate-600">
                      {school.code || "—"}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="mt-4 md:mt-0">
                    <p className="mb-1 text-xs text-slate-400 md:hidden">
                      Status
                    </p>

                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                        school.status === "active"
                          ? "bg-green-50 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {school.status}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 flex flex-wrap gap-2 md:mt-0 md:justify-end">
                    <Link
                      href={`/platform/schools/${school.id}`}
                      className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      Manage
                    </Link>

                    <Link
                      href={`/platform/schools/${school.id}/edit`}
                      className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Edit
                    </Link>

                    <SchoolStatusButton
                      schoolId={school.id}
                      status={school.status}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <svg
                className="h-7 w-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <path d="M3 21h18M5 21V9l7-5 7 5v12" />
                <path d="M9 21v-6h6v6" />
              </svg>
            </div>

            <h2 className="mt-5 font-bold text-slate-900">No schools yet</h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Create your first school to start managing students, teachers,
              academics and finance.
            </p>

            <Link
              href="/platform/schools/new"
              className="mt-6 inline-flex items-center rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
            >
              Create your first school
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
