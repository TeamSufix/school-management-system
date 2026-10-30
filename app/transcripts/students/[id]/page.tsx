import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentTranscript } from "@/lib/reports/data";
import PrintButton from "@/components/school/PrintButton";

export default async function TranscriptPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ school?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const transcript = await getStudentTranscript(id, typeof query.school === "string" ? query.school : undefined);
  if (!transcript) notFound();
  const rel = (value: { name: string } | { name: string }[] | null) => (Array.isArray(value) ? value[0]?.name : value?.name) ?? "Subject";
  const schoolClass = Array.isArray(transcript.student.classes) ? transcript.student.classes[0] : transcript.student.classes;

  return (
    <main className="mx-auto max-w-4xl space-y-6 bg-white p-8 print:p-0">
      <div className="flex items-center justify-between print:hidden"><Link href="/" className="text-green-700">Dashboard</Link><PrintButton /></div>
      <header className="border-b-2 border-green-700 pb-6 text-center">
        <h1 className="text-3xl font-bold">{transcript.school.name}</h1>
        <p>{transcript.school.address}</p>
        <h2 className="mt-4 text-2xl font-semibold">Academic Transcript</h2>
      </header>
      <section className="grid gap-3 sm:grid-cols-2">
        <p><strong>Student:</strong> {transcript.student.first_name} {transcript.student.last_name}</p>
        <p><strong>Student ID:</strong> {transcript.student.student_id}</p>
        <p><strong>Class:</strong> {schoolClass?.name ?? "Not assigned"}</p>
        <p><strong>Cumulative:</strong> {transcript.cumulativeAverage === null ? "—" : `${transcript.cumulativeAverage.toFixed(2)}% · GPA ${transcript.cumulativeGpa?.toFixed(2)}`}</p>
      </section>
      {transcript.periods.map((period) => (
        <section key={`${period.year}-${period.term}`}>
          <h3 className="mb-2 font-semibold">{period.year} · {period.term.replace("term_", "Term ")}</h3>
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b"><th className="p-2">Subject</th><th className="p-2">Score</th><th className="p-2">Grade</th></tr></thead>
            <tbody>
              {period.rows.map((row) => <tr key={row.id} className="border-b"><td className="p-2">{rel(row.subjects)}</td><td className="p-2">{row.score}</td><td className="p-2">{row.grade}</td></tr>)}
            </tbody>
          </table>
          <p className="mt-1 text-sm text-slate-600">Average {period.average.toFixed(2)}% · GPA {period.gpa.toFixed(2)}</p>
        </section>
      ))}
      {!transcript.periods.length && <p>No results recorded yet.</p>}
      <footer className="text-sm text-slate-600"><p>GPA scale: A = 4.0, B = 3.0, C = 2.0, D = 1.0, F = 0. Scores include approved amendments.</p></footer>
    </main>
  );
}
