"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSchoolAccount } from "@/actions/accounts";
import { createSchoolAdmin } from "@/actions/schools";
import { validatePlatformSettings } from "@/lib/platform/validation";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function savePlatformSettings(form: FormData) {
  const user = await getCurrentUser();
  if (user?.role !== "super_admin") return { error: "Only a platform administrator can change platform settings." };
  const name = text(form, "platform_name");
  const email = text(form, "support_email");
  const phone = text(form, "support_phone");
  const validationError = validatePlatformSettings(name, email, phone);
  if (validationError) return { error: validationError };
  const admin = createAdminClient();
  const result = await admin.from("platform_settings").upsert({ id: 1, platform_name: name, support_email: email || null, support_phone: phone || null, updated_by: user.id, updated_at: new Date().toISOString() });
  if (result.error) return { error: "Unable to save platform settings. Verify the platform settings migration is installed." };
  revalidatePath("/platform", "layout");
  revalidatePath("/login");
  return { success: true };
}

export async function createPlatformSchoolUser(form: FormData) {
  const user = await getCurrentUser();
  if (user?.role !== "super_admin") return { error: "Only a platform administrator can provision accounts here." };
  const role = text(form, "role");
  const schoolId = text(form, "school_id");
  if (!["school_admin", "teacher", "accountant", "parent"].includes(role)) return { error: "Select a valid school role." };
  if (!schoolId) return { error: "Select a school." };
  if (role === "school_admin") {
    const result = await createSchoolAdmin(schoolId, form);
    if (result.error) return { error: result.error };
  } else {
    const result = await createSchoolAccount({ schoolId, role: role as "teacher" | "accountant" | "parent", firstName: text(form, "first_name"), lastName: text(form, "last_name"), email: text(form, "email"), phone: text(form, "phone"), password: String(form.get("password") ?? "") });
    if (!result.success) return { error: result.error ?? "Unable to provision account." };
  }
  revalidatePath("/platform/users");
  return { success: true };
}
