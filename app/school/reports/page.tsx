import Link from "next/link";
import { getManagementContext } from "@/lib/auth/get-management-context";
import { redirect } from "next/navigation";
import { getAttendanceReport } from "@/lib/reports/attendance";
import { readAllRows } from "@/lib/supabase/read-all";
import { moneyToCents } from "@/lib/academics/money";
import PrintButton from "@/components/school/PrintButton";

const money = (value: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(value);
const input = "rounded-lg border border-slate-300 p-2";

export default async function SchoolReportsPage({ searchParams }: { searchParams: Promise<{ class?: string; from?: string; to?: string; year?: string; term?: string; school?: string }> }) {
  const query = await searchParams;
  const schoolId = typeof query.school === "string" ? query.school : undefined;
  const context = await getManagementContext(schoolId);
  if (!context || !["super_admin", "school_admin", "teacher", "accountant"].includes(context.role)) redirect("/unauthorized");
  const attendance = context.role === "accountant" ? null : await getAttendanceReport(query.class, query.from, query.to, schoolId);
  let financeRows: { academic_year: string; term: string; due: number; paid: number; balance: number }[] = [];
  if (context.role !== "teacher") {
    const fees = await readAllRows(context.client.from("fees").select("id, academic_year, term, amount_due").eq("school_id", context.schoolId));
    const payments = await readAllRows(context.client.from("payments").select("fee_id, amount").eq("school_id", context.schoolId));
    const paidByFee = new Map<string, number>();
    for (const payment of payments) paidByFee.set(payment.fee_id, (paidByFee.get(payment.fee_id) ?? 0) + moneyToCents(Number(payment.amount)));
    const byPeriod = new Map<string, { academic_year: string; term: string; due: number; paid: number; balance: number }>();
    for (const fee of fees) {
      const key = `${fee.academic_year}:${fee.term}`;
      const row = byPeriod.get(key) ?? { academic_year: fee.academic_year, term: fee.term, due: 0, paid: 0, balance: 0 };
      const paid = paidByFee.get(fee.id) ?? 0;
      row.due += Number(fee.amount_due);
      row.paid += paid / 100;
      row.balance += (moneyToCents(Number(fee.amount_due)) - paid) / 100;
      byPeriod.set(key, row);
    }
    financeRows = [...byPeriod.values()].sort((a, b) => b.academic_year.localeCompare(a.academic_year) || a.term.localeCompare(b.term));
  }
  const subjectTerms: { subject: string; period: string; average: number; count: number; delta: number | null }[] = [];
  if (context.role !== "accountant") {
    const results = await readAllRows(
      context.client.from("results").select("score, academic_year, term, subjects(name)").eq("school_id", context.schoolId),
    );
    const periods = [...new Set(results.map((row) => `${row.academic_year}:${row.term}`))].sort();
    const latest = periods.at(-1);
    const previous = periods.at(-2);
    const byPeriodSubject = new Map<string, { total: number; count: number }>();
    for (const row of results) {
      const subject = (Array.isArray(row.subjects) ? row.subjects[0] : row.subjects)?.name ?? "Subject";
      const key = `${row.academic_year}:${row.term}|${subject}`;
      const entry = byPeriodSubject.get(key) ?? { total: 0, count: 0 };
      entry.total += Number(row.score);
      entry.count += 1;
      byPeriodSubject.set(key, entry);
    }
    for (const period of periods) {
      const subjects = [...byPeriodSubject.keys()].filter((key) => key.startsWith(`${period}|`)).map((key) => key.split("|")[1]);
      for (const subject of subjects) {
        const current = byPeriodSubject.get(`${period}|${subject}`);
        const avg = current ? current.total / current.count : 0;
        let delta: number | null = null;
        if (period === latest && previous) {
          const prev = byPeriodSubject.get(`${previous}|${subject}`);
          if (prev) delta = avg - prev.total / prev.count;
        }
        subjectTerms.push({ subject, period, average: Math.round(avg * 10) / 10, count: current?.count ?? 0, delta });
      }
    }
  }

  const exportBase = schoolId ? `/reports/export?school=${schoolId}` : "/reports/export?";
  const attendanceQuery = `type=attendance${attendance?.selected ? `&class=${attendance.selected}` : ""}${query.from ? `&from=${query.from}` : ""}${query.to ? `&to=${query.to}` : ""}`;
  const schoolQuery = schoolId ? `&school=${schoolId}` : "";
  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-3xl font-bold">School reports</h1>
        <PrintButton />
      </div>
      {attendance && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Attendance report</h2>
          <form className="flex flex-wrap items-end gap-3 print:hidden">
            {schoolId && <input type="hidden" name="school" value={schoolId} />}
            <label className="text-sm">Class
              <select name="class" defaultValue={attendance.selected ?? ""} className={`block ${input}`}>
                <option value="">All classes</option>
                {attendance.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="text-sm">From<input className={`block ${input}`} type="date" name="from" defaultValue={query.from ?? ""} /></label>
            <label className="text-sm">To<input className={`block ${input}`} type="date" name="to" defaultValue={query.to ?? ""} /></label>
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Run report</button>
            <Link href={`${exportBase}${exportBase.endsWith("?") ? "" : "&"}${attendanceQuery}${schoolQuery}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Export CSV</Link>
          </form>
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b"><th className="p-2">Student</th><th className="p-2">Present</th><th className="p-2">Absent</th><th className="p-2">Late</th><th className="p-2">Excused</th><th className="p-2">Attendance rate</th></tr></thead>
            <tbody>
              {attendance.rows.map((row) => (
                <tr key={row.student_id} className="border-b"><td className="p-2">{row.first_name} {row.last_name}</td><td className="p-2">{row.present}</td><td className="p-2">{row.absent}</td><td className="p-2">{row.late}</td><td className="p-2">{row.excused}</td><td className="p-2">{row.rate}%</td></tr>
              ))}
              {!attendance.rows.length && <tr><td className="p-2" colSpan={6}>No attendance recorded for this filter.</td></tr>}
            </tbody>
          </table>
        </section>
      )}
      {context.role !== "accountant" && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Academic trend — term over term</h2>
          <p className="text-sm text-slate-500">Average result score per subject for each academic period. The change column compares the latest period with the previous one.</p>
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b"><th className="p-2">Period</th><th className="p-2">Subject</th><th className="p-2">Results</th><th className="p-2">Average</th><th className="p-2">Change</th></tr></thead>
            <tbody>
              {subjectTerms.map((row) => (
                <tr key={`${row.period}|${row.subject}`} className="border-b">
                  <td className="p-2">{row.period.replace(":", " · ").replace("_", " ")}</td>
                  <td className="p-2">{row.subject}</td>
                  <td className="p-2">{row.count}</td>
                  <td className="p-2">{row.average}%</td>
                  <td className="p-2">
                    {row.delta === null ? "—" : (
                      <span className={row.delta >= 0 ? "font-semibold text-green-700" : "font-semibold text-red-700"}>
                        {row.delta >= 0 ? "+" : ""}{row.delta.toFixed(1)}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {!subjectTerms.length && <tr><td className="p-2" colSpan={5}>No results recorded yet.</td></tr>}
            </tbody>
          </table>
        </section>
      )}
      {context.role !== "teacher" && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Fee collection summary</h2>
          <Link href={`${exportBase}${exportBase.endsWith("?") ? "" : "&"}type=fees${schoolQuery}`} className="inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold print:hidden">Export CSV</Link>
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b"><th className="p-2">Period</th><th className="p-2">Fees due</th><th className="p-2">Collected</th><th className="p-2">Outstanding</th></tr></thead>
            <tbody>
              {financeRows.map((row) => (
                <tr key={`${row.academic_year}${row.term}`} className="border-b"><td className="p-2">{row.academic_year} · {row.term.replace("_", " ")}</td><td className="p-2">{money(row.due)}</td><td className="p-2">{money(row.paid)}</td><td className="p-2">{money(row.balance)}</td></tr>
              ))}
              {!financeRows.length && <tr><td className="p-2" colSpan={4}>No fee records yet.</td></tr>}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
