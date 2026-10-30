import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";

export type StudentContext = {
  userId: string;
  schoolId: string;
  studentId: string;
  classId: string | null;
  student: {
    id: string;
    first_name: string;
    last_name: string;
    student_id: string;
    class_id: string | null;
  };
  client: Awaited<ReturnType<typeof createClient>>;
};

/**
 * Context for a signed-in student account. A student login is linked through
 * students.user_id and carries a `student` school membership.
 */
export async function getStudentContext(): Promise<StudentContext | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "student" || !user.schoolId) return null;

  const client = await createClient();
  const { data: student, error } = await client
    .from("students")
    .select("id, first_name, last_name, student_id, class_id, status")
    .eq("school_id", user.schoolId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("getStudentContext student error:", error);
    return null;
  }
  if (!student || student.status !== "active") return null;

  return {
    userId: user.id,
    schoolId: user.schoolId,
    studentId: student.id,
    classId: student.class_id,
    student: {
      id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      student_id: student.student_id,
      class_id: student.class_id,
    },
    client,
  };
}
