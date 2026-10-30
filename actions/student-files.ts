"use server";

import { revalidatePath } from "next/cache";
import { getManagementContext } from "@/lib/auth/get-management-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { inspectLogo } from "@/lib/platform/logo";
import { inspectRecordFile, recordSizeLimit, sanitizeFileName } from "@/lib/students/files";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

async function studentFileContext(form: FormData) {
  const context = await getManagementContext(text(form, "school_id"));
  if (!context || !["school_admin", "super_admin"].includes(context.role)) return null;
  const studentId = text(form, "student_id");
  if (!studentId) return null;
  const student = await context.client.from("students").select("id").eq("id", studentId).eq("school_id", context.schoolId).maybeSingle();
  if (student.error || !student.data) return null;
  return { ...context, studentId };
}

export async function uploadStudentPhoto(form: FormData) {
  const context = await studentFileContext(form);
  if (!context) return { error: "You are not authorized to update this student's photo." };
  const file = form.get("photo");
  if (!file || typeof file === "string" || !file.size) return { error: "Choose a PNG or JPEG photo." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const image = inspectLogo(bytes);
  if (!image) return { error: "Photo must be a PNG or JPEG under 512 KB and 4096 × 4096 pixels." };
  const path = `${context.schoolId}/students/${context.studentId}/photo/${crypto.randomUUID()}.${image.extension}`;
  const admin = createAdminClient();
  const upload = await admin.storage.from("schoolms-records").upload(path, bytes, { contentType: image.contentType, upsert: false });
  if (upload.error) return { error: "Unable to upload the photo. Verify that the student records migration is installed." };
  const update = await admin.from("students").update({ photo_path: path, updated_at: new Date().toISOString() }).eq("id", context.studentId).eq("school_id", context.schoolId).select("id").maybeSingle();
  if (update.error || !update.data) {
    await admin.storage.from("schoolms-records").remove([path]);
    return { error: "Unable to save the photo reference." };
  }
  revalidatePath(`/school/students/${context.studentId}`);
  return { success: true };
}

export async function uploadStudentDocument(form: FormData) {
  const context = await studentFileContext(form);
  if (!context) return { error: "You are not authorized to upload student documents." };
  const file = form.get("document");
  if (!file || typeof file === "string" || !file.size) return { error: "Choose a PDF, PNG or JPEG document." };
  if (file.size > recordSizeLimit) return { error: "Documents must be at most 5 MB." };
  const fileName = sanitizeFileName(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const inspected = inspectRecordFile(bytes, fileName);
  if (!inspected) return { error: "Choose a valid PDF, PNG or JPEG document up to 5 MB." };
  const description = text(form, "description").slice(0, 1000);
  const path = `${context.schoolId}/students/${context.studentId}/documents/${crypto.randomUUID()}-${fileName}`;
  const admin = createAdminClient();
  const upload = await admin.storage.from("schoolms-records").upload(path, bytes, { contentType: inspected.contentType, upsert: false });
  if (upload.error) return { error: "Unable to upload the document. Verify that the student records migration is installed." };
  const insert = await admin.from("student_documents").insert({ school_id: context.schoolId, student_id: context.studentId, file_name: fileName, file_path: path, description: description || null, uploaded_by: context.userId }).select("id").maybeSingle();
  if (insert.error || !insert.data) {
    await admin.storage.from("schoolms-records").remove([path]);
    return { error: "Unable to save the document record." };
  }
  revalidatePath(`/school/students/${context.studentId}`);
  return { success: true };
}

export async function deleteStudentDocument(form: FormData) {
  const context = await studentFileContext(form);
  if (!context) return { error: "You are not authorized to delete student documents." };
  const documentId = text(form, "document_id");
  if (!documentId) return { error: "Document is required." };
  const record = await context.client.from("student_documents").select("id, file_path").eq("id", documentId).eq("student_id", context.studentId).eq("school_id", context.schoolId).maybeSingle();
  if (record.error || !record.data) return { error: "Document not found." };
  const admin = createAdminClient();
  const removed = await admin.from("student_documents").delete().eq("id", documentId).eq("school_id", context.schoolId);
  if (removed.error) return { error: "Unable to delete the document record." };
  await admin.storage.from("schoolms-records").remove([record.data.file_path]);
  revalidatePath(`/school/students/${context.studentId}`);
  return { success: true };
}
