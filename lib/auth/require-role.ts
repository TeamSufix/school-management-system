import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import type { UserRole } from "@/lib/auth/get-user";

/* Require an authenticated user. */
export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

/* Require one of the supplied application roles. */
export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireUser();

  if (!user.role || !allowedRoles.includes(user.role)) {
    redirect("/unauthorized");
  }

  return user;
}

/**
 * Require a school-level account.
 *
 * Super admins are intentionally excluded because
 * they operate through the platform.
 */
export async function requireSchoolUser() {
  const user = await requireUser();

  const schoolRoles: UserRole[] = ["school_admin", "teacher", "accountant"];

  if (!user.role || !schoolRoles.includes(user.role) || !user.schoolId) {
    redirect("/unauthorized");
  }

  return user;
}

/* Require school admin. */
export async function requireSchoolAdmin() {
  return requireRole(["school_admin"]);
}

/* Require teacher.*/
export async function requireTeacher() {
  return requireRole(["teacher"]);
}

/* Require accountant. */
export async function requireAccountant() {
  return requireRole(["accountant"]);
}

/* Require super admin. */
export async function requireSuperAdmin() {
  return requireRole(["super_admin"]);
}