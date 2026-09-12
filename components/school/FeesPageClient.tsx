"use client";

import { useEffect, useMemo, useState } from "react";

import {
  createFee,
  createPayment,
  getFees,
  getPayments,
  type FeeTerm,
  type PaymentMethod,
} from "@/actions/fees";

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
};

type Props = {
  students: Student[];
  schoolId: string;
};

type Fee = {
  id: string;
  student_id: string;
  academic_year: string;
  term: FeeTerm;
  amount_due: number;
  total_paid: number;
  balance: number;
  students: Student | null;
  payments: {
    id: string;
    fee_id: string;
    amount: number;
    date: string;
    payment_method: PaymentMethod;
    reference: string | null;
  }[];
};

type Payment = {
  id: string;
  fee_id: string;
  student_id: string;
  amount: number;
  date: string;
  payment_method: PaymentMethod;
  reference: string | null;
  created_at: string;
  student: Student | null;
  fee: {
    id: string;
    academic_year: string;
    term: FeeTerm;
    amount_due: number;
  } | null;
};

const terms: {
  value: FeeTerm;
  label: string;
}[] = [
  {
    value: "term_1",
    label: "Term 1",
  },
  {
    value: "term_2",
    label: "Term 2",
  },
  {
    value: "term_3",
    label: "Term 3",
  },
];

const paymentMethods: {
  value: PaymentMethod;
  label: string;
}[] = [
  {
    value: "cash",
    label: "Cash",
  },
  {
    value: "mobile_money",
    label: "Mobile Money",
  },
  {
    value: "bank",
    label: "Bank",
  },
  {
    value: "card",
    label: "Card",
  },
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10";

const selectClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-500/10";

const cardClass =
  "rounded-3xl border border-slate-200/80 bg-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.28)]";

function getTodayDate() {
  const today = new Date();

  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(today.getDate()).padStart(2, "0")}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatTerm(term: FeeTerm) {
  return terms.find((item) => item.value === term)?.label ?? term;
}

function formatPaymentMethod(method: PaymentMethod) {
  return paymentMethods.find((item) => item.value === method)?.label ?? method;
}

function getInitials(firstName?: string | null, lastName?: string | null) {
  const first = firstName?.trim()?.[0] ?? "";
  const last = lastName?.trim()?.[0] ?? "";

  return `${first}${last}`.toUpperCase() || "?";
}

function getStudentName(student?: Student | null) {
  if (!student) return "Unknown student";

  return `${student.first_name} ${student.last_name}`;
}

function getPaymentStatus(fee: Fee) {
  if (fee.balance <= 0) {
    return {
      label: "Paid",
      className:
        "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/10",
    };
  }

  if (fee.total_paid > 0) {
    return {
      label: "Partial",
      className:
        "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/10",
    };
  }

  return {
    label: "Outstanding",
    className: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10",
  };
}

export default function FeesPageClient({ students, schoolId }: Props) {
  const currentYear = `${new Date().getFullYear()}-${
    new Date().getFullYear() + 1
  }`;

  const [fees, setFees] = useState<Fee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [academicYear, setAcademicYear] = useState(currentYear);
  const [term, setTerm] = useState<FeeTerm>("term_1");

  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showFeeForm, setShowFeeForm] = useState(false);

  const [feeStudentId, setFeeStudentId] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [savingFee, setSavingFee] = useState(false);

  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(getTodayDate);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  async function loadFees() {
    setLoading(true);
    setError("");

    const result = await getFees(academicYear, term, schoolId);

    if (!result.success) {
      setError(result.error ?? "Failed to load fees.");
      setFees([]);
      setLoading(false);
      return;
    }

    setFees((result.fees ?? []) as Fee[]);
    setLoading(false);
  }

  async function loadPayments() {
    setLoadingPayments(true);

    const result = await getPayments(schoolId);

    if (!result.success) {
      setError(result.error ?? "Failed to load payments.");
      setPayments([]);
      setLoadingPayments(false);
      return;
    }

    setPayments((result.payments ?? []) as Payment[]);
    setLoadingPayments(false);
  }

  useEffect(() => {
    loadFees();
  }, [academicYear, term, schoolId]);

  useEffect(() => {
    loadPayments();
  }, [schoolId]);

  const totals = useMemo(
    () =>
      fees.reduce(
        (summary, fee) => {
          summary.due += Number(fee.amount_due);
          summary.paid += Number(fee.total_paid);
          summary.balance += Number(fee.balance);

          return summary;
        },
        {
          due: 0,
          paid: 0,
          balance: 0,
        },
      ),
    [fees],
  );

  const collectionRate = useMemo(() => {
    if (totals.due <= 0) return 0;

    return Math.min(100, Math.round((totals.paid / totals.due) * 100));
  }, [totals.due, totals.paid]);

  async function handleCreateFee() {
    setError("");
    setSuccess("");

    if (!feeStudentId) {
      setError("Select a student.");
      return;
    }

    const amount = Number(feeAmount);

    if (!Number.isFinite(amount) || amount < 0) {
      setError("Enter a valid fee amount.");
      return;
    }

    setSavingFee(true);

    const result = await createFee(
      {
        student_id: feeStudentId,
        academic_year: academicYear,
        term,
        amount_due: amount,
      },
      schoolId,
    );

    if (!result.success) {
      setError(result.error ?? "Failed to create fee.");
      setSavingFee(false);
      return;
    }

    setSuccess("Fee record created successfully.");

    setFeeStudentId("");
    setFeeAmount("");
    setShowFeeForm(false);

    await Promise.all([loadFees(), loadPayments()]);

    setSavingFee(false);
  }

  async function handleCreatePayment() {
    setError("");
    setSuccess("");

    if (!selectedFee) {
      setError("Select a fee first.");
      return;
    }

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    setSavingPayment(true);

    const result = await createPayment(
      {
        fee_id: selectedFee.id,
        student_id: selectedFee.student_id,
        amount,
        date: paymentDate,
        payment_method: paymentMethod,
        reference: paymentReference || null,
      },
      schoolId,
    );

    if (!result.success) {
      setError(result.error ?? "Failed to record payment.");
      setSavingPayment(false);
      return;
    }

    setSuccess("Payment recorded successfully.");

    setSelectedFee(null);
    setPaymentAmount("");
    setPaymentReference("");
    setPaymentDate(getTodayDate());
    setPaymentMethod("cash");

    await Promise.all([loadFees(), loadPayments()]);

    setSavingPayment(false);
  }

  return (
    <div className="space-y-7 pb-10">
      {/* PAGE INTRO */}

      <div className="relative overflow-hidden rounded-3xl bg-[#07130d] px-6 py-7 text-white shadow-[0_24px_70px_-32px_rgba(5,46,22,0.65)] sm:px-8">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-green-400/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5 text-green-300"
              >
                <path
                  d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M4 8h16M8 15h3"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <p className="mb-1 text-sm font-medium text-green-300">Finance</p>

            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Fees & Payments
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Track student fees, record payments, and keep your school&apos;s
              financial records organized.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-400/10 text-green-300">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path
                  d="M4 19V9M10 19V5M16 19v-7M22 19V3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div>
              <p className="text-xs text-slate-400">Collection rate</p>
              <p className="text-sm font-semibold text-white">
                {collectionRate}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={`${cardClass} p-5`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Fee Records
              </p>

              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                {fees.length}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {formatTerm(term)} · {academicYear}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path
                  d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M14 3v5h5M9 13h6M9 17h6"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className={`${cardClass} p-5`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Amount Due
              </p>

              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                {formatCurrency(totals.due)}
              </p>

              <p className="mt-1 text-xs text-slate-500">Total expected</p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path
                  d="M12 3v18M16 7.5c0-1.4-1.6-2.5-4-2.5s-4 1.1-4 2.5 1.6 2.5 4 2.5 4 1.1 4 2.5-1.6 2.5-4 2.5-4 1.1-4 2.5 1.6 2.5 4 2.5 4-1.1 4-2.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className={`${cardClass} p-5`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Total Paid
              </p>

              <p className="mt-3 text-2xl font-bold tracking-tight text-emerald-600">
                {formatCurrency(totals.paid)}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {collectionRate}% collected
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path
                  d="M5 12.5 9.2 17 19 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className={`${cardClass} p-5`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Outstanding
              </p>

              <p className="mt-3 text-2xl font-bold tracking-tight text-red-600">
                {formatCurrency(totals.balance)}
              </p>

              <p className="mt-1 text-xs text-slate-500">Remaining balance</p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path
                  d="M12 3 22 20H2L12 3Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 9v5M12 17h.01"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ALERTS */}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-100">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M12 8v4M12 16h.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.7"
              />
            </svg>
          </div>

          <div>
            <p className="font-semibold">Something went wrong</p>
            <p className="mt-0.5 text-red-600/90">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-700">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="m7 12 3 3 7-7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div>
            <p className="font-semibold">Success</p>
            <p className="mt-0.5 text-emerald-600/90">{success}</p>
          </div>
        </div>
      )}

      {/* FEE RECORDS */}

      <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path
                    d="M6 3h9l3 3v15H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <path
                    d="M14 3v4h4M8 11h8M8 15h8M8 19h4"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  Fee Records
                </h2>

                <p className="mt-0.5 text-sm text-slate-500">
                  Manage student fees for the selected academic period.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={academicYear}
                onChange={(event) => setAcademicYear(event.target.value)}
                placeholder="2026-2027"
                aria-label="Academic year"
                className={`${inputClass} sm:w-36`}
              />

              <select
                value={term}
                onChange={(event) => setTerm(event.target.value as FeeTerm)}
                aria-label="Term"
                className={`${selectClass} sm:w-32`}
              >
                {terms.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowFeeForm((current) => !current)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#15803d] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(21,128,61,0.7)] transition hover:bg-[#166534] active:scale-[0.98]"
              >
                {showFeeForm ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                      <path
                        d="M6 6l12 12M18 6 6 18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    Close
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                      <path
                        d="M12 5v14M5 12h14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    Add Fee
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ADD FEE */}

        {showFeeForm && (
          <div className="border-b border-slate-100 bg-gradient-to-b from-green-50/70 to-white px-5 py-6 sm:px-6">
            <div className="mb-5">
              <p className="text-sm font-semibold text-slate-900">
                Create fee record
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Add the amount a student is expected to pay for this term.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_auto]">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Student
                </label>

                <select
                  value={feeStudentId}
                  onChange={(event) => setFeeStudentId(event.target.value)}
                  className={selectClass}
                >
                  <option value="">Select student</option>

                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.first_name} {student.last_name} —{" "}
                      {student.student_id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Amount due
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    GH₵
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={feeAmount}
                    onChange={(event) => setFeeAmount(event.target.value)}
                    placeholder="0.00"
                    className={`${inputClass} pl-12`}
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleCreateFee}
                  disabled={savingFee}
                  className="w-full rounded-xl bg-[#07130d] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_-16px_rgba(7,19,13,0.8)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
                >
                  {savingFee ? "Saving..." : "Create Fee"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FEE TABLE */}

        {loading ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5 animate-pulse"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="8"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M12 8v4l2.5 2"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <p className="mt-4 text-sm font-medium text-slate-700">
              Loading fee records...
            </p>

            <p className="mt-1 text-xs text-slate-400">Please wait a moment.</p>
          </div>
        ) : fees.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <path
                  d="M6 3h9l3 3v15H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.7" />
              </svg>
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No fee records yet
            </h3>

            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              No fee records were found for this academic year and term.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Term</th>
                  <th className="px-6 py-4">Due</th>
                  <th className="px-6 py-4">Paid</th>
                  <th className="px-6 py-4">Balance</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {fees.map((fee) => {
                  const status = getPaymentStatus(fee);
                  const student = fee.students;

                  return (
                    <tr
                      key={fee.id}
                      className="group transition hover:bg-slate-50/70"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-xs font-bold text-green-700 ring-1 ring-green-100">
                            {getInitials(
                              student?.first_name,
                              student?.last_name,
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {getStudentName(student)}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-500">
                              {student?.student_id ?? "No student ID"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                          {formatTerm(fee.term)}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {formatCurrency(fee.amount_due)}
                      </td>

                      <td className="px-6 py-4 font-semibold text-emerald-600">
                        {formatCurrency(fee.total_paid)}
                      </td>

                      <td className="px-6 py-4 font-semibold text-red-600">
                        {formatCurrency(fee.balance)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          disabled={fee.balance <= 0}
                          onClick={() => setSelectedFee(fee)}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#07130d] px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            className="h-3.5 w-3.5"
                          >
                            <path
                              d="M12 5v14M5 12h14"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                          Payment
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* PAYMENT HISTORY */}

      <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path
                    d="M4 7h16M4 12h16M4 17h10"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  Payment History
                </h2>

                <p className="mt-0.5 text-sm text-slate-500">
                  All payments recorded for this school.
                </p>
              </div>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              {payments.length} {payments.length === 1 ? "payment" : "payments"}
            </div>
          </div>
        </div>

        {loadingPayments ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5 animate-pulse"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="8"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M12 8v4l2.5 2"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <p className="mt-4 text-sm font-medium text-slate-700">
              Loading payment history...
            </p>
          </div>
        ) : payments.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <path
                  d="M4 7h16M4 12h16M4 17h10"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No payments recorded
            </h3>

            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Payment transactions will appear here once they are recorded.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Term</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Reference</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[11px] font-bold text-slate-600">
                          {getInitials(
                            payment.student?.first_name,
                            payment.student?.last_name,
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {getStudentName(payment.student)}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {payment.student?.student_id ?? "No student ID"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-600">{payment.date}</td>

                    <td className="px-6 py-4">
                      {payment.fee ? (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                          {formatTerm(payment.fee.term)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-semibold text-emerald-600">
                        {formatCurrency(payment.amount)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700">
                        {formatPaymentMethod(payment.payment_method)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-slate-500">
                        {payment.reference || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* PAYMENT MODAL */}

      {selectedFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => setSelectedFee(null)}
          />

          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-white shadow-[0_30px_100px_-30px_rgba(0,0,0,0.45)]">
            {/* MODAL HEADER */}

            <div className="relative overflow-hidden bg-[#07130d] px-6 py-6 text-white">
              <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-green-400/10 blur-2xl" />

              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-green-300 ring-1 ring-white/10">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <path
                        d="M12 3v18M16 7.5c0-1.4-1.6-2.5-4-2.5s-4 1.1-4 2.5 1.6 2.5 4 2.5 4 1.1 4 2.5-1.6 2.5-4 2.5-4 1.1-4 2.5 1.6 2.5 4 2.5 4-1.1 4-2.5"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold">Record Payment</h3>

                    <p className="mt-0.5 text-sm text-slate-300">
                      Add a payment to this fee account.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedFee(null)}
                  aria-label="Close"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path
                      d="M6 6l12 12M18 6 6 18"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* STUDENT SUMMARY */}

            <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-sm font-bold text-green-700">
                  {getInitials(
                    selectedFee.students?.first_name,
                    selectedFee.students?.last_name,
                  )}
                </div>

                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {getStudentName(selectedFee.students)}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {selectedFee.students?.student_id} ·{" "}
                    {formatTerm(selectedFee.term)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Fee
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {formatCurrency(selectedFee.amount_due)}
                  </p>
                </div>

                <div className="rounded-2xl border border-red-100 bg-red-50 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-red-500">
                    Remaining
                  </p>

                  <p className="mt-1 text-sm font-bold text-red-700">
                    {formatCurrency(selectedFee.balance)}
                  </p>
                </div>
              </div>
            </div>

            {/* MODAL FORM */}

            <div className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Payment amount
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    GH₵
                  </span>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                    placeholder="0.00"
                    className={`${inputClass} pl-12`}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Payment date
                  </label>

                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(event) => setPaymentDate(event.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Payment method
                  </label>

                  <select
                    value={paymentMethod}
                    onChange={(event) =>
                      setPaymentMethod(event.target.value as PaymentMethod)
                    }
                    className={selectClass}
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reference{" "}
                  <span className="font-normal normal-case text-slate-400">
                    optional
                  </span>
                </label>

                <input
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                  placeholder="Transaction or receipt reference"
                  className={inputClass}
                />
              </div>
            </div>

            {/* MODAL FOOTER */}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSelectedFee(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCreatePayment}
                disabled={savingPayment}
                className="rounded-xl bg-[#15803d] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(21,128,61,0.7)] transition hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingPayment ? "Saving..." : "Record Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
