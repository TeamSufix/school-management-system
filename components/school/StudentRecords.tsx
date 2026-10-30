import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getStudentRecords } from "@/lib/students/records";

export type StudentRecordView = "all" | "attendance" | "results" | "fees";
const money = (value: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(value);
const term = (value: string) => value.replace("term_", "Term ");
const name = (value: { name: string } | { name: string }[] | null) => (Array.isArray(value) ? value[0]?.name : value?.name) ?? "Not available";
const sectionClass = "scroll-mt-6 rounded-2xl border bg-white p-6";

function RecordTable({ headings, children }: { headings: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead><tr>{headings.map((heading) => <th key={heading} className="p-2">{heading}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export default async function StudentRecords({ studentId, schoolId, view = "all" }: {
  studentId: string; schoolId?: string; view?: StudentRecordView;
}) {
  const records = await getStudentRecords(studentId, schoolId, view);
  if (!records) notFound();
  if ((view === "fees" && records.fees === null) || (view === "attendance" && records.attendance === null) || (view === "results" && records.results === null)) redirect("/unauthorized");
  const schoolQuery = records.role === "super_admin" ? `&school=${encodeURIComponent(records.schoolId)}` : "";
  return (
    <section className="mt-8 space-y-8" aria-label="Student records">
      <header>
        <h2 className="text-2xl font-bold">Records for {records.student.first_name} {records.student.last_name}</h2>
        <p className="mt-1 text-sm text-slate-500">Student ID: {records.student.student_id}</p>
      </header>
      {view !== "all" && <Link href={`/school/students/${studentId}`} className="inline-block text-green-700">Back to student profile</Link>}
      {(view === "all" || view === "attendance") && records.attendance !== null && (
        <section id="student-attendance" className={sectionClass}>
          <h3 className="mb-4 text-xl font-bold">Attendance</h3>
          {!records.attendance.length ? <p>No attendance records for this student.</p> : (
            <RecordTable headings={["Date", "Recorded class", "Status", "Remarks"]}>
              {records.attendance.map((record) => (
                <tr key={record.id} className="border-t">
                  <td className="p-2">{record.date}</td>
                  <td className="p-2">{name(record.classes)}</td>
                  <td className="p-2 capitalize">{record.status}</td>
                  <td className="p-2">{record.remarks || "—"}</td>
                </tr>
              ))}
            </RecordTable>
          )}
        </section>
      )}
      {(view === "all" || view === "results") && records.results !== null && (
        <section id="student-results" className={sectionClass}>
          <h3 className="mb-2 text-xl font-bold">Academic results</h3>
          <p className="mb-4 text-sm text-slate-500">Scores include approved amendments.{records.role === "teacher" ? " Only your assigned class/subject pairs are shown." : ""}</p>
          {!records.results.length ? <p>No results available for this student.</p> : (
            <RecordTable headings={["Year / Term", "Class", "Subject", "Score", "Grade", "Report"]}>
              {records.results.map((record) => (
                <tr key={record.id} className="border-t">
                  <td className="p-2">{record.academic_year} / {term(record.term)}</td>
                  <td className="p-2">{name(record.classes)}</td>
                  <td className="p-2">{name(record.subjects)}</td>
                  <td className="p-2">{record.score}</td>
                  <td className="p-2">{record.grade}</td>
                  <td className="p-2">{records.role !== "teacher" && (
                    <Link className="text-green-700" href={`/reports/students/${studentId}?year=${encodeURIComponent(record.academic_year)}&term=${record.term}${schoolQuery}`}>Report card</Link>
                  )}</td>
                </tr>
              ))}
            </RecordTable>
          )}
        </section>
      )}
      {(view === "all" || view === "fees") && records.fees !== null && (
        <section id="student-fees" className={sectionClass}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-xl font-bold">Fees and balances</h3>
            <Link className="text-green-700" href={`/statements/students/${studentId}${records.role === "super_admin" ? `?school=${encodeURIComponent(records.schoolId)}` : ""}`}>Fee statement</Link>
          </div>
          {!records.fees.length ? <p>No fees recorded for this student.</p> : (
            <RecordTable headings={["Year / Term", "Amount due", "Total paid", "Balance / Credit"]}>
              {records.fees.map((fee) => (
                <tr key={fee.id} className="border-t">
                  <td className="p-2">{fee.academic_year} / {term(fee.term)}</td>
                  <td className="p-2">{money(fee.amount_due)}</td>
                  <td className="p-2">{money(fee.total_paid)}</td>
                  <td className="p-2">{money(fee.balance)}</td>
                </tr>
              ))}
            </RecordTable>
          )}
          <h4 className="mb-3 mt-6 font-bold">Payments</h4>
          {!records.payments?.length ? <p>No payments recorded.</p> : records.payments.map((payment) => (
            <div key={payment.id} className="flex flex-wrap justify-between gap-3 border-t py-3 text-sm">
              <span>{payment.date} · {payment.payment_method.replaceAll("_", " ")}{payment.reference ? ` · ${payment.reference}` : ""}</span>
              <strong>{money(Number(payment.amount))}</strong>
              <Link className="text-green-700" href={`/receipts/${payment.id}${records.role === "super_admin" ? `?school=${encodeURIComponent(records.schoolId)}` : ""}`}>Receipt</Link>
            </div>
          ))}
        </section>
      )}
    </section>
  );
}
