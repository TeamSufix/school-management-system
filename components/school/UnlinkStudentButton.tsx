"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { unlinkStudentFromParent } from "@/actions/parents";

type Props = {
  parentId: string;
  studentId: string;
};

export default function UnlinkStudentButton({ parentId, studentId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleUnlink() {
    const confirmed = window.confirm("Remove this student from this parent?");

    if (!confirmed) return;

    setLoading(true);

    const result = await unlinkStudentFromParent({
      parentId,
      studentId,
    });

    if (!result.success) {
      window.alert(result.error ?? "Unable to remove student.");
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleUnlink}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
        <path
          d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {loading ? "Removing..." : "Remove"}
    </button>
  );
}
