"use client";

import { useActionState, type ReactNode } from "react";

type Result = { error?: string; success?: boolean };

export default function ConfigurationForm({ action, children, label }: {
  action: (form: FormData) => Promise<Result>;
  children: ReactNode;
  label: string;
}) {
  const [state, submit, pending] = useActionState(async (_: Result, form: FormData) => {
    try { return await action(form); }
    catch { return { error: "Unable to complete this request. Please try again." }; }
  }, {});
  return (
    <form action={submit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      {children}
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.success && <p role="status" className="text-sm text-green-700">Saved successfully.</p>}
      <button disabled={pending} className="rounded-lg bg-green-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : label}</button>
    </form>
  );
}
