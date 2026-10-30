import "server-only";

import { createClient } from "@/lib/supabase/server";

export type UserRole =
  | "super_admin"
  | "school_admin"
  | "teacher"
  | "accountant"
  | "parent"
  | "student";

export type CurrentSchool = {
  id: string;
  name: string;
  code: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: string;
  logo_url: string | null;
  city: string | null;
  country: string | null;
};

export type CurrentUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: UserRole | null;
  schoolId: string | null;
  school: CurrentSchool | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("getCurrentUser profile error:", profileError);
  }

  const { data: platformMembership, error: platformError } = await supabase
    .from("platform_memberships")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (platformError) {
    console.error("getCurrentUser platform membership error:", platformError);
  }

  if (platformMembership?.role === "super_admin") {
    return {
      id: user.id,
      email: user.email ?? null,
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
      phone: profile?.phone ?? null,
      role: "super_admin",
      schoolId: null,
      school: null,
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("school_memberships")
    .select("school_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    console.error("getCurrentUser school membership error:", membershipError);
  }

  if (!membership?.school_id) {
    return {
      id: user.id,
      email: user.email ?? null,
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
      phone: profile?.phone ?? null,
      role: null,
      schoolId: null,
      school: null,
    };
  }

  const validSchoolRoles: UserRole[] = [
    "school_admin",
    "teacher",
    "accountant",
    "parent",
    "student",
  ];

  const role = validSchoolRoles.includes(membership.role as UserRole)
    ? (membership.role as UserRole)
    : null;

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select(
      `
        id,
        name,
        code,
        phone,
        email,
        address,
        status,
        logo_url,
        city,
        country
      `,
    )
    .eq("id", membership.school_id)
    .maybeSingle();

  if (schoolError) {
    console.error("getCurrentUser school error:", schoolError);
  }

  if (schoolError || !school || school.status !== "active") {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    firstName: profile?.first_name ?? null,
    lastName: profile?.last_name ?? null,
    phone: profile?.phone ?? null,
    role,
    schoolId: membership.school_id,
    school,
  };
}

export async function getCurrentSchool() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  if (!user.schoolId || !user.school) {
    return null;
  }

  return {
    school: user.school,
    schoolId: user.schoolId,
    role: user.role,
  };
}
