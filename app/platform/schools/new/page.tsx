import Link from "next/link";

import CreateSchoolForm from "@/components/platform/CreateSchoolForm";

export default function NewSchoolPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/platform/schools"
            className="font-medium text-slate-400 hover:text-slate-700"
          >
            Schools
          </Link>

          <span className="text-slate-300">/</span>

          <span className="font-medium text-slate-800">New school</span>
        </div>

        <section className="relative mt-8 overflow-hidden rounded-3xl bg-[#07130d] shadow-xl shadow-slate-200/60">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-green-500/10 blur-3xl" />

          <div className="relative px-6 py-8 sm:px-8 lg:px-10">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-500/10 text-green-400 ring-1 ring-green-400/10">
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path d="M3 21h18M5 21V9l7-5 7 5v12" />
                  <path d="M9 21v-6h6v6M9 10h.01M12 10h.01M15 10h.01" />
                </svg>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-400">
                  Platform Administration
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
                  Create School
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                  Add a new school to the SchoolMS platform and configure its
                  basic information.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
            <h2 className="font-bold text-slate-900">School information</h2>

            <p className="mt-1 text-sm text-slate-500">
              Enter the basic details for the new school.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <CreateSchoolForm />
          </div>
        </section>

        <div className="mt-6">
          <Link
            href="/platform/schools"
            className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            ← Back to schools
          </Link>
        </div>
      </div>
    </main>
  );
}
