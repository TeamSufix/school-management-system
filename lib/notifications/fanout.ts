import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type Client = Pick<SupabaseClient, "from">;

/**
 * Notify a student (if they have a login) and every linked parent about an
 * event. Failures are logged but never block the underlying action.
 */
export async function notifyStudentAndParents(
  client: Client,
  schoolId: string,
  studentIds: string[],
  title: string,
  body: string,
) {
  try {
    if (!studentIds.length) return;
    const [{ data: students }, { data: links }] = await Promise.all([
      client.from("students").select("id, user_id").eq("school_id", schoolId).in("id", studentIds),
      client.from("student_parents").select("student_id, parent_id").in("student_id", studentIds),
    ]);
    const recipients = new Set<string>();
    for (const student of students ?? []) if (student.user_id) recipients.add(student.user_id);
    for (const link of links ?? []) recipients.add(link.parent_id);
    if (!recipients.size) return;
    await client.from("notifications").insert(
      [...recipients].map((userId) => ({
        school_id: schoolId,
        user_id: userId,
        title: title.slice(0, 200),
        body: body.slice(0, 2000),
      })),
    );
  } catch (error) {
    console.error("Notification fan-out failed:", error);
  }
}
