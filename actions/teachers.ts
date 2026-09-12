// "use server";

// import { revalidatePath } from "next/cache";

// import { getCurrentSchool, getCurrentUser } from "@/lib/auth/get-user";
// import { getManagementContext } from "@/lib/auth/get-management-context";

// async function getTeacherContext(requestedSchoolId?: string | null) {
//   const user = await getCurrentUser();

//   if (!user) {
//     return {
//       success: false as const,
//       error: "You must be logged in.",
//     };
//   }

//   if (user.role === "super_admin") {
//     if (!requestedSchoolId) {
//       return {
//         success: false as const,
//         error: "A school must be selected.",
//       };
//     }

//     const context = await getManagementContext(requestedSchoolId);

//     if (!context || context.role !== "super_admin") {
//       return {
//         success: false as const,
//         error: "You are not authorized to manage this school.",
//       };
//     }

//     return {
//       success: true as const,
//       schoolId: context.schoolId,
//       client: context.client,
//     };
//   }

//   const current = await getCurrentSchool();

//   if (!current || current.role !== "school_admin") {
//     return {
//       success: false as const,
//       error: "You are not authorized to manage teachers.",
//     };
//   }

//   if (requestedSchoolId && requestedSchoolId !== current.schoolId) {
//     return {
//       success: false as const,
//       error: "You cannot manage another school.",
//     };
//   }

//   return {
//     success: true as const,
//     schoolId: current.schoolId,
//     client: await getManagementContext(current.schoolId).then(
//       (context) => context?.client,
//     ),
//   };
// }

// export async function createTeacher(formData: FormData) {
//   const requestedSchoolId =
//     String(formData.get("school_id") ?? "").trim() || null;

//   const current = await getTeacherContext(requestedSchoolId);

//   if (!current.success || !current.client) {
//     return {
//       error:
//         current.success === false
//           ? current.error
//           : "Unable to access the school.",
//     };
//   }

//   const firstName = String(formData.get("first_name") ?? "").trim();

//   const lastName = String(formData.get("last_name") ?? "").trim();

//   const email = String(formData.get("email") ?? "").trim();

//   const phone = String(formData.get("phone") ?? "").trim();

//   if (!firstName || !lastName) {
//     return {
//       error: "First name and last name are required.",
//     };
//   }

//   const { error } = await current.client.from("teachers").insert({
//     school_id: current.schoolId,
//     first_name: firstName,
//     last_name: lastName,
//     email: email || null,
//     phone: phone || null,
//     status: "active",
//   });

//   if (error) {
//     console.error("Create teacher error:", error);

//     return {
//       error: "Failed to create teacher.",
//     };
//   }

//   revalidatePath("/school/teachers");
//   revalidatePath("/school/dashboard");

//   if (requestedSchoolId) {
//     revalidatePath(`/platform/schools/${requestedSchoolId}`);
//     revalidatePath(`/platform/schools/${requestedSchoolId}/teachers`);
//   }

//   return {
//     success: true,
//   };
// }

// export async function updateTeacher(formData: FormData) {
//   const requestedSchoolId =
//     String(formData.get("school_id") ?? "").trim() || null;

//   const current = await getTeacherContext(requestedSchoolId);

//   if (!current.success || !current.client) {
//     return {
//       error:
//         current.success === false
//           ? current.error
//           : "Unable to access the school.",
//     };
//   }

//   const id = String(formData.get("id") ?? "").trim();

//   const firstName = String(formData.get("first_name") ?? "").trim();

//   const lastName = String(formData.get("last_name") ?? "").trim();

//   const email = String(formData.get("email") ?? "").trim();

//   const phone = String(formData.get("phone") ?? "").trim();

//   if (!id || !firstName || !lastName) {
//     return {
//       error: "First name and last name are required.",
//     };
//   }

//   const { error } = await current.client
//     .from("teachers")
//     .update({
//       first_name: firstName,
//       last_name: lastName,
//       email: email || null,
//       phone: phone || null,
//       updated_at: new Date().toISOString(),
//     })
//     .eq("id", id)
//     .eq("school_id", current.schoolId);

//   if (error) {
//     console.error("Update teacher error:", error);

//     return {
//       error: "Failed to update teacher.",
//     };
//   }

//   revalidatePath("/school/teachers");
//   revalidatePath("/school/dashboard");

//   if (requestedSchoolId) {
//     revalidatePath(`/platform/schools/${requestedSchoolId}`);
//     revalidatePath(`/platform/schools/${requestedSchoolId}/teachers`);
//   }

//   return {
//     success: true,
//   };
// }

// export async function toggleTeacherStatus(
//   id: string,
//   status: "active" | "inactive",
//   schoolId?: string,
// ) {
//   const current = await getTeacherContext(schoolId);

//   if (!current.success || !current.client) {
//     return {
//       error:
//         current.success === false
//           ? current.error
//           : "Unable to access the school.",
//     };
//   }

//   const { error } = await current.client
//     .from("teachers")
//     .update({
//       status,
//       updated_at: new Date().toISOString(),
//     })
//     .eq("id", id)
//     .eq("school_id", current.schoolId);

//   if (error) {
//     console.error("Teacher status error:", error);

//     return {
//       error: "Failed to update teacher status.",
//     };
//   }

//   revalidatePath("/school/teachers");
//   revalidatePath("/school/dashboard");

//   if (schoolId) {
//     revalidatePath(`/platform/schools/${schoolId}`);
//     revalidatePath(`/platform/schools/${schoolId}/teachers`);
//   }

//   return {
//     success: true,
//   };
// }

"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { getManagementContext } from "@/lib/auth/get-management-context";

type TeacherStatus = "active" | "inactive";

function getString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

async function getTeacherManagementContext(requestedSchoolId?: string | null) {
  const context = await getManagementContext(requestedSchoolId);

  if (!context) {
    return {
      success: false as const,
      error: "You are not authorized to manage this school.",
    };
  }

  // Only school admins and super admins manage teachers.
  if (context.role !== "school_admin" && context.role !== "super_admin") {
    return {
      success: false as const,
      error: "Only a school administrator can manage teachers.",
    };
  }

  return {
    success: true as const,
    ...context,
  };
}

/**
 * Get all teachers for a school.
 */
export async function getTeachers(schoolId?: string | null) {
  try {
    const context = await getTeacherManagementContext(schoolId);

    if (!context.success) {
      return context;
    }

    const { data, error } = await context.client
      .from("teachers")
      .select("*")
      .eq("school_id", context.schoolId)
      .order("first_name", {
        ascending: true,
      })
      .order("last_name", {
        ascending: true,
      });

    if (error) {
      console.error("Get teachers error:", error);

      return {
        success: false as const,
        error: "Failed to load teachers.",
      };
    }

    return {
      success: true as const,
      teachers: data ?? [],
    };
  } catch (error) {
    console.error("Get teachers exception:", error);

    return {
      success: false as const,
      error: "An unexpected error occurred.",
    };
  }
}

/**
 * Create a teacher.
 *
 * This creates:
 *
 * 1. Supabase Auth account
 * 2. Profile
 * 3. School membership
 * 4. Teacher record
 */
export async function createTeacher(formData: FormData) {
  try {
    const requestedSchoolId = getString(formData, "school_id") || null;

    const context = await getTeacherManagementContext(requestedSchoolId);

    if (!context.success) {
      return {
        error: context.error,
      };
    }

    const firstName = getString(formData, "first_name");

    const lastName = getString(formData, "last_name");

    const email = getString(formData, "email").toLowerCase();

    const phone = getString(formData, "phone");

    const password = getString(formData, "password");

    if (!firstName || !lastName) {
      return {
        error: "First name and last name are required.",
      };
    }

    if (!email) {
      return {
        error: "Email is required because the teacher will use it to sign in.",
      };
    }

    if (!password) {
      return {
        error: "Password is required for the teacher account.",
      };
    }

    if (password.length < 8) {
      return {
        error: "Teacher password must be at least 8 characters.",
      };
    }

    const admin = createAdminClient();

    // -------------------------------------------------------
    // MAKE SURE SCHOOL EXISTS
    // -------------------------------------------------------

    const { data: school, error: schoolError } = await admin
      .from("schools")
      .select("id")
      .eq("id", context.schoolId)
      .maybeSingle();

    if (schoolError || !school) {
      return {
        error: "School not found.",
      };
    }

    // -------------------------------------------------------
    // CREATE AUTH ACCOUNT
    // -------------------------------------------------------

    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
        },
      });

    if (authError || !authData.user) {
      console.error("Create teacher auth error:", authError);

      return {
        error: authError?.message ?? "Failed to create teacher account.",
      };
    }

    const userId = authData.user.id;

    // -------------------------------------------------------
    // CREATE PROFILE
    // -------------------------------------------------------

    const { error: profileError } = await admin.from("profiles").upsert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
    });

    if (profileError) {
      console.error("Create teacher profile error:", profileError);

      await admin.auth.admin.deleteUser(userId);

      return {
        error: "Failed to create teacher profile.",
      };
    }

    // -------------------------------------------------------
    // CREATE SCHOOL MEMBERSHIP
    // -------------------------------------------------------

    const { error: membershipError } = await admin
      .from("school_memberships")
      .insert({
        user_id: userId,
        school_id: context.schoolId,
        role: "teacher",
      });

    if (membershipError) {
      console.error("Create teacher membership error:", membershipError);

      await admin.auth.admin.deleteUser(userId);

      return {
        error: "Failed to assign teacher to the school.",
      };
    }

    // -------------------------------------------------------
    // CREATE TEACHER RECORD
    // -------------------------------------------------------

    const { error: teacherError } = await admin.from("teachers").insert({
      school_id: context.schoolId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone: phone || null,
      status: "active",
    });

    if (teacherError) {
      console.error("Create teacher record error:", teacherError);

      // Roll back membership and auth account.
      await admin
        .from("school_memberships")
        .delete()
        .eq("user_id", userId)
        .eq("school_id", context.schoolId);

      await admin.auth.admin.deleteUser(userId);

      if (teacherError.code === "23505") {
        return {
          error: "A teacher with this information already exists.",
        };
      }

      return {
        error: teacherError.message ?? "Failed to create teacher.",
      };
    }

    // -------------------------------------------------------
    // REVALIDATE
    // -------------------------------------------------------

    revalidatePath("/school/teachers");
    revalidatePath("/school/dashboard");

    if (requestedSchoolId) {
      revalidatePath(`/platform/schools/${context.schoolId}`);

      revalidatePath(`/platform/schools/${context.schoolId}/teachers`);
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Create teacher exception:", error);

    return {
      error: "An unexpected error occurred while creating the teacher.",
    };
  }
}

/**
 * Update teacher profile.
 */
export async function updateTeacher(formData: FormData) {
  try {
    const requestedSchoolId = getString(formData, "school_id") || null;

    const context = await getTeacherManagementContext(requestedSchoolId);

    if (!context.success) {
      return {
        error: context.error,
      };
    }

    const id = getString(formData, "id");

    const firstName = getString(formData, "first_name");

    const lastName = getString(formData, "last_name");

    const email = getString(formData, "email").toLowerCase();

    const phone = getString(formData, "phone");

    if (!id) {
      return {
        error: "Teacher ID is required.",
      };
    }

    if (!firstName || !lastName) {
      return {
        error: "First name and last name are required.",
      };
    }

    const { data: existingTeacher, error: findError } = await context.client
      .from("teachers")
      .select("id")
      .eq("id", id)
      .eq("school_id", context.schoolId)
      .maybeSingle();

    if (findError) {
      console.error("Find teacher error:", findError);

      return {
        error: "Unable to find teacher.",
      };
    }

    if (!existingTeacher) {
      return {
        error: "Teacher not found.",
      };
    }

    const { error } = await context.client
      .from("teachers")
      .update({
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        phone: phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("school_id", context.schoolId);

    if (error) {
      console.error("Update teacher error:", error);

      return {
        error: error.message ?? "Failed to update teacher.",
      };
    }

    revalidatePath("/school/teachers");
    revalidatePath("/school/dashboard");

    if (requestedSchoolId) {
      revalidatePath(`/platform/schools/${context.schoolId}`);

      revalidatePath(`/platform/schools/${context.schoolId}/teachers`);
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Update teacher exception:", error);

    return {
      error: "An unexpected error occurred while updating the teacher.",
    };
  }
}

/**
 * Activate/deactivate teacher.
 */
export async function toggleTeacherStatus(
  id: string,
  status: TeacherStatus,
  schoolId?: string,
) {
  try {
    const context = await getTeacherManagementContext(schoolId);

    if (!context.success) {
      return {
        error: context.error,
      };
    }

    if (!id) {
      return {
        error: "Teacher ID is required.",
      };
    }

    if (status !== "active" && status !== "inactive") {
      return {
        error: "Invalid teacher status.",
      };
    }

    const { data: teacher, error: findError } = await context.client
      .from("teachers")
      .select("id")
      .eq("id", id)
      .eq("school_id", context.schoolId)
      .maybeSingle();

    if (findError) {
      console.error("Find teacher for status error:", findError);

      return {
        error: "Unable to find teacher.",
      };
    }

    if (!teacher) {
      return {
        error: "Teacher not found.",
      };
    }

    const { error } = await context.client
      .from("teachers")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("school_id", context.schoolId);

    if (error) {
      console.error("Teacher status error:", error);

      return {
        error: error.message ?? "Failed to update teacher status.",
      };
    }

    revalidatePath("/school/teachers");
    revalidatePath("/school/dashboard");

    if (schoolId) {
      revalidatePath(`/platform/schools/${schoolId}`);

      revalidatePath(`/platform/schools/${schoolId}/teachers`);
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Toggle teacher status exception:", error);

    return {
      error: "An unexpected error occurred while updating teacher status.",
    };
  }
}