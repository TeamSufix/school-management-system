import type { UserRole } from "@/lib/auth/get-user";

export function getDashboardForRole(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "/platform/dashboard";

    case "school_admin":
      return "/school/dashboard";

    case "teacher":
      return "/school/dashboard";

    case "accountant":
      return "/school/dashboard";

    case "parent":
      return "/parent/dashboard";

    default:
      return "/login";
  }
}