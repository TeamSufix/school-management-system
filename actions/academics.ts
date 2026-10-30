"use server";

import { revalidatePath } from "next/cache";
import { getManagementContext } from "@/lib/auth/get-management-context";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

async function adminContext(form: FormData) {
  const context = await getManagementContext(text(form, "school_id"));
  if (!context || !["school_admin", "super_admin"].includes(context.role)) return null;
  return context;
}

function dates(start: string, end: string) {
  if (start && !DATE.test(start)) return "Enter a valid start date.";
  if (end && !DATE.test(end)) return "Enter a valid end date.";
  if (start && end && start >= end) return "The start date must be before the end date.";
  return null;
}

export async function saveAcademicSession(form: FormData) {
  const context = await adminContext(form);
  if (!context) return { error: "Only an administrator of this school can manage academic sessions." };
  const name = text(form, "name");
  const startsOn = text(form, "starts_on");
  const endsOn = text(form, "ends_on");
  if (!/^[0-9]{4}\/[0-9]{4}$/.test(name)) return { error: "Session name must look like 2026/2027." };
  const error = dates(startsOn, endsOn);
  if (error) return { error };
  const isCurrent = form.get("is_current") === "on";
  if (isCurrent) {
    await context.client.from("academic_sessions").update({ is_current: false }).eq("school_id", context.schoolId).eq("is_current", true);
  }
  const result = await context.client.from("academic_sessions").insert({
    school_id: context.schoolId,
    name,
    starts_on: startsOn || null,
    ends_on: endsOn || null,
    is_current: isCurrent,
  });
  if (result.error) {
    if (result.error.code === "23505") return { error: "A session with this name already exists." };
    return { error: "Unable to save the session. Verify that the academic structure migration is installed." };
  }
  revalidatePath("/school/settings");
  revalidatePath(`/platform/schools/${context.schoolId}/settings`);
  return { success: true };
}

export async function setCurrentSession(form: FormData) {
  const context = await adminContext(form);
  if (!context) return { error: "Only an administrator can change the current session." };
  const sessionId = text(form, "session_id");
  await context.client.from("academic_sessions").update({ is_current: false }).eq("school_id", context.schoolId).eq("is_current", true);
  const result = await context.client.from("academic_sessions").update({ is_current: true }).eq("id", sessionId).eq("school_id", context.schoolId).select("id").maybeSingle();
  if (result.error || !result.data) return { error: "Session not found." };
  revalidatePath("/school/settings");
  revalidatePath(`/platform/schools/${context.schoolId}/settings`);
  return { success: true };
}

export async function saveAcademicTerm(form: FormData) {
  const context = await adminContext(form);
  if (!context) return { error: "Only an administrator of this school can manage terms." };
  const sessionId = text(form, "session_id");
  const name = text(form, "name");
  const startsOn = text(form, "starts_on");
  const endsOn = text(form, "ends_on");
  if (!["term_1", "term_2", "term_3"].includes(name)) return { error: "Select a valid term." };
  const error = dates(startsOn, endsOn);
  if (error) return { error };
  const session = await context.client.from("academic_sessions").select("id").eq("id", sessionId).eq("school_id", context.schoolId).maybeSingle();
  if (session.error || !session.data) return { error: "The selected session does not belong to this school." };
  const isCurrent = form.get("is_current") === "on";
  if (isCurrent) {
    await context.client.from("academic_terms").update({ is_current: false }).eq("school_id", context.schoolId).eq("is_current", true);
  }
  const result = await context.client.from("academic_terms").insert({
    school_id: context.schoolId,
    session_id: sessionId,
    name,
    starts_on: startsOn || null,
    ends_on: endsOn || null,
    is_current: isCurrent,
  });
  if (result.error) {
    if (result.error.code === "23505") return { error: "This term already exists for the selected session." };
    return { error: "Unable to save the term. Verify that the academic structure migration is installed." };
  }
  revalidatePath("/school/settings");
  revalidatePath(`/platform/schools/${context.schoolId}/settings`);
  return { success: true };
}

export async function setCurrentTerm(form: FormData) {
  const context = await adminContext(form);
  if (!context) return { error: "Only an administrator can change the current term." };
  const termId = text(form, "term_id");
  await context.client.from("academic_terms").update({ is_current: false }).eq("school_id", context.schoolId).eq("is_current", true);
  const result = await context.client.from("academic_terms").update({ is_current: true }).eq("id", termId).eq("school_id", context.schoolId).select("id").maybeSingle();
  if (result.error || !result.data) return { error: "Term not found." };
  revalidatePath("/school/settings");
  revalidatePath(`/platform/schools/${context.schoolId}/settings`);
  return { success: true };
}

export async function saveStream(form: FormData) {
  const context = await adminContext(form);
  if (!context) return { error: "Only an administrator of this school can manage streams." };
  const classId = text(form, "class_id");
  const name = text(form, "name");
  if (!name || name.length > 50) return { error: "Stream name must contain 1 to 50 characters." };
  const schoolClass = await context.client.from("classes").select("id").eq("id", classId).eq("school_id", context.schoolId).maybeSingle();
  if (schoolClass.error || !schoolClass.data) return { error: "The selected class does not belong to this school." };
  const result = await context.client.from("streams").insert({ school_id: context.schoolId, class_id: classId, name });
  if (result.error) {
    if (result.error.code === "23505") return { error: "This stream already exists for the selected class." };
    return { error: "Unable to save the stream. Verify that the academic structure migration is installed." };
  }
  revalidatePath("/school/settings");
  revalidatePath(`/platform/schools/${context.schoolId}/settings`);
  return { success: true };
}

export async function removeStream(form: FormData) {
  const context = await adminContext(form);
  if (!context) return { error: "Only an administrator can remove streams." };
  const streamId = text(form, "stream_id");
  const result = await context.client.from("streams").delete().eq("id", streamId).eq("school_id", context.schoolId).select("id").maybeSingle();
  if (result.error || !result.data) return { error: "Stream not found." };
  revalidatePath("/school/settings");
  revalidatePath(`/platform/schools/${context.schoolId}/settings`);
  return { success: true };
}
