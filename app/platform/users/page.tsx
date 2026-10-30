import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { readAllRows } from "@/lib/supabase/read-all";
import { getPlatformUserDirectory } from "@/lib/platform/data";
import { createPlatformSchoolUser } from "@/actions/platform";
import ConfigurationForm from "@/components/school/ConfigurationForm";

const input = "block w-full rounded-lg border border-slate-300 p-2";

export default async function PlatformUsersPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  await requireRole(["super_admin"]);
  const params = await searchParams;
  const page = params.page === undefined ? 1 : Number(params.page);
  if (!Number.isInteger(page) || page < 1 || page > 10000) notFound();
  const query = typeof params.q === "string" ? params.q.slice(0, 200).trim() : "";
  const directory = await getPlatformUserDirectory(page);
  if (!directory) redirect("/unauthorized");
  const schools = await readAllRows(createAdminClient().from("schools").select("id, name").eq("status", "active").order("name").order("id"));
  const users = directory.users.filter((user) => `${user.id} ${user.email} ${user.firstName} ${user.lastName}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <header><h1 className="text-3xl font-bold">Platform users</h1><p className="mt-2 text-slate-600">School account directory and provisioning. Platform-administrator grants are not changed on this screen.</p></header>
      <form className="flex flex-wrap gap-3">
        <input type="hidden" name="page" value={page} />
        <label>Filter this page by name, email or user ID<input className={input} name="q" defaultValue={query} maxLength={200} /></label>
        <button className="self-end rounded-lg bg-slate-900 px-4 py-2 text-white">Filter</button>
      </form>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead><tr>{["Account", "User ID", "Memberships", "Email status", "Last sign-in"].map((heading) => <th key={heading} className="p-4">{heading}</th>)}</tr></thead>
          <tbody>{users.map((user) => (
            <tr key={user.id} className="border-t">
              <td className="p-4"><p className="font-semibold">{user.firstName} {user.lastName}</p><p>{user.email}</p><p>{user.phone}</p></td>
              <td className="break-all p-4 font-mono text-xs">{user.id}</td>
              <td className="p-4">{user.isSuperAdmin && <p className="font-semibold">Platform administrator</p>}{user.memberships.map((membership) => <p key={`${membership.schoolId}:${membership.role}`}><Link className="text-green-700" href={`/platform/schools/${membership.schoolId}`}>{membership.schoolName}</Link> · {membership.role.replaceAll("_", " ")}</p>)}{!user.isSuperAdmin && !user.memberships.length && <p>No membership assigned</p>}</td>
              <td className="p-4">{user.emailConfirmed ? "Confirmed" : "Not confirmed"}</td>
              <td className="p-4">{user.lastSignIn ? new Date(user.lastSignIn).toLocaleDateString("en-GH") : "Never"}</td>
            </tr>
          ))}</tbody>
        </table>
        {!users.length && <p className="p-4">No matching accounts on this page.</p>}
      </div>
      <nav className="flex gap-6" aria-label="User directory pages">
        {page > 1 && <Link className="text-green-700" href={`/platform/users?page=${page - 1}`}>Previous page</Link>}
        <span>Page {page} · up to 50 accounts per page</span>
        {directory.hasNext && <Link className="text-green-700" href={`/platform/users?page=${page + 1}`}>Next page</Link>}
      </nav>
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Create school account</h2>
        <ConfigurationForm action={createPlatformSchoolUser} label="Create account">
          <label>School<select className={input} name="school_id" required defaultValue=""><option value="" disabled>Select an active school</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select></label>
          <label>Role<select className={input} name="role" defaultValue="teacher"><option value="school_admin">School admin</option><option value="teacher">Teacher</option><option value="accountant">Accountant</option><option value="parent">Parent</option></select></label>
          <div className="grid gap-3 sm:grid-cols-2"><label>First name<input className={input} name="first_name" required maxLength={200} /></label><label>Last name<input className={input} name="last_name" required maxLength={200} /></label></div>
          <label>Email<input className={input} name="email" type="email" required /></label>
          <label>Phone<input className={input} name="phone" type="tel" maxLength={40} /></label>
          <label>Initial password<input className={input} name="password" type="password" autoComplete="new-password" required minLength={8} /></label>
          <p className="text-sm text-slate-500">Communicate the initial password securely. This form does not send email or SMS.</p>
        </ConfigurationForm>
      </section>
    </div>
  );
}
