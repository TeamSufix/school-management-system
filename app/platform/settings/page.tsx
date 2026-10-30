import { requireRole } from "@/lib/auth/require-role";
import { defaultPlatformSettings, getPlatformSettings } from "@/lib/platform/data";
import { savePlatformSettings } from "@/actions/platform";
import ConfigurationForm from "@/components/school/ConfigurationForm";

const input = "block w-full rounded-lg border border-slate-300 p-2";

export default async function PlatformSettingsPage() {
  await requireRole(["super_admin"]);
  const result = await getPlatformSettings();
  if (result.error) return <div className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-bold">Platform settings unavailable</h1><p className="mt-3">Verify that the reviewed platform settings migration is installed. No settings have been changed.</p></div>;
  const settings = result.data ?? defaultPlatformSettings;
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header><h1 className="text-3xl font-bold">Platform settings</h1><p className="mt-2 text-slate-600">Configure the administration display name and support contacts shown on the sign-in screen.</p></header>
      <ConfigurationForm action={savePlatformSettings} label="Save platform settings">
        <label>Platform display name<input className={input} name="platform_name" defaultValue={settings.platform_name} maxLength={100} required /></label>
        <label>Support email<input className={input} name="support_email" type="email" defaultValue={settings.support_email ?? ""} maxLength={254} /></label>
        <label>Support phone<input className={input} name="support_phone" type="tel" defaultValue={settings.support_phone ?? ""} maxLength={40} /></label>
      </ConfigurationForm>
    </div>
  );
}
