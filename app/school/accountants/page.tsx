import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";
import CreateAccountantForm from "@/components/school/CreateAccountantForm";

export default async function AccountantsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "school_admin" && user.role !== "super_admin") {
    redirect("/school/dashboard");
  }

  if (!user.schoolId) {
    redirect("/login");
  }

  const supabase = createAdminClient();

  const { data: accountantMemberships, error: membershipError } = await supabase
    .from("school_memberships")
    .select(
      `
        user_id,
        school_id,
        role,
        created_at
      `,
    )
    .eq("school_id", user.schoolId)
    .eq("role", "accountant")
    .order("created_at", { ascending: false });

  if (membershipError) {
    console.error("Accountants membership fetch error:", membershipError);
  }

  const memberships = accountantMemberships ?? [];

  const userIds = memberships.map((membership) => membership.user_id);

  let profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  }[] = [];

  if (userIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select(
        `
          id,
          first_name,
          last_name,
          phone
        `,
      )
      .in("id", userIds);

    if (profileError) {
      console.error("Accountant profiles fetch error:", profileError);
    } else {
      profiles = profileData ?? [];
    }
  }

  const accountants = memberships.map((membership) => {
    const profile = profiles.find((item) => item.id === membership.user_id);

    return {
      ...membership,
      profile,
    };
  });

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      {/* Header */}

      <div className="flex flex-col gap-6">
        <Link
          href="/school/dashboard"
          className="flex w-fit items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-green-600"
        >
          <span>←</span>
          Back to dashboard
        </Link>

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
                Accountants
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Manage the staff responsible for school fees and payment
                records.
              </p>
            </div>

            <div className="flex w-fit items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-sm font-bold text-green-700">
                {accountants.length}
              </div>

              <div>
                <p className="text-xs font-bold text-slate-900">Accountants</p>

                <p className="text-[11px] text-slate-400">
                  Active school accounts
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}

      <div className="mt-8 grid gap-6 xl:grid-cols-[360px_1fr]">
        {user.role === "school_admin" && (
          <div className="h-fit rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                +
              </div>

              <h2 className="mt-4 text-base font-bold text-slate-900">
                Add Accountant
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Create an account for a staff member who will manage financial
                records.
              </p>
            </div>

            <CreateAccountantForm schoolId={user.schoolId} />
          </div>
        )}

        <section className="min-w-0">
          <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-green-600">
                Staff Directory
              </p>

              <h2 className="mt-1 text-lg font-bold text-slate-900">
                School Accountants
              </h2>
            </div>

            {accountants.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {accountants.map((accountant) => {
                  const profile = accountant.profile;

                  const firstName = profile?.first_name ?? "Unknown";
                  const lastName = profile?.last_name ?? "";

                  return (
                    <div
                      key={accountant.user_id}
                      className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-sm font-bold text-green-700">
                          {getInitials(firstName, lastName)}
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900">
                            {firstName} {lastName}
                          </h3>

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

                      <span className="w-fit rounded-full bg-green-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-green-700">
                        Accountant
                      </span>
                    </div>
                  );
                })}
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
                    <circle cx="9" cy="7" r="4" />
                    <path d="M3 21v-2a6 6 0 0 1 12 0v2" />
                    <path d="M19 8v6" />
                    <path d="M16 11h6" />
                  </svg>
                </div>

                <h3 className="mt-4 font-bold text-slate-900">
                  No accountants yet
                </h3>

                <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
                  Create your first accountant account to start managing
                  financial operations.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function getInitials(firstName: string, lastName: string) {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);

  return `${first}${last}`.toUpperCase() || "A";
}
