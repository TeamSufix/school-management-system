import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSchool } from "@/lib/auth/get-user";

import CreateClassForm from "@/components/school/CreateClassForm";
import ClassActions from "@/components/school/ClassActions";

export default async function ClassesPage() {
  const current = await getCurrentSchool();

  if (!current) {
    redirect("/login");
  }

  const supabase = await createClient();

  const { data: classes, error } = await supabase
    .from("classes")
    .select("*")
    .eq("school_id", current.schoolId)
    .order("name");

  if (error) {
    console.error("Classes fetch error:", error);
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      {/* Header */}

      <Link
        href="/school/dashboard"
        className="flex w-fit items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-green-600"
      >
        <span>←</span>
        Back to dashboard
      </Link>

      <div className="mt-6">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />

          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-green-600">
            School Administration
          </p>
        </div>

        <div className="mt-2 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Classes
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Organize students into classes for {current.school.name}.
            </p>
          </div>

          <div className="flex w-fit items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-sm font-bold text-green-700">
              {classes?.length ?? 0}
            </div>

            <div>
              <p className="text-xs font-bold text-slate-900">Classes</p>
              <p className="text-[11px] text-slate-400">School structure</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}

      <div className="mt-8 grid gap-6 xl:grid-cols-[360px_1fr]">
        {current.role === "school_admin" && (
          <div className="h-fit rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-lg font-bold text-green-600">
                +
              </div>

              <h2 className="mt-4 text-base font-bold text-slate-900">
                Create Class
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Add a new class to your school structure.
              </p>
            </div>

            <CreateClassForm schoolId={current.schoolId} />
          </div>
        )}

        <section className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-green-600">
              School Structure
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-900">
              All Classes
            </h2>
          </div>

          {classes && classes.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {classes.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-sm font-bold text-slate-600">
                      {item.name?.charAt(0)?.toUpperCase() ?? "C"}
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900">{item.name}</h3>

                      {item.level ? (
                        <p className="mt-1 text-sm text-slate-500">
                          {item.level}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-slate-400">
                          No level specified
                        </p>
                      )}
                    </div>
                  </div>

                  {current.role === "school_admin" && (
                    <ClassActions
                      id={item.id}
                      name={item.name}
                      level={item.level}
                      schoolId={current.schoolId}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="M4 5h16v14H4z" />
                  <path d="M8 9h8" />
                  <path d="M8 13h5" />
                </svg>
              </div>

              <h3 className="mt-4 font-bold text-slate-900">No classes yet</h3>

              <p className="mt-1 text-sm text-slate-500">
                Create your first class to begin organizing students.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
