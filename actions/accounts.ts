"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";

export type AccountRole = "teacher" | "accountant" | "parent";

type CreateAccountInput = {
  schoolId: string;
  role: AccountRole;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
};

export async function createSchoolAccount(input: CreateAccountInput) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return {
      success: false,
      error: "You must be logged in.",
    };
  }

  /*
   * Only Super Admins and School Admins can create
   * school accounts.
   */
  if (
    currentUser.role !== "super_admin" &&
    currentUser.role !== "school_admin"
  ) {
    return {
      success: false,
      error: "You do not have permission to create accounts.",
    };
  }

  if (!input.schoolId) {
    return {
      success: false,
      error: "School is required.",
    };
  }

  /*
   * School Admins can only create accounts
   * inside their own school.
   */
  if (
    currentUser.role === "school_admin" &&
    currentUser.schoolId !== input.schoolId
  ) {
    return {
      success: false,
      error: "You cannot create an account for another school.",
    };
  }

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;
  const password = input.password;

  if (!firstName || !lastName || !email || !password) {
    return {
      success: false,
      error: "First name, last name, email and password are required.",
    };
  }

  if (password.length < 8) {
    return {
      success: false,
      error: "Password must be at least 8 characters.",
    };
  }

  const admin = createAdminClient();

  /*
   * Confirm that the school exists.
   */
  const { data: school, error: schoolError } = await admin
    .from("schools")
    .select("id, name")
    .eq("id", input.schoolId)
    .maybeSingle();

  if (schoolError || !school) {
    console.error("School lookup error:", schoolError);

    return {
      success: false,
      error: "School not found.",
    };
  }

  /*
   * Create the Supabase Auth account.
   */
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone,
      },
    });

//   if (authError || !authData.user) {
//     console.error("Create account auth error:", authError);

//     return {
//       success: false,
//       error: authError?.message || "Unable to create login account.",
//     };
//   }

if (authError || !authData.user) {
  console.error("========== CREATE ACCOUNT: AUTH FAILED ==========");
  console.error("Auth error:", authError);
  console.error("Email:", email);
  console.error("Role:", input.role);
  console.error("School ID:", input.schoolId);
  console.error("=================================================");

  return {
    success: false,
    error: authError?.message || "Unable to create login account.",
  };
}

  const userId = authData.user.id;

  /*
   * Create profile.
   */
  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    first_name: firstName,
    last_name: lastName,
    phone,
  });

//   if (profileError) {
//     console.error("Create account profile error:", profileError);

//     await admin.auth.admin.deleteUser(userId);

//     return {
//       success: false,
//       error: "Unable to create the user profile.",
//     };
//   }

if (profileError) {
  console.error("========== CREATE ACCOUNT: PROFILE FAILED ==========");
  console.error("Profile error:", profileError);
  console.error("User ID:", userId);
  console.error("=====================================================");

  await admin.auth.admin.deleteUser(userId);

  return {
    success: false,
    error: profileError.message || "Unable to create the user profile.",
  };
}

  /*
   * Assign the user to the school.
   */
  const { error: membershipError } = await admin
    .from("school_memberships")
    .insert({
      user_id: userId,
      school_id: input.schoolId,
      role: input.role,
    });

//   if (membershipError) {
//     console.error(
//       "Create account membership error:",
//       membershipError,
//     );

//     await admin.from("profiles").delete().eq("id", userId);

//     await admin.auth.admin.deleteUser(userId);

//     return {
//       success: false,
//       error:
//         membershipError.message ||
//         "Unable to assign the user to the school.",
//     };
//   }

if (membershipError) {
  console.error("========== CREATE ACCOUNT: MEMBERSHIP FAILED ==========");
  console.error("Membership error:", membershipError);
  console.error("User ID:", userId);
  console.error("School ID:", input.schoolId);
  console.error("Role:", input.role);
  console.error("=========================================================");

  await admin.auth.admin.deleteUser(userId);

  return {
    success: false,
    error:
      membershipError.message || "Unable to assign the user to the school.",
  };
}

  /*
   * Teachers need a teacher record connected
   * directly to their Auth user.
   */
  if (input.role === "teacher") {
    const { error: teacherError } = await admin.from("teachers").insert({
      school_id: input.schoolId,
      user_id: userId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      status: "active",
    });

    // if (teacherError) {
    //   console.error(
    //     "Create teacher record error:",
    //     teacherError,
    //   );

    //   /*
    //    * Roll everything back.
    //    */
    //   await admin
    //     .from("school_memberships")
    //     .delete()
    //     .eq("user_id", userId)
    //     .eq("school_id", input.schoolId);

    //   await admin
    //     .from("profiles")
    //     .delete()
    //     .eq("id", userId);

    //   await admin.auth.admin.deleteUser(userId);

    //   return {
    //     success: false,
    //     error:
    //       teacherError.message ||
    //       "Unable to create teacher record.",
    //   };
    // }

    if (teacherError) {
      console.error("========== CREATE ACCOUNT: TEACHER FAILED ==========");
      console.error("Teacher error:", teacherError);
      console.error("Teacher error code:", teacherError.code);
      console.error("Teacher error details:", teacherError.details);
      console.error("Teacher error hint:", teacherError.hint);
      console.error("User ID:", userId);
      console.error("School ID:", input.schoolId);
      console.error("======================================================");

      await admin
        .from("school_memberships")
        .delete()
        .eq("user_id", userId)
        .eq("school_id", input.schoolId);

      await admin.from("profiles").delete().eq("id", userId);

      await admin.auth.admin.deleteUser(userId);

      return {
        success: false,
        error: teacherError.message || "Unable to create teacher record.",
      };
    }
  }

  /*
   * Accountants can later receive their own
   * accountant record here if required.
   */
  if (input.role === "accountant") {
    // Accountant-specific record can be added here.
  }

  /*
   * Parents can later receive their own
   * parent record here if required.
   */
  if (input.role === "parent") {
    // Parent-specific record can be added here.
  }

  /*
   * Refresh relevant pages.
   */
  revalidatePath("/school/dashboard");
  revalidatePath("/school/teachers");
  revalidatePath("/school/accountants");
  revalidatePath("/school/parents");

  revalidatePath("/platform/schools");
  revalidatePath(`/platform/schools/${input.schoolId}`);
  revalidatePath(`/platform/schools/${input.schoolId}/teachers`);
  revalidatePath(`/platform/schools/${input.schoolId}/accountants`);
  revalidatePath(`/platform/schools/${input.schoolId}/parents`);

  return {
    success: true,
    userId,
    schoolId: input.schoolId,
    role: input.role,
  };
}