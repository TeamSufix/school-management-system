import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSchool } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import StudentRecords from "@/components/school/StudentRecords";
import StudentFileManager from "@/components/school/StudentFileManager";
import EnrollmentHistory from "@/components/school/EnrollmentHistory";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function StudentProfilePage({ params }: Props) {
  const current = await getCurrentSchool();

  if (!current) {
    redirect("/login");
  }

  const { id } = await params;

  const supabase = await createClient();

  const { data: student, error } = await supabase
    .from("students")
    .select(
      `
        *,
        classes (
          id,
          name
        )
      `,
    )
    .eq("id", id)
    .eq("school_id", current.schoolId)
    .single();

  if (error || !student) {
    notFound();
  }

  const studentClass = Array.isArray(student.classes)
    ? student.classes[0]
    : student.classes;

  let photoUrl: string | null = null;
  if (
    typeof student.photo_path === "string" &&
    student.photo_path.startsWith(`${current.schoolId}/students/${student.id}/photo/`)
  ) {
    const signed = await createAdminClient()
      .storage.from("schoolms-records")
      .createSignedUrl(student.photo_path, 600);
    photoUrl = signed.data?.signedUrl ?? null;
  }

  const initials =
    `${student.first_name?.charAt(0) ?? ""}${student.last_name?.charAt(0) ?? ""}`.toUpperCase();

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6 lg:px-8">
      <Link
        href="/school/students"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-green-600"
      >
        <span>←</span>
        Back to students
      </Link>

      {/* Profile header */}
      <section className="relative mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.2)]">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-green-100/70 blur-3xl" />

        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-center gap-5">
            <div
              role="img"
              aria-label={`${student.first_name} ${student.last_name}`}
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-green-50 bg-cover bg-center text-2xl font-bold text-green-700 ring-1 ring-green-100"
              style={photoUrl ? { backgroundImage: `url("${photoUrl}")` } : undefined}
            >
              {photoUrl ? null : initials || "ST"}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
                Student Profile
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {student.first_name} {student.last_name}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span>
                  Student ID:{" "}
                  <span className="font-semibold text-slate-700">
                    {student.student_id}
                  </span>
                </span>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                    student.status === "active"
                      ? "bg-green-50 text-green-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {student.status}
                </span>
              </div>
            </div>
          </div>

          {current.role === "school_admin" && (
            <Link
              href={`/school/students/${student.id}/edit`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Edit Student
              <span>→</span>
            </Link>
          )}
        </div>
      </section>

      {current.role === "school_admin" && <Link href={`/reports/students/${student.id}`} className="mt-6 inline-block rounded-xl bg-green-700 px-5 py-3 font-semibold text-white">View report card</Link>}

      {/* Information */}
      <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_15px_50px_-30px_rgba(15,23,42,0.25)]">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
          <h2 className="font-bold text-slate-950">Student Information</h2>
          <p className="mt-1 text-sm text-slate-500">
            Basic information and current school assignment.
          </p>
        </div>

        <div className="grid gap-x-8 gap-y-7 p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-3">
          <Info label="First Name" value={student.first_name} />
          <Info label="Last Name" value={student.last_name} />
          <Info label="Student ID" value={student.student_id} />

          <Info
            label="Gender"
            value={
              student.gender
                ? student.gender.charAt(0).toUpperCase() +
                  student.gender.slice(1)
                : "Not provided"
            }
          />

          <Info
            label="Date of Birth"
            value={student.date_of_birth ?? "Not provided"}
          />

          <Info label="Class" value={studentClass?.name ?? "Not assigned"} />

          <Info label="Phone" value={student.phone ?? "Not provided"} />

          <Info label="Address" value={student.address ?? "Not provided"} />

          <Info
            label="Admission Date"
            value={student.admission_date ?? "Not provided"}
          />

          <Info label="Status" value={student.status} />
        </div>
      </section>

      {/* Guardian */}
      <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_15px_50px_-30px_rgba(15,23,42,0.25)]">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
          <h2 className="font-bold text-slate-950">Guardian Information</h2>
        </div>

        <div className="grid gap-x-8 gap-y-7 p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
          <Info label="Name" value={student.guardian_name ?? "Not provided"} />
          <Info
            label="Relationship"
            value={student.guardian_relationship ?? "Not provided"}
          />
          <Info label="Phone" value={student.guardian_phone ?? "Not provided"} />
          <Info label="Email" value={student.guardian_email ?? "Not provided"} />
        </div>
      </section>

      <StudentFileManager studentId={student.id} />

      <EnrollmentHistory studentId={student.id} />

      {/* Records */}
      <section className="mt-6">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-green-600">
            Student Records
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-950">
            Connected modules
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {current.role !== "accountant" && <RecordCard
            title="Attendance"
            description="View attendance records."
            href="#student-attendance"
          />}

          {current.role !== "accountant" && <RecordCard
            title="Results"
            description="View academic results."
            href="#student-results"
          />}

          {current.role !== "teacher" && <RecordCard
            title="Fees"
            description="View fees and payments."
            href="#student-fees"
          />}

          <RecordCard
            title="Class"
            description="View assigned class."
            href="/school/classes"
          />
        </div>
      </section>
      <StudentRecords studentId={student.id} />
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p className="mt-1.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function RecordCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_35px_-25px_rgba(15,23,42,0.25)] transition duration-200 hover:-translate-y-0.5 hover:border-green-200 hover:shadow-[0_18px_45px_-25px_rgba(15,23,42,0.3)]"
    >
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-semibold text-slate-950">{title}</h3>

        <span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-green-600">
          →
        </span>
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </Link>
  );
}
