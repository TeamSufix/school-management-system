"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { getManagementContext } from "@/lib/auth/get-management-context";

/**
 * Create (or link) a login account for an existing student record.
 * Only school admins / super admins can provision student logins.
 */
export async function createStudentLogin(form: FormData) {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const studentId = text("student_id");
  const email = text("email").toLowerCase();
  const password = String(form.get("password") ?? "");

  const context = await getManagementContext(text("school_id") || null);
  if (!context || !["school_admin", "super_admin"].includes(context.role)) {
    return { error: "Only a school administrator can create student logins." };
  }
  if (!studentId || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) {
    return { error: "A valid student and email address are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const student = await context.client
    .from("students")
    .select("id, first_name, last_name, user_id")
    .eq("id", studentId)
    .eq("school_id", context.schoolId)
    .maybeSingle();
  if (student.error || !student.data) return { error: "Student not found in this school." };
  if (student.data.user_id) return { error: "This student already has a login account." };

  const admin = createAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: student.data.first_name,
      last_name: student.data.last_name,
    },
  });
  if (authError || !authData.user) {
    return { error: authError?.message || "Unable to create the login account." };
  }
  const userId = authData.user.id;

  const cleanup = async () => {
    await admin.from("school_memberships").delete().eq("user_id", userId).eq("school_id", context.schoolId);
    await admin.from("profiles").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
  };

  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    first_name: student.data.first_name,
    last_name: student.data.last_name,
  });
  if (profileError) {
    await cleanup();
    return { error: profileError.message || "Unable to create the user profile." };
  }

  const { error: membershipError } = await admin.from("school_memberships").insert({
    user_id: userId,
    school_id: context.schoolId,
    role: "student",
  });
  if (membershipError) {
    await cleanup();
    return { error: membershipError.message || "Unable to assign the student to the school." };
  }

  const { error: linkError } = await admin
    .from("students")
    .update({ user_id: userId })
    .eq("id", studentId)
    .eq("school_id", context.schoolId)
    .is("user_id", null);
  if (linkError) {
    await cleanup();
    return { error: linkError.message || "Unable to link the account to the student record." };
  }

  revalidatePath(`/school/students/${studentId}`);
  revalidatePath("/school/students");
  return { success: true };
}

/** Remove a student's login link (keeps the student record). */
export async function removeStudentLogin(form: FormData) {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const studentId = text("student_id");
  const context = await getManagementContext(text("school_id") || null);
  if (!context || !["school_admin", "super_admin"].includes(context.role)) {
    return { error: "Only a school administrator can manage student logins." };
  }
  const student = await context.client
    .from("students")
    .select("id, user_id")
    .eq("id", studentId)
    .eq("school_id", context.schoolId)
    .maybeSingle();
  if (student.error || !student.data?.user_id) return { error: "No login is linked to this student." };

  const admin = createAdminClient();
  await admin.from("students").update({ user_id: null }).eq("id", studentId).eq("school_id", context.schoolId);
  await admin.from("school_memberships").delete().eq("user_id", student.data.user_id).eq("school_id", context.schoolId).eq("role", "student");
  await admin.auth.admin.deleteUser(student.data.user_id);

  revalidatePath(`/school/students/${studentId}`);
  return { success: true };
}
