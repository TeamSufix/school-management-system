"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { linkStudentToParent } from "@/actions/parents";

type Student = {
  id: string;
  first_name: string;
  last_name: string;
};

type Props = {
  parentId: string;
  students: Student[];
};

export default function LinkStudentToParentForm({ parentId, students }: Props) {
  const router = useRouter();

  const [studentId, setStudentId] = useState("");
  const [relationship, setRelationship] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    if (!studentId) {
      setError("Please select a student.");
      setLoading(false);
      return;
    }

    const result = await linkStudentToParent({
      parentId,
      studentId,
      relationship,
    });

    if (!result.success) {
      setError(result.error ?? "Unable to link student.");
      setLoading(false);
      return;
    }

    setSuccess("Student linked successfully.");
    setStudentId("");
    setRelationship("");
    setLoading(false);

    router.refresh();
  }

  if (students.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-medium text-slate-700">
          No students available
        </p>
        <p className="mt-1 text-xs text-slate-500">
          There are currently no students available in this school.
        </p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-500/10";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.25)] sm:p-6"
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-700">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path
              d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div>
          <h3 className="font-bold text-slate-900">Link Student</h3>
          <p className="text-xs text-slate-500">
            Connect a student to this parent.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Student
          </label>

          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className={inputClass}
          >
            <option value="">Select student</option>

            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.first_name} {student.last_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Relationship
          </label>

          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className={inputClass}
          >
            <option value="">Relationship</option>
            <option value="Father">Father</option>
            <option value="Mother">Mother</option>
            <option value="Guardian">Guardian</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#15803d] px-4 py-3 text-sm font-bold text-white shadow-[0_10px_22px_-12px_rgba(21,128,61,0.7)] transition hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Linking..." : "Link Student"}
        </button>
      </div>
    </form>
  );
}
