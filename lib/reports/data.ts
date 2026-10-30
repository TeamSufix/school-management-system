import "server-only";

import { getCurrentUser } from "@/lib/auth/get-user";
import { getManagementContext } from "@/lib/auth/get-management-context";
import { createClient } from "@/lib/supabase/server";
import { readAllRows } from "@/lib/supabase/read-all";
import { defaultAcademicPeriod, validateAcademicPeriod, type AcademicPeriod } from "@/lib/academics/period";

async function reportContext(schoolId?: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role === "parent") {
    if (!user.schoolId || (schoolId && schoolId !== user.schoolId)) return null;
    return { user, schoolId: user.schoolId, client: await createClient() };
  }
  if (!["school_admin", "super_admin", "accountant"].includes(user.role ?? "")) return null;
  const context = await getManagementContext(schoolId);
  return context ? { user, schoolId: context.schoolId, client: context.client } : null;
}

async function hasStudentAccess(context: NonNullable<Awaited<ReturnType<typeof reportContext>>>, studentId: string) {
  if (context.user.role !== "parent") return true;
  const { data, error } = await context.client.from("student_parents").select("student_id").eq("parent_id", context.user.id).eq("student_id", studentId).maybeSingle();
  if (error) throw new Error("Unable to verify parent access.");
  return !!data;
}

export async function getReportAcademicPeriod(schoolId?: string): Promise<AcademicPeriod> {
  const context = await reportContext(schoolId);
  if (!context) return defaultAcademicPeriod();
  const { data, error } = await context.client.from("school_academic_settings").select("academic_year, term").eq("school_id", context.schoolId).maybeSingle();
  if (error) throw new Error("Unable to load the school academic period.");
  return data ? data as AcademicPeriod : defaultAcademicPeriod();
}

export async function getStudentReport(studentId: string, year: string, term: string, schoolId?: string) {
  if (validateAcademicPeriod(year.replace("-", "/"), term)) return null;
  const context = await reportContext(schoolId);
  if (!context || context.user.role === "accountant" || !await hasStudentAccess(context, studentId)) return null;
  const [student, school] = await Promise.all([
    context.client.from("students").select("id, first_name, last_name, student_id, classes(name)").eq("id", studentId).eq("school_id", context.schoolId).maybeSingle(),
    context.client.from("schools").select("id, name, address, phone, email").eq("id", context.schoolId).maybeSingle(),
  ]);
  if (student.error || school.error) throw new Error("Unable to load report details.");
  if (!student.data || !school.data) return null;
  const rows = await readAllRows(context.client.from("results").select("id, score, grade, class_id, classes(name), subjects(name)").eq("school_id", context.schoolId).eq("student_id", studentId).in("academic_year", [...new Set([year, year.replace("-", "/"), year.replace("/", "-")])]).eq("term", term).order("id"));
  const amendments = await readAllRows(context.client.from("result_amendments").select("id, result_id, new_score, new_grade, created_at, results!inner(student_id, academic_year, term)").eq("school_id", context.schoolId).eq("results.student_id", studentId).in("results.academic_year", [...new Set([year, year.replace("-", "/"), year.replace("/", "-")])]).eq("results.term", term).order("created_at").order("id"));
  const latest = new Map(amendments.map((amendment) => [amendment.result_id, amendment]));
  const results = rows.map((row) => ({ ...row, score: Number(latest.get(row.id)?.new_score ?? row.score), grade: latest.get(row.id)?.new_grade ?? row.grade }));
  return { student: student.data, school: school.data, results, year, term, schoolId: context.schoolId };
}

export async function getPaymentReceipt(paymentId: string, schoolId?: string) {
  const context = await reportContext(schoolId);
  if (!context) return null;
  const payment = await context.client.from("payments").select("id, student_id, fee_id, amount, date, payment_method, reference, created_at").eq("id", paymentId).eq("school_id", context.schoolId).maybeSingle();
  if (payment.error) throw new Error("Unable to load payment.");
  if (!payment.data || !await hasStudentAccess(context, payment.data.student_id)) return null;
  const [student, fee, school] = await Promise.all([
    context.client.from("students").select("first_name, last_name, student_id").eq("id", payment.data.student_id).eq("school_id", context.schoolId).maybeSingle(),
    context.client.from("fees").select("academic_year, term").eq("id", payment.data.fee_id).eq("school_id", context.schoolId).eq("student_id", payment.data.student_id).maybeSingle(),
    context.client.from("schools").select("name, address, phone, email").eq("id", context.schoolId).maybeSingle(),
  ]);
  if ([student, fee, school].some((result) => result.error)) throw new Error("Unable to load receipt details.");
  if (!student.data || !fee.data || !school.data) return null;
  return { payment: payment.data, student: student.data, fee: fee.data, school: school.data };
}
