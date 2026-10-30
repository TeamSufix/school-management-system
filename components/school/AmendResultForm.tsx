"use client";

import { useState, type FormEvent } from "react";
import { amendResult } from "@/actions/results";

export default function AmendResultForm({ resultId, schoolId, score, onSaved }: {
  resultId: string; schoolId: string; score: number; onSaved: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage("");
    try {
      const result = await amendResult({ result_id: resultId, new_score: Number(form.get("score")), reason: String(form.get("reason") ?? "") }, schoolId || undefined);
      if (!result.success) setMessage(result.error ?? "Unable to amend result.");
      else { setMessage("Amendment recorded."); await onSaved(); }
    } catch { setMessage("Unable to amend result. Please try again."); }
    finally { setPending(false); }
  }
  return <details className="mt-2 text-sm"><summary className="cursor-pointer text-green-700">Amend result</summary><form onSubmit={submit} className="mt-2 space-y-2"><label className="block">New score<input name="score" type="number" min="0" max="100" step="0.01" defaultValue={score} required className="block w-full rounded border p-2" /></label><label className="block">Reason<input name="reason" required maxLength={2000} className="block w-full rounded border p-2" /></label><button disabled={pending} className="rounded bg-green-700 px-3 py-2 text-white">{pending ? "Saving…" : "Record amendment"}</button>{message && <p role="status">{message}</p>}</form></details>;
}
