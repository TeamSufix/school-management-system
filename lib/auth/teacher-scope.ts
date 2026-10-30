import type { ManagementContext } from "@/lib/auth/get-management-context";

export function canAccessTeachingScope(
  context: Pick<ManagementContext, "role" | "teacherAssignments">,
  classId?: string | null,
  subjectId?: string | null,
) {
  return context.role !== "teacher" || (context.teacherAssignments ?? []).some(
    (assignment) => (!classId || assignment.class_id === classId) && (!subjectId || assignment.subject_id === subjectId),
  );
}
