"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSchoolAccount } from "@/actions/accounts";

type Props = {
  schoolId: string;
};

export default function CreateParentForm({ schoolId }: Props) {
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
      role: "parent",
      firstName: String(formData.get("first_name") ?? ""),
      lastName: String(formData.get("last_name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      password: String(formData.get("password") ?? ""),
    });

    if (!result.success) {
      setError(result.error ?? "Failed to create parent.");
      setLoading(false);
      return;
    }

    setSuccess("Parent account created successfully. They can now log in.");

    setLoading(false);

    const form = document.getElementById(
      "create-parent-form",
    ) as HTMLFormElement | null;

    form?.reset();

    router.refresh();
  }

  return (
    <form
      id="create-parent-form"
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
            <h2 className="font-bold text-slate-950">Add parent</h2>

            <p className="mt-1 text-sm leading-5 text-slate-500">
              Create the parent account and login credentials.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <input
            name="first_name"
            placeholder="First name"
            required
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
          />

          <input
            name="last_name"
            placeholder="Last name"
            required
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
          />
        </div>

        <input
          name="email"
          type="email"
          placeholder="parent@example.com"
          required
          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
        />

        <input
          name="phone"
          type="tel"
          placeholder="024 000 0000"
          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
        />

        <div>
          <input
            name="password"
            type="password"
            placeholder="Login password"
            minLength={8}
            required
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
          />

          <p className="mt-2 text-xs text-slate-400">Minimum 8 characters.</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-[#07130d] px-4 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create parent"}
        </button>
      </div>
    </form>
  );
}
