export const attendanceStatuses = ["present", "absent", "late", "excused"] as const;
export type AttendanceStatus = (typeof attendanceStatuses)[number];

export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateAttendanceBatch(records: unknown, today = todayDate()): string | null {
  if (!Array.isArray(records) || !records.length || records.length > 1000) return "Provide between 1 and 1000 attendance records.";
  const students = new Set<string>();
  const classes = new Set<string>();
  const dates = new Set<string>();
  for (const record of records) {
    if (!record || typeof record !== "object") return "Invalid attendance record.";
    if (typeof record.student_id !== "string" || !record.student_id.trim() || typeof record.class_id !== "string" || !record.class_id.trim()) return "A student and class are required for every record.";
    if (!isCalendarDate(record.date)) return "Select a valid attendance date.";
    if (record.date > today) return "Attendance cannot be recorded for a future date.";
    if (!attendanceStatuses.includes(record.status)) return "Invalid attendance status.";
    if (record.remarks != null && (typeof record.remarks !== "string" || record.remarks.length > 2000)) return "Attendance remarks must be text of at most 2000 characters.";
    if (students.has(record.student_id)) return "A student appears more than once in this attendance batch.";
    students.add(record.student_id);
    classes.add(record.class_id);
    dates.add(record.date);
  }
  if (classes.size !== 1 || dates.size !== 1) return "Attendance must belong to one class and one date.";
  return null;
}
