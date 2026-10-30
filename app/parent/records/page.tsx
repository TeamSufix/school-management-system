import Link from "next/link";
import { redirect } from "next/navigation";
import { getParentRecords } from "@/lib/auth/get-parent-records";
import PrintButton from "@/components/school/PrintButton";

const money = (value: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(value);
const termLabel = (term: string) => term.replace("term_", "Term ");

export default async function ParentRecordsPage() {
  let records;
  try {
    records = await getParentRecords();
  } catch {
    return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-bold">Family records unavailable</h1><p className="mt-4">We could not load your records. Please try again or contact your school administrator.</p><Link href="/parent/dashboard" className="mt-4 inline-block text-green-700">Back to dashboard</Link></main>;
  }
  if (!records) redirect("/unauthorized");

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><Link href="/parent/dashboard" className="text-green-700 print:hidden">Back to dashboard</Link><h1 className="mt-3 text-3xl font-bold">Family school records</h1><p className="mt-2 text-slate-600">{records.user.school?.name}</p></div>
        <PrintButton />
      </header>
      {!records.children.length && <p>No children are linked to your account yet.</p>}
      {records.children.map((child) => {
        const attendance = records.attendance.filter((record) => record.student_id === child.id);
        const results = records.results.filter((record) => record.student_id === child.id);
        const fees = records.fees.filter((record) => record.student_id === child.id);
        const payments = records.payments.filter((record) => record.student_id === child.id);
        return (
          <article key={child.id} id={child.id} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 print:break-before-page print:border-0">
            <h2 className="text-2xl font-bold">{child.first_name} {child.last_name} <span className="text-sm font-normal text-slate-500">{child.student_id}</span></h2>
            <nav className="flex flex-wrap gap-3 print:hidden" aria-label="Report cards">{[...new Map(results.map((result) => [`${result.academic_year}:${result.term}`, result])).values()].map((result) => <Link key={`${result.academic_year}:${result.term}`} className="font-semibold text-green-700" href={`/reports/students/${child.id}?year=${encodeURIComponent(result.academic_year)}&term=${result.term}`}>Report card: {result.academic_year} · {termLabel(result.term)}</Link>)}</nav>
            <section><h3 className="text-xl font-semibold">Academic report</h3><p className="mb-3 text-sm text-slate-500">Recorded scores include approved amendments. This is a record summary, not a certified report card.</p>
              <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Year</th><th className="p-2">Term</th><th className="p-2">Subject</th><th className="p-2">Score</th><th className="p-2">Grade</th></tr></thead><tbody>{results.map((result) => { const subject = Array.isArray(result.subjects) ? result.subjects[0] : result.subjects; return <tr key={result.id} className="border-t"><td className="p-2">{result.academic_year}</td><td className="p-2">{termLabel(result.term)}</td><td className="p-2">{subject?.name ?? "Subject unavailable"}</td><td className="p-2">{result.score}</td><td className="p-2">{result.grade}</td></tr>; })}</tbody></table></div>
              {!results.length && <p className="mt-3 text-slate-500">No results recorded.</p>}
            </section>
            <section><h3 className="mb-3 text-xl font-semibold">Fees and balances</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Year / Term</th><th className="p-2">Due</th><th className="p-2">Paid</th><th className="p-2">Balance</th></tr></thead><tbody>{fees.map((fee) => { const paid = payments.filter((payment) => payment.fee_id === fee.id).reduce((sum, payment) => sum + Number(payment.amount), 0); return <tr key={fee.id} className="border-t"><td className="p-2">{fee.academic_year} / {termLabel(fee.term)}</td><td className="p-2">{money(Number(fee.amount_due))}</td><td className="p-2">{money(paid)}</td><td className="p-2">{money(Number(fee.amount_due) - paid)}</td></tr>; })}</tbody></table></div>{!fees.length && <p className="mt-3 text-slate-500">No fees recorded.</p>}</section>
            <section><h3 className="mb-3 text-xl font-semibold">Payment history</h3>{payments.map((payment) => <div key={payment.id} className="flex flex-wrap justify-between gap-3 border-t py-3 text-sm"><span>{payment.date} · {payment.payment_method.replaceAll("_", " ")}<br /><span className="text-xs text-slate-500">Receipt ID: {payment.id}{payment.reference ? ` · Reference: ${payment.reference}` : ""}</span></span><strong>{money(Number(payment.amount))}</strong><Link href={`/receipts/${payment.id}`} className="font-semibold text-green-700 print:hidden">View receipt</Link></div>)}{!payments.length && <p className="text-slate-500">No payments recorded.</p>}</section>
            <section><h3 className="mb-3 text-xl font-semibold">Attendance</h3><p className="mb-3 text-sm text-slate-600">{attendance.length} attendance records</p><div className="grid gap-2 sm:grid-cols-3">{attendance.map((record) => <div key={record.id} className="rounded-lg border p-3 text-sm">{record.date}<span className="ml-3 capitalize">{record.status}</span></div>)}</div>{!attendance.length && <p className="text-slate-500">No attendance recorded.</p>}</section>
          </article>
        );
      })}
    </main>
  );
}
