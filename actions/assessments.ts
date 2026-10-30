"use server";

import { revalidatePath } from "next/cache";
import { getManagementContext } from "@/lib/auth/get-management-context";
import { canAccessTeachingScope } from "@/lib/auth/teacher-scope";
import { normalizeAcademicYear, isTerm } from "@/lib/academics/period";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const TYPES = ["class_test", "assignment", "mid_term", "end_of_term", "exam"] as const;

async function scopedContext(form: FormData, classId: string, subjectId: string) {
  const context = await getManagementContext(text(form, "school_id"));
  if (!context || !["school_admin", "super_admin", "teacher"].includes(context.role)) return null;
  if (!canAccessTeachingScope(context, classId, subjectId)) return null;
  return context;
}

export async function createAssessment(form: FormData) {
  const classId = text(form, "class_id");
  const subjectId = text(form, "subject_id");
  const context = await scopedContext(form, classId, subjectId);
  if (!context) return { error: "You are not assigned to this class and subject." };
  const name = text(form, "name");
  const type = text(form, "assessment_type");
  const year = normalizeAcademicYear(text(form, "academic_year"));
  const term = text(form, "term");
  const weight = Number(form.get("weight"));
  const maxScore = Number(form.get("max_score") || 100);
  if (!name || name.length > 200) return { error: "Assessment name must contain 1 to 200 characters." };
  if (!TYPES.includes(type as (typeof TYPES)[number])) return { error: "Select a valid assessment type." };
  if (!year || !isTerm(term)) return { error: "Select a valid academic year and term." };
  if (!Number.isFinite(weight) || weight <= 0 || weight > 100) return { error: "Weight must be between 0 and 100." };
  if (!Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 1000) return { error: "Maximum score must be between 0 and 1000." };
  const [schoolClass, subject] = await Promise.all([
    context.client.from("classes").select("id").eq("id", classId).eq("school_id", context.schoolId).maybeSingle(),
    context.client.from("subjects").select("id").eq("id", subjectId).eq("school_id", context.schoolId).maybeSingle(),
  ]);
  if (schoolClass.error || !schoolClass.data || subject.error || !subject.data) {
    return { error: "The selected class or subject does not belong to this school." };
  }
  const sessionId = text(form, "session_id") || null;
  const result = await context.client.from("assessments").insert({
    school_id: context.schoolId,
    class_id: classId,
    subject_id: subjectId,
    session_id: sessionId,
    academic_year: year,
    term,
    name,
    assessment_type: type,
    weight,
    max_score: maxScore,
    created_by: context.userId,
  });
  if (result.error) {
    if (result.error.code === "23505") return { error: "An assessment with this name already exists for this class, subject, year and term." };
    return { error: "Unable to create the assessment. Verify that the assessments migration is installed." };
  }
  revalidatePath("/school/assessments");
  revalidatePath(`/platform/schools/${context.schoolId}/assessments`);
  return { success: true };
}

export async function saveAssessmentScores(form: FormData) {
  const assessmentId = text(form, "assessment_id");
  const assessment = await getManagementContext(text(form, "school_id"));
  if (!assessment) return { error: "You are not authorized to record scores." };
  const found = await assessment.client.from("assessments").select("id, class_id, subject_id, max_score").eq("id", assessmentId).eq("school_id", assessment.schoolId).maybeSingle();
  if (found.error || !found.data) return { error: "Assessment not found." };
  if (!canAccessTeachingScope(assessment, found.data.class_id, found.data.subject_id)) {
    return { error: "You are not assigned to this class and subject." };
  }
  const rows: { school_id: string; assessment_id: string; student_id: string; score: number; recorded_by: string }[] = [];
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("score_")) continue;
    const studentId = key.slice(6);
    const raw = String(value).trim();
    if (!raw) continue;
    const score = Number(raw);
    if (!Number.isFinite(score) || score < 0 || score > found.data.max_score) {
      return { error: `Score for a student must be between 0 and ${found.data.max_score}.` };
    }
    rows.push({ school_id: assessment.schoolId, assessment_id: assessmentId, student_id: studentId, score, recorded_by: assessment.userId });
  }
  if (!rows.length) return { error: "Enter at least one score." };
  const result = await assessment.client.from("assessment_scores").upsert(rows, { onConflict: "assessment_id,student_id" });
  if (result.error) return { error: result.error.message || "Unable to save scores." };
  revalidatePath("/school/assessments");
  revalidatePath(`/platform/schools/${assessment.schoolId}/assessments`);
  return { success: true };
}

export async function deleteAssessment(form: FormData) {
  const assessmentId = text(form, "assessment_id");
  const context = await getManagementContext(text(form, "school_id"));
  if (!context) return { error: "You are not authorized to delete assessments." };
  const found = await context.client.from("assessments").select("id, class_id, subject_id").eq("id", assessmentId).eq("school_id", context.schoolId).maybeSingle();
  if (found.error || !found.data) return { error: "Assessment not found." };
  if (!canAccessTeachingScope(context, found.data.class_id, found.data.subject_id)) {
    return { error: "You are not assigned to this class and subject." };
  }
  const result = await context.client.from("assessments").delete().eq("id", assessmentId).eq("school_id", context.schoolId);
  if (result.error) return { error: "Unable to delete the assessment." };
  revalidatePath("/school/assessments");
  revalidatePath(`/platform/schools/${context.schoolId}/assessments`);
  return { success: true };
}
