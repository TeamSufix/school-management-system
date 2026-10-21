"use server";

import { revalidatePath } from "next/cache";

import { getManagementContext } from "@/lib/auth/get-management-context";

export type ClassFormData = {
  id?: string;
  name: string;
  level?: string | null;
  school_id?: string | null;
};

function canManageClasses(role: string) {
  return role === "school_admin" || role === "super_admin";
}

/* GET CLASSES */

export async function getClasses(requestedSchoolId?: string | null) {
  try {
    const context = await getManagementContext(requestedSchoolId);

    if (!context) {
      return {
        success: false,
        data: [],
        error: "You are not authorized to view classes.",
      };
    }

    const { data, error } = await context.client
      .from("classes")
      .select("*")
      .eq("school_id", context.schoolId)
      .order("name", {
        ascending: true,
      });

    if (error) {
      console.error("Get classes error:", error);

      return {
        success: false,
        data: [],
        error: error.message || "Failed to load classes.",
      };
    }

    return {
      success: true,
      data: data ?? [],
      error: null,
    };
  } catch (error) {
    console.error("Get classes exception:", error);

    return {
      success: false,
      data: [],
      error: "An unexpected error occurred.",
    };
  }
}

/* CREATE CLASS */

export async function createClass(formData: FormData) {
  try {
    const requestedSchoolId =
      String(formData.get("school_id") ?? "").trim() || null;

    const context = await getManagementContext(requestedSchoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to create classes.",
      };
    }

    if (!canManageClasses(context.role)) {
      return {
        success: false,
        error: "You are not authorized to create classes.",
      };
    }

    const name = String(formData.get("name") ?? "").trim();
    const level = String(formData.get("level") ?? "").trim() || null;

    if (!name) {
      return {
        success: false,
        error: "Class name is required.",
      };
    }

    const { error } = await context.client.from("classes").insert({
      school_id: context.schoolId,
      name,
      level,
    });

    if (error) {
      console.error("Create class error:", error);

      if (error.code === "23505") {
        return {
          success: false,
          error: "A class with this name already exists.",
        };
      }

      if (error.code === "23503") {
        return {
          success: false,
          error: "The selected school does not exist.",
        };
      }

      if (error.code === "42501") {
        return {
          success: false,
          error: "You do not have permission to create classes.",
        };
      }

      return {
        success: false,
        error: error.message || "Failed to create class.",
      };
    }

    revalidatePath("/school/classes");
    revalidatePath("/school/dashboard");

    if (requestedSchoolId) {
      revalidatePath(`/platform/schools/${context.schoolId}`);
      revalidatePath(`/platform/schools/${context.schoolId}/classes`);
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Create class exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred while creating the class.",
    };
  }
}

/* UPDATE CLASS */

export async function updateClass(formData: FormData) {
  try {
    const id = String(formData.get("id") ?? "").trim();

    if (!id) {
      return {
        success: false,
        error: "Class ID is required.",
      };
    }

    const requestedSchoolId =
      String(formData.get("school_id") ?? "").trim() || null;

    const context = await getManagementContext(requestedSchoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to update classes.",
      };
    }

    if (!canManageClasses(context.role)) {
      return {
        success: false,
        error: "You are not authorized to update classes.",
      };
    }

    const name = String(formData.get("name") ?? "").trim();
    const level = String(formData.get("level") ?? "").trim() || null;

    if (!name) {
      return {
        success: false,
        error: "Class name is required.",
      };
    }

    const { data, error } = await context.client
      .from("classes")
      .update({
        name,
        level,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("school_id", context.schoolId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Update class error:", error);

      if (error.code === "23505") {
        return {
          success: false,
          error: "A class with this name already exists.",
        };
      }

      if (error.code === "42501") {
        return {
          success: false,
          error: "You do not have permission to update this class.",
        };
      }

      return {
        success: false,
        error: error.message || "Failed to update class.",
      };
    }

    if (!data) {
      return {
        success: false,
        error: "Class not found.",
      };
    }

    revalidatePath("/school/classes");
    revalidatePath("/school/dashboard");

    if (requestedSchoolId) {
      revalidatePath(`/platform/schools/${context.schoolId}`);
      revalidatePath(`/platform/schools/${context.schoolId}/classes`);
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Update class exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred while updating the class.",
    };
  }
}

/* DELETE CLASS */

export async function deleteClass(id: string, requestedSchoolId?: string) {
  try {
    if (!id) {
      return {
        success: false,
        error: "Class ID is required.",
      };
    }

    const context = await getManagementContext(requestedSchoolId);

    if (!context) {
      return {
        success: false,
        error: "You are not authorized to delete classes.",
      };
    }

    if (!canManageClasses(context.role)) {
      return {
        success: false,
        error: "You are not authorized to delete classes.",
      };
    }

    const { data, error } = await context.client
      .from("classes")
      .delete()
      .eq("id", id)
      .eq("school_id", context.schoolId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Delete class error:", error);

      if (error.code === "23503") {
        return {
          success: false,
          error:
            "This class cannot be deleted because it is already being used.",
        };
      }

      if (error.code === "42501") {
        return {
          success: false,
          error: "You do not have permission to delete this class.",
        };
      }

      return {
        success: false,
        error: error.message || "Failed to delete class.",
      };
    }

    if (!data) {
      return {
        success: false,
        error: "Class not found.",
      };
    }

    revalidatePath("/school/classes");
    revalidatePath("/school/dashboard");

    if (requestedSchoolId) {
      revalidatePath(`/platform/schools/${context.schoolId}`);
      revalidatePath(`/platform/schools/${context.schoolId}/classes`);
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Delete class exception:", error);

    return {
      success: false,
      error: "An unexpected error occurred while deleting the class.",
    };
  }
}