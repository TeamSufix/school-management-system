import "server-only";

import { getManagementContext } from "@/lib/auth/get-management-context";
import { canAccessTeachingScope } from "@/lib/auth/teacher-scope";
import { readAllRows } from "@/lib/supabase/read-all";

const DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

export type AttendanceReportRow = {
  student_id: string;
  first_name: string;
  last_name: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  rate: number;
};

export async function getAttendanceReport(classId: string | undefined, from: string | undefined, to: string | undefined, schoolId?: string) {
  const context = await getManagementContext(schoolId);
  if (!context || !["super_admin", "school_admin", "teacher"].includes(context.role)) return null;
  if (from && !DATE.test(from)) return null;
  if (to && !DATE.test(to)) return null;
  if (from && to && from > to) return null;
  const classes = await context.client.from("classes").select("id, name").eq("school_id", context.schoolId).order("name");
  if (classes.error) throw new Error("Unable to load classes.");
  const visibleClasses = (classes.data ?? []).filter((item) => canAccessTeachingScope(context, item.id));
  const selected = classId && visibleClasses.some((item) => item.id === classId) ? classId : undefined;
  let query = context.client
    .from("attendance")
    .select("student_id, status, students(first_name, last_name)")
    .eq("school_id", context.schoolId);
  if (selected) query = query.eq("class_id", selected);
  else if (context.role === "teacher") query = query.in("class_id", visibleClasses.map((item) => item.id));
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);
  const rows = await readAllRows(query);
  const byStudent = new Map<string, AttendanceReportRow>();
  for (const row of rows) {
    const student = Array.isArray(row.students) ? row.students[0] : row.students;
    const record = byStudent.get(row.student_id) ?? {
      student_id: row.student_id,
      first_name: student?.first_name ?? "Unknown",
      last_name: student?.last_name ?? "student",
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      total: 0,
      rate: 0,
    };
    const status = row.status as "present" | "absent" | "late" | "excused";
    if (["present", "absent", "late", "excused"].includes(status)) {
      record[status] += 1;
      record.total += 1;
    }
    byStudent.set(row.student_id, record);
  }
  const report = [...byStudent.values()].map((row) => ({
    ...row,
    rate: row.total ? Math.round(((row.present + row.late) / row.total) * 1000) / 10 : 0,
  })).sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name));
  return { classes: visibleClasses, selected, from, to, rows: report, schoolId: context.schoolId };
}
