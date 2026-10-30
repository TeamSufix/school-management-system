import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { markNotificationRead } from "@/actions/communication";
import ConfigurationForm from "@/components/school/ConfigurationForm";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const client = await createClient();
  const notifications = await client
    .from("notifications")
    .select("id, title, body, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (notifications.error) {
    return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-bold">Notifications unavailable</h1><p className="mt-4">Verify that the communication migration has been installed.</p></main>;
  }
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-3xl font-bold">Notifications</h1>
      {!notifications.data?.length && <p>No notifications yet.</p>}
      {notifications.data?.map((notification) => (
        <article key={notification.id} className={`rounded-2xl border p-5 ${notification.read_at ? "border-slate-200" : "border-green-300 bg-green-50/40"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold">{notification.title}</h2>
              <p className="text-xs text-slate-500">{new Date(notification.created_at).toLocaleString()}</p>
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
    </main>
  );
}
