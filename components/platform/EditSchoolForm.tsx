"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSchool } from "@/actions/schools";

type School = {
  id: string;
  name: string;
  code: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  status: string;
};

export default function EditSchoolForm({ school }: { school: School }) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");

    const result = await updateSchool(school.id, formData);

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
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
            </svg>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">School details</h2>

            <p className="mt-1 text-sm text-slate-500">
              Update the information for {school.name}.
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
            defaultValue={school.name}
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
            defaultValue={school.code ?? ""}
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
              defaultValue={school.phone ?? ""}
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
              defaultValue={school.email ?? ""}
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
            defaultValue={school.address ?? ""}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="city"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              City
            </label>

            <input
              id="city"
              name="city"
              type="text"
              defaultValue={school.city ?? ""}
              placeholder="Accra"
              className="h-13 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
            />
          </div>

          <div>
            <label
              htmlFor="country"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Country
            </label>

            <input
              id="country"
              name="country"
              type="text"
              defaultValue={school.country ?? ""}
              placeholder="Ghana"
              className="h-13 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
            />
          </div>
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
            className="h-12 rounded-xl bg-[#07130d] px-6 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving changes..." : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}
