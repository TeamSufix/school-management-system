"use server";

import { revalidatePath } from "next/cache";

import { getStudentContext } from "@/lib/auth/get-student-context";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

/**
 * Submit a student's answers to an online assessment. The database trigger
 * auto-grades multiple-choice questions and marks the submission for teacher
 * review when written answers are present.
 */
export async function submitAssessment(form: FormData) {
  const context = await getStudentContext();
  if (!context) return { error: "Only a student account can submit assessments." };
  if (!context.classId) return { error: "You are not assigned to a class." };

  const assessmentId = text(form, "assessment_id");
  const assessment = await context.client
    .from("assessments")
    .select("id, class_id, due_at")
    .eq("id", assessmentId)
    .eq("school_id", context.schoolId)
    .maybeSingle();
  if (assessment.error || !assessment.data) return { error: "Assessment not found." };
  if (assessment.data.class_id !== context.classId) return { error: "This assessment is not for your class." };
  if (assessment.data.due_at && new Date(assessment.data.due_at).getTime() < Date.now()) {
    return { error: "The submission deadline has passed." };
  }

  type PortalQuestion = { id: string; sort_order: number; prompt: string; question_type: string; options: string[]; points: number };
  const { data: questions } = (await context.client.rpc("sms_assessment_questions", { target_assessment: assessmentId })) as { data: PortalQuestion[] | null };

  const answers: Record<string, string> = {};
  for (const question of questions ?? []) {
    const value = text(form, `answer_${question.id}`);
    if (!value) continue;
    if (question.question_type === "multiple_choice") {
      const optionIndex = Number(value);
      const optionCount = Array.isArray(question.options) ? question.options.length : 0;
      if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= optionCount) {
        return { error: "Choose a valid option for every multiple-choice question." };
      }
      answers[question.id] = String(optionIndex);
    } else {
      if (value.length > 5000) return { error: "Answers must be 5000 characters or fewer." };
      answers[question.id] = value;
    }
  }
  if ((questions ?? []).some((q: PortalQuestion) => !(q.id in answers))) {
    return { error: "Answer every question before submitting." };
  }

  const result = await context.client.from("assessment_submissions").insert({
    school_id: context.schoolId,
    assessment_id: assessmentId,
    student_id: context.studentId,
    submitted_by: context.userId,
    answers,
  });
  if (result.error) {
    if (result.error.code === "23505") return { error: "You have already submitted this assessment." };
    return { error: result.error.message || "Unable to submit your answers." };
  }
  revalidatePath("/student/assessments");
  revalidatePath(`/student/assessments/${assessmentId}`);
  return { success: true };
}
