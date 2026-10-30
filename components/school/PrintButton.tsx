"use client";

export default function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="rounded-xl bg-green-700 px-4 py-2 font-semibold text-white print:hidden">Print / Save PDF</button>;
}
