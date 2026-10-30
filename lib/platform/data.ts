import "server-only";

import { getCurrentUser } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const defaultPlatformSettings = { platform_name: "SchoolMS", support_email: null as string | null, support_phone: null as string | null };

export async function getPlatformSettings() {
  const client = await createClient();
  const result = await client.from("platform_settings").select("platform_name, support_email, support_phone").eq("id", 1).maybeSingle();
  return result;
}

export async function getPublicPlatformSettings() {
  try {
    const result = await getPlatformSettings();
    return result.data ?? defaultPlatformSettings;
  } catch {
    return defaultPlatformSettings;
  }
}

export async function getPlatformUserDirectory(page: number) {
  const user = await getCurrentUser();
  if (user?.role !== "super_admin") return null;
  if (!Number.isInteger(page) || page < 1 || page > 10000) return null;
  const admin = createAdminClient();
  const auth = await admin.auth.admin.listUsers({ page, perPage: 50 });
  if (auth.error) throw new Error("Unable to load the user directory.");
  const ids = auth.data.users.map((account) => account.id);
  if (!ids.length) return { users: [], hasNext: false };
  const [profiles, platform, memberships] = await Promise.all([
    admin.from("profiles").select("id, first_name, last_name, phone").in("id", ids),
    admin.from("platform_memberships").select("user_id, role").in("user_id", ids),
    admin.from("school_memberships").select("user_id, role, school_id, schools(name)").in("user_id", ids),
  ]);
  if ([profiles, platform, memberships].some((result) => result.error)) throw new Error("Unable to load account memberships.");
  return {
    hasNext: auth.data.users.length === 50,
    users: auth.data.users.map((account) => {
      const profile = profiles.data?.find((item) => item.id === account.id);
      return {
        id: account.id,
        email: account.email ?? "No email",
        firstName: profile?.first_name ?? "",
        lastName: profile?.last_name ?? "",
        phone: profile?.phone ?? "",
        emailConfirmed: !!account.email_confirmed_at,
        lastSignIn: account.last_sign_in_at ?? null,
        isSuperAdmin: platform.data?.some((item) => item.user_id === account.id && item.role === "super_admin") ?? false,
        memberships: (memberships.data ?? []).filter((item) => item.user_id === account.id).map((item) => ({
          role: item.role,
          schoolId: item.school_id,
          schoolName: (Array.isArray(item.schools) ? item.schools[0]?.name : (item.schools as { name?: string } | null)?.name) ?? "School unavailable",
        })),
      };
    }),
  };
}
