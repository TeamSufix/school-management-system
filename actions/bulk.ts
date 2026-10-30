"use server";

import { revalidatePath } from "next/cache";

import { getManagementContext } from "@/lib/auth/get-management-context";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { cells.push(current.trim()); current = ""; continue; }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Import students from a CSV upload. Columns:
 * first_name, last_name, student_id, gender(optional), date_of_birth(optional YYYY-MM-DD)
 * One class is selected; existing student IDs are skipped.
 */
export async function importStudentsCsv(form: FormData) {
  const context = await getManagementContext(text(form, "school_id") || null);
  if (!context || !["school_admin", "super_admin"].includes(context.role)) {
    return { error: "Only a school administrator can import students." };
  }
  const classId = text(form, "class_id") || null;
  const file = form.get("csv_file");
  if (!(file instanceof File) || !file.size) return { error: "Choose a CSV file to import." };
  if (file.size > 512 * 1024) return { error: "CSV files are limited to 512 KB." };
  const content = await file.text();
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 500) return { error: "Import is limited to 500 students per file." };
  const start = /^first_name/i.test(lines[0] ?? "") ? 1 : 0;

  const rows: { school_id: string; first_name: string; last_name: string; student_id: string; class_id: string | null; gender: string | null; date_of_birth: string | null; status: string }[] = [];
  const errors: string[] = [];
  for (const [index, line] of lines.slice(start).entries()) {
    const [first, last, studentId, gender, dob] = splitCsvLine(line);
    const rowNumber = index + start + 1;
    if (!first || !last || !studentId) { errors.push(`Row ${rowNumber}: first name, last name and student ID are required.`); continue; }
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) { errors.push(`Row ${rowNumber}: date of birth must be YYYY-MM-DD.`); continue; }
    if (gender && !["male", "female"].includes(gender.toLowerCase())) { errors.push(`Row ${rowNumber}: gender must be male or female.`); continue; }
    rows.push({
      school_id: context.schoolId,
      first_name: first,
      last_name: last,
      student_id: studentId,
      class_id: classId,
      gender: gender?.toLowerCase() || null,
      date_of_birth: dob || null,
      status: "active",
    });
  }
  if (!rows.length) return { error: errors[0] ?? "The CSV file contains no students." };

  const { data: existing } = await context.client
    .from("students")
    .select("student_id")
    .eq("school_id", context.schoolId)
    .in("student_id", rows.map((row) => row.student_id));
  const existingIds = new Set((existing ?? []).map((row) => row.student_id));
  const fresh = rows.filter((row) => !existingIds.has(row.student_id));
  const skipped = rows.length - fresh.length;
  let created = 0;
  if (fresh.length) {
    const result = await context.client.from("students").insert(fresh);
    if (result.error) return { error: result.error.message || "Unable to import students." };
    created = fresh.length;
  }
  revalidatePath("/school/students");
  return { success: true, message: `${created} imported${skipped ? `, ${skipped} skipped (existing student ID)` : ""}${errors.length ? `, ${errors.length} invalid row(s)` : ""}.`, errors };
}

/**
 * Promote every active student in one class to another class for a session.
 * Current enrollments are closed and new ones recorded for the session.
 */
export async function promoteClass(form: FormData) {
  const context = await getManagementContext(text(form, "school_id") || null);
  if (!context || !["school_admin", "super_admin"].includes(context.role)) {
    return { error: "Only a school administrator can promote classes." };
  }
  const fromClassId = text(form, "from_class_id");
  const toClassId = text(form, "to_class_id");
  const sessionId = text(form, "session_id");
  if (!fromClassId || !toClassId || !sessionId) return { error: "Source class, destination class and session are required." };
  if (fromClassId === toClassId) return { error: "Choose a different destination class." };

  const [classes, session] = await Promise.all([
    context.client.from("classes").select("id").eq("school_id", context.schoolId).in("id", [fromClassId, toClassId]),
    context.client.from("academic_sessions").select("id").eq("id", sessionId).eq("school_id", context.schoolId).maybeSingle(),
  ]);
  if (classes.error || (classes.data?.length ?? 0) !== 2 || session.error || !session.data) {
    return { error: "The selected classes or session do not belong to this school." };
  }

  const { data: students, error } = await context.client
    .from("students")
    .select("id")
    .eq("school_id", context.schoolId)
    .eq("class_id", fromClassId)
    .eq("status", "active");
  if (error) return { error: "Unable to load the class roster." };
  if (!students?.length) return { error: "There are no active students in the source class." };

  const studentIds = students.map((student) => student.id);
  await context.client.from("enrollments").update({ left_on: new Date().toISOString().slice(0, 10) }).eq("school_id", context.schoolId).in("student_id", studentIds).is("left_on", null);
  const { error: enrollError } = await context.client.from("enrollments").insert(
    studentIds.map((studentId) => ({ school_id: context.schoolId, student_id: studentId, session_id: sessionId, class_id: toClassId })),
  );
  if (enrollError) return { error: enrollError.message || "Unable to record the new enrollments." };
  const { error: updateError } = await context.client.from("students").update({ class_id: toClassId }).eq("school_id", context.schoolId).in("id", studentIds);
  if (updateError) return { error: updateError.message || "Enrollments were recorded but class assignment failed to update." };

  revalidatePath("/school/students");
  revalidatePath("/school/classes");
  return { success: true, message: `${studentIds.length} student${studentIds.length === 1 ? "" : "s"} promoted.` };
}
