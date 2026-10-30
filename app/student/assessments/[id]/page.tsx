import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getStudentContext } from "@/lib/auth/get-student-context";
import { submitAssessment } from "@/actions/student-portal";
import ConfigurationForm from "@/components/school/ConfigurationForm";

const input = "block w-full rounded-lg border border-slate-300 p-2";
const typeLabel = (type: string) => type.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
const rel = (value: { name: string } | { name: string }[] | null) => (Array.isArray(value) ? value[0]?.name : value?.name) ?? "";

export default async function TakeAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await getStudentContext();
  if (!context) redirect("/login");
  const { id } = await params;

  const assessment = await context.client
    .from("assessments")
    .select("id, name, assessment_type, due_at, max_score, instructions, class_id, subjects(name)")
    .eq("id", id)
    .eq("school_id", context.schoolId)
    .maybeSingle();
  if (assessment.error || !assessment.data || assessment.data.class_id !== context.classId) notFound();

  type PortalQuestion = { id: string; sort_order: number; prompt: string; question_type: string; options: string[]; points: number };
  const [{ data: questions }, { data: submission }] = await Promise.all([
    context.client.rpc("sms_assessment_questions", { target_assessment: id }) as unknown as Promise<{ data: PortalQuestion[] | null }>,
    context.client
      .from("assessment_submissions")
      .select("id, status, score, answers, feedback, submitted_at")
      .eq("assessment_id", id)
      .eq("student_id", context.studentId)
      .maybeSingle(),
  ]);

  const closed = assessment.data.due_at ? new Date(assessment.data.due_at) < new Date() : false;

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <Link href="/student/assessments" className="text-sm font-medium text-slate-500 hover:text-green-600">← Back to assessments</Link>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">{assessment.data.name}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {rel(assessment.data.subjects)} · {typeLabel(assessment.data.assessment_type)} · max {assessment.data.max_score}
        {assessment.data.due_at ? ` · due ${new Date(assessment.data.due_at).toLocaleString()}` : ""}
      </p>
      {assessment.data.instructions && (
        <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{assessment.data.instructions}</p>
      )}

      {submission ? (
        <section className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
          <h2 className="font-bold text-green-800">
            {submission.status === "graded" ? `Graded · ${submission.score}` : "Submitted · awaiting grade"}
          </h2>
          <p className="mt-1 text-sm text-green-700">Submitted {new Date(submission.submitted_at).toLocaleString()}</p>
          {submission.feedback && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">Feedback: {submission.feedback}</p>}
        </section>
      ) : closed ? (
        <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          The deadline for this assessment has passed.
        </p>
      ) : !questions?.length ? (
        <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          This assessment has no online questions. Your teacher will record the score.
        </p>
      ) : (
        <ConfigurationForm action={submitAssessment} label="Submit answers">
          <input type="hidden" name="assessment_id" value={id} />
          {questions.map((question, index) => (
            <fieldset key={question.id} className="rounded-xl border border-slate-200 p-4">
              <legend className="px-1 text-sm font-bold text-slate-800">
                {index + 1}. {question.prompt} <span className="font-normal text-slate-400">({question.points} pts)</span>
              </legend>
              {question.question_type === "multiple_choice" ? (
                <div className="mt-2 space-y-2">
                  {(question.options as string[]).map((option, optionIndex) => (
                    <label key={optionIndex} className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="radio" name={`answer_${question.id}`} value={optionIndex} required />
                      {option}
                    </label>
                  ))}
                </div>
              ) : (
                <textarea className={`${input} mt-2`} name={`answer_${question.id}`} rows={4} maxLength={5000} required />
              )}
            </fieldset>
          ))}
        </ConfigurationForm>
      )}
    </main>
  );
}
