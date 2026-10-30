"use server";

import { revalidatePath } from "next/cache";

import { getManagementContext } from "@/lib/auth/get-management-context";
import { canAccessTeachingScope } from "@/lib/auth/teacher-scope";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function saveTermRemarks(form: FormData) {
  const context = await getManagementContext(text(form, "school_id") || null);
  if (!context || !["school_admin", "super_admin", "teacher"].includes(context.role)) {
    return { error: "Only teachers and administrators can write remarks." };
  }
  const studentId = text(form, "student_id");
  const year = text(form, "academic_year");
  const term = text(form, "term");
  const classRemark = text(form, "class_teacher_remark") || null;
  const headRemark = text(form, "head_teacher_remark") || null;
  if (!studentId || !year || !["term_1", "term_2", "term_3"].includes(term)) {
    return { error: "Student, academic year and a valid term are required." };
  }
  if ((classRemark?.length ?? 0) > 1000 || (headRemark?.length ?? 0) > 1000) {
    return { error: "Remarks must be 1000 characters or fewer." };
  }
  const student = await context.client.from("students").select("id, class_id").eq("id", studentId).eq("school_id", context.schoolId).maybeSingle();
  if (student.error || !student.data) return { error: "Student not found." };
  if (!canAccessTeachingScope(context, student.data.class_id)) {
    return { error: "This student's class is not assigned to you." };
  }
  const result = await context.client.from("student_term_remarks").upsert({
    school_id: context.schoolId,
    student_id: studentId,
    academic_year: year,
    term,
    class_teacher_remark: classRemark,
    head_teacher_remark: headRemark,
    updated_by: context.userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "student_id,academic_year,term" });
  if (result.error) return { error: result.error.message || "Unable to save remarks." };
  revalidatePath(`/reports/students/${studentId}`);
  return { success: true };
}
