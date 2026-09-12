"use client";

import { useState } from "react";
import { login } from "@/actions/auth";

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");

    const result = await login(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[430px]">
      {/* Brand */}
      <div className="mb-8 flex justify-center">
        <div className="relative">
          <div className="absolute -inset-3 rounded-[28px] bg-green-500/10 blur-xl" />

          <div className="relative flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#07130d] shadow-2xl shadow-green-900/20">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-8 w-8 text-green-400"
            >
              <path d="M3 10.5 12 5l9 5.5-9 5-9-5Z" />
              <path d="M6 12.5V17c3.5 2.5 8.5 2.5 12 0v-4.5" />
              <path d="M21 10.5V16" />
            </svg>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_30px_80px_-35px_rgba(15,23,42,0.3)]">
        <div className="h-1.5 bg-gradient-to-r from-green-700 via-green-500 to-emerald-300" />

        <div className="p-7 sm:p-10">
          {/* Header */}
          <div className="mb-9 text-center">
            <div className="mb-3 inline-flex items-center rounded-full border border-green-100 bg-green-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-green-700">
              SchoolMS
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Welcome back
            </h1>

            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
              Sign in to manage your school, students, teachers and daily
              operations.
            </p>
          </div>

          <form action={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Email address
              </label>

              <div className="group relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-slate-400 transition-colors group-focus-within:text-green-600">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="h-5 w-5"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3.5 7 8.5 6 8.5-6" />
                  </svg>
                </div>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm text-slate-950 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Password
              </label>

              <div className="group relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-slate-400 transition-colors group-focus-within:text-green-600">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="h-5 w-5"
                  >
                    <rect x="4" y="10" width="16" height="11" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                </div>

                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm text-slate-950 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">
                  !
                </div>

                <p className="text-sm leading-6 text-red-700">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#07130d] px-5 text-sm font-bold text-white shadow-xl shadow-green-900/10 transition-all hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-green-900/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <svg
                    className="h-5 w-5 animate-spin"
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
                  Signing in...
                </>
              ) : (
                <>
                  Sign in to SchoolMS
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  >
                    <path
                      d="M4 10h11M10.5 5.5 15 10l-4.5 4.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Security */}
          <div className="mt-7 flex items-center justify-center gap-2 border-t border-slate-100 pt-6 text-xs text-slate-400">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-4 w-4 text-green-600"
            >
              <path d="M12 3 19 6v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3Z" />
              <path
                d="m9 12 2 2 4-4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Secure school management platform
          </div>
        </div>
      </div>

      <p className="mt-6 px-4 text-center text-xs leading-5 text-slate-400">
        SchoolMS · School Management Made Simple
        <span className="mx-1">·</span>
        TeamSufix.System Consulting & Engineering
      </p>
    </div>
  );
}
