"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/auth/get-user";

export type ManagementRole = Extract<
  UserRole,
  "super_admin" | "school_admin" | "teacher" | "accountant"
>;

export type ManagementContext = {
  role: ManagementRole;
  schoolId: string;
  client:
    | Awaited<ReturnType<typeof createClient>>
    | ReturnType<typeof createAdminClient>;
};

/**
 * Current user.
 *
 * SUPER ADMIN
 * - Must explicitly provide a school ID.
 * - Uses service-role client.
 *
 * SCHOOL ADMIN / TEACHER / ACCOUNTANT
 * - Automatically use their own school.
 * - Cannot switch schools.
 * - Use authenticated Supabase client.
 *
 * PARENT
 * - Intentionally excluded.
 * - Parents will use a separate parent context because
 *   they can only access their own children's records.
 */
export async function getManagementContext(
  requestedSchoolId?: string | null,
): Promise<ManagementContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  // PLATFORM MEMBERSHIP

  const { data: platformMembership, error: platformError } = await supabase
    .from("platform_memberships")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (platformError) {
    console.error("getManagementContext platform error:", platformError);

    return null;
  }

  // SUPER ADMIN

  if (platformMembership?.role === "super_admin") {
    if (!requestedSchoolId) {
      return null;
    }

    const admin = createAdminClient();

    const { data: school, error: schoolError } = await admin
      .from("schools")
      .select("id")
      .eq("id", requestedSchoolId)
      .maybeSingle();

    if (schoolError) {
      console.error("getManagementContext school lookup error:", schoolError);

      return null;
    }

    if (!school) {
      return null;
    }

    return {
      role: "super_admin",
      schoolId: school.id,
      client: admin,
    };
  }

  // SCHOOL MEMBERSHIP

  const { data: membership, error: membershipError } = await supabase
    .from("school_memberships")
    .select("school_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    console.error("getManagementContext membership error:", membershipError);

    return null;
  }

  if (!membership?.school_id) {
    return null;
  }

  // MANAGEMENT ROLES ONLY

  const validManagementRoles: ManagementRole[] = [
    "school_admin",
    "teacher",
    "accountant",
  ];

  const role = membership.role as ManagementRole;

  if (!validManagementRoles.includes(role)) {
    return null;
  }

  // PREVENT CROSS-SCHOOL ACCESS

  if (requestedSchoolId && requestedSchoolId !== membership.school_id) {
    return null;
  }

  return {
    role,
    schoolId: membership.school_id,
    client: supabase,
  };
}