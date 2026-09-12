"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSubject } from "@/actions/subjects";

type Props = {
  schoolId?: string;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-green-500 focus:ring-4 focus:ring-green-500/10";

export default function CreateSubjectForm({ schoolId }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");

    if (schoolId) {
      formData.set("school_id", schoolId);
    }

    const result = await createSubject(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);

    const form = document.getElementById(
      "create-subject-form",
    ) as HTMLFormElement | null;

    form?.reset();

    router.refresh();
  }

  return (
    <form
      id="create-subject-form"
      action={handleSubmit}
      className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.28)]"
    >
      <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-700">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
              Academics
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Create Subject
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Add a subject to this school.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6 sm:p-8">
        {schoolId && <input type="hidden" name="school_id" value={schoolId} />}

        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Subject Name
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="Mathematics"
            className={inputClass}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="code"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Subject Code
            </label>
            <span className="text-xs text-slate-400">Optional</span>
          </div>

          <input
            id="code"
            name="code"
            placeholder="MATH"
            className={`${inputClass} uppercase`}
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#15803d] px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_25px_-12px_rgba(21,128,61,0.7)] transition hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creating Subject..." : "Create Subject"}
        </button>
      </div>
    </form>
  );
}
