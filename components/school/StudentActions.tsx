"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { toggleStudentStatus } from "@/actions/students";

type Props = {
  id: string;
  status: string;
  schoolId?: string;
};

export default function StudentActions({ id, status, schoolId }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleStatusChange() {
    setLoading(true);
    setError("");

    const nextStatus = status === "active" ? "inactive" : "active";

    const result = await toggleStudentStatus(id, nextStatus, schoolId);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.refresh();
  }

  const viewHref = schoolId
    ? `/platform/schools/${schoolId}/students/${id}`
    : `/school/students/${id}`;

  const editHref = schoolId
    ? `/platform/schools/${schoolId}/students/${id}/edit`
    : `/school/students/${id}/edit`;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Link
          href={viewHref}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path
              d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <circle
              cx="12"
              cy="12"
              r="2.5"
              stroke="currentColor"
              strokeWidth="1.7"
            />
          </svg>
          View
        </Link>

        <Link
          href={editHref}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-700"
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
        </Link>

        <button
          type="button"
          onClick={handleStatusChange}
          disabled={loading}
          className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
            status === "active"
              ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
          } disabled:cursor-not-allowed disabled:opacity-50`}
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
