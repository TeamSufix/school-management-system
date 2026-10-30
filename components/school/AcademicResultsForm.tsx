import ResultsForm from "@/components/school/ResultsForm";
import { getManagementContext } from "@/lib/auth/get-management-context";
import { defaultAcademicPeriod, type AcademicPeriod } from "@/lib/academics/period";

export default async function AcademicResultsForm(props: { classes: { id: string; name: string }[]; subjects: { id: string; name: string }[]; schoolId: string }) {
  const context = await getManagementContext(props.schoolId);
  if (!context) return <p role="alert">Academic access is unavailable. Ask your administrator to verify your account, assignments and database setup.</p>;
  const { data, error } = await context.client.from("school_academic_settings").select("academic_year, term").eq("school_id", context.schoolId).maybeSingle();
  return <>{(error || !data) && <p className="mb-4 text-amber-800">The school academic period is not configured. Verify the year and term before saving.</p>}<ResultsForm {...props} canManage={context.role === "school_admin" || context.role === "super_admin"} initialPeriod={(data ?? defaultAcademicPeriod()) as AcademicPeriod} /></>;
}
