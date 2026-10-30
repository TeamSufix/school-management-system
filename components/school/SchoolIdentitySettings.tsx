import { redirect } from "next/navigation";
import { getManagementContext } from "@/lib/auth/get-management-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveSchoolIdentity } from "@/actions/school-identity";
import { schoolTypes } from "@/lib/platform/validation";
import ConfigurationForm from "@/components/school/ConfigurationForm";
import LogoInput from "@/components/platform/LogoInput";

const input = "block w-full rounded-lg border border-slate-300 p-2";

export default async function SchoolIdentitySettings({ schoolId }: { schoolId: string }) {
  const context = await getManagementContext(schoolId);
  if (!context || !["super_admin", "school_admin"].includes(context.role)) redirect("/unauthorized");
  const result = await context.client.from("schools").select("name, email, phone, address, website, school_type, logo_path").eq("id", context.schoolId).maybeSingle();
  if (result.error || !result.data) return <section role="status" className="rounded-xl border border-amber-200 p-5"><h2 className="font-bold">School identity setup unavailable</h2><p>Verify that the new platform metadata migration has been installed. Existing academic settings below remain separate.</p></section>;
  const school = result.data;
  let logoUrl: string | null = null;
  if (school.logo_path && school.logo_path.startsWith(`${context.schoolId}/logos/`)) {
    const signed = await createAdminClient().storage.from("schoolms-branding").createSignedUrl(school.logo_path, 600);
    logoUrl = signed.data?.signedUrl ?? null;
  }
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">School identity and contact information</h2>
      {logoUrl && <div role="img" aria-label={`${school.name} logo`} className="h-24 w-24 rounded-xl border bg-white bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${logoUrl}")` }} />}
      <ConfigurationForm action={saveSchoolIdentity} label="Save school identity">
        <input type="hidden" name="school_id" value={context.schoolId} />
        <label className="block">School name<input className={input} name="name" defaultValue={school.name} maxLength={200} required /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>Email<input className={input} name="email" type="email" defaultValue={school.email ?? ""} maxLength={254} /></label>
          <label>Phone<input className={input} name="phone" type="tel" defaultValue={school.phone ?? ""} maxLength={40} /></label>
        </div>
        <label className="block">Address<textarea className={input} name="address" defaultValue={school.address ?? ""} maxLength={2000} /></label>
        <label className="block">Website<input className={input} name="website" type="url" defaultValue={school.website ?? ""} maxLength={2048} /></label>
        <label className="block">School type<select className={input} name="school_type" defaultValue={school.school_type}>{schoolTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label>
        <LogoInput />
      </ConfigurationForm>
    </section>
  );
}
