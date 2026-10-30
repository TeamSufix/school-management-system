import { redirect } from "next/navigation";
import { getManagementContext } from "@/lib/auth/get-management-context";
import { canAccessTeachingScope } from "@/lib/auth/teacher-scope";
import { defaultAcademicPeriod } from "@/lib/academics/period";
import { createAssessment, saveAssessmentScores, deleteAssessment, addAssessmentQuestion, deleteAssessmentQuestion, gradeSubmission } from "@/actions/assessments";
import ConfigurationForm from "@/components/school/ConfigurationForm";

const input = "block w-full rounded-lg border border-slate-300 p-2";
const TYPES = ["class_test", "assignment", "mid_term", "end_of_term", "exam"] as const;
const typeLabel = (type: string) => type.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());

export default async function AssessmentsManager({ schoolId }: { schoolId?: string }) {
  const context = await getManagementContext(schoolId);
  if (!context || !["super_admin", "school_admin", "teacher"].includes(context.role)) redirect("/unauthorized");
  const [classes, subjects, sessions, settings, assessments, scores, questions, submissions] = await Promise.all([
    context.client.from("classes").select("id, name").eq("school_id", context.schoolId).order("name"),
    context.client.from("subjects").select("id, name").eq("school_id", context.schoolId).order("name"),
    context.client.from("academic_sessions").select("id, name").eq("school_id", context.schoolId).order("name", { ascending: false }),
    context.client.from("school_academic_settings").select("academic_year, term").eq("school_id", context.schoolId).maybeSingle(),
    context.client.from("assessments").select("id, class_id, subject_id, academic_year, term, name, assessment_type, weight, max_score, due_at, instructions").eq("school_id", context.schoolId).order("created_at", { ascending: false }),
    context.client.from("assessment_scores").select("assessment_id, student_id, score").eq("school_id", context.schoolId),
    context.client.from("assessment_questions").select("id, assessment_id, sort_order, prompt, question_type, options, correct_option, points").eq("school_id", context.schoolId).order("sort_order"),
    context.client.from("assessment_submissions").select("id, assessment_id, student_id, status, score, answers, feedback, submitted_at").eq("school_id", context.schoolId).order("submitted_at", { ascending: false }),
  ]);
  if ([classes, subjects, assessments, scores, questions, submissions].some((result) => result.error)) {
    return <main className="mx-auto max-w-5xl p-8"><h1 className="text-2xl font-bold">Assessments unavailable</h1><p className="mt-4">Verify that the assessments migration has been installed.</p></main>;
  }
  const period = settings.data ?? defaultAcademicPeriod();
  const classRows = (classes.data ?? []).filter((item) => canAccessTeachingScope(context, item.id));
  const assessmentRows = (assessments.data ?? []).filter((item) => canAccessTeachingScope(context, item.class_id, item.subject_id));
  const classIds = [...new Set(assessmentRows.map((item) => item.class_id))];
  const students = classIds.length
    ? await context.client.from("students").select("id, first_name, last_name, student_id, class_id").eq("school_id", context.schoolId).in("class_id", classIds).eq("status", "active").order("first_name")
    : { data: [], error: null };
  if (students.error) return <main className="mx-auto max-w-5xl p-8"><h1 className="text-2xl font-bold">Assessments unavailable</h1></main>;
  const scoreMap = new Map((scores.data ?? []).map((row) => [`${row.assessment_id}:${row.student_id}`, row.score]));
  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <h1 className="text-3xl font-bold">Assessments and exams</h1>
      <ConfigurationForm action={createAssessment} label="Create assessment">
        {schoolId && <input type="hidden" name="school_id" value={schoolId} />}
        <div className="grid gap-3 sm:grid-cols-2">
          <label>Class<select className={input} name="class_id" required defaultValue=""><option value="" disabled>Select class</option>{classRows.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Subject<select className={input} name="subject_id" required defaultValue=""><option value="" disabled>Select subject</option>{(subjects.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Session<select className={input} name="session_id" defaultValue=""><option value="">None</option>{(sessions.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Name<input className={input} name="name" maxLength={200} required /></label>
          <label>Type<select className={input} name="assessment_type" required>{TYPES.map((type) => <option key={type} value={type}>{typeLabel(type)}</option>)}</select></label>
          <label>Weight %<input className={input} name="weight" type="number" min="0.01" max="100" step="0.01" defaultValue="10" required /></label>
          <label>Maximum score<input className={input} name="max_score" type="number" min="1" max="1000" step="0.01" defaultValue="100" required /></label>
          <label>Submission deadline (optional)<input className={input} name="due_at" type="datetime-local" /></label>
        </div>
        <label className="block">Instructions for students (optional)<textarea className={input} name="instructions" rows={2} maxLength={5000} /></label>
        <input type="hidden" name="academic_year" value={period.academic_year} />
        <input type="hidden" name="term" value={period.term} />
        <p className="text-sm text-slate-500">Recorded for {period.academic_year} · {period.term.replace("_", " ")}.</p>
      </ConfigurationForm>
      {!assessmentRows.length && <p>No assessments yet.</p>}
      {assessmentRows.map((assessment) => {
        const roster = (students.data ?? []).filter((student) => student.class_id === assessment.class_id);
        const assessmentQuestions = (questions.data ?? []).filter((item) => item.assessment_id === assessment.id);
        const assessmentSubmissions = (submissions.data ?? []).filter((item) => item.assessment_id === assessment.id);
        return (
          <section key={assessment.id} className="space-y-4 rounded-2xl border border-slate-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">{assessment.name}</h2>
                <p className="text-sm text-slate-500">
                  {(classes.data ?? []).find((item) => item.id === assessment.class_id)?.name} · {(subjects.data ?? []).find((item) => item.id === assessment.subject_id)?.name} · {typeLabel(assessment.assessment_type)} · weight {assessment.weight}% · max {assessment.max_score} · {assessment.academic_year} {assessment.term.replace("_", " ")}
                  {assessment.due_at ? ` · due ${new Date(assessment.due_at).toLocaleString()}` : ""}
                </p>
              </div>
              <ConfigurationForm action={deleteAssessment} label="Delete assessment">
                {schoolId && <input type="hidden" name="school_id" value={schoolId} />}
                <input type="hidden" name="assessment_id" value={assessment.id} />
              </ConfigurationForm>
            </div>
            <details className="rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer text-sm font-bold text-slate-700">Online questions ({assessmentQuestions.length})</summary>
              <div className="mt-3 space-y-3">
                {assessmentQuestions.map((question) => (
                  <div key={question.id} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                    <div>
                      <p className="font-semibold text-slate-800">{question.sort_order}. {question.prompt} <span className="font-normal text-slate-400">({question.points} pts · {question.question_type === "multiple_choice" ? "multiple choice" : "short answer"})</span></p>
                      {question.question_type === "multiple_choice" && (
                        <ul className="mt-1 text-xs text-slate-500">
                          {(question.options as string[]).map((option, index) => (
                            <li key={index} className={index === question.correct_option ? "font-bold text-green-700" : ""}>{index === question.correct_option ? "✓ " : ""}{option}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <ConfigurationForm action={deleteAssessmentQuestion} label="Remove">
                      {schoolId && <input type="hidden" name="school_id" value={schoolId} />}
                      <input type="hidden" name="assessment_id" value={assessment.id} />
                      <input type="hidden" name="question_id" value={question.id} />
                    </ConfigurationForm>
                  </div>
                ))}
                <ConfigurationForm action={addAssessmentQuestion} label="Add question">
                  {schoolId && <input type="hidden" name="school_id" value={schoolId} />}
                  <input type="hidden" name="assessment_id" value={assessment.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label>Type<select className={input} name="question_type" defaultValue="multiple_choice"><option value="multiple_choice">Multiple choice (auto-graded)</option><option value="short_answer">Short answer (teacher graded)</option></select></label>
                    <label>Points<input className={input} name="points" type="number" min="0.01" max="1000" step="0.01" defaultValue="1" required /></label>
                  </div>
                  <label className="block">Question<input className={input} name="prompt" maxLength={2000} required /></label>
                  <label className="block">Options, one per line (multiple choice only)<textarea className={input} name="options" rows={3} /></label>
                  <label className="block">Correct option number, starting at 0 (multiple choice only)<input className={input} name="correct_option" type="number" min="0" max="9" step="1" defaultValue="0" /></label>
                </ConfigurationForm>
              </div>
            </details>
            {assessmentSubmissions.length > 0 && (
              <details className="rounded-xl border border-slate-200 p-4">
                <summary className="cursor-pointer text-sm font-bold text-slate-700">Student submissions ({assessmentSubmissions.length})</summary>
                <div className="mt-3 space-y-3">
                  {assessmentSubmissions.map((submission) => {
                    const student = (students.data ?? []).find((item) => item.id === submission.student_id);
                    return (
                      <div key={submission.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                        <p className="font-semibold text-slate-800">
                          {student ? `${student.first_name} ${student.last_name}` : submission.student_id}
                          <span className="ml-2 font-normal text-slate-400">{submission.status === "graded" ? `graded · ${submission.score}` : "awaiting grade"} · {new Date(submission.submitted_at).toLocaleString()}</span>
                        </p>
                        {assessmentQuestions.filter((q) => q.question_type === "short_answer").map((q) => (
                          <div key={q.id} className="mt-2">
                            <p className="text-xs font-bold text-slate-500">{q.prompt}</p>
                            <p className="whitespace-pre-wrap text-slate-700">{(submission.answers as Record<string, string>)?.[q.id] ?? "—"}</p>
                          </div>
                        ))}
                        {submission.status !== "graded" && (
                          <ConfigurationForm action={gradeSubmission} label="Grade">
                            {schoolId && <input type="hidden" name="school_id" value={schoolId} />}
                            <input type="hidden" name="assessment_id" value={assessment.id} />
                            <input type="hidden" name="submission_id" value={submission.id} />
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              <input className={input} name="score" type="number" min="0" max={assessment.max_score} step="0.01" placeholder={`Score (0–${assessment.max_score})`} required />
                              <input className={input} name="feedback" maxLength={2000} placeholder="Feedback (optional)" />
                            </div>
                          </ConfigurationForm>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
            <ConfigurationForm action={saveAssessmentScores} label="Save scores">
              {schoolId && <input type="hidden" name="school_id" value={schoolId} />}
              <input type="hidden" name="assessment_id" value={assessment.id} />
              <div className="grid gap-2 sm:grid-cols-2">
                {roster.map((student) => (
                  <label key={student.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <span>{student.first_name} {student.last_name} <span className="text-slate-400">({student.student_id})</span></span>
                    <input name={`score_${student.id}`} type="number" min="0" max={assessment.max_score} step="0.01" defaultValue={scoreMap.get(`${assessment.id}:${student.id}`) ?? ""} className="w-24 rounded-lg border border-slate-300 p-1.5 text-right" />
                  </label>
                ))}
              </div>
            </ConfigurationForm>
          </section>
        );
      })}
    </main>
  );
}
