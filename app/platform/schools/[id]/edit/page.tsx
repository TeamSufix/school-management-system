import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import EditSchoolForm from "@/components/platform/EditSchoolForm";

type EditSchoolPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditSchoolPage({ params }: EditSchoolPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: school, error } = await supabase
    .from("schools")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !school) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/platform/schools"
            className="font-medium text-slate-400 transition hover:text-slate-700"
          >
            Schools
          </Link>

          <span className="text-slate-300">/</span>

          <span className="font-medium text-slate-800">Edit school</span>
        </div>

        {/* Header */}
        <section className="mt-8 overflow-hidden rounded-3xl bg-[#07130d] shadow-xl shadow-slate-200/60">
          <div className="relative px-6 py-8 sm:px-8 lg:px-10">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-green-500/10 blur-3xl" />

            <div className="relative flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-500/10 text-green-400 ring-1 ring-green-400/10">
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                </svg>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-400">
                  School Management
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
                  Edit School
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                  Update the information and settings for{" "}
                  <span className="font-medium text-white">{school.name}</span>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Form */}
        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
            <h2 className="font-bold text-slate-900">School information</h2>

            <p className="mt-1 text-sm text-slate-500">
              Keep the school's information accurate and up to date.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <EditSchoolForm school={school} />
          </div>
        </section>

        {/* Bottom navigation */}
        <div className="mt-6 flex items-center justify-between">
          <Link
            href="/platform/schools"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <span>←</span>
            Back to schools
          </Link>

          <Link
            href={`/platform/schools/${school.id}`}
            className="text-sm font-semibold text-green-700 transition hover:text-green-800"
          >
            View school →
          </Link>
        </div>
      </div>
    </main>
  );
}
