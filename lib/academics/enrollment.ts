import type { SupabaseClient } from "@supabase/supabase-js";

export async function recordEnrollment(
  client: SupabaseClient,
  schoolId: string,
  studentId: string,
  classId: string | null | undefined,
  streamId?: string | null,
) {
  if (!classId) return;
  const session = await client.rpc("sms_current_session", { target_school: schoolId });
  if (session.error || !session.data) return;
  const existing = await client
    .from("enrollments")
    .select("id, class_id, left_on")
    .eq("student_id", studentId)
    .eq("session_id", session.data)
    .maybeSingle();
  if (existing.error) return;
  if (!existing.data) {
    await client.from("enrollments").insert({
      school_id: schoolId,
      student_id: studentId,
      session_id: session.data,
      class_id: classId,
      stream_id: streamId ?? null,
    });
    return;
  }
  if (existing.data.left_on === null && existing.data.class_id === classId) {
    if (streamId !== undefined) {
      await client.from("enrollments").update({ stream_id: streamId }).eq("id", existing.data.id);
    }
    return;
  }
  if (existing.data.left_on === null) {
    await client.from("enrollments").update({ left_on: new Date().toISOString().slice(0, 10) }).eq("id", existing.data.id);
    await client.from("enrollments").insert({
      school_id: schoolId,
      student_id: studentId,
      session_id: session.data,
      class_id: classId,
      stream_id: streamId ?? null,
    });
  }
}
