"use server";

import { revalidatePath } from "next/cache";
import { getManagementContext } from "@/lib/auth/get-management-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { isWebsite, schoolTypes } from "@/lib/platform/validation";
import { inspectLogo, logoSizeLimit } from "@/lib/platform/logo";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function saveSchoolIdentity(form: FormData) {
  const context = await getManagementContext(text(form, "school_id"));
  if (!context || !["school_admin", "super_admin"].includes(context.role)) return { error: "Only an administrator of this school can change its identity." };
  const name = text(form, "name");
  const email = text(form, "email");
  const phone = text(form, "phone");
  const address = text(form, "address");
  const website = text(form, "website");
  const schoolType = text(form, "school_type");
  if (!name || name.length > 200) return { error: "School name must contain 1 to 200 characters." };
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return { error: "Enter a valid school email address." };
  if (phone.length > 40 || address.length > 2000) return { error: "Phone or address is too long." };
  if (!isWebsite(website)) return { error: "Enter a valid HTTP or HTTPS school website without embedded credentials." };
  if (!schoolTypes.includes(schoolType as (typeof schoolTypes)[number])) return { error: "Select a valid school type." };
  const logo = form.get("logo");
  if (typeof logo === "string" && logo) return { error: "Choose an image file for the logo." };
  let image: { bytes: Uint8Array; extension: string; contentType: string } | null = null;
  if (logo && typeof logo !== "string" && logo.size) {
    if (logo.size > logoSizeLimit) return { error: "Logo must be at most 512 KB." };
    const bytes = new Uint8Array(await logo.arrayBuffer());
    const inspected = inspectLogo(bytes);
    if (!inspected) return { error: "Choose a PNG or JPEG logo with dimensions no larger than 4096 × 4096." };
    image = { bytes, ...inspected };
  }
  const admin = createAdminClient();
  let path: string | null = null;
  if (image) {
    path = `${context.schoolId}/logos/${crypto.randomUUID()}.${image.extension}`;
    const upload = await admin.storage.from("schoolms-branding").upload(path, image.bytes, { contentType: image.contentType, upsert: false });
    if (upload.error) return { error: "Unable to upload the logo. Verify that the branding storage migration is installed." };
  }
  const result = await admin.from("schools").update({ name, email: email || null, phone: phone || null, address: address || null, website: website || null, school_type: schoolType, ...(path ? { logo_path: path } : {}), updated_at: new Date().toISOString() }).eq("id", context.schoolId).select("id").maybeSingle();
  if (result.error || !result.data) {
    if (path) await admin.storage.from("schoolms-branding").remove([path]);
    return { error: "Unable to save school identity. Verify that the school metadata migration is installed." };
  }
  revalidatePath("/school", "layout");
  revalidatePath("/platform", "layout");
  revalidatePath("/school/settings");
  revalidatePath(`/platform/schools/${context.schoolId}/settings`);
  return { success: true };
}
