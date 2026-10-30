import { redirect } from "next/navigation";

import { getStudentContext } from "@/lib/auth/get-student-context";
import StudentRecords from "@/components/school/StudentRecords";

export default async function StudentRecordsPage() {
  const context = await getStudentContext();
  if (!context) redirect("/login");

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <h1 className="text-3xl font-bold text-slate-900">My Records</h1>
      <p className="mt-2 text-sm text-slate-500">
        Attendance, results and fee statements for {context.student.first_name} {context.student.last_name}.
      </p>
      <StudentRecords studentId={context.studentId} />
    </main>
  );
}
