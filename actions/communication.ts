"use server";

import { revalidatePath } from "next/cache";
import { getManagementContext } from "@/lib/auth/get-management-context";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const AUDIENCES = {
  all: ["school_admin", "teacher", "accountant", "parent", "student"],
  staff: ["school_admin", "teacher", "accountant"],
  teachers: ["school_admin", "teacher"],
  parents: ["school_admin", "parent"],
  students: ["school_admin", "student"],
} as const;

async function adminContext(form: FormData) {
  const context = await getManagementContext(text(form, "school_id"));
  if (!context || !["school_admin", "super_admin"].includes(context.role)) return null;
  return context;
}

export async function createAnnouncement(form: FormData) {
  const context = await adminContext(form);
  if (!context) return { error: "Only an administrator of this school can publish announcements." };
  const title = text(form, "title");
  const body = text(form, "body");
  const audience = text(form, "audience") as keyof typeof AUDIENCES;
  const publishOn = text(form, "publish_on") || new Date().toISOString().slice(0, 10);
  if (!title || title.length > 200) return { error: "Title must contain 1 to 200 characters." };
  if (!body || body.length > 5000) return { error: "Body must contain 1 to 5000 characters." };
  if (!(audience in AUDIENCES)) return { error: "Select a valid audience." };
  const announcement = await context.client.from("announcements").insert({
    school_id: context.schoolId,
    title,
    body,
    audience,
    publish_on: publishOn,
    created_by: context.userId,
  }).select("id").maybeSingle();
  if (announcement.error || !announcement.data) {
    return { error: "Unable to publish the announcement. Verify that the communication migration is installed." };
  }
  const members = await context.client.from("school_memberships").select("user_id").eq("school_id", context.schoolId).in("role", [...AUDIENCES[audience]]);
  if (members.data?.length) {
    await context.client.from("notifications").insert(
      [...new Set(members.data.map((member) => member.user_id))]
        .filter((userId) => userId !== context.userId)
        .map((userId) => ({
          school_id: context.schoolId,
          user_id: userId,
          announcement_id: announcement.data!.id,
          title,
          body: body.slice(0, 2000),
        })),
    );
  }
  revalidatePath("/school/announcements");
  revalidatePath("/school/notifications");
  revalidatePath(`/platform/schools/${context.schoolId}/announcements`);
  return { success: true };
}

export async function deleteAnnouncement(form: FormData) {
  const context = await adminContext(form);
  if (!context) return { error: "Only an administrator can delete announcements." };
  const result = await context.client.from("announcements").delete().eq("id", text(form, "announcement_id")).eq("school_id", context.schoolId).select("id").maybeSingle();
  if (result.error || !result.data) return { error: "Announcement not found." };
  revalidatePath("/school/announcements");
  return { success: true };
}

export async function markNotificationRead(form: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: "Notification not found." };
  const client = await createClient();
  const result = await client.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", text(form, "notification_id")).eq("user_id", user.id).is("read_at", null).select("id").maybeSingle();
  if (result.error) return { error: "Unable to update the notification." };
  revalidatePath("/school/notifications");
  return { success: true };
}

export async function saveTimetableEntry(form: FormData) {
  const context = await adminContext(form);
  if (!context) return { error: "Only an administrator can manage the timetable." };
  const classId = text(form, "class_id");
  const subjectId = text(form, "subject_id");
  const teacherId = text(form, "teacher_id") || null;
  const weekday = Number(form.get("weekday"));
  const startsAt = text(form, "starts_at");
  const endsAt = text(form, "ends_at");
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) return { error: "Select a valid weekday." };
  if (!/^[0-9]{2}:[0-9]{2}/.test(startsAt) || !/^[0-9]{2}:[0-9]{2}/.test(endsAt)) return { error: "Enter valid start and end times." };
  if (startsAt >= endsAt) return { error: "The end time must be after the start time." };
  const [schoolClass, subject, teacher] = await Promise.all([
    context.client.from("classes").select("id").eq("id", classId).eq("school_id", context.schoolId).maybeSingle(),
    context.client.from("subjects").select("id").eq("id", subjectId).eq("school_id", context.schoolId).maybeSingle(),
    teacherId ? context.client.from("teachers").select("id").eq("id", teacherId).eq("school_id", context.schoolId).maybeSingle() : Promise.resolve({ data: true, error: null }),
  ]);
  if (schoolClass.error || !schoolClass.data || subject.error || !subject.data) {
    return { error: "The selected class or subject does not belong to this school." };
  }
  if (teacherId && (teacher.error || !teacher.data)) return { error: "The selected teacher does not belong to this school." };
  const result = await context.client.from("timetable_entries").insert({
    school_id: context.schoolId,
    class_id: classId,
    subject_id: subjectId,
    teacher_id: teacherId,
    weekday,
    starts_at: startsAt,
    ends_at: endsAt,
  });
  if (result.error) {
    if (result.error.code === "23505") return { error: "This class already has an entry at that time." };
    return { error: "Unable to save the timetable entry. Verify that the communication migration is installed." };
  }
  revalidatePath("/school/timetable");
  revalidatePath(`/platform/schools/${context.schoolId}/timetable`);
  return { success: true };
}

export async function deleteTimetableEntry(form: FormData) {
  const context = await adminContext(form);
  if (!context) return { error: "Only an administrator can manage the timetable." };
  const result = await context.client.from("timetable_entries").delete().eq("id", text(form, "entry_id")).eq("school_id", context.schoolId).select("id").maybeSingle();
  if (result.error || !result.data) return { error: "Timetable entry not found." };
  revalidatePath("/school/timetable");
  return { success: true };
}
