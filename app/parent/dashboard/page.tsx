import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import LogoutButton from "@/components/auth/LogoutButton";

export default async function ParentDashboard() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "parent") {
    redirect("/login");
  }

  const supabase = await createClient();

  const { data: children, error } = await supabase
    .from("student_parents")
    .select(
      `
      id,
      relationship,
      students (
        id,
        first_name,
        last_name,
        student_id,
        gender,
        date_of_birth
      )
    `,
    )
    .eq("parent_id", user.id);

  if (error) {
    console.error("Parent children fetch error:", error);
  }

  const validChildren =
    children?.filter((item) => {
      const student = Array.isArray(item.students)
        ? item.students[0]
        : item.students;

      return !!student;
    }) ?? [];

  return (
    <main className="min-h-screen bg-[#f6f8f7]">
      {/* =====================================================
          TOP BAR
      ====================================================== */}

      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          {/* Brand */}

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-700 text-sm font-black text-white shadow-md shadow-green-600/20">
              S
            </div>

            <div>
              <p className="text-sm font-bold tracking-tight text-slate-900">
                School<span className="text-green-600">MS</span>
              </p>

              <p className="hidden text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:block">
                Parent Portal
              </p>
            </div>
          </div>

          {/* Right */}

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />

              <span className="text-xs font-semibold text-green-700">
                Parent Account
              </span>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700">
              {getInitials(user.firstName, user.lastName)}
            </div>

            <LogoutButton />
          </div>
        </div>
      </header>

      {/* =====================================================
          CONTENT
      ====================================================== */}

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
        {/* Hero */}

        <section className="relative overflow-hidden rounded-[28px] bg-[#07130d] px-6 py-8 text-white shadow-xl shadow-slate-900/5 sm:px-8 sm:py-10">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-green-500/10 blur-3xl" />

          <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-green-400/10 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-green-400/10 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />

              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-green-300">
                Parent Dashboard
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Welcome
                  {user.firstName ? `, ${user.firstName}` : ""}.
                </h1>

                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
                  Stay connected with your children's school information from
                  one simple place.
                </p>

                <div className="mt-5 flex items-center gap-2 text-sm text-slate-300">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M3 21h18" />
                    <path d="M5 21V8l7-4 7 4v13" />
                  </svg>

                  <span>{user.school?.name ?? "SchoolMS"}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
                <p className="text-xs font-medium text-slate-500">
                  Linked Children
                </p>

                <p className="mt-1 text-3xl font-bold text-white">
                  {validChildren.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            CHILDREN
        ====================================================== */}

        <section className="mt-8">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-green-600">
                Family
              </p>

              <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                My Children
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                View your children's school information.
              </p>
            </div>

            {validChildren.length > 0 && (
              <span className="hidden text-xs font-medium text-slate-400 sm:block">
                {validChildren.length}{" "}
                {validChildren.length === 1 ? "child" : "children"}
              </span>
            )}
          </div>

          {validChildren.length === 0 ? (
            <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm">
              <div className="flex flex-col items-center px-6 py-14 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-green-600">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  >
                    <circle cx="9" cy="7" r="4" />
                    <path d="M3 21v-2a6 6 0 0 1 12 0v2" />
                    <path d="M19 8v6" />
                    <path d="M16 11h6" />
                  </svg>
                </div>

                <h3 className="mt-5 font-bold text-slate-900">
                  No children linked yet
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Your children's records have not been connected to this parent
                  account yet.
                </p>

                <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">
                  Please contact your school administrator.
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {validChildren.map((item) => {
                const student = Array.isArray(item.students)
                  ? item.students[0]
                  : item.students;

                if (!student) return null;

                return (
                  <ChildCard
                    key={item.id}
                    student={student}
                    relationship={item.relationship}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* ============================================================
   CHILD CARD
============================================================ */

function ChildCard({
  student,
  relationship,
}: {
  student: {
    id: string;
    first_name: string;
    last_name: string;
    student_id: string;
    gender: string | null;
    date_of_birth: string | null;
  };
  relationship: string | null;
}) {
  return (
    <div className="group overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md">
      {/* Card Header */}

      <div className="border-b border-slate-100 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-50 to-green-100 text-lg font-bold text-green-700">
            {getInitials(student.first_name, student.last_name)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-slate-900">
                  {student.first_name} {student.last_name}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Student ID:{" "}
                  <span className="font-medium text-slate-700">
                    {student.student_id}
                  </span>
                </p>
              </div>

              <span className="rounded-full bg-green-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-green-700">
                {relationship || "Parent"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}

      <div className="grid grid-cols-2 gap-px bg-slate-100">
        <InfoItem label="Gender" value={student.gender || "Not provided"} />

        <InfoItem
          label="Date of Birth"
          value={
            student.date_of_birth
              ? formatDate(student.date_of_birth)
              : "Not provided"
          }
        />
      </div>
    </div>
  );
}

/* ============================================================
   INFO ITEM
============================================================ */

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <p className="mt-1.5 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

/* ============================================================
   HELPERS
============================================================ */

function getInitials(firstName?: string | null, lastName?: string | null) {
  const first = firstName?.trim()?.charAt(0) ?? "";
  const last = lastName?.trim()?.charAt(0) ?? "";

  return `${first}${last}`.toUpperCase() || "P";
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
