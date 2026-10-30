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
    context.client.from("students").select("id, first_name, last_name, student_id, class_id, classes(name)").eq("id", studentId).eq("school_id", context.schoolId).maybeSingle(),
    context.client.from("schools").select("id, name, address, phone, email").eq("id", context.schoolId).maybeSingle(),
  ]);
  if (student.error || school.error) throw new Error("Unable to load report details.");
  if (!student.data || !school.data) return null;
  const rows = await readAllRows(context.client.from("results").select("id, score, grade, class_id, subject_id, classes(name), subjects(name)").eq("school_id", context.schoolId).eq("student_id", studentId).in("academic_year", [...new Set([year, year.replace("-", "/"), year.replace("/", "-")])]).eq("term", term).order("id"));
  const amendments = await readAllRows(context.client.from("result_amendments").select("id, result_id, new_score, new_grade, created_at, results!inner(student_id, academic_year, term)").eq("school_id", context.schoolId).eq("results.student_id", studentId).in("results.academic_year", [...new Set([year, year.replace("-", "/"), year.replace("/", "-")])]).eq("results.term", term).order("created_at").order("id"));
  const latest = new Map(amendments.map((amendment) => [amendment.result_id, amendment]));
  const results = rows.map((row) => ({ ...row, score: Number(latest.get(row.id)?.new_score ?? row.score), grade: latest.get(row.id)?.new_grade ?? row.grade }));
  const classId = results[0]?.class_id ?? (student.data as { class_id?: string | null }).class_id ?? null;
  let assessments: { id: string; name: string; assessment_type: string; weight: number; max_score: number; subject: string; score: number | null; contribution: number | null }[] = [];
  const years = [...new Set([year, year.replace("-", "/"), year.replace("/", "-")])];
  let classStats: { subjectAverages: Map<string, number>; position: number | null; classSize: number } = { subjectAverages: new Map(), position: null, classSize: 0 };
  if (classId) {
    const classResults = await readAllRows(context.client.from("results").select("id, student_id, subject_id, score").eq("school_id", context.schoolId).eq("class_id", classId).in("academic_year", years).eq("term", term).order("id"));
    const classResultIds = classResults.map((row) => row.id);
    const classAmendments = classResultIds.length
      ? await readAllRows(context.client.from("result_amendments").select("result_id, new_score").eq("school_id", context.schoolId).in("result_id", classResultIds).order("created_at").order("id"))
      : [];
    const latestScore = new Map(classAmendments.map((amendment) => [amendment.result_id, Number(amendment.new_score)]));
    const byStudentSubject = new Map<string, Map<string, number>>();
    const subjectTotals = new Map<string, { sum: number; count: number }>();
    for (const row of classResults) {
      const score = latestScore.get(row.id) ?? Number(row.score);
      if (!byStudentSubject.has(row.student_id)) byStudentSubject.set(row.student_id, new Map());
      byStudentSubject.get(row.student_id)!.set(row.subject_id, score);
      const subject = subjectTotals.get(row.subject_id) ?? { sum: 0, count: 0 };
      subjectTotals.set(row.subject_id, { sum: subject.sum + score, count: subject.count + 1 });
    }
    const studentAverages = [...byStudentSubject.entries()].map(([id, subjects]) => ({
      id,
      average: [...subjects.values()].reduce((a, b) => a + b, 0) / subjects.size,
    })).sort((a, b) => b.average - a.average);
    const rank = studentAverages.findIndex((entry) => entry.id === studentId);
    classStats = {
      subjectAverages: new Map([...subjectTotals.entries()].map(([id, t]) => [id, t.sum / t.count])),
      position: rank === -1 ? null : rank + 1,
      classSize: studentAverages.length,
    };
  }
  let attendanceSummary: { present: number; absent: number; late: number; excused: number } | null = null;
  const { data: termRow } = await context.client
    .from("academic_terms")
    .select("starts_on, ends_on, academic_sessions!inner(name)")
    .eq("school_id", context.schoolId)
    .eq("name", term)
    .in("academic_sessions.name", years)
    .maybeSingle();
  if (termRow?.starts_on && termRow?.ends_on) {
    const attendanceRows = await readAllRows(context.client.from("attendance").select("status").eq("school_id", context.schoolId).eq("student_id", studentId).gte("date", termRow.starts_on).lte("date", termRow.ends_on).order("id"));
    if (attendanceRows.length) {
      attendanceSummary = { present: 0, absent: 0, late: 0, excused: 0 };
      for (const row of attendanceRows) {
        const status = row.status as keyof typeof attendanceSummary;
        if (status in attendanceSummary) attendanceSummary[status] += 1;
      }
    }
  }
  const { data: remarks } = await context.client
    .from("student_term_remarks")
    .select("class_teacher_remark, head_teacher_remark")
    .eq("school_id", context.schoolId)
    .eq("student_id", studentId)
    .in("academic_year", years)
    .eq("term", term)
    .maybeSingle();
  if (classId) {
    const assessmentRows = await context.client
      .from("assessments")
      .select("id, name, assessment_type, weight, max_score, subjects(name)")
      .eq("school_id", context.schoolId)
      .eq("class_id", classId)
      .in("academic_year", [...new Set([year, year.replace("-", "/"), year.replace("/", "-")])])
      .eq("term", term)
      .order("created_at");
    if (!assessmentRows.error && assessmentRows.data?.length) {
      const scoreRows = await context.client
        .from("assessment_scores")
        .select("assessment_id, score")
        .eq("school_id", context.schoolId)
        .eq("student_id", studentId)
        .in("assessment_id", assessmentRows.data.map((row) => row.id));
      if (scoreRows.error) throw new Error("Unable to load assessment scores.");
      const scoreMap = new Map((scoreRows.data ?? []).map((row) => [row.assessment_id, Number(row.score)]));
      assessments = assessmentRows.data.map((row) => {
        const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
        const score = scoreMap.get(row.id) ?? null;
        return {
          id: row.id,
          name: row.name,
          assessment_type: row.assessment_type,
          weight: Number(row.weight),
          max_score: Number(row.max_score),
          subject: subject?.name ?? "Subject",
          score,
          contribution: score === null ? null : (score / Number(row.max_score)) * Number(row.weight),
        };
      });
    }
  }
  return { student: student.data, school: school.data, results, assessments, year, term, schoolId: context.schoolId, classStats, attendanceSummary, remarks: remarks ?? null };
}

export async function getClassReports(classId: string, year: string, term: string, schoolId?: string) {
  const context = await reportContext(schoolId);
  if (!context || !["school_admin", "super_admin"].includes(context.user.role ?? "")) return null;
  const { data: students, error } = await context.client
    .from("students")
    .select("id")
    .eq("school_id", context.schoolId)
    .eq("class_id", classId)
    .eq("status", "active")
    .order("first_name");
  if (error || !students?.length) return error ? Promise.reject(new Error("Unable to load class students.")) : null;
  const reports = [];
  for (const student of students) {
    const report = await getStudentReport(student.id, year, term, schoolId);
    if (report) reports.push(report);
  }
  return reports;
}

export async function getStudentTranscript(studentId: string, schoolId?: string) {
  const context = await reportContext(schoolId);
  if (!context || context.user.role === "accountant" || !await hasStudentAccess(context, studentId)) return null;
  const [student, school] = await Promise.all([
    context.client.from("students").select("id, first_name, last_name, student_id, classes(name)").eq("id", studentId).eq("school_id", context.schoolId).maybeSingle(),
    context.client.from("schools").select("name, address, phone, email").eq("id", context.schoolId).maybeSingle(),
  ]);
  if (student.error || school.error) throw new Error("Unable to load transcript details.");
  if (!student.data || !school.data) return null;
  const results = await readAllRows(context.client.from("results").select("id, academic_year, term, score, grade, subjects(name)").eq("school_id", context.schoolId).eq("student_id", studentId).order("academic_year").order("term").order("id"));
  const amendments = await readAllRows(context.client.from("result_amendments").select("result_id, new_score, new_grade, results!inner(student_id)").eq("school_id", context.schoolId).eq("results.student_id", studentId).order("created_at").order("id"));
  const latest = new Map(amendments.map((amendment) => [amendment.result_id, amendment]));
  const rows = results.map((row) => ({ ...row, score: Number(latest.get(row.id)?.new_score ?? row.score), grade: latest.get(row.id)?.new_grade ?? row.grade }));
  const gradePoints: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };
  const byPeriod = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = `${row.academic_year}::${row.term}`;
    byPeriod.set(key, [...(byPeriod.get(key) ?? []), row]);
  }
  const periods = [...byPeriod.entries()].map(([key, periodRows]) => {
    const [yearName, termName] = key.split("::");
    const average = periodRows.reduce((sum, row) => sum + row.score, 0) / periodRows.length;
    const gpa = periodRows.reduce((sum, row) => sum + (gradePoints[row.grade ?? "F"] ?? 0), 0) / periodRows.length;
    return { year: yearName, term: termName, rows: periodRows, average, gpa };
  });
  const cumulativeGpa = rows.length ? rows.reduce((sum, row) => sum + (gradePoints[row.grade ?? "F"] ?? 0), 0) / rows.length : null;
  const cumulativeAverage = rows.length ? rows.reduce((sum, row) => sum + row.score, 0) / rows.length : null;
  return { student: student.data, school: school.data, periods, cumulativeGpa, cumulativeAverage };
}

export async function getFeeStatement(studentId: string, schoolId?: string) {
  const context = await reportContext(schoolId);
  if (!context || context.user.role === "teacher" || !await hasStudentAccess(context, studentId)) return null;
  const [student, school] = await Promise.all([
    context.client.from("students").select("id, first_name, last_name, student_id, classes(name)").eq("id", studentId).eq("school_id", context.schoolId).maybeSingle(),
    context.client.from("schools").select("name, address, phone, email").eq("id", context.schoolId).maybeSingle(),
  ]);
  if (student.error || school.error) throw new Error("Unable to load statement details.");
  if (!student.data || !school.data) return null;
  const [fees, payments] = await Promise.all([
    readAllRows(context.client.from("fees").select("id, academic_year, term, amount_due, created_at").eq("school_id", context.schoolId).eq("student_id", studentId).order("academic_year", { ascending: false }).order("term")),
    readAllRows(context.client.from("payments").select("id, fee_id, amount, date, payment_method, reference").eq("school_id", context.schoolId).eq("student_id", studentId).order("date", { ascending: false })),
  ]);
  const feeIds = fees.map((fee) => fee.id);
  const items = feeIds.length
    ? await context.client.from("fee_items").select("fee_id, name, amount").eq("school_id", context.schoolId).in("fee_id", feeIds)
    : { data: [], error: null };
  if (items.error) throw new Error("Unable to load fee breakdown.");
  const itemsByFee = new Map<string, { name: string; amount: number }[]>();
  for (const item of items.data ?? []) itemsByFee.set(item.fee_id, [...(itemsByFee.get(item.fee_id) ?? []), { name: item.name, amount: Number(item.amount) }]);
  const paidByFee = new Map<string, number>();
  for (const payment of payments) paidByFee.set(payment.fee_id, (paidByFee.get(payment.fee_id) ?? 0) + Math.round(Number(payment.amount) * 100));
  const feeRows = fees.map((fee) => ({
    ...fee,
    amount_due: Number(fee.amount_due),
    paid: (paidByFee.get(fee.id) ?? 0) / 100,
    balance: (Math.round(Number(fee.amount_due) * 100) - (paidByFee.get(fee.id) ?? 0)) / 100,
    items: itemsByFee.get(fee.id) ?? [],
  }));
  const totals = feeRows.reduce((sum, fee) => ({ due: sum.due + fee.amount_due, paid: sum.paid + fee.paid, balance: sum.balance + fee.balance }), { due: 0, paid: 0, balance: 0 });
  return { student: student.data, school: school.data, fees: feeRows, payments, totals };
}

export async function getPaymentReceipt(paymentId: string, schoolId?: string) {
  const context = await reportContext(schoolId);
  if (!context) return null;
  const payment = await context.client.from("payments").select("id, student_id, fee_id, amount, date, payment_method, reference, recorded_by, created_at").eq("id", paymentId).eq("school_id", context.schoolId).maybeSingle();
  if (payment.error) throw new Error("Unable to load payment.");
  if (!payment.data || !await hasStudentAccess(context, payment.data.student_id)) return null;
  const [student, fee, school, recorder] = await Promise.all([
    context.client.from("students").select("first_name, last_name, student_id").eq("id", payment.data.student_id).eq("school_id", context.schoolId).maybeSingle(),
    context.client.from("fees").select("academic_year, term").eq("id", payment.data.fee_id).eq("school_id", context.schoolId).eq("student_id", payment.data.student_id).maybeSingle(),
    context.client.from("schools").select("name, address, phone, email").eq("id", context.schoolId).maybeSingle(),
    payment.data.recorded_by
      ? context.client.from("profiles").select("first_name, last_name").eq("id", payment.data.recorded_by).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if ([student, fee, school].some((result) => result.error)) throw new Error("Unable to load receipt details.");
  if (!student.data || !fee.data || !school.data) return null;
  const recordedBy = recorder.data ? `${recorder.data.first_name ?? ""} ${recorder.data.last_name ?? ""}`.trim() : null;
  return { payment: payment.data, student: student.data, fee: fee.data, school: school.data, recordedBy };
}
