"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSchoolAdmin } from "@/actions/schools";

export default function CreateSchoolAdminForm({
  schoolId,
}: {
  schoolId: string;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");

    const result = await createSchoolAdmin(schoolId, formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <form
      action={handleSubmit}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_45px_-25px_rgba(15,23,42,0.25)]"
    >
      <div className="border-b border-slate-100 bg-gradient-to-br from-green-50 to-white px-6 py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-5 w-5"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M19 8v6M22 11h-6" />
            </svg>
          </div>

          <div>
            <h2 className="font-bold text-slate-950">School administrator</h2>

            <p className="mt-1 text-sm leading-5 text-slate-500">
              Create the primary account responsible for this school.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="first_name"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              First name
            </label>

            <input
              id="first_name"
              name="first_name"
              required
              type="text"
              placeholder="John"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
            />
          </div>

          <div>
            <label
              htmlFor="last_name"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Last name
            </label>

            <input
              id="last_name"
              name="last_name"
              required
              type="text"
              placeholder="Mensah"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Email address
          </label>

          <input
            id="email"
            name="email"
            required
            type="email"
            placeholder="admin@graceacademy.com"
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Temporary password
          </label>

          <input
            id="password"
            name="password"
            required
            minLength={8}
            type="password"
            placeholder="Minimum 8 characters"
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
          />

          <p className="mt-2 text-xs leading-5 text-slate-400">
            The administrator can change this password after signing in.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#07130d] px-5 text-sm font-bold text-white shadow-lg transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="opacity-30"
                />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              Creating account...
            </>
          ) : (
            "Create school administrator"
          )}
        </button>
      </div>
    </form>
  );
}
