import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentReport, getReportAcademicPeriod } from "@/lib/reports/data";
import { calculateGrade } from "@/lib/academics/grades";
import PrintButton from "@/components/school/PrintButton";

export default async function StudentReportPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string; term?: string; school?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const schoolId = typeof query.school === "string" ? query.school : undefined;
  const period = typeof query.year !== "string" || typeof query.term !== "string" ? await getReportAcademicPeriod(schoolId) : null;
  const year = typeof query.year === "string" ? query.year : period!.academic_year;
  const term = typeof query.term === "string" ? query.term : period!.term;
  const report = await getStudentReport(id, year, term, schoolId);
  if (!report) notFound();
  const total = report.results.reduce((sum, result) => sum + result.score, 0);
  const average = report.results.length ? total / report.results.length : null;
  const classes = [...new Set(report.results.flatMap((result) => {
    const schoolClass = Array.isArray(result.classes) ? result.classes[0] : result.classes;
    return schoolClass?.name ? [schoolClass.name] : [];
  }))];
  return (
    <main className="mx-auto max-w-4xl space-y-6 bg-white p-8 print:p-0">
      <div className="flex items-center justify-between print:hidden"><Link href="/" className="text-green-700">Dashboard</Link><PrintButton /></div>
      <form className="flex flex-wrap items-end gap-3 print:hidden">
        {schoolId && <input type="hidden" name="school" value={schoolId} />}
        <label>Academic year<input name="year" defaultValue={year} required pattern="[0-9]{4}(/|-)[0-9]{4}" className="block rounded border p-2" /></label>
        <label>Term<select name="term" defaultValue={term} className="block rounded border p-2"><option value="term_1">Term 1</option><option value="term_2">Term 2</option><option value="term_3">Term 3</option></select></label>
        <button className="rounded bg-slate-900 px-4 py-2 text-white">View report</button>
      </form>
      <header className="border-b-2 border-green-700 pb-6 text-center"><h1 className="text-3xl font-bold">{report.school.name}</h1><p>{report.school.address}</p><p>{report.school.phone} {report.school.email}</p><h2 className="mt-4 text-2xl font-semibold">Student Report Card</h2><p>{year} · {term.replace("term_", "Term ")}</p></header>
      <section className="grid gap-3 sm:grid-cols-2"><p><strong>Student:</strong> {report.student.first_name} {report.student.last_name}</p><p><strong>Student ID:</strong> {report.student.student_id}</p><p><strong>Recorded class:</strong> {classes.join(", ") || "No results recorded"}</p><p><strong>Generated:</strong> {new Date().toISOString().slice(0, 10)}</p></section>
      <table className="w-full text-left"><thead><tr className="border-b"><th className="p-3">Subject</th><th className="p-3">Score / 100</th><th className="p-3">Grade</th></tr></thead><tbody>{report.results.map((result) => {
        const subject = Array.isArray(result.subjects) ? result.subjects[0] : result.subjects;
        return <tr key={result.id} className="border-b"><td className="p-3">{subject?.name ?? "Subject unavailable"}</td><td className="p-3">{result.score}</td><td className="p-3">{result.grade}</td></tr>;
      })}</tbody></table>
      {!report.results.length ? <p>No results recorded for this period.</p> : <section className="rounded-xl bg-slate-50 p-5"><p>Subjects recorded: {report.results.length}</p><p>Total: {total.toFixed(2)} / {report.results.length * 100}</p><p>Average: {average?.toFixed(2)}% · Grade: {calculateGrade(average ?? 0)}</p></section>}
      {!!report.assessments.length && <section><h3 className="mb-2 text-lg font-semibold">Assessment breakdown</h3><table className="w-full text-left"><thead><tr className="border-b"><th className="p-3">Assessment</th><th className="p-3">Subject</th><th className="p-3">Type</th><th className="p-3">Score</th><th className="p-3">Weighted</th></tr></thead><tbody>{report.assessments.map((assessment) => (
        <tr key={assessment.id} className="border-b"><td className="p-3">{assessment.name}</td><td className="p-3">{assessment.subject}</td><td className="p-3">{assessment.assessment_type.replaceAll("_", " ")}</td><td className="p-3">{assessment.score === null ? "—" : `${assessment.score} / ${assessment.max_score}`}</td><td className="p-3">{assessment.contribution === null ? "—" : `${assessment.contribution.toFixed(2)} / ${assessment.weight}`}</td></tr>
      ))}</tbody></table></section>}
      <footer className="space-y-3 text-sm text-slate-600"><p>Grades: A ≥ 80, B ≥ 70, C ≥ 60, D ≥ 50, F &lt; 50. Scores include approved amendments. Averages cover recorded subjects only.</p><p>This report reflects records available when generated. Contact the school for verification.</p></footer>
    </main>
  );
}
