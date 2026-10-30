import Link from "next/link";
import { redirect } from "next/navigation";

import { getStudentContext } from "@/lib/auth/get-student-context";

const typeLabel = (type: string) => type.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
const rel = (value: { name: string } | { name: string }[] | null) => (Array.isArray(value) ? value[0]?.name : value?.name) ?? "";

export default async function StudentAssessmentsPage() {
  const context = await getStudentContext();
  if (!context) redirect("/login");
  if (!context.classId) {
    return <main className="mx-auto max-w-5xl p-8"><h1 className="text-2xl font-bold">Assignments &amp; Quizzes</h1><p className="mt-4 text-slate-500">You are not assigned to a class yet.</p></main>;
  }

  const [{ data: assessments }, { data: submissions }] = await Promise.all([
    context.client
      .from("assessments")
      .select("id, name, assessment_type, due_at, max_score, instructions, subjects(name)")
      .eq("school_id", context.schoolId)
      .eq("class_id", context.classId)
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    context.client
      .from("assessment_submissions")
      .select("assessment_id, status, score, submitted_at")
      .eq("student_id", context.studentId),
  ]);

  const byAssessment = new Map((submissions ?? []).map((row) => [row.assessment_id, row]));

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <h1 className="text-3xl font-bold text-slate-900">Assignments &amp; Quizzes</h1>
      <p className="mt-2 text-sm text-slate-500">Submit your work before the deadline. Multiple-choice quizzes are graded instantly.</p>

      <div className="mt-6 space-y-4">
        {!assessments?.length && <p className="text-slate-500">No assessments yet.</p>}
        {assessments?.map((assessment) => {
          const submission = byAssessment.get(assessment.id);
          const closed = assessment.due_at ? new Date(assessment.due_at) < new Date() : false;
          return (
            <Link
              key={assessment.id}
              href={`/student/assessments/${assessment.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-green-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-900">{assessment.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {rel(assessment.subjects)} · {typeLabel(assessment.assessment_type)} · max {assessment.max_score}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {assessment.due_at ? `Due ${new Date(assessment.due_at).toLocaleString()}` : "No deadline"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    submission?.status === "graded"
                      ? "bg-green-50 text-green-700"
                      : submission
                        ? "bg-amber-50 text-amber-700"
                        : closed
                          ? "bg-red-50 text-red-700"
                          : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {submission?.status === "graded"
                    ? `Graded · ${submission.score}`
                    : submission
                      ? "Submitted · awaiting grade"
                      : closed
                        ? "Closed"
                        : "Open"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
