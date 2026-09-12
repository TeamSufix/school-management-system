"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleSchoolStatus } from "@/actions/schools";

export default function SchoolStatusButton({
  schoolId,
  status,
}: {
  schoolId: string;
  status: "active" | "inactive";
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    const nextStatus = status === "active" ? "inactive" : "active";

    const confirmed = window.confirm(
      nextStatus === "inactive"
        ? "Deactivate this school?"
        : "Activate this school?",
    );

    if (!confirmed) return;

    setLoading(true);

    const result = await toggleSchoolStatus(schoolId, nextStatus);

    if (result?.error) {
      window.alert(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
        status === "active"
          ? "border-red-100 bg-white text-red-600 hover:border-red-200 hover:bg-red-50"
          : "border-green-100 bg-green-50 text-green-700 hover:bg-green-100"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "active" ? "bg-green-500" : "bg-slate-400"
        }`}
      />

      {loading
        ? "Updating..."
        : status === "active"
          ? "Deactivate"
          : "Activate"}
    </button>
  );
}
