import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSchool } from "@/lib/auth/get-user";

import FeesPageClient from "@/components/school/AcademicFeesForm";

export default async function FeesPage() {
  const currentSchool = await getCurrentSchool();

  if (!currentSchool) {
    redirect("/login");
  }

  const supabase = await createClient();

  const { data: students, error } = await supabase
    .from("students")
    .select(
      `
        id,
        first_name,
        last_name,
        student_id
      `,
    )
    .eq("school_id", currentSchool.schoolId)
    .eq("status", "active")
    .order("first_name", {
      ascending: true,
    })
    .order("last_name", {
      ascending: true,
    });

  if (error) {
    console.error("Get fees page students error:", error);
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />

          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-green-600">
            School Administration
          </p>
        </div>

        <div className="mt-2 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Fees & Payments
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage student fees and maintain a permanent payment history.
            </p>
          </div>

          <div className="flex w-fit items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-sm font-bold text-green-700">
              {students?.length ?? 0}
            </div>

            <div>
              <p className="text-xs font-bold text-slate-900">
                Active Students
              </p>

              <p className="text-[11px] text-slate-400">
                Available for fee records
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-8 overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Finance Workspace
          </p>

          <h2 className="mt-1 text-base font-bold text-slate-900">
            Student Fees & Payment Records
          </h2>
        </div>

        <div className="p-5 sm:p-7">
          <FeesPageClient students={students ?? []} schoolId={""} />
        </div>
      </section>
    </main>
  );
}
