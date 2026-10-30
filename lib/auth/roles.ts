import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/auth/get-user";

export type { UserRole } from "@/lib/auth/get-user";

export async function getCurrentRole(): Promise<UserRole | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: platformMembership, error: platformError } = await supabase
    .from("platform_memberships")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (platformError) {
    console.error("getCurrentRole platform membership error:", platformError);
  }

  if (platformMembership?.role === "super_admin") {
    return "super_admin";
  }

  const { data: schoolMembership, error: schoolError } = await supabase
    .from("school_memberships")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (schoolError) {
    console.error("getCurrentRole school membership error:", schoolError);
  }

  const role = schoolMembership?.role;

  if (
    role === "school_admin" ||
    role === "teacher" ||
    role === "accountant" ||
    role === "parent" ||
    role === "student"
  ) {
    return role;
  }

  return null;
}
