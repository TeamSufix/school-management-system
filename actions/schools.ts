"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createSchool(formData: FormData) {
  const role = await getCurrentRole();

  if (role !== "super_admin") {
    return {
      error: "You are not authorized to create a school.",
    };
  }

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!name) {
    return {
      error: "School name is required.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "You must be logged in.",
    };
  }

  const { error } = await supabase.from("schools").insert({
    name,
    code: code || null,
    phone: phone || null,
    email: email || null,
    address: address || null,
    status: "active",
    created_by: user.id,
  });

  if (error) {
    console.error("Create school error:", error);

    if (error.code === "23505") {
      return {
        error: "A school with this code already exists.",
      };
    }

    return {
      error: "Failed to create school.",
    };
  }

  revalidatePath("/platform/schools");

  return {
    success: true,
  };
}

export async function updateSchool(schoolId: string, formData: FormData) {
  const role = await getCurrentRole();

  if (role !== "super_admin") {
    return {
      error: "You are not authorized to update schools.",
    };
  }

  if (!schoolId) {
    return {
      error: "School ID is required.",
    };
  }

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();

  if (!name) {
    return {
      error: "School name is required.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("schools")
    .update({
      name,
      code: code || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      city: city || null,
      country: country || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", schoolId);

  if (error) {
    console.error("Update school error:", error);

    if (error.code === "23505") {
      return {
        error: "A school with this code already exists.",
      };
    }

    return {
      error: "Failed to update school.",
    };
  }

  revalidatePath("/platform/schools");
  revalidatePath(`/platform/schools/${schoolId}/edit`);

  return {
    success: true,
  };
}

export async function toggleSchoolStatus(
  schoolId: string,
  status: "active" | "inactive",
) {
  const role = await getCurrentRole();

  if (role !== "super_admin") {
    return {
      error: "You are not authorized to change school status.",
    };
  }

  if (!schoolId) {
    return {
      error: "School ID is required.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("schools")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", schoolId);

  if (error) {
    console.error("Toggle school status error:", error);

    return {
      error: "Failed to update school status.",
    };
  }

  revalidatePath("/platform/schools");
  revalidatePath(`/platform/schools/${schoolId}/edit`);

  return {
    success: true,
  };
}

export async function createSchoolAdmin(schoolId: string, formData: FormData) {
  const role = await getCurrentRole();

  if (role !== "super_admin") {
    return {
      error: "You are not authorized to create school administrators.",
    };
  }

  const firstName = String(formData.get("first_name") ?? "").trim();

  const lastName = String(formData.get("last_name") ?? "").trim();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") ?? "");

  if (!schoolId) {
    return {
      error: "School ID is required.",
    };
  }

  if (!firstName || !lastName || !email || !password) {
    return {
      error: "All fields are required.",
    };
  }

  if (password.length < 8) {
    return {
      error: "Password must be at least 8 characters.",
    };
  }

  const supabase = await createAdminClient();

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("id")
    .eq("id", schoolId)
    .single();

  if (schoolError || !school) {
    return {
      error: "School not found.",
    };
  }

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });

  if (authError || !authData.user) {
    console.error("Create school admin auth error:", authError);

    return {
      error: authError?.message ?? "Failed to create school administrator.",
    };
  }

  const userId = authData.user.id;

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    first_name: firstName,
    last_name: lastName,
  });

  if (profileError) {
    console.error("Create profile error:", profileError);

    await supabase.auth.admin.deleteUser(userId);

    return {
      error: "Failed to create administrator profile.",
    };
  }

  const { error: membershipError } = await supabase
    .from("school_memberships")
    .insert({
      user_id: userId,
      school_id: schoolId,
      role: "school_admin",
    });

  if (membershipError) {
    console.error("Create school membership error:", membershipError);

    await supabase.auth.admin.deleteUser(userId);

    return {
      error: "Failed to assign administrator to school.",
    };
  }

  revalidatePath(`/platform/schools/${schoolId}`);

  return {
    success: true,
  };
}