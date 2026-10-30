import "server-only";

import { getCurrentUser } from "@/lib/auth/get-user";
import { getManagementContext } from "@/lib/auth/get-management-context";
import { canAccessTeachingScope } from "@/lib/auth/teacher-scope";
import { createClient } from "@/lib/supabase/server";
import { readAllRows } from "@/lib/supabase/read-all";
import { moneyToCents } from "@/lib/academics/money";

export async function getStudentRecords(studentId: string, requestedSchoolId?: string, view: "all" | "attendance" | "results" | "fees" = "all") {
  const user = await getCurrentUser();
  if (!user || !["super_admin", "school_admin", "teacher", "accountant", "parent", "student"].includes(user.role ?? "")) return null;
  if ((user.role === "parent" || user.role === "student") && (!user.schoolId || (requestedSchoolId && requestedSchoolId !== user.schoolId))) return null;
  const management = user.role === "parent" || user.role === "student" ? null : await getManagementContext(requestedSchoolId);
  if (user.role !== "parent" && user.role !== "student" && !management) return null;
  const schoolId = management?.schoolId ?? user.schoolId;
  if (!schoolId) return null;
  const client = management?.client ?? await createClient();
  if (user.role === "parent") {
    const link = await client.from("student_parents").select("student_id").eq("parent_id", user.id).eq("student_id", studentId).maybeSingle();
    if (link.error?.code === "22P02") return null;
    if (link.error) throw new Error("Unable to verify student access.");
    if (!link.data) return null;
  }
  if (user.role === "student") {
    const self = await client.from("students").select("id").eq("id", studentId).eq("user_id", user.id).eq("school_id", schoolId).maybeSingle();
    if (self.error?.code === "22P02") return null;
    if (self.error) throw new Error("Unable to verify student access.");
    if (!self.data) return null;
  }
  const student = await client.from("students").select("id, school_id, class_id, first_name, last_name, student_id").eq("id", studentId).eq("school_id", schoolId).maybeSingle();
  if (student.error?.code === "22P02") return null;
  if (student.error) throw new Error("Unable to load student details.");
  if (!student.data) return null;
  if (user.role === "teacher" && (!management || !student.data.class_id || !canAccessTeachingScope(management, student.data.class_id))) return null;

  const canViewAcademics = user.role !== "accountant";
  const canViewFinance = user.role !== "teacher";
  const [attendance, results, fees, payments] = await Promise.all([
    canViewAcademics && (view === "all" || view === "attendance") ? readAllRows(client.from("attendance").select("id, class_id, date, status, remarks, classes(name)").eq("school_id", schoolId).eq("student_id", studentId).order("date", { ascending: false }).order("id")) : null,
    canViewAcademics && (view === "all" || view === "results") ? readAllRows(client.from("results").select("id, class_id, subject_id, academic_year, term, score, grade, subjects(name), classes(name)").eq("school_id", schoolId).eq("student_id", studentId).order("academic_year", { ascending: false }).order("term").order("id")) : null,
    canViewFinance && (view === "all" || view === "fees") ? readAllRows(client.from("fees").select("id, academic_year, term, amount_due").eq("school_id", schoolId).eq("student_id", studentId).order("academic_year", { ascending: false }).order("term").order("id")) : null,
    canViewFinance && (view === "all" || view === "fees") ? readAllRows(client.from("payments").select("id, fee_id, amount, date, payment_method, reference").eq("school_id", schoolId).eq("student_id", studentId).order("date", { ascending: false }).order("id")) : null,
  ]);
  const visibleResults = results?.filter((record) => !management || canAccessTeachingScope(management, record.class_id, record.subject_id)) ?? null;
  const amendments = visibleResults?.length ? await readAllRows(client.from("result_amendments").select("id, result_id, new_score, new_grade, created_at, results!inner(student_id)").eq("school_id", schoolId).eq("results.student_id", studentId).order("created_at").order("id")) : [];
  const latest = new Map(amendments.map((amendment) => [amendment.result_id, amendment]));
  const paidByFee = new Map<string, number>();
  for (const payment of payments ?? []) paidByFee.set(payment.fee_id, (paidByFee.get(payment.fee_id) ?? 0) + moneyToCents(Number(payment.amount)));

  return {
    student: student.data,
    role: user.role,
    schoolId,
    attendance: attendance?.filter((record) => !management || canAccessTeachingScope(management, record.class_id)) ?? null,
    results: visibleResults?.map((record) => ({ ...record, score: Number(latest.get(record.id)?.new_score ?? record.score), grade: latest.get(record.id)?.new_grade ?? record.grade })) ?? null,
    fees: fees?.map((fee) => ({ ...fee, amount_due: Number(fee.amount_due), total_paid: (paidByFee.get(fee.id) ?? 0) / 100, balance: (moneyToCents(Number(fee.amount_due)) - (paidByFee.get(fee.id) ?? 0)) / 100 })) ?? null,
    payments,
  };
}
