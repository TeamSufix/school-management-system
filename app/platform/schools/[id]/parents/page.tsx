import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";

import CreateParentForm from "@/components/school/CreateParentForm";
import LinkStudentToParentForm from "@/components/school/LinkStudentToParentForm";
import UnlinkStudentButton from "@/components/school/UnlinkStudentButton";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SchoolParentsPage({ params }: Props) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "super_admin") {
    redirect("/school/dashboard");
  }

  const { id: schoolId } = await params;

  if (!schoolId) {
    notFound();
  }

  const admin = createAdminClient();

  const { data: school, error: schoolError } = await admin
    .from("schools")
    .select("id, name")
    .eq("id", schoolId)
    .maybeSingle();

  if (schoolError) {
    console.error("Platform school lookup error:", schoolError);
  }

  if (!school) {
    notFound();
  }

  const { data: parents, error: parentsError } = await admin
    .from("school_memberships")
    .select(
      `
      user_id,
      school_id,
      role,
      created_at,
      profiles (
        first_name,
        last_name,
        phone
      )
    `,
    )
    .eq("school_id", schoolId)
    .eq("role", "parent")
    .order("created_at", { ascending: false });

  if (parentsError) {
    console.error("Platform parents fetch error:", parentsError);
  }

  const { data: students, error: studentsError } = await admin
    .from("students")
    .select(
      `
      id,
      first_name,
      last_name,
      student_id
    `,
    )
    .eq("school_id", schoolId)
    .order("first_name");

  if (studentsError) {
    console.error("Platform students fetch error:", studentsError);
  }

  const studentIds = (students ?? []).map((student) => student.id);

  let parentLinks: {
    id: string;
    parent_id: string;
    student_id: string;
    relationship: string | null;
  }[] = [];

  if (studentIds.length > 0) {
    const { data: links, error: linksError } = await admin
      .from("student_parents")
      .select(
        `
        id,
        parent_id,
        student_id,
        relationship
      `,
      )
      .in("student_id", studentIds);

    if (linksError) {
      console.error("Platform parent links fetch error:", linksError);
    } else {
      parentLinks = links ?? [];
    }
  }

  const parentCount = parents?.length ?? 0;
  const studentCount = students?.length ?? 0;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/platform/schools"
            className="font-medium text-slate-400 transition hover:text-slate-700"
          >
            Schools
          </Link>

          <span className="text-slate-300">/</span>

          <Link
            href={`/platform/schools/${schoolId}`}
            className="max-w-[180px] truncate font-medium text-slate-500 transition hover:text-green-600"
          >
            {school.name}
          </Link>

          <span className="text-slate-300">/</span>

          <span className="font-medium text-slate-800">Parents</span>
        </div>

        {/* Hero */}
        <section className="relative mt-8 overflow-hidden rounded-3xl bg-[#07130d] shadow-xl shadow-slate-200/60">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-green-500/10 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-500/10 text-green-400 ring-1 ring-green-400/10">
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-400">
                      Family Management
                    </p>
                    <p className="mt-1 text-sm text-slate-400">{school.name}</p>
                  </div>
                </div>

                <h1 className="mt-7 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Parents
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                  Manage parent accounts and connect each parent to their
                  students.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                  <p className="text-xs text-slate-500">Parents</p>
                  <p className="mt-1 text-2xl font-bold text-white">
                    {parentCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                  <p className="text-xs text-slate-500">Students</p>
                  <p className="mt-1 text-2xl font-bold text-white">
                    {studentCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* Create */}
          <section className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-700">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M19 8v6M16 11h6" />
                </svg>
              </div>

              <h2 className="mt-4 text-lg font-bold text-slate-900">
                Add parent
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Create a parent account for this school.
              </p>
            </div>

            <CreateParentForm schoolId={schoolId} />
          </section>

          {/* Parents */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-bold text-slate-900">Parent accounts</h2>

              <p className="mt-1 text-xs text-slate-500">
                {parentCount}{" "}
                {parentCount === 1 ? "parent account" : "parent accounts"}{" "}
                registered
              </p>
            </div>

            {!parents || parents.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <svg
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <circle cx="9" cy="7" r="4" />
                    <path d="M3 21v-2a6 6 0 0 1 12 0v2" />
                    <path d="M16 11h6M19 8v6" />
                  </svg>
                </div>

                <h3 className="mt-5 font-semibold text-slate-900">
                  No parents yet
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Create the first parent account using the form.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {parents.map((parent) => {
                  const profile = Array.isArray(parent.profiles)
                    ? parent.profiles[0]
                    : parent.profiles;

                  const linkedChildren = parentLinks
                    .filter((link) => link.parent_id === parent.user_id)
                    .map((link) => {
                      const student = students?.find(
                        (item) => item.id === link.student_id,
                      );

                      return {
                        ...link,
                        student,
                      };
                    })
                    .filter((item) => item.student);

                  const initials = `${profile?.first_name?.[0] ?? "P"}${
                    profile?.last_name?.[0] ?? ""
                  }`.toUpperCase();

                  return (
                    <div
                      key={parent.user_id}
                      className="p-6 transition hover:bg-slate-50/70"
                    >
                      {/* Parent */}
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-sm font-bold text-green-700">
                            {initials}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-slate-900">
                                {profile?.first_name || "Parent"}{" "}
                                {profile?.last_name || ""}
                              </h3>

                              <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                                Parent
                              </span>
                            </div>

                            {profile?.phone && (
                              <p className="mt-1 text-sm text-slate-500">
                                {profile.phone}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
                          {linkedChildren.length}{" "}
                          {linkedChildren.length === 1 ? "child" : "children"}
                        </div>
                      </div>

                      {/* Children */}
                      <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">
                              Linked students
                            </h4>

                            <p className="mt-0.5 text-xs text-slate-500">
                              Students connected to this parent
                            </p>
                          </div>
                        </div>

                        {linkedChildren.length === 0 ? (
                          <p className="mt-4 text-sm text-slate-500">
                            No students linked yet.
                          </p>
                        ) : (
                          <div className="mt-4 space-y-2">
                            {linkedChildren.map((link) => (
                              <div
                                key={link.id}
                                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {link.student?.first_name}{" "}
                                    {link.student?.last_name}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    ID: {link.student?.student_id}
                                    {link.relationship
                                      ? ` • ${link.relationship}`
                                      : ""}
                                  </p>
                                </div>

                                <UnlinkStudentButton
                                  parentId={parent.user_id}
                                  studentId={link.student_id}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Link */}
                      <div className="mt-5">
                        <details className="group">
                          <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-green-200 hover:bg-green-50/50">
                            <span>Link a student</span>

                            <span className="text-lg text-slate-400 transition group-open:rotate-45">
                              +
                            </span>
                          </summary>

                          <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <LinkStudentToParentForm
                              parentId={parent.user_id}
                              students={students ?? []}
                            />
                          </div>
                        </details>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
