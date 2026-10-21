"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";

export async function linkStudentToParent(input: {
  parentId: string;
  studentId: string;
  relationship?: string;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return {
      success: false,
      error: "You must be logged in.",
    };
  }

  if (
    currentUser.role !== "school_admin" &&
    currentUser.role !== "super_admin"
  ) {
    return {
      success: false,
      error: "You do not have permission to link students.",
    };
  }

  if (!input.parentId || !input.studentId) {
    return {
      success: false,
      error: "Parent and student are required.",
    };
  }

  const admin = createAdminClient();

  /* Get the parent membership. */
  const { data: parentMembership, error: parentError } = await admin
    .from("school_memberships")
    .select("user_id, school_id, role")
    .eq("user_id", input.parentId)
    .eq("role", "parent")
    .maybeSingle();

  if (parentError || !parentMembership) {
    console.error("Parent lookup error:", parentError);

    return {
      success: false,
      error: "Parent account not found.",
    };
  }

  /* Get the student. */
  const { data: student, error: studentError } = await admin
    .from("students")
    .select("id, school_id, first_name, last_name")
    .eq("id", input.studentId)
    .maybeSingle();

  if (studentError || !student) {
    console.error("Student lookup error:", studentError);

    return {
      success: false,
      error: "Student not found.",
    };
  }

  /* Parent and student belong to the same school. */
  if (parentMembership.school_id !== student.school_id) {
    return {
      success: false,
      error: "Parent and student must belong to the same school.",
    };
  }

  /* School Admin can only work inside their own school. */
  if (
    currentUser.role === "school_admin" &&
    currentUser.schoolId !== student.school_id
  ) {
    return {
      success: false,
      error: "You cannot link a student from another school.",
    };
  }

  /* Create the relationship between student and parent. */
  const { error: linkError } = await admin
    .from("student_parents")
    .insert({
      student_id: input.studentId,
      parent_id: input.parentId,
      relationship: input.relationship?.trim() || null,
    });

  if (linkError) {
    console.error("Student parent link error:", linkError);

    if (linkError.code === "23505") {
      return {
        success: false,
        error: "This student is already linked to this parent.",
      };
    }

    return {
      success: false,
      error: linkError.message || "Unable to link student to parent.",
    };
  }

  revalidatePath("/school/parents");
  revalidatePath("/school/students");
  revalidatePath("/parent/dashboard");

  return {
    success: true,
  };
}

export async function unlinkStudentFromParent(input: {
  parentId: string;
  studentId: string;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return {
      success: false,
      error: "You must be logged in.",
    };
  }

  if (
    currentUser.role !== "school_admin" &&
    currentUser.role !== "super_admin"
  ) {
    return {
      success: false,
      error: "You do not have permission to remove this link.",
    };
  }

  const admin = createAdminClient();

  const { data: student } = await admin
    .from("students")
    .select("id, school_id")
    .eq("id", input.studentId)
    .maybeSingle();

  if (!student) {
    return {
      success: false,
      error: "Student not found.",
    };
  }

  if (
    currentUser.role === "school_admin" &&
    currentUser.schoolId !== student.school_id
  ) {
    return {
      success: false,
      error: "You cannot modify another school's records.",
    };
  }

  const { error } = await admin
    .from("student_parents")
    .delete()
    .eq("parent_id", input.parentId)
    .eq("student_id", input.studentId);

  if (error) {
    console.error("Unlink student parent error:", error);

    return {
      success: false,
      error: error.message || "Unable to remove student link.",
    };
  }

  revalidatePath("/school/parents");
  revalidatePath("/school/students");
  revalidatePath("/parent/dashboard");

  return {
    success: true,
  };
}