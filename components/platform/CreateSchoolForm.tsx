"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSchool } from "@/actions/schools";

export default function CreateSchoolForm() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");

    const result = await createSchool(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/platform/schools");
    router.refresh();
  }

  return (
    <form
      action={handleSubmit}
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]"
    >
      <div className="border-b border-slate-100 bg-gradient-to-br from-green-50 via-white to-white px-7 py-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-6 w-6"
            >
              <path d="M3 21h18" />
              <path d="M5 21V7l7-4 7 4v14" />
              <path d="M9 21v-4h6v4" />
              <path d="M9 10h.01M15 10h.01M9 13h.01M15 13h.01" />
            </svg>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">
              School information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add the basic details for the new school.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-7">
        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            School name
          </label>

          <input
            id="name"
            name="name"
            type="text"
            placeholder="Grace Academy"
            required
            className="h-13 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
          />
        </div>

        <div>
          <label
            htmlFor="code"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            School code
          </label>

          <input
            id="code"
            name="code"
            type="text"
            placeholder="GRA-001"
            className="h-13 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm uppercase text-slate-950 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Phone
            </label>

            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="024 000 0000"
              className="h-13 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="info@school.com"
              className="h-13 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="address"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Address
          </label>

          <textarea
            id="address"
            name="address"
            rows={3}
            placeholder="School address"
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="h-12 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#07130d] px-6 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating school..." : "Create school"}
          </button>
        </div>
      </div>
    </form>
  );
}
