"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { toggleTeacherStatus, updateTeacher } from "@/actions/teachers";

type TeacherActionsProps = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: string;
  schoolId?: string;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-500/10";

export default function TeacherActions({
  id,
  firstName,
  lastName,
  email,
  phone,
  status,
  schoolId,
}: TeacherActionsProps) {
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

    const result = await updateTeacher(formData);

    if (!result.success) {
      setError(result.error ?? "Failed to update teacher.");
      setLoading(false);
      return;
    }

    setEditing(false);
    setLoading(false);

    router.refresh();
  }

  async function handleStatusChange() {
    setLoading(true);
    setError("");

    const nextStatus = status === "active" ? "inactive" : "active";

    const result = await toggleTeacherStatus(id, nextStatus, schoolId);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.refresh();
  }

  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();

  if (editing) {
    return (
      <div className="w-full max-w-xl">
        <form
          action={handleUpdate}
          className="rounded-2xl border border-green-200 bg-green-50/50 p-4"
        >
          <input type="hidden" name="id" value={id} />

          {schoolId && (
            <input type="hidden" name="school_id" value={schoolId} />
          )}

          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#07130d] text-xs font-bold text-green-300">
              {initials}
            </div>

            <div>
              <p className="text-sm font-bold text-slate-900">Edit teacher</p>
              <p className="text-xs text-slate-500">
                Update staff information.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="first_name"
              defaultValue={firstName}
              required
              placeholder="First name"
              className={inputClass}
            />

            <input
              name="last_name"
              defaultValue={lastName}
              required
              placeholder="Last name"
              className={inputClass}
            />

            <input
              name="email"
              type="email"
              defaultValue={email ?? ""}
              placeholder="Email"
              className={inputClass}
            />

            <input
              name="phone"
              defaultValue={phone ?? ""}
              placeholder="Phone"
              className={inputClass}
            />
          </div>

          {error && (
            <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700">
              {error}
            </div>
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
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
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
      <div className="flex flex-wrap justify-end gap-2">
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
          onClick={handleStatusChange}
          disabled={loading}
          className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
            status === "active"
              ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
          } disabled:opacity-50`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status === "active" ? "bg-red-500" : "bg-green-500"
            }`}
          />

          {loading
            ? "Updating..."
            : status === "active"
              ? "Deactivate"
              : "Activate"}
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
