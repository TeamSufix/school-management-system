// "use server";

// import { redirect } from "next/navigation";
// import { createClient } from "@/lib/supabase/server";
// import { revalidatePath } from "next/cache";

// export async function login(formData: FormData) {
//   const email = String(formData.get("email") ?? "")
//     .trim()
//     .toLowerCase();

//   const password = String(formData.get("password") ?? "");

//   if (!email || !password) {
//     return {
//       error: "Email and password are required.",
//     };
//   }

//   const supabase = await createClient();

//   const { error } = await supabase.auth.signInWithPassword({
//     email,
//     password,
//   });

//   if (error) {
//     console.error("Login error:", error);

//     return {
//       error: error.message,
//     };
//   }

//   const {
//     data: { user },
//   } = await supabase.auth.getUser();

//   if (!user) {
//     return {
//       error: "Authentication succeeded, but no user session was found.",
//     };
//   }

//   /*
//    * Check platform membership first.
//    */
//   const { data: platformMembership } = await supabase
//     .from("platform_memberships")
//     .select("role")
//     .eq("user_id", user.id)
//     .maybeSingle();

//   if (platformMembership?.role === "super_admin") {
//     revalidatePath("/platform/dashboard");

//     redirect("/platform/dashboard");
//   }

//   /*
//    * Check school membership.
//    */
//   const { data: schoolMembership } = await supabase
//     .from("school_memberships")
//     .select("school_id, role")
//     .eq("user_id", user.id)
//     .maybeSingle();

//   if (
//     schoolMembership?.role === "school_admin" ||
//     schoolMembership?.role === "teacher" ||
//     schoolMembership?.role === "accountant"
//   ) {
//     revalidatePath("/school/dashboard");

//     redirect("/school/dashboard");
//   }

//   /*
//    * User authenticated but has no valid application role.
//    */
//   await supabase.auth.signOut();

//   return {
//     error: "Your account does not have a valid role.",
//   };
// }

// export async function logout() {
//   const supabase = await createClient();

//   await supabase.auth.signOut();

//   redirect("/login");
// }

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getDashboardForRole } from "@/lib/auth/redirect-after-login";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      error: "Email and password are required.",
    };
  }

  const supabase = await createClient();

  // =========================================================
  // AUTHENTICATE
  // =========================================================

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error("Login error:", signInError);

    return {
      error: "Invalid email or password.",
    };
  }

  // =========================================================
  // RESOLVE APPLICATION ACCOUNT
  // =========================================================

  const user = await getCurrentUser();

  if (!user) {
    await supabase.auth.signOut();

    return {
      error: "Authentication succeeded, but your account could not be loaded.",
    };
  }

  // =========================================================
  // VALID ROLE
  // =========================================================

  if (!user.role) {
    await supabase.auth.signOut();

    return {
      error:
        "Your account has been created, but no valid application role is assigned.",
    };
  }

  // =========================================================
  // SCHOOL VALIDATION
  // =========================================================

  if (user.role !== "super_admin" && !user.schoolId) {
    await supabase.auth.signOut();

    return {
      error:
        "Your account is not connected to a school. Please contact the administrator.",
    };
  }

  // =========================================================
  // REDIRECT
  // =========================================================

  const dashboard = getDashboardForRole(user.role);

  revalidatePath(dashboard);

  redirect(dashboard);
}

export async function logout() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/login");
}