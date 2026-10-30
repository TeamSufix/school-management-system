"use server";

import { revalidatePath } from "next/cache";

import { getManagementContext } from "@/lib/auth/get-management-context";
import { validateAcademicPeriod } from "@/lib/academics/period";
import { isValidMoney, moneyToCents } from "@/lib/academics/money";

export type FeeTerm = "term_1" | "term_2" | "term_3";

export type PaymentMethod = "cash" | "mobile_money" | "bank" | "card";

export type FeeRecord = {
  student_id: string;
  academic_year: string;
  term: FeeTerm;
  amount_due: number;
};

export type PaymentRecord = {
  fee_id: string;
  student_id: string;
  amount: number;
  date: string;
  payment_method: PaymentMethod;
  reference?: string | null;
};

export type FeeStudent = {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
};

export type FeePayment = {
  id: string;
  fee_id: string;
  student_id: string;
  amount: number;
  date: string;
  payment_method: PaymentMethod;
  reference: string | null;
  created_at: string;
  student: FeeStudent | null;
  fee: {
    id: string;
    academic_year: string;
    term: FeeTerm;
    amount_due: number;
  } | null;
};

export type Fee = {
  id: string;
  student_id: string;
  academic_year: string;
  term: FeeTerm;
  amount_due: number;
  total_paid: number;
  balance: number;
  students: FeeStudent | null;
  payments: FeePayment[];
  created_at: string;
};

type ActionResult = {
  success: boolean;
  error?: string;
  fee?: Record<string, unknown> | null;
  payment?: Record<string, unknown> | null;
};

function canViewFinance(role: string) {
  return (
    role === "super_admin" || role === "school_admin" || role === "accountant"
  );
}

function canManageFinance(role: string) {
  return (
    role === "super_admin" || role === "school_admin" || role === "accountant"
  );
}

/* GET ACTIVE STUDENTS */

export async function getFeeStudents(schoolId?: string) {
  try {
    const context = await getManagementContext(schoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to access students.",
      };
    }

    if (!canViewFinance(context.role)) {
      return {
        success: false,
        error: "You are not authorized to access fee records.",
      };
    }

    const { data, error } = await context.client
      .from("students")
      .select(
        `
        id,
        first_name,
        last_name,
        student_id,
        class_id,
        status
      `,
      )
      .eq("school_id", context.schoolId)
      .eq("status", "active")
      .order("first_name", {
        ascending: true,
      })
      .order("last_name", {
        ascending: true,
      });

    if (error) {
      console.error("Get fee students error:", error);

      return {
        success: false,
        error: error.message || "Failed to load students.",
      };
    }

    return {
      success: true,
      students: data ?? [],
    };
  } catch (error) {
    console.error("Get fee students exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred.",
    };
  }
}

/* GET FEES */

export async function getFees(
  academicYear?: string,
  term?: FeeTerm,
  schoolId?: string,
) {
  try {
    const context = await getManagementContext(schoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to access fees.",
      };
    }

    if (!canViewFinance(context.role)) {
      return {
        success: false,
        error: "You are not authorized to access fees.",
      };
    }

    let query = context.client
      .from("fees")
      .select(
        `
        id,
        student_id,
        academic_year,
        term,
        amount_due,
        created_at,
        students (
          id,
          first_name,
          last_name,
          student_id
        )
      `,
      )
      .eq("school_id", context.schoolId)
      .order("created_at", {
        ascending: false,
      });

    if (academicYear) {
      query = query.in("academic_year", [...new Set([academicYear, academicYear.replace("-", "/"), academicYear.replace("/", "-")])]);
    }

    if (term) {
      query = query.eq("term", term);
    }

    const { data: fees, error } = await query;

    if (error) {
      console.error("Get fees error:", error);

      return {
        success: false,
        error: error.message || "Failed to load fees.",
      };
    }

    const feeIds = (fees ?? []).map((fee) => fee.id);

    let payments: FeePayment[] = [];

    if (feeIds.length) {
      const { data, error: paymentError } = await context.client
        .from("payments")
        .select(
          `
          id,
          fee_id,
          student_id,
          amount,
          date,
          payment_method,
          reference,
          created_at
        `,
        )
        .eq("school_id", context.schoolId)
        .in("fee_id", feeIds)
        .order("date", {
          ascending: false,
        })
        .order("created_at", {
          ascending: false,
        });

      if (paymentError) {
        console.error("Get fee payments error:", paymentError);

        return {
          success: false,
          error: paymentError.message || "Failed to load fee payments.",
        };
      }

      payments = (data ?? []).map((payment) => ({
        ...payment,
        student: null,
        fee: null,
      })) as FeePayment[];
    }

    const result = (fees ?? []).map((fee) => {
      const feePayments = payments.filter(
        (payment) => payment.fee_id === fee.id,
      );

      const amountDue = Number(fee.amount_due);

      const paidCents = feePayments.reduce(
        (total, payment) => total + moneyToCents(Number(payment.amount)),
        0,
      );
      const totalPaid = paidCents / 100;
      const balance = (moneyToCents(amountDue) - paidCents) / 100;

      const student = Array.isArray(fee.students)
        ? (fee.students[0] ?? null)
        : (fee.students ?? null);

      return {
        id: fee.id,
        student_id: fee.student_id,
        academic_year: fee.academic_year,
        term: fee.term as FeeTerm,
        amount_due: amountDue,
        total_paid: totalPaid,
        balance,
        students: student,
        payments: feePayments,
        created_at: fee.created_at,
      };
    });

    return {
      success: true,
      fees: result,
    };
  } catch (error) {
    console.error("Get fees exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred.",
    };
  }
}

/* GET ALL PAYMENTS */

export async function getPayments(schoolId?: string) {
  try {
    const context = await getManagementContext(schoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to access payments.",
      };
    }

    if (!canViewFinance(context.role)) {
      return {
        success: false,
        error: "You are not authorized to access payments.",
      };
    }

    const { data: payments, error } = await context.client
      .from("payments")
      .select(
        `
        id,
        fee_id,
        student_id,
        amount,
        date,
        payment_method,
        reference,
        created_at
      `,
      )
      .eq("school_id", context.schoolId)
      .order("date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Get all payments error:", error);

      return {
        success: false,
        error: error.message || "Failed to load payment history.",
      };
    }

    const records = payments ?? [];

    if (!records.length) {
      return {
        success: true,
        payments: [],
      };
    }

    const studentIds = [
      ...new Set(records.map((payment) => payment.student_id)),
    ];

    const feeIds = [...new Set(records.map((payment) => payment.fee_id))];

    const [{ data: students }, { data: fees }] = await Promise.all([
      context.client
        .from("students")
        .select(
          `
          id,
          first_name,
          last_name,
          student_id
        `,
        )
        .eq("school_id", context.schoolId)
        .in("id", studentIds),

      context.client
        .from("fees")
        .select(
          `
          id,
          academic_year,
          term,
          amount_due
        `,
        )
        .eq("school_id", context.schoolId)
        .in("id", feeIds),
    ]);

    const studentMap = new Map(
      (students ?? []).map((student) => [student.id, student]),
    );

    const feeMap = new Map((fees ?? []).map((fee) => [fee.id, fee]));

    return {
      success: true,
      payments: records.map((payment) => ({
        ...payment,
        amount: Number(payment.amount),
        student: studentMap.get(payment.student_id) ?? null,
        fee: feeMap.get(payment.fee_id) ?? null,
      })),
    };
  } catch (error) {
    console.error("Get all payments exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred.",
    };
  }
}

/* CREATE FEE */

export async function createFee(
  record: FeeRecord,
  schoolId?: string,
): Promise<ActionResult> {
  try {
    const context = await getManagementContext(schoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to create fees.",
      };
    }

    if (!canManageFinance(context.role)) {
      return {
        success: false,
        error: "You are not authorized to create fees.",
      };
    }

    if (!record.student_id) {
      return {
        success: false,
        error: "Student is required.",
      };
    }

    if (!record.academic_year?.trim()) {
      return {
        success: false,
        error: "Academic year is required.",
      };
    }

    if (!["term_1", "term_2", "term_3"].includes(record.term)) {
      return {
        success: false,
        error: "Invalid term.",
      };
    }

    const amountDue = Number(record.amount_due);

    const periodError = validateAcademicPeriod(record.academic_year.trim(), record.term);
    if (periodError) return { success: false, error: periodError };

    if (!isValidMoney(amountDue)) {
      return {
        success: false,
        error: "Amount due must be a valid amount.",
      };
    }

    const { data: student, error: studentError } = await context.client
      .from("students")
      .select("id")
      .eq("id", record.student_id)
      .eq("school_id", context.schoolId)
      .maybeSingle();

    if (studentError || !student) {
      return {
        success: false,
        error: "The selected student does not belong to this school.",
      };
    }

    const { data: fee, error } = await context.client
      .from("fees")
      .insert({
        school_id: context.schoolId,
        student_id: record.student_id,
        academic_year: record.academic_year.trim(),
        term: record.term,
        amount_due: amountDue,
      })
      .select()
      .single();

    if (error) {
      console.error("Create fee error:", error);

      if (error.code === "23505") {
        return {
          success: false,
          error:
            "A fee record already exists for this student, academic year and term.",
        };
      }

      if (error.code === "42501") {
        return {
          success: false,
          error: "You do not have permission to create fees.",
        };
      }

      return {
        success: false,
        error: error.message || "Failed to create fee record.",
      };
    }

    revalidatePath("/school/fees");
    revalidatePath("/school/dashboard");

    if (schoolId) {
      revalidatePath(`/platform/schools/${schoolId}`);
      revalidatePath(`/platform/schools/${schoolId}/fees`);
    }

    return {
      success: true,
      fee,
    };
  } catch (error) {
    console.error("Create fee exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred while creating the fee.",
    };
  }
}

/* CREATE PAYMENT */

export async function createPayment(
  record: PaymentRecord,
  schoolId?: string,
): Promise<ActionResult> {
  try {
    const context = await getManagementContext(schoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to record payments.",
      };
    }

    if (!canManageFinance(context.role)) {
      return {
        success: false,
        error: "You are not authorized to record payments.",
      };
    }

    if (!record.fee_id) {
      return {
        success: false,
        error: "Fee record is required.",
      };
    }

    if (!record.student_id) {
      return {
        success: false,
        error: "Student is required.",
      };
    }

    const amount = Number(record.amount);

    if (!isValidMoney(amount) || amount <= 0) {
      return {
        success: false,
        error: "Payment amount must be greater than zero.",
      };
    }

    if (!record.date) {
      return {
        success: false,
        error: "Payment date is required.",
      };
    }

    if (
      !["cash", "mobile_money", "bank", "card"].includes(record.payment_method)
    ) {
      return {
        success: false,
        error: "Invalid payment method.",
      };
    }

    const { data: fee, error: feeError } = await context.client
      .from("fees")
      .select(
        `
        id,
        student_id,
        amount_due
      `,
      )
      .eq("id", record.fee_id)
      .eq("student_id", record.student_id)
      .eq("school_id", context.schoolId)
      .maybeSingle();

    if (feeError || !fee) {
      return {
        success: false,
        error: "The selected fee does not belong to this student or school.",
      };
    }

    const { data: existingPayments, error: paymentsError } =
      await context.client
        .from("payments")
        .select("amount")
        .eq("fee_id", fee.id)
        .eq("school_id", context.schoolId);

    if (paymentsError) {
      return {
        success: false,
        error: "Unable to calculate the current fee balance.",
      };
    }

    const paidCents = (existingPayments ?? []).reduce(
      (total, payment) => total + moneyToCents(Number(payment.amount)),
      0,
    );

    const balanceCents = moneyToCents(Number(fee.amount_due)) - paidCents;
    const balance = balanceCents / 100;

    if (balance <= 0) {
      return {
        success: false,
        error: "This fee has already been fully paid.",
      };
    }

    if (moneyToCents(amount) > balanceCents) {
      return {
        success: false,
        error: `Payment cannot exceed the remaining balance of GH₵ ${balance.toFixed(
          2,
        )}.`,
      };
    }

    const { data: payment, error } = await context.client
      .from("payments")
      .insert({
        school_id: context.schoolId,
        fee_id: record.fee_id,
        student_id: record.student_id,
        amount,
        date: record.date,
        payment_method: record.payment_method,
        reference: record.reference?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Create payment error:", error);

      if (error.code === "42501") {
        return {
          success: false,
          error: "You do not have permission to record payments.",
        };
      }

      return {
        success: false,
        error: error.message || "Failed to record payment.",
      };
    }

    revalidatePath("/school/fees");
    revalidatePath("/school/dashboard");

    if (schoolId) {
      revalidatePath(`/platform/schools/${schoolId}`);
      revalidatePath(`/platform/schools/${schoolId}/fees`);
    }

    return {
      success: true,
      payment,
    };
  } catch (error) {
    console.error("Create payment exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred while recording the payment.",
    };
  }
}