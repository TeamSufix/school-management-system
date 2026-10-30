"use server";

import { revalidatePath } from "next/cache";
import { getManagementContext } from "@/lib/auth/get-management-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateAcademicPeriod } from "@/lib/academics/period";

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

function refreshConfiguration(schoolId: string) {
  revalidatePath("/school/settings");
  revalidatePath(`/platform/schools/${schoolId}/settings`);
  revalidatePath("/school", "layout");
  revalidatePath("/platform", "layout");
}

export async function saveAcademicSettings(form: FormData) {
  const context = await getManagementContext(value(form, "school_id"));
  if (!context || !["school_admin", "super_admin"].includes(context.role)) return { error: "Only administrators can configure academic periods." };
  const academicYear = value(form, "academic_year");
  const term = value(form, "term");
  const error = validateAcademicPeriod(academicYear, term);
  if (error) return { error };
  const result = await context.client.from("school_academic_settings").upsert({ school_id: context.schoolId, academic_year: academicYear, term, updated_at: new Date().toISOString() });
  if (result.error) return { error: "Unable to save academic settings. Verify the database configuration proposal has been applied." };
  refreshConfiguration(context.schoolId);
  return { success: true };
}

export async function saveTeacherAssignment(form: FormData) {
  const context = await getManagementContext(value(form, "school_id"));
  if (!context || !["school_admin", "super_admin"].includes(context.role)) return { error: "Only administrators can assign teachers." };
  const teacherId = value(form, "teacher_id");
  const classId = value(form, "class_id");
  const subjectId = value(form, "subject_id");
  if (!teacherId || !classId || !subjectId) return { error: "Teacher, class and subject are required." };
  const [teacher, schoolClass, subject] = await Promise.all([
    context.client.from("teachers").select("id, user_id, status").eq("id", teacherId).eq("school_id", context.schoolId).maybeSingle(),
    context.client.from("classes").select("id").eq("id", classId).eq("school_id", context.schoolId).maybeSingle(),
    context.client.from("subjects").select("id").eq("id", subjectId).eq("school_id", context.schoolId).maybeSingle(),
  ]);
  if ([teacher, schoolClass, subject].some((result) => result.error || !result.data) || !teacher.data?.user_id || teacher.data.status !== "active") return { error: "Select an active teacher with a linked login, and a class and subject from this school." };
  const result = await context.client.from("teacher_assignments").insert({ school_id: context.schoolId, teacher_id: teacherId, class_id: classId, subject_id: subjectId });
  if (result.error) return { error: result.error.code === "23505" ? "This assignment already exists." : "Unable to save assignment. Verify the database configuration and teacher membership." };
  refreshConfiguration(context.schoolId);
  return { success: true };
}

export async function removeTeacherAssignment(form: FormData) {
  const context = await getManagementContext(value(form, "school_id"));
  if (!context || !["school_admin", "super_admin"].includes(context.role)) return { error: "Only administrators can remove assignments." };
  const result = await context.client.from("teacher_assignments").delete().eq("id", value(form, "assignment_id")).eq("school_id", context.schoolId);
  if (result.error) return { error: "Unable to remove assignment." };
  refreshConfiguration(context.schoolId);
  return { success: true };
}

export async function linkTeacherLogin(form: FormData) {
  const context = await getManagementContext(value(form, "school_id"));
  if (!context || !["school_admin", "super_admin"].includes(context.role)) return { error: "Only administrators can link teacher logins." };
  const userId = value(form, "user_id");
  const teacherId = value(form, "teacher_id");
  const admin = createAdminClient();
  const membership = await admin.from("school_memberships").select("user_id").eq("school_id", context.schoolId).eq("user_id", userId).eq("role", "teacher").maybeSingle();
  if (membership.error || !membership.data) return { error: "The login must already have a teacher membership in this school." };
  const existing = await admin.from("teachers").select("id").eq("school_id", context.schoolId).eq("user_id", userId);
  if (existing.error || existing.data?.some((teacher) => teacher.id !== teacherId)) return { error: "This login is already linked to another teacher record." };
  const result = await admin.from("teachers").update({ user_id: userId }).eq("id", teacherId).eq("school_id", context.schoolId).is("user_id", null).select("id").maybeSingle();
  if (result.error || !result.data) return { error: "Teacher not found or already linked. Existing login links cannot be replaced here." };
  refreshConfiguration(context.schoolId);
  return { success: true };
}
