import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-20">
      <h1 className="text-3xl font-bold text-slate-900">Access denied</h1>
      <p className="mt-4 text-slate-600">Your account does not have permission to access this page. Contact your school administrator if you need access.</p>
      <Link href="/" className="mt-6 inline-block font-semibold text-green-700">Return to your dashboard</Link>
    </main>
  );
}
