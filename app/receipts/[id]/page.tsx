import Link from "next/link";
import { notFound } from "next/navigation";
import { getPaymentReceipt } from "@/lib/reports/data";
import PrintButton from "@/components/school/PrintButton";

export default async function PaymentReceiptPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ school?: string }>;
}) {
  const { id } = await params;
  const { school } = await searchParams;
  const receipt = await getPaymentReceipt(id, typeof school === "string" ? school : undefined);
  if (!receipt) notFound();
  const amount = new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(Number(receipt.payment.amount));
  return (
    <main className="mx-auto max-w-3xl space-y-6 bg-white p-8 print:p-0">
      <div className="flex items-center justify-between print:hidden"><Link href="/" className="text-green-700">Dashboard</Link><PrintButton /></div>
      <header className="border-b-2 border-green-700 pb-6"><h1 className="text-3xl font-bold">{receipt.school.name}</h1><p>{receipt.school.address}</p><p>{receipt.school.phone} {receipt.school.email}</p><h2 className="mt-4 text-2xl font-semibold">Payment Receipt</h2></header>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div><dt className="text-sm text-slate-500">Receipt ID</dt><dd className="break-all font-mono text-sm">{receipt.payment.id}</dd></div>
        <div><dt className="text-sm text-slate-500">Payment date</dt><dd>{receipt.payment.date}</dd></div>
        <div><dt className="text-sm text-slate-500">Student</dt><dd>{receipt.student.first_name} {receipt.student.last_name}</dd></div>
        <div><dt className="text-sm text-slate-500">Student ID</dt><dd>{receipt.student.student_id}</dd></div>
        <div><dt className="text-sm text-slate-500">Academic period</dt><dd>{receipt.fee.academic_year} · {receipt.fee.term.replace("term_", "Term ")}</dd></div>
        <div><dt className="text-sm text-slate-500">Method</dt><dd className="capitalize">{receipt.payment.payment_method.replaceAll("_", " ")}</dd></div>
        <div><dt className="text-sm text-slate-500">Reference</dt><dd>{receipt.payment.reference || "Not provided"}</dd></div>
      </dl>
      <p className="rounded-xl bg-green-50 p-6 text-3xl font-bold text-green-800">Amount received: {amount}</p>
      <footer className="text-sm text-slate-500">This receipt acknowledges this recorded payment only. Contact the school with the receipt ID for verification.</footer>
    </main>
  );
}
