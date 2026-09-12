import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSchool } from "@/lib/auth/get-user";

import EditStudentForm from "@/components/school/EditStudentForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditStudentPage({ params }: Props) {
  const current = await getCurrentSchool();

  if (!current) {
    redirect("/login");
  }

  if (current.role !== "school_admin") {
    redirect("/school/students");
  }

  const { id } = await params;

  const supabase = await createClient();

  const [{ data: student }, { data: classes }] = await Promise.all([
    supabase
      .from("students")
      .select("*")
      .eq("id", id)
      .eq("school_id", current.schoolId)
      .single(),

    supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", current.schoolId)
      .order("name"),
  ]);

  if (!student) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/school/students/${id}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-green-600"
      >
        <span>←</span>
        Back to student
      </Link>

      <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.2)]">
        <div className="relative overflow-hidden border-b border-slate-100 p-6 sm:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-green-100/60 blur-3xl" />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
              Student Management
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Edit Student
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Update{" "}
              <span className="font-semibold text-slate-700">
                {student.first_name} {student.last_name}
              </span>
              's information.
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <EditStudentForm student={student} classes={classes ?? []} />
        </div>
      </section>
    </main>
  );
}
