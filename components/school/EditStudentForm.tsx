"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { updateStudent } from "@/actions/students";

type SchoolClass = {
  id: string;
  name: string;
};

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
  gender: string | null;
  date_of_birth: string | null;
  class_id: string;
  phone: string | null;
  address: string | null;
};

type Props = {
  student: Student;
  classes: SchoolClass[];
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-green-500 focus:ring-4 focus:ring-green-500/10";

export default function EditStudentForm({ student, classes }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");

    const result = await updateStudent(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/school/students/${student.id}`);
    router.refresh();
  }

  const initials =
    `${student.first_name[0] ?? ""}${student.last_name[0] ?? ""}`.toUpperCase();

  return (
    <form
      action={handleSubmit}
      className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.28)]"
    >
      <input type="hidden" name="id" value={student.id} />

      <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-6 sm:px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#07130d] text-sm font-bold text-green-300 shadow-sm">
            {initials}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
              Student Profile
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Edit Student
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Update {student.first_name}&apos;s information.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-7 p-6 sm:p-8">
        <div>
          <p className="mb-4 text-sm font-bold text-slate-900">
            Basic information
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="first_name"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                First Name
              </label>
              <input
                id="first_name"
                name="first_name"
                required
                defaultValue={student.first_name}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="last_name"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Last Name
              </label>
              <input
                id="last_name"
                name="last_name"
                required
                defaultValue={student.last_name}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="student_id"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Student ID
          </label>
          <input
            id="student_id"
            name="student_id"
            required
            defaultValue={student.student_id}
            className={inputClass}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="gender"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              defaultValue={student.gender ?? ""}
              className={inputClass}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="date_of_birth"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Date of Birth
            </label>
            <input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              defaultValue={student.date_of_birth ?? ""}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="class_id"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Class
          </label>

          <select
            id="class_id"
            name="class_id"
            required
            defaultValue={student.class_id}
            className={inputClass}
          >
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
              defaultValue={student.phone ?? ""}
              className={inputClass}
            />
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
              defaultValue={student.address ?? ""}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end border-t border-slate-100 pt-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#15803d] px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_25px_-12px_rgba(21,128,61,0.7)] transition hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {loading ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </div>
    </form>
  );
}