"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getAttendance,
  getAttendanceHistory,
  getAttendanceStudents,
  saveAttendance,
  type AttendanceStatus,
} from "@/actions/attendance";

type SchoolClass = {
  id: string;
  name: string;
};

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
  class_id: string;
  status: string;
};

type AttendanceHistory = {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: AttendanceStatus;
  remarks: string | null;
  created_at: string;
  student: {
    id: string;
    first_name: string;
    last_name: string;
    student_id: string;
  } | null;
  class: {
    id: string;
    name: string;
  } | null;
};

type Props = {
  classes: SchoolClass[];
  schoolId: string;
};

function getTodayDate() {
  const today = new Date();

  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(today.getDate()).padStart(2, "0")}`;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(status: AttendanceStatus) {
  if (status === "present") return "Present";
  if (status === "absent") return "Absent";
  return "Late";
}

export default function AttendanceForm({ classes, schoolId }: Props) {
  const [classId, setClassId] = useState("");

  const [students, setStudents] = useState<Student[]>([]);

  const [attendance, setAttendance] = useState<
    Record<string, AttendanceStatus>
  >({});

  const [history, setHistory] = useState<AttendanceHistory[]>([]);

  const [loadingHistory, setLoadingHistory] = useState(true);

  const [loadingStudents, setLoadingStudents] = useState(false);

  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const date = getTodayDate();

  async function loadHistory() {
    setLoadingHistory(true);

    const result = await getAttendanceHistory(schoolId);

    if (!result.success) {
      setError(result.error ?? "Failed to load attendance history.");
      setHistory([]);
      setLoadingHistory(false);
      return;
    }

    setHistory((result.attendance ?? []) as AttendanceHistory[]);

    setLoadingHistory(false);
  }

  useEffect(() => {
    loadHistory();
  }, [schoolId]);

  useEffect(() => {
    if (!classId) {
      setStudents([]);
      setAttendance({});
      return;
    }

    async function loadStudents() {
      setLoadingStudents(true);
      setError("");

      const result = await getAttendanceStudents(classId, schoolId);

      if (!result.success) {
        setError(result.error ?? "Failed to load students.");
        setStudents([]);
        setAttendance({});
        setLoadingStudents(false);
        return;
      }

      const loadedStudents = result.students ?? [];

      setStudents(loadedStudents);

      const initial: Record<string, AttendanceStatus> = {};

      loadedStudents.forEach((student) => {
        initial[student.id] = "present";
      });

      setAttendance(initial);
      setLoadingStudents(false);
    }

    loadStudents();
  }, [classId, schoolId]);

  useEffect(() => {
    if (!classId || !students.length) {
      return;
    }

    async function loadExisting() {
      setLoadingAttendance(true);

      const result = await getAttendance(classId, date, schoolId);

      if (result.success) {
        const existing = result.attendance ?? [];

        if (existing.length) {
          setAttendance((current) => {
            const next = { ...current };

            existing.forEach((record) => {
              next[record.student_id] = record.status as AttendanceStatus;
            });

            return next;
          });
        }
      }

      setLoadingAttendance(false);
    }

    loadExisting();
  }, [classId, schoolId, students.length]);

  const todayHistory = useMemo(
    () => history.filter((record) => record.date === date),
    [history, date],
  );

  async function handleSave() {
    setError("");
    setSuccess("");

    if (!classId) {
      setError("Please select a class.");
      return;
    }

    if (!students.length) {
      setError("There are no active students in this class.");
      return;
    }

    const records = students.map((student) => ({
      student_id: student.id,
      class_id: classId,
      date,
      status: attendance[student.id] ?? "present",
    }));

    setSaving(true);

    const result = await saveAttendance(records, schoolId);

    if (!result.success) {
      setError(result.error ?? "Failed to save attendance.");
      setSaving(false);
      return;
    }

    setSuccess("Attendance recorded successfully.");

    await loadHistory();

    setSaving(false);
  }

  return (
    <div className="space-y-8">
      {/* =====================================================
          HISTORY
      ===================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Attendance History
              </h2>

              <p className="text-sm text-slate-500">
                All recorded attendance for this school.
              </p>
            </div>

            <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
              {history.length} records
            </div>
          </div>
        </div>

        {loadingHistory ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            Loading attendance history...
          </div>
        ) : history.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="font-medium text-slate-900">
              No attendance recorded yet.
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Use the form below to record today's attendance.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3">Student</th>

                  <th className="px-6 py-3">Student ID</th>

                  <th className="px-6 py-3">Class</th>

                  <th className="px-6 py-3">Date</th>

                  <th className="px-6 py-3">Status</th>

                  <th className="px-6 py-3">Remarks</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {record.student
                        ? `${record.student.first_name} ${record.student.last_name}`
                        : "Unknown student"}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {record.student?.student_id ?? "—"}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {record.class?.name ?? "—"}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(record.date)}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          record.status === "present"
                            ? "bg-green-100 text-green-700"
                            : record.status === "late"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {statusLabel(record.status)}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-500">
                      {record.remarks || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =====================================================
          ADD ATTENDANCE
      ===================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Record Today's Attendance
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Attendance can only be recorded for today.
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Class
              </label>

              <select
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              >
                <option value="">Select class</option>

                {classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Date
              </label>

              <input
                type="date"
                value={date}
                readOnly
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-600"
              />
            </div>
          </div>

          {!classId ? (
            <div className="mt-8 rounded-xl bg-slate-50 px-6 py-10 text-center">
              <p className="font-medium text-slate-900">Select a class</p>

              <p className="mt-1 text-sm text-slate-500">
                Students will appear here.
              </p>
            </div>
          ) : loadingStudents || loadingAttendance ? (
            <div className="mt-8 py-10 text-center text-sm text-slate-500">
              Loading students...
            </div>
          ) : students.length === 0 ? (
            <div className="mt-8 rounded-xl bg-slate-50 px-6 py-10 text-center">
              <p className="font-medium text-slate-900">No active students</p>

              <p className="mt-1 text-sm text-slate-500">
                This class has no active students.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Student</th>

                      <th className="px-5 py-3">Student ID</th>

                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {students.map((student) => (
                      <tr key={student.id}>
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {student.first_name} {student.last_name}
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {student.student_id}
                        </td>

                        <td className="px-5 py-4">
                          <select
                            value={attendance[student.id] ?? "present"}
                            onChange={(event) =>
                              setAttendance((current) => ({
                                ...current,
                                [student.id]: event.target
                                  .value as AttendanceStatus,
                              }))
                            }
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                          >
                            <option value="present">Present</option>

                            <option value="absent">Absent</option>

                            <option value="late">Late</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {students.length}{" "}
                    {students.length === 1 ? "student" : "students"}
                  </p>

                  <p className="text-xs text-slate-500">
                    {todayHistory.length > 0
                      ? "Attendance has already been recorded for some students today."
                      : "Ready to record today's attendance."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || todayHistory.length > 0}
                  className="rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : todayHistory.length > 0
                      ? "Attendance Already Recorded"
                      : "Save Attendance"}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}