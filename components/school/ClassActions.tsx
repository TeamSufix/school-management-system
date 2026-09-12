"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { deleteClass, updateClass } from "@/actions/classes";

type ClassActionsProps = {
  id: string;
  name: string;
  level: string | null;
  schoolId?: string;
};

export default function ClassActions({
  id,
  name,
  level,
  schoolId,
}: ClassActionsProps) {
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

    const result = await updateClass(formData);

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

    const result = await deleteClass(id, schoolId);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);

    router.refresh();
  }

  if (editing) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-green-100 bg-green-50/50 p-4">
        <div className="mb-4">
          <p className="text-sm font-bold text-slate-900">Edit class</p>
          <p className="mt-1 text-xs text-slate-500">
            Update the class information below.
          </p>
        </div>

        <form action={handleUpdate} className="space-y-3">
          <input type="hidden" name="id" value={id} />

          {schoolId && (
            <input type="hidden" name="school_id" value={schoolId} />
          )}

          <input
            name="name"
            defaultValue={name}
            required
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
          />

          <input
            name="level"
            defaultValue={level ?? ""}
            placeholder="Level"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
          />

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#07130d] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save changes"}
            </button>

            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError("");
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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
          onClick={() => {
            setEditing(true);
            setError("");
          }}
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-green-200 hover:bg-green-50 hover:text-green-700"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="inline-flex h-9 items-center rounded-lg border border-red-100 bg-white px-3 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
        >
          {loading ? "Deleting..." : "Delete"}
        </button>
      </div>

      {error && (
        <p className="max-w-[220px] text-right text-xs leading-5 text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
