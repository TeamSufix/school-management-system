import { notFound } from "next/navigation";
import { getClassReports, getReportAcademicPeriod } from "@/lib/reports/data";
import { calculateGrade } from "@/lib/academics/grades";
import PrintButton from "@/components/school/PrintButton";

export default async function ClassReportsPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string; term?: string; school?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const schoolId = typeof query.school === "string" ? query.school : undefined;
  const period = typeof query.year !== "string" || typeof query.term !== "string" ? await getReportAcademicPeriod(schoolId) : null;
  const year = typeof query.year === "string" ? query.year : period!.academic_year;
  const term = typeof query.term === "string" ? query.term : period!.term;
  const reports = await getClassReports(id, year, term, schoolId);
  if (!reports?.length) notFound();

  return (
    <main className="mx-auto max-w-4xl bg-white p-8 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <p className="text-sm text-slate-500">{reports.length} report cards · {year} · {term.replace("term_", "Term ")}</p>
        <PrintButton />
      </div>
      {reports.map((report) => {
        const total = report.results.reduce((sum, result) => sum + result.score, 0);
        const average = report.results.length ? total / report.results.length : null;
        return (
          <article key={report.student.id} className="mt-8 space-y-4 break-after-page">
            <header className="border-b-2 border-green-700 pb-4 text-center">
              <h1 className="text-2xl font-bold">{report.school.name}</h1>
              <p className="text-sm">{report.school.address}</p>
              <h2 className="mt-2 text-xl font-semibold">Student Report Card</h2>
              <p className="text-sm">{year} · {term.replace("term_", "Term ")}</p>
            </header>
            <section className="grid gap-2 text-sm sm:grid-cols-2">
              <p><strong>Student:</strong> {report.student.first_name} {report.student.last_name}</p>
              <p><strong>Student ID:</strong> {report.student.student_id}</p>
              <p><strong>Average:</strong> {average === null ? "—" : `${average.toFixed(2)}% · ${calculateGrade(average)}`}</p>
              <p><strong>Position:</strong> {report.classStats.position === null ? "—" : `${report.classStats.position} of ${report.classStats.classSize}`}</p>
            </section>
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b"><th className="p-2">Subject</th><th className="p-2">Score</th><th className="p-2">Class avg</th><th className="p-2">Grade</th></tr></thead>
              <tbody>
                {report.results.map((result) => {
                  const subject = Array.isArray(result.subjects) ? result.subjects[0] : result.subjects;
                  const subjectAverage = report.classStats.subjectAverages.get(result.subject_id);
                  return <tr key={result.id} className="border-b"><td className="p-2">{subject?.name ?? "Subject"}</td><td className="p-2">{result.score}</td><td className="p-2">{subjectAverage === undefined ? "—" : subjectAverage.toFixed(1)}</td><td className="p-2">{result.grade}</td></tr>;
                })}
              </tbody>
            </table>
            {!report.results.length && <p className="text-sm">No results recorded for this period.</p>}
            {report.remarks && (report.remarks.class_teacher_remark || report.remarks.head_teacher_remark) && (
              <section className="text-sm">
                {report.remarks.class_teacher_remark && <p><strong>Class teacher:</strong> {report.remarks.class_teacher_remark}</p>}
                {report.remarks.head_teacher_remark && <p><strong>Head teacher:</strong> {report.remarks.head_teacher_remark}</p>}
              </section>
            )}
            <p className="text-xs text-slate-400">Generated {new Date().toISOString().slice(0, 10)}</p>
          </article>
        );
      })}
    </main>
  );
}
