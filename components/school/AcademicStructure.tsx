import { getManagementContext } from "@/lib/auth/get-management-context";
import { saveAcademicSession, saveAcademicTerm, saveStream, removeStream, setCurrentSession, setCurrentTerm } from "@/actions/academics";
import ConfigurationForm from "@/components/school/ConfigurationForm";

const input = "block w-full rounded-lg border border-slate-300 p-2";

export default async function AcademicStructure({ schoolId }: { schoolId: string }) {
  const context = await getManagementContext(schoolId);
  if (!context || !["super_admin", "school_admin"].includes(context.role)) return null;
  const [sessions, terms, classes, streams] = await Promise.all([
    context.client.from("academic_sessions").select("id, name, starts_on, ends_on, is_current").eq("school_id", context.schoolId).order("name", { ascending: false }),
    context.client.from("academic_terms").select("id, session_id, name, starts_on, ends_on, is_current").eq("school_id", context.schoolId).order("created_at"),
    context.client.from("classes").select("id, name").eq("school_id", context.schoolId).order("name"),
    context.client.from("streams").select("id, class_id, name").eq("school_id", context.schoolId).order("name"),
  ]);
  if ([sessions, terms, classes, streams].some((result) => result.error)) {
    return <section role="status" className="rounded-xl border border-amber-200 p-5"><h2 className="font-bold">Academic structure unavailable</h2><p>Verify that the academic structure migration has been installed.</p></section>;
  }
  const sessionRows = sessions.data ?? [];
  const termRows = terms.data ?? [];
  const classRows = classes.data ?? [];
  const streamRows = streams.data ?? [];
  const termName = (name: string) => name.replace("_", " ").replace(/^./, (c) => c.toUpperCase());
  return (
    <section className="space-y-6">
      <h2 className="text-xl font-bold">Academic sessions, terms and streams</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <ConfigurationForm action={saveAcademicSession} label="Add session">
          <input type="hidden" name="school_id" value={context.schoolId} />
          <h3 className="font-semibold">New academic session</h3>
          <label className="block">Name<input className={input} name="name" placeholder="2026/2027" pattern="[0-9]{4}/[0-9]{4}" required /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>Starts on<input className={input} name="starts_on" type="date" /></label>
            <label>Ends on<input className={input} name="ends_on" type="date" /></label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_current" /> Current session</label>
        </ConfigurationForm>
        <ConfigurationForm action={saveAcademicTerm} label="Add term">
          <input type="hidden" name="school_id" value={context.schoolId} />
          <h3 className="font-semibold">New term</h3>
          <label className="block">Session<select className={input} name="session_id" required defaultValue=""><option value="" disabled>Select session</option>{sessionRows.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}</select></label>
          <label className="block">Term<select className={input} name="name" required><option value="term_1">Term 1</option><option value="term_2">Term 2</option><option value="term_3">Term 3</option></select></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>Starts on<input className={input} name="starts_on" type="date" /></label>
            <label>Ends on<input className={input} name="ends_on" type="date" /></label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_current" /> Current term</label>
        </ConfigurationForm>
      </div>
      <div className="space-y-2">
        {sessionRows.map((session) => (
          <div key={session.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold">{session.name} {session.is_current && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">current</span>}</p>
              {!session.is_current && <ConfigurationForm action={setCurrentSession} label="Set current"><input type="hidden" name="school_id" value={context.schoolId} /><input type="hidden" name="session_id" value={session.id} /></ConfigurationForm>}
            </div>
            <p className="text-sm text-slate-500">{session.starts_on ?? "—"} to {session.ends_on ?? "—"}</p>
            <ul className="mt-2 space-y-1">
              {termRows.filter((term) => term.session_id === session.id).map((term) => (
                <li key={term.id} className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-medium">{termName(term.name)}</span>
                  <span className="text-slate-500">{term.starts_on ?? "—"} to {term.ends_on ?? "—"}</span>
                  {term.is_current
                    ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">current</span>
                    : <ConfigurationForm action={setCurrentTerm} label="Set current"><input type="hidden" name="school_id" value={context.schoolId} /><input type="hidden" name="term_id" value={term.id} /></ConfigurationForm>}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!sessionRows.length && <p className="text-sm text-slate-500">No sessions yet. Add one to enable enrollment history and dated terms.</p>}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ConfigurationForm action={saveStream} label="Add stream">
          <input type="hidden" name="school_id" value={context.schoolId} />
          <h3 className="font-semibold">New stream</h3>
          <label className="block">Class<select className={input} name="class_id" required defaultValue=""><option value="" disabled>Select class</option>{classRows.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}</select></label>
          <label className="block">Name<input className={input} name="name" maxLength={50} placeholder="A" required /></label>
        </ConfigurationForm>
        <div className="space-y-2">
          <h3 className="font-semibold">Existing streams</h3>
          {!streamRows.length && <p className="text-sm text-slate-500">No streams yet.</p>}
          {streamRows.map((stream) => (
            <div key={stream.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <p className="text-sm">{classRows.find((item) => item.id === stream.class_id)?.name} · Stream {stream.name}</p>
              <ConfigurationForm action={removeStream} label="Remove"><input type="hidden" name="school_id" value={context.schoolId} /><input type="hidden" name="stream_id" value={stream.id} /></ConfigurationForm>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
