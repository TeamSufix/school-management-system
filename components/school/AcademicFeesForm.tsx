import FeesPageClient from "@/components/school/FeesPageClient";
import { getManagementContext } from "@/lib/auth/get-management-context";
import { defaultAcademicPeriod, type AcademicPeriod } from "@/lib/academics/period";

export default async function AcademicFeesForm(props: { students: { id: string; first_name: string; last_name: string; student_id: string }[]; schoolId: string }) {
  const context = await getManagementContext(props.schoolId);
  if (!context || !["school_admin", "super_admin", "accountant"].includes(context.role)) return <p role="alert">You do not have access to financial records.</p>;
  const { data, error } = await context.client.from("school_academic_settings").select("academic_year, term").eq("school_id", context.schoolId).maybeSingle();
  return <>{(error || !data) && <p className="mb-4 text-amber-800">The school academic period is not configured. Verify the year and term before saving.</p>}<FeesPageClient {...props} initialPeriod={(data ?? defaultAcademicPeriod()) as AcademicPeriod} /></>;
}
