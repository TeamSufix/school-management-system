import { redirect } from "next/navigation";

import { getStudentContext } from "@/lib/auth/get-student-context";
import { markNotificationRead } from "@/actions/communication";
import ConfigurationForm from "@/components/school/ConfigurationForm";

export default async function StudentNotificationsPage() {
  const context = await getStudentContext();
  if (!context) redirect("/login");

  const { data: notifications } = await context.client
    .from("notifications")
    .select("id, title, body, read_at, created_at")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
      <div className="mt-6 space-y-3">
        {!notifications?.length && <p className="text-slate-500">No notifications yet.</p>}
        {notifications?.map((notification) => (
          <article key={notification.id} className={`rounded-2xl border p-5 ${notification.read_at ? "border-slate-200 bg-white" : "border-green-200 bg-green-50/60"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900">{notification.title}</h2>
                <p className="text-xs text-slate-400">{new Date(notification.created_at).toLocaleString()}</p>
              </div>
              {!notification.read_at && (
                <ConfigurationForm action={markNotificationRead} label="Mark read">
                  <input type="hidden" name="notification_id" value={notification.id} />
                </ConfigurationForm>
              )}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{notification.body}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
