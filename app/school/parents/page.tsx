import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";

import CreateParentForm from "@/components/school/CreateParentForm";
import LinkStudentToParentForm from "@/components/school/LinkStudentToParentForm";
import UnlinkStudentButton from "@/components/school/UnlinkStudentButton";

export default async function ParentsPage() {
  const user = await getCurrentUser();

  // AUTHENTICATION

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "school_admin" && user.role !== "super_admin") {
    redirect("/school/dashboard");
  }

  if (!user.schoolId) {
    redirect("/school/dashboard");
  }

  // ADMIN CLIENT

  const supabase = createAdminClient();

  const schoolId = user.schoolId;

  // LOAD PARENT MEMBERSHIPS

  const { data: parentMemberships, error: parentsError } =
    await supabase
      .from("school_memberships")
      .select(`
        user_id,
        school_id,
        role,
        created_at
      `)
      .eq("school_id", schoolId)
      .eq("role", "parent")
      .order("created_at", { ascending: false });

  if (parentsError) {
    console.error("Parents membership fetch error:", parentsError);
  }

  const memberships = parentMemberships ?? [];

  // LOAD PARENT PROFILES

  const parentUserIds = memberships.map(
    (parent) => parent.user_id,
  );

  let profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  }[] = [];

  if (parentUserIds.length > 0) {
    const { data: profileData, error: profileError } =
      await supabase
        .from("profiles")
        .select(`
          id,
          first_name,
          last_name,
          phone
        `)
        .in("id", parentUserIds);

    if (profileError) {
      console.error("Parent profiles fetch error:", profileError);
    } else {
      profiles = profileData ?? [];
    }
  }

  // COMBINE MEMBERSHIPS + PROFILES

  const parents = memberships.map((membership) => {
    const profile = profiles.find(
      (item) => item.id === membership.user_id,
    );

    return {
      ...membership,
      profile,
    };
  });

  // LOAD STUDENTS

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select(`
      id,
      first_name,
      last_name,
      student_id
    `)
    .eq("school_id", schoolId)
    .order("first_name");

  if (studentsError) {
    console.error("Students fetch error:", studentsError);
  }

  const schoolStudents = students ?? [];

  // LOAD PARENT-STUDENT LINKS

  const studentIds = schoolStudents.map(
    (student) => student.id,
  );

  let parentLinks: {
    id: string;
    parent_id: string;
    student_id: string;
    relationship: string | null;
  }[] = [];

  if (studentIds.length > 0) {
    const { data: links, error: linksError } =
      await supabase
        .from("student_parents")
        .select(`
          id,
          parent_id,
          student_id,
          relationship
        `)
        .in("student_id", studentIds);

    if (linksError) {
      console.error(
        "Parent links fetch error:",
        linksError,
      );
    } else {
      parentLinks = links ?? [];
    }
  }

  // PAGE

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">

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
              Parents
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Create parent accounts and connect them to their children.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <SummaryBadge
              value={parents.length}
              label="Parents"
            />

            <SummaryBadge
              value={schoolStudents.length}
              label="Students"
            />
          </div>
        </div>
      </div>


      <div className="mt-8 grid gap-6 xl:grid-cols-[360px_1fr]">
        {/* CREATE PARENT */}

        <div className="h-fit rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-lg font-bold text-green-600">
              +
            </div>

            <h2 className="mt-4 text-base font-bold text-slate-900">
              Add Parent
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Create a parent account, then connect their child below.
            </p>
          </div>

          {user.role === "school_admin" && (
            <CreateParentForm schoolId={schoolId} />
          )}
        </div>

        {/* PARENT LIST */}

        <section className="min-w-0 space-y-4">
          {parents.length === 0 ? (
            <div className="rounded-[24px] border border-slate-200/80 bg-white px-6 py-14 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                <svg
                  width="25"
                  height="25"
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

              <h3 className="mt-4 font-bold text-slate-900">
                No parents created yet
              </h3>

              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
                Create a parent account using the form to start
                connecting families to students.
              </p>
            </div>
          ) : (
            parents.map((parent) => {
              const profile = parent.profile;

              const firstName =
                profile?.first_name || "Parent";

              const lastName =
                profile?.last_name || "";

              const linkedChildren = parentLinks
                .filter(
                  (link) =>
                    link.parent_id === parent.user_id,
                )
                .map((link) => {
                  const student =
                    schoolStudents.find(
                      (item) =>
                        item.id === link.student_id,
                    );

                  return {
                    ...link,
                    student,
                  };
                })
                .filter((item) => item.student);

              return (
                <div
                  key={parent.user_id}
                  className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm"
                >
             

                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-sm font-bold text-green-700">
                        {getInitials(
                          firstName,
                          lastName,
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-bold text-slate-900">
                            {firstName} {lastName}
                          </h2>

                          <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-green-700">
                            Parent
                          </span>
                        </div>

                        {profile?.phone ? (
                          <p className="mt-1 text-sm text-slate-500">
                            {profile.phone}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-slate-400">
                            No phone number
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Children
                      </p>

                      <p className="mt-0.5 text-sm font-bold text-slate-800">
                        {linkedChildren.length}
                      </p>
                    </div>
                  </div>


                  <div className="border-t border-slate-100 px-5 py-5 sm:px-6">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-green-600">
                        Family
                      </p>

                      <h3 className="mt-1 text-sm font-bold text-slate-900">
                        Linked Children
                      </h3>
                    </div>

                    {linkedChildren.length === 0 ? (
                      <div className="mt-4 rounded-xl bg-slate-50 px-4 py-4">
                        <p className="text-sm text-slate-500">
                          No children linked yet.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2">
                        {linkedChildren.map(
                          (link) => (
                            <div
                              key={link.id}
                              className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold text-slate-600 shadow-sm">
                                  {getInitials(
                                    link.student
                                      ?.first_name,
                                    link.student
                                      ?.last_name,
                                  )}
                                </div>

                                <div>
                                  <p className="text-sm font-bold text-slate-900">
                                    {
                                      link.student
                                        ?.first_name
                                    }{" "}
                                    {
                                      link.student
                                        ?.last_name
                                    }
                                  </p>

                                  <p className="mt-0.5 text-xs text-slate-500">
                                    ID:{" "}
                                    {
                                      link.student
                                        ?.student_id
                                    }

                                    {link.relationship
                                      ? ` • ${link.relationship}`
                                      : ""}
                                  </p>
                                </div>
                              </div>

                              <UnlinkStudentButton
                                parentId={
                                  parent.user_id
                                }
                                studentId={
                                  link.student_id
                                }
                              />
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>


                  <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-5 sm:px-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Add Relationship
                    </p>

                    <h3 className="mt-1 text-sm font-bold text-slate-900">
                      Link Student
                    </h3>

                    <div className="mt-3">
                      <LinkStudentToParentForm
                        parentId={parent.user_id}
                        students={schoolStudents}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}

// SUMMARY BADGE

function SummaryBadge({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex">
      <span className="text-lg font-bold text-slate-900">
        {value}
      </span>

      <span className="text-xs font-medium text-slate-400">
        {label}
      </span>
    </div>
  );
}

// INITIALS

function getInitials(
  firstName?: string | null,
  lastName?: string | null,
) {
  const first =
    firstName?.trim()?.charAt(0) ?? "";

  const last =
    lastName?.trim()?.charAt(0) ?? "";

  return (
    `${first}${last}`.toUpperCase() || "P"
  );
}