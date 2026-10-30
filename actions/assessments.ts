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
  const dueAt = text(form, "due_at");
  const instructions = text(form, "instructions") || null;
  if (instructions && instructions.length > 5000) return { error: "Instructions must be 5000 characters or fewer." };
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
    due_at: dueAt ? new Date(dueAt).toISOString() : null,
    instructions,
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

async function assessmentScope(form: FormData) {
  const assessmentId = text(form, "assessment_id");
  const context = await getManagementContext(text(form, "school_id"));
  if (!context) return null;
  const found = await context.client.from("assessments").select("id, class_id, subject_id, max_score").eq("id", assessmentId).eq("school_id", context.schoolId).maybeSingle();
  if (found.error || !found.data) return null;
  if (!canAccessTeachingScope(context, found.data.class_id, found.data.subject_id)) return null;
  return { context, assessment: found.data };
}

export async function addAssessmentQuestion(form: FormData) {
  const scoped = await assessmentScope(form);
  if (!scoped) return { error: "You are not assigned to this assessment." };
  const prompt = text(form, "prompt");
  const questionType = text(form, "question_type");
  const points = Number(form.get("points") || 1);
  if (!prompt || prompt.length > 2000) return { error: "The question must contain 1 to 2000 characters." };
  if (!["multiple_choice", "short_answer"].includes(questionType)) return { error: "Select a valid question type." };
  if (!Number.isFinite(points) || points <= 0 || points > 1000) return { error: "Points must be between 0 and 1000." };

  let options: string[] = [];
  let correctOption: number | null = null;
  if (questionType === "multiple_choice") {
    options = text(form, "options").split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 10);
    correctOption = Number(form.get("correct_option"));
    if (options.length < 2) return { error: "Enter at least two answer options, one per line." };
    if (!Number.isInteger(correctOption) || correctOption < 0 || correctOption >= options.length) {
      return { error: "Select which option is correct." };
    }
  }

  const last = await scoped.context.client
    .from("assessment_questions")
    .select("sort_order")
    .eq("assessment_id", scoped.assessment.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const result = await scoped.context.client.from("assessment_questions").insert({
    school_id: scoped.context.schoolId,
    assessment_id: scoped.assessment.id,
    sort_order: (last.data?.sort_order ?? 0) + 1,
    prompt,
    question_type: questionType,
    options,
    correct_option: correctOption,
    points,
  });
  if (result.error) return { error: result.error.message || "Unable to add the question." };
  revalidatePath("/school/assessments");
  return { success: true };
}

export async function deleteAssessmentQuestion(form: FormData) {
  const scoped = await assessmentScope(form);
  if (!scoped) return { error: "You are not assigned to this assessment." };
  const result = await scoped.context.client
    .from("assessment_questions")
    .delete()
    .eq("id", text(form, "question_id"))
    .eq("assessment_id", scoped.assessment.id)
    .select("id")
    .maybeSingle();
  if (result.error || !result.data) return { error: "Question not found." };
  revalidatePath("/school/assessments");
  return { success: true };
}

export async function gradeSubmission(form: FormData) {
  const scoped = await assessmentScope(form);
  if (!scoped) return { error: "You are not assigned to this assessment." };
  const score = Number(form.get("score"));
  const feedback = text(form, "feedback") || null;
  if (!Number.isFinite(score) || score < 0 || score > scoped.assessment.max_score) {
    return { error: `Score must be between 0 and ${scoped.assessment.max_score}.` };
  }
  if (feedback && feedback.length > 2000) return { error: "Feedback must be 2000 characters or fewer." };
  const result = await scoped.context.client
    .from("assessment_submissions")
    .update({ score, status: "graded", graded_by: scoped.context.userId, graded_at: new Date().toISOString(), feedback })
    .eq("id", text(form, "submission_id"))
    .eq("assessment_id", scoped.assessment.id)
    .select("id")
    .maybeSingle();
  if (result.error || !result.data) return { error: result.error?.message || "Submission not found." };
  revalidatePath("/school/assessments");
  revalidatePath("/student/assessments");
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
