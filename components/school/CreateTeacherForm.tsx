"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSchoolAccount } from "@/actions/accounts";

type Props = {
  schoolId: string;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-green-500 focus:ring-4 focus:ring-green-500/10";

export default function CreateTeacherForm({ schoolId }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    setSuccess("");

    const result = await createSchoolAccount({
      schoolId,
      role: "teacher",
      firstName: String(formData.get("first_name") ?? ""),
      lastName: String(formData.get("last_name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      password: String(formData.get("password") ?? ""),
    });

    if (!result.success) {
      setError(result.error ?? "Failed to create teacher.");
      setLoading(false);
      return;
    }

    setSuccess("Teacher account created successfully. They can now log in.");

    setLoading(false);

    const form = document.getElementById(
      "create-teacher-form",
    ) as HTMLFormElement | null;

    form?.reset();

    router.refresh();
  }

  return (
    <form
      id="create-teacher-form"
      action={handleSubmit}
      className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.28)]"
    >
      <div className="bg-gradient-to-br from-[#07130d] via-[#0c2517] to-[#15803d] px-6 py-7 text-white sm:px-8">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-300">
              Staff Management
            </p>
            <h2 className="mt-1 text-xl font-bold">Add Teacher</h2>
            <p className="mt-1 text-sm text-white/65">
              Create a teacher account and login credentials.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              First Name
            </label>
            <input
              name="first_name"
              required
              placeholder="John"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Last Name
            </label>
            <input
              name="last_name"
              required
              placeholder="Mensah"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            placeholder="teacher@example.com"
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Phone
          </label>
          <input
            name="phone"
            type="tel"
            placeholder="024 000 0000"
            className={inputClass}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
          <div className="mb-4">
            <p className="text-sm font-bold text-slate-900">
              Login credentials
            </p>
            <p className="mt-1 text-xs text-slate-500">
              The teacher will use these credentials to access the platform.
            </p>
          </div>

          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Login Password
          </label>

          <input
            name="password"
            type="password"
            minLength={8}
            required
            placeholder="At least 8 characters"
            className={inputClass}
          />

          <p className="mt-2 text-xs text-slate-500">
            Give this password to the teacher securely.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <p className="font-semibold">Teacher created</p>
            <p className="mt-1">{success}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#15803d] px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_25px_-12px_rgba(21,128,61,0.7)] transition hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creating Account..." : "Create Teacher"}
        </button>
      </div>
    </form>
  );
}
