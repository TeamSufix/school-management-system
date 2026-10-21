"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { deleteSubject, updateSubject } from "@/actions/subjects";

type SubjectActionsProps = {
  id: string;
  name: string;
  code: string | null;
  schoolId?: string;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-500/10";

export default function SubjectActions({
  id,
  name,
  code,
  schoolId,
}: SubjectActionsProps) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpdate(formData: FormData) {
    setLoading(true);
    setError("");

    if (schoolId) {
      formData.set("school_id", schoolId);
    }

    const result = await updateSubject(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setEditing(false);
    setLoading(false);

    router.refresh();
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${name}"?`,
    );

    if (!confirmed) return;

    setLoading(true);
    setError("");

    const result = await deleteSubject(id, schoolId);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
  }

  if (editing) {
    return (
      <div className="w-full max-w-lg">
        <form
          action={handleUpdate}
          className="rounded-2xl border border-green-200 bg-green-50/50 p-4"
        >
          <input type="hidden" name="id" value={id} />

          {schoolId && (
            <input type="hidden" name="school_id" value={schoolId} />
          )}

          <div className="mb-4">
            <p className="text-sm font-bold text-slate-900">Edit subject</p>
            <p className="mt-1 text-xs text-slate-500">
              Update the subject details below.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="name"
              defaultValue={name}
              required
              placeholder="Subject name"
              className={inputClass}
            />

            <input
              name="code"
              defaultValue={code ?? ""}
              placeholder="Code"
              className={`${inputClass} uppercase`}
            />
          </div>

          {error && (
            <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700">
              {error}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#15803d] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#166534] disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError("");
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path
              d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4 12.5-11.5Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Edit
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path
              d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {loading ? "Deleting..." : "Delete"}
        </button>
      </div>

      {error && (
        <p className="max-w-xs text-right text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
