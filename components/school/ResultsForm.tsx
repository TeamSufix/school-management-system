"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AmendResultForm from "@/components/school/AmendResultForm";

import {
  getResultStudents,
  getResults,
  getResultsHistory,
  saveResults,
  type ResultRecord,
} from "@/actions/results";

import { calculateGrade } from "@/lib/academics/grades";
import { defaultAcademicPeriod, type AcademicPeriod } from "@/lib/academics/period";

type SchoolClass = {
  id: string;
  name: string;
};

type Subject = {
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

type HistoryRecord = {
  id: string;
  student_id: string;
  class_id: string;
  subject_id: string;
  academic_year: string;
  term: "term_1" | "term_2" | "term_3";
  score: number;
  grade: string;
  created_at: string;
  student: Student | null;
  class: SchoolClass | null;
  subject: Subject | null;
};

type Props = {
  classes: SchoolClass[];
  subjects: Subject[];
  schoolId: string;
  initialPeriod?: AcademicPeriod;
  canManage?: boolean;
};

type Scores = Record<string, string>;

function formatTerm(term: HistoryRecord["term"]) {
  if (term === "term_1") return "Term 1";
  if (term === "term_2") return "Term 2";
  return "Term 3";
}

function initials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}

function gradeClass(grade: string) {
  const value = grade.toUpperCase();

  if (value.startsWith("A")) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (value.startsWith("B")) {
    return "bg-green-50 text-green-700 ring-green-200";
  }

  if (value.startsWith("C")) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (value.startsWith("D") || value.startsWith("E")) {
    return "bg-orange-50 text-orange-700 ring-orange-200";
  }

  return "bg-red-50 text-red-700 ring-red-200";
}

export default function ResultsForm({ classes, subjects, schoolId, initialPeriod = defaultAcademicPeriod(), canManage = false }: Props) {
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [academicYear, setAcademicYear] = useState(initialPeriod.academic_year);

  const [term, setTerm] = useState<"term_1" | "term_2" | "term_3">(initialPeriod.term);

  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<Scores>({});
  const [recordedStudents, setRecordedStudents] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadHistory() {
    setLoadingHistory(true);

    const result = await getResultsHistory(schoolId);

    if (!result.success) {
      setError(result.error ?? "Failed to load result history.");
      setHistory([]);
      setLoadingHistory(false);
      return;
    }

    setHistory((result.results ?? []) as HistoryRecord[]);
    setLoadingHistory(false);
  }

  useEffect(() => {
    let active = true;
    getResultsHistory(schoolId).then((result) => {
      if (!active) return;
      setHistory((result.results ?? []) as HistoryRecord[]);
      if (!result.success) setError(result.error ?? "Failed to load results.");
      setLoadingHistory(false);
    }).catch(() => { if (active) { setError("Failed to load results."); setLoadingHistory(false); } });
    return () => { active = false; };
  }, [schoolId]);

  useEffect(() => {
    if (!classId) return;
    let active = true;
    async function load() {
      try {
        const studentResult = await getResultStudents(classId, schoolId);
        const result = subjectId && academicYear ? await getResults(classId, subjectId, academicYear, term, schoolId) : null;
        if (!active) return;
        if (!studentResult.success || (result && !result.success)) {
          setError(studentResult.error ?? result?.error ?? "Unable to load academic records.");
          setStudents([]);
          setScores({});
        } else {
          setStudents(studentResult.students ?? []);
          const values: Scores = {};
          for (const record of result?.results ?? []) values[record.student_id] = String(record.current_score ?? record.score);
          setScores(values);
          setRecordedStudents(Object.keys(values));
        }
      } catch {
        if (active) { setError("Unable to load academic records."); setStudents([]); setScores({}); }
      } finally {
        if (active) { setLoadingStudents(false); setLoadingResults(false); }
      }
    }
    void load();
    return () => { active = false; };
  }, [classId, subjectId, academicYear, term, schoolId]);

  function resetSelection() {
    setScores({});
    setRecordedStudents([]);
    setSuccess("");
    setError("");
    setLoadingResults(!!classId);
  }

  function updateScore(studentId: string, value: string) {
    if (value === "") {
      setScores((current) => ({
        ...current,
        [studentId]: "",
      }));

      return;
    }

    const numeric = Number(value);

    if (Number.isNaN(numeric) || numeric < 0 || numeric > 100) {
      return;
    }

    setScores((current) => ({
      ...current,
      [studentId]: value,
    }));
  }

  const completedCount = useMemo(
    () =>
      students.filter(
        (student) =>
          scores[student.id] !== undefined && scores[student.id] !== "",
      ).length,
    [students, scores],
  );

  const completion =
    students.length > 0
      ? Math.round((completedCount / students.length) * 100)
      : 0;

  async function handleSave() {
    setError("");
    setSuccess("");

    if (!classId) {
      setError("Please select a class.");
      return;
    }

    if (!subjectId) {
      setError("Please select a subject.");
      return;
    }

    if (!academicYear.trim()) {
      setError("Academic year is required.");
      return;
    }

    const records: ResultRecord[] = students
      .filter(
        (student) =>
          !recordedStudents.includes(student.id) && scores[student.id] !== undefined && scores[student.id] !== "",
      )
      .map((student) => ({
        student_id: student.id,
        class_id: classId,
        subject_id: subjectId,
        academic_year: academicYear.trim(),
        term,
        score: Number(scores[student.id]),
      }));

    if (!records.length) {
      setError("Enter at least one student score.");
      return;
    }

    setSaving(true);

    const result = await saveResults(records, schoolId);

    if (!result.success) {
      setError(result.error ?? "Failed to save results.");
      setSaving(false);
      return;
    }

    setSuccess("Results saved successfully. Use Amend result in the history to correct recorded scores.");
    setRecordedStudents((current) => [...new Set([...current, ...records.map((record) => record.student_id)])]);

    await loadHistory();

    setSaving(false);
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-500/10";

  return (
    <div className="space-y-7">
      {/* HISTORY */}
      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.25)]">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-600">
              Academic Records
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Results History
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              All recorded academic results.
            </p>
          </div>

          <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">
            {history.length} results
          </div>
        </div>

        {loadingHistory ? (
          <div className="px-6 py-14 text-center text-sm text-slate-500">
            Loading results...
          </div>
        ) : history.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <path
                  d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <p className="mt-4 font-semibold text-slate-900">
              No results recorded yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Recorded results will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Class</th>
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">Academic Year</th>
                  <th className="px-6 py-4">Term</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Grade</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {history.map((record) => (
                  <tr
                    key={record.id}
                    className="transition hover:bg-green-50/30"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-xs font-bold text-green-700">
                          {initials(
                            record.student?.first_name,
                            record.student?.last_name,
                          )}
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900">
                            {record.student?.first_name}{" "}
                            {record.student?.last_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {record.student?.student_id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {record.class?.name}
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-700">
                      {record.subject?.name}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {record.academic_year}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {formatTerm(record.term)}
                    </td>

                    <td className="px-6 py-4 font-bold text-slate-900">
                      {record.score}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${gradeClass(
                          record.grade,
                        )}`}
                      >
                        {record.grade}
                      </span>
                      {canManage && <><Link className="mt-2 block text-sm font-semibold text-green-700" href={`/reports/students/${record.student_id}?year=${encodeURIComponent(record.academic_year)}&term=${record.term}${schoolId ? `&school=${encodeURIComponent(schoolId)}` : ""}`}>Report card</Link><AmendResultForm resultId={record.id} schoolId={schoolId} score={record.score} onSaved={loadHistory} /></>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* RECORD RESULTS */}
      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.25)]">
        <div className="bg-gradient-to-br from-[#07130d] via-[#0b2417] to-[#15803d] px-6 py-7 text-white sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-300">
            New Entry
          </p>

          <h2 className="mt-1 text-xl font-bold">Record Results</h2>

          <p className="mt-1 text-sm text-white/65">
            Enter results for a class and subject.
          </p>
        </div>

        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Class
              </label>

              <select
                value={classId}
                onChange={(event) => { resetSelection(); setClassId(event.target.value); setStudents([]); setLoadingStudents(!!event.target.value); setLoadingResults(!!event.target.value); }}
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

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Subject
              </label>

              <select
                value={subjectId}
                onChange={(event) => { resetSelection(); setSubjectId(event.target.value); }}
                className={inputClass}
              >
                <option value="">Select subject</option>

                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Academic Year
              </label>

              <input
                value={academicYear}
                onChange={(event) => { resetSelection(); setAcademicYear(event.target.value); }}
                placeholder="2026/2027"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Term
              </label>

              <select
                value={term}
                onChange={(event) => { resetSelection(); setTerm(event.target.value as "term_1" | "term_2" | "term_3"); }}
                className={inputClass}
              >
                <option value="term_1">Term 1</option>
                <option value="term_2">Term 2</option>
                <option value="term_3">Term 3</option>
              </select>
            </div>
          </div>

          {!classId ? (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
              <p className="font-semibold text-slate-900">Select a class</p>
              <p className="mt-1 text-sm text-slate-500">
                Students will appear here.
              </p>
            </div>
          ) : loadingStudents || loadingResults ? (
            <div className="mt-8 rounded-2xl bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
              Loading students...
            </div>
          ) : students.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
              <p className="font-semibold text-slate-900">No active students</p>
              <p className="mt-1 text-sm text-slate-500">
                There are no active students in this class.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
                <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        Student Scores
                      </p>
                      <p className="text-xs text-slate-500">
                        Enter scores from 0 to 100.
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {completion}%
                      </p>
                      <p className="text-[11px] text-slate-500">completed</p>
                    </div>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-green-600 transition-all"
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Student</th>
                        <th className="px-5 py-3">Student ID</th>
                        <th className="px-5 py-3">Score</th>
                        <th className="px-5 py-3">Grade</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {students.map((student) => {
                        const score = scores[student.id] ?? "";
                        const numeric = score === "" ? null : Number(score);

                        return (
                          <tr
                            key={student.id}
                            className="transition hover:bg-green-50/20"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                                  {initials(
                                    student.first_name,
                                    student.last_name,
                                  )}
                                </div>

                                <span className="font-semibold text-slate-900">
                                  {student.first_name} {student.last_name}
                                </span>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-slate-500">
                              {student.student_id}
                            </td>

                            <td className="px-5 py-4">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={score}
                                disabled={recordedStudents.includes(student.id)}
                                aria-label={`Score for ${student.first_name} ${student.last_name}`}
                                onChange={(event) =>
                                  updateScore(student.id, event.target.value)
                                }
                                className="w-28 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
                              />
                            </td>

                            <td className="px-5 py-4">
                              {numeric === null ? (
                                <span className="text-slate-300">—</span>
                              ) : (
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${gradeClass(
                                    calculateGrade(numeric),
                                  )}`}
                                >
                                  {calculateGrade(numeric)}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {completedCount} / {students.length} students scored
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Results already recorded cannot be overwritten.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-xl bg-[#15803d] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_25px_-12px_rgba(21,128,61,0.7)] transition hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving Results..." : "Save Results"}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
