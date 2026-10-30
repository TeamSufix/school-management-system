import Link from "next/link";
import { notFound } from "next/navigation";
import { getFeeStatement } from "@/lib/reports/data";
import PrintButton from "@/components/school/PrintButton";

const money = (value: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(value);

export default async function FeeStatementPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ school?: string }>;
}) {
  const { id } = await params;
  const { school } = await searchParams;
  const statement = await getFeeStatement(id, typeof school === "string" ? school : undefined);
  if (!statement) notFound();
  const studentClass = Array.isArray(statement.student.classes) ? statement.student.classes[0] : statement.student.classes;
  return (
    <main className="mx-auto max-w-4xl space-y-6 bg-white p-8 print:p-0">
      <div className="flex items-center justify-between print:hidden"><Link href="/" className="text-green-700">Dashboard</Link><PrintButton /></div>
      <header className="border-b-2 border-green-700 pb-6 text-center">
        <h1 className="text-3xl font-bold">{statement.school.name}</h1>
        <p>{statement.school.address}</p>
        <p>{statement.school.phone} {statement.school.email}</p>
        <h2 className="mt-4 text-2xl font-semibold">Student Fee Statement</h2>
      </header>
      <section className="grid gap-3 sm:grid-cols-2">
        <p><strong>Student:</strong> {statement.student.first_name} {statement.student.last_name}</p>
        <p><strong>Student ID:</strong> {statement.student.student_id}</p>
        <p><strong>Class:</strong> {studentClass?.name ?? "Not assigned"}</p>
        <p><strong>Generated:</strong> {new Date().toISOString().slice(0, 10)}</p>
      </section>
      {statement.fees.map((fee) => (
        <section key={fee.id} className="rounded-xl border p-5">
          <h3 className="font-semibold">{fee.academic_year} · {fee.term.replace("_", " ")}</h3>
          {!!fee.items.length && (
            <table className="mt-2 w-full text-left text-sm">
              <tbody>
                {fee.items.map((item, index) => <tr key={index} className="border-b last:border-0"><td className="p-1.5">{item.name}</td><td className="p-1.5 text-right">{money(item.amount)}</td></tr>)}
              </tbody>
            </table>
          )}
          <div className="mt-2 grid gap-1 text-sm sm:grid-cols-3">
            <p>Due: <strong>{money(fee.amount_due)}</strong></p>
            <p>Paid: <strong>{money(fee.paid)}</strong></p>
            <p>Balance: <strong>{money(fee.balance)}</strong></p>
          </div>
        </section>
      ))}
      {!statement.fees.length && <p>No fee records for this student.</p>}
      <section>
        <h3 className="mb-2 font-semibold">Payment history</h3>
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b"><th className="p-2">Date</th><th className="p-2">Amount</th><th className="p-2">Method</th><th className="p-2">Reference</th><th className="p-2">Receipt</th></tr></thead>
          <tbody>
            {statement.payments.map((payment) => (
              <tr key={payment.id} className="border-b">
                <td className="p-2">{payment.date}</td>
                <td className="p-2">{money(Number(payment.amount))}</td>
                <td className="p-2 capitalize">{payment.payment_method.replaceAll("_", " ")}</td>
                <td className="p-2">{payment.reference || "—"}</td>
                <td className="p-2 print:hidden"><Link className="text-green-700 underline" href={`/receipts/${payment.id}`}>Receipt</Link></td>
              </tr>
            ))}
            {!statement.payments.length && <tr><td className="p-2" colSpan={5}>No payments recorded.</td></tr>}
          </tbody>
        </table>
      </section>
      <section className="rounded-xl bg-slate-50 p-5">
        <p>Total due: <strong>{money(statement.totals.due)}</strong></p>
        <p>Total paid: <strong>{money(statement.totals.paid)}</strong></p>
        <p>Outstanding balance: <strong>{money(statement.totals.balance)}</strong></p>
      </section>
      <footer className="text-sm text-slate-500">This statement reflects records available when generated. Contact the school for verification.</footer>
    </main>
  );
}
