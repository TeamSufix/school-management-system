import { redirect } from "next/navigation";
import { getManagementContext } from "@/lib/auth/get-management-context";
import { createAnnouncement, deleteAnnouncement } from "@/actions/communication";
import ConfigurationForm from "@/components/school/ConfigurationForm";

const input = "block w-full rounded-lg border border-slate-300 p-2";
const audienceLabel: Record<string, string> = { all: "Everyone", staff: "Staff", teachers: "Teachers", parents: "Parents", students: "Students" };

export default async function AnnouncementsManager({ schoolId }: { schoolId?: string }) {
  const context = await getManagementContext(schoolId);
  if (!context || !["super_admin", "school_admin", "teacher", "accountant"].includes(context.role)) redirect("/unauthorized");
  const announcements = await context.client
    .from("announcements")
    .select("id, title, body, audience, publish_on, created_at")
    .eq("school_id", context.schoolId)
    .order("publish_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (announcements.error) {
    return <main className="mx-auto max-w-4xl p-8"><h1 className="text-2xl font-bold">Announcements unavailable</h1><p className="mt-4">Verify that the communication migration has been installed.</p></main>;
  }
  const canManage = ["school_admin", "super_admin"].includes(context.role);
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-3xl font-bold">Announcements</h1>
      {canManage && (
        <ConfigurationForm action={createAnnouncement} label="Publish announcement">
          {schoolId && <input type="hidden" name="school_id" value={schoolId} />}
          <label className="block">Title<input className={input} name="title" maxLength={200} required /></label>
          <label className="block">Message<textarea className={input} name="body" rows={4} maxLength={5000} required /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>Audience<select className={input} name="audience" defaultValue="all"><option value="all">Everyone</option><option value="staff">Staff</option><option value="teachers">Teachers</option><option value="parents">Parents</option><option value="students">Students</option></select></label>
            <label>Publish date<input className={input} name="publish_on" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
          </div>
        </ConfigurationForm>
      )}
      <div className="space-y-3">
        {!announcements.data?.length && <p>No announcements yet.</p>}
        {announcements.data?.map((announcement) => (
          <article key={announcement.id} className="rounded-2xl border border-slate-200 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold">{announcement.title}</h2>
                <p className="text-xs text-slate-500">{audienceLabel[announcement.audience]} · {announcement.publish_on}</p>
              </div>
              {canManage && <ConfigurationForm action={deleteAnnouncement} label="Delete">{schoolId && <input type="hidden" name="school_id" value={schoolId} />}<input type="hidden" name="announcement_id" value={announcement.id} /></ConfigurationForm>}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{announcement.body}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
