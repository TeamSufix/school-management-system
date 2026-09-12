"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createStudent } from "@/actions/students";

type SchoolClass = {
  id: string;
  name: string;
};

type Props = {
  classes: SchoolClass[];
  schoolId?: string;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-green-500 focus:ring-4 focus:ring-green-500/10";

const labelClass = "mb-2 block text-sm font-semibold text-slate-700";

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function CreateStudentForm({ classes, schoolId }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");

    if (schoolId) {
      formData.set("school_id", schoolId);
    }

    const result = await createStudent(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const form = document.getElementById(
      "create-student-form",
    ) as HTMLFormElement | null;

    form?.reset();

    setLoading(false);
    router.refresh();
  }

  return (
    <form
      id="create-student-form"
      action={handleSubmit}
      className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.28)]"
    >
      <div className="border-b border-slate-100 bg-gradient-to-br from-[#07130d] via-[#0b2417] to-[#15803d] px-6 py-6 text-white sm:px-8">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <UserIcon />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-300">
              Student Management
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">
              Add Student
            </h2>
            <p className="mt-1 text-sm text-white/65">
              Create a new student profile for this school.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-7 p-6 sm:p-8">
        {schoolId && <input type="hidden" name="school_id" value={schoolId} />}

        <div>
          <div className="mb-4">
            <p className="text-sm font-bold text-slate-900">
              Basic information
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Enter the student&apos;s identification details.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="first_name" className={labelClass}>
                First Name
              </label>
              <input
                id="first_name"
                name="first_name"
                required
                placeholder="John"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="last_name" className={labelClass}>
                Last Name
              </label>
              <input
                id="last_name"
                name="last_name"
                required
                placeholder="Mensah"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="student_id" className={labelClass}>
            Student ID
          </label>
          <input
            id="student_id"
            name="student_id"
            required
            placeholder="GA-2026-001"
            className={inputClass}
          />
        </div>

        <div>
          <div className="mb-4">
            <p className="text-sm font-bold text-slate-900">Personal details</p>
            <p className="mt-1 text-xs text-slate-500">
              Optional demographic and contact information.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="gender" className={labelClass}>
                Gender
              </label>
              <select id="gender" name="gender" className={inputClass}>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div>
              <label htmlFor="date_of_birth" className={labelClass}>
                Date of Birth
              </label>
              <input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="class_id" className={labelClass}>
            Class
          </label>

          <select id="class_id" name="class_id" required className={inputClass}>
            <option value="">Select class</option>

            {classes.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>
                {schoolClass.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="phone" className={labelClass}>
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="024 000 0000"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="address" className={labelClass}>
              Address
            </label>
            <textarea
              id="address"
              name="address"
              rows={3}
              placeholder="Student address"
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        {classes.length === 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <span className="mt-0.5 font-bold">!</span>
            <div>
              <p className="font-semibold">No classes available</p>
              <p className="mt-0.5 text-amber-700">
                Create a class before adding students.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span className="font-bold">!</span>
            <p>{error}</p>
          </div>
        )}

        <div className="flex items-center justify-end border-t border-slate-100 pt-6">
          <button
            type="submit"
            disabled={loading || classes.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#15803d] px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_25px_-12px_rgba(21,128,61,0.7)] transition hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {loading ? "Adding Student..." : "Add Student"}
          </button>
        </div>
      </div>
    </form>
  );
}
