import { getManagementContext } from "@/lib/auth/get-management-context";
import { getAttendanceReport } from "@/lib/reports/attendance";
import { readAllRows } from "@/lib/supabase/read-all";
import { moneyToCents } from "@/lib/academics/money";

const cell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const schoolId = url.searchParams.get("school") ?? undefined;
  const context = await getManagementContext(schoolId);
  if (!context || !["super_admin", "school_admin", "teacher", "accountant"].includes(context.role)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const type = url.searchParams.get("type");
  let csv = "";
  if (type === "attendance") {
    if (context.role === "accountant") return new Response("Unauthorized", { status: 401 });
    const report = await getAttendanceReport(
      url.searchParams.get("class") ?? undefined,
      url.searchParams.get("from") ?? undefined,
      url.searchParams.get("to") ?? undefined,
      schoolId,
    );
    if (!report) return new Response("Report unavailable", { status: 400 });
    csv = ["student,first_name,last_name,present,absent,late,excused,rate"]
      .concat(report.rows.map((row) => [row.student_id, row.first_name, row.last_name, row.present, row.absent, row.late, row.excused, row.rate].map(cell).join(",")))
      .join("\n");
  } else if (type === "fees") {
    if (context.role === "teacher") return new Response("Unauthorized", { status: 401 });
    const [fees, payments] = await Promise.all([
      readAllRows(context.client.from("fees").select("id, academic_year, term, amount_due, students(first_name, last_name, student_id)").eq("school_id", context.schoolId)),
      readAllRows(context.client.from("payments").select("fee_id, amount").eq("school_id", context.schoolId)),
    ]);
    const paidByFee = new Map<string, number>();
    for (const payment of payments) paidByFee.set(payment.fee_id, (paidByFee.get(payment.fee_id) ?? 0) + moneyToCents(Number(payment.amount)));
    csv = ["student_id,student,academic_year,term,amount_due,total_paid,balance"]
      .concat(fees.map((fee) => {
        const student = Array.isArray(fee.students) ? fee.students[0] : fee.students;
        const paid = (paidByFee.get(fee.id) ?? 0) / 100;
        return [student?.student_id ?? "", `${student?.first_name ?? ""} ${student?.last_name ?? ""}`.trim(), fee.academic_year, fee.term, Number(fee.amount_due), paid, Number(fee.amount_due) - paid].map(cell).join(",");
      }))
      .join("\n");
  } else {
    return new Response("Unknown export type", { status: 400 });
  }
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${type}-report.csv"`,
    },
  });
}
