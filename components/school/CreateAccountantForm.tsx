"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSchoolAccount } from "@/actions/accounts";

type Props = {
  schoolId: string;
};

export default function CreateAccountantForm({ schoolId }: Props) {
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
      role: "accountant",
      firstName: String(formData.get("first_name") ?? ""),
      lastName: String(formData.get("last_name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      password: String(formData.get("password") ?? ""),
    });

    if (!result.success) {
      setError(result.error ?? "Failed to create accountant.");
      setLoading(false);
      return;
    }

    setSuccess("Accountant account created successfully. They can now log in.");

    setLoading(false);

    const form = document.getElementById(
      "create-accountant-form",
    ) as HTMLFormElement | null;

    form?.reset();

    router.refresh();
  }

  return (
    <form
      id="create-accountant-form"
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
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v10M8.5 10h7M8.5 14h7" />
            </svg>
          </div>

          <div>
            <h2 className="font-bold text-slate-950">Add accountant</h2>

            <p className="mt-1 text-sm leading-5 text-slate-500">
              Create login credentials for the school accountant.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              First name
            </label>

            <input
              name="first_name"
              required
              placeholder="John"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Last name
            </label>

            <input
              name="last_name"
              required
              placeholder="Mensah"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
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
            placeholder="accountant@example.com"
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
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
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Login password
          </label>

          <input
            name="password"
            type="password"
            minLength={8}
            required
            placeholder="At least 8 characters"
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
          />

          <p className="mt-2 text-xs text-slate-400">
            Give this password to the accountant.
          </p>
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
          className="flex h-12 w-full items-center justify-center rounded-xl bg-[#07130d] px-5 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create accountant"}
        </button>
      </div>
    </form>
  );
}
