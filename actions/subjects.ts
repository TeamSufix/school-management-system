"use server";

import { revalidatePath } from "next/cache";

import { getManagementContext } from "@/lib/auth/get-management-context";

/* GET SUBJECTS */

export async function getSubjects(requestedSchoolId?: string | null) {
  try {
    const context = await getManagementContext(requestedSchoolId);

    if (!context) {
      return {
        success: false,
        subjects: [],
        error: "You are not authorized to view subjects.",
      };
    }

    const { data, error } = await context.client
      .from("subjects")
      .select("*")
      .eq("school_id", context.schoolId)
      .order("name", {
        ascending: true,
      });

    if (error) {
      console.error("Get subjects error:", error);

      return {
        success: false,
        subjects: [],
        error: error.message || "Failed to load subjects.",
      };
    }

    return {
      success: true,
      subjects: data ?? [],
      error: null,
    };
  } catch (error) {
    console.error("Get subjects exception:", error);

    return {
      success: false,
      subjects: [],
      error: "An unexpected error occurred.",
    };
  }
}

/* CREATE SUBJECT */

export async function createSubject(formData: FormData) {
  try {
    const requestedSchoolId =
      String(formData.get("school_id") ?? "").trim() || null;

    const context = await getManagementContext(requestedSchoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to create subjects.",
      };
    }

    if (context.role !== "school_admin" && context.role !== "super_admin") {
      return {
        success: false,
        error: "You are not authorized to create subjects.",
      };
    }

    const name = String(formData.get("name") ?? "").trim();
    const code = String(formData.get("code") ?? "").trim();

    if (!name) {
      return {
        success: false,
        error: "Subject name is required.",
      };
    }

    const { error } = await context.client.from("subjects").insert({
      school_id: context.schoolId,
      name,
      code: code || null,
    });

    if (error) {
      console.error("Create subject error:", error);

      if (error.code === "23505") {
        return {
          success: false,
          error: "This subject already exists.",
        };
      }

      if (error.code === "42501") {
        return {
          success: false,
          error: "You do not have permission to create subjects.",
        };
      }

      return {
        success: false,
        error: error.message || "Failed to create subject.",
      };
    }

    revalidatePath("/school/subjects");
    revalidatePath("/school/dashboard");

    if (requestedSchoolId) {
      revalidatePath(`/platform/schools/${context.schoolId}`);
      revalidatePath(`/platform/schools/${context.schoolId}/subjects`);
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Create subject exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred while creating the subject.",
    };
  }
}

/* UPDATE SUBJECT */

export async function updateSubject(formData: FormData) {
  try {
    const requestedSchoolId =
      String(formData.get("school_id") ?? "").trim() || null;

    const context = await getManagementContext(requestedSchoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to update subjects.",
      };
    }

    if (context.role !== "school_admin" && context.role !== "super_admin") {
      return {
        success: false,
        error: "You are not authorized to update subjects.",
      };
    }

    const id = String(formData.get("id") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const code = String(formData.get("code") ?? "").trim();

    if (!id) {
      return {
        success: false,
        error: "Subject ID is required.",
      };
    }

    if (!name) {
      return {
        success: false,
        error: "Subject name is required.",
      };
    }

    const { data, error } = await context.client
      .from("subjects")
      .update({
        name,
        code: code || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("school_id", context.schoolId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Update subject error:", error);

      if (error.code === "23505") {
        return {
          success: false,
          error: "Another subject with this name already exists.",
        };
      }

      if (error.code === "42501") {
        return {
          success: false,
          error: "You do not have permission to update this subject.",
        };
      }

      return {
        success: false,
        error: error.message || "Failed to update subject.",
      };
    }

    if (!data) {
      return {
        success: false,
        error: "Subject not found.",
      };
    }

    revalidatePath("/school/subjects");
    revalidatePath("/school/dashboard");

    if (requestedSchoolId) {
      revalidatePath(`/platform/schools/${context.schoolId}`);
      revalidatePath(`/platform/schools/${context.schoolId}/subjects`);
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Update subject exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred while updating the subject.",
    };
  }
}

/* DELETE SUBJECT */

export async function deleteSubject(id: string, requestedSchoolId?: string) {
  try {
    if (!id) {
      return {
        success: false,
        error: "Subject ID is required.",
      };
    }

    const context = await getManagementContext(requestedSchoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to delete subjects.",
      };
    }

    if (context.role !== "school_admin" && context.role !== "super_admin") {
      return {
        success: false,
        error: "You are not authorized to delete subjects.",
      };
    }

    const { data, error } = await context.client
      .from("subjects")
      .delete()
      .eq("id", id)
      .eq("school_id", context.schoolId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Delete subject error:", error);

      if (error.code === "23503") {
        return {
          success: false,
          error:
            "This subject cannot be deleted because it is already being used.",
        };
      }

      if (error.code === "42501") {
        return {
          success: false,
          error: "You do not have permission to delete this subject.",
        };
      }

      return {
        success: false,
        error:
          "Failed to delete subject. It may already be used by other records.",
      };
    }

    if (!data) {
      return {
        success: false,
        error: "Subject not found.",
      };
    }

    revalidatePath("/school/subjects");
    revalidatePath("/school/dashboard");

    if (requestedSchoolId) {
      revalidatePath(`/platform/schools/${context.schoolId}`);
      revalidatePath(`/platform/schools/${context.schoolId}/subjects`);
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Delete subject exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred while deleting the subject.",
    };
  }
}