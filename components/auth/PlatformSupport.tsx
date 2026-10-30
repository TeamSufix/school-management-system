import { getPublicPlatformSettings } from "@/lib/platform/data";

export default async function PlatformSupport() {
  const settings = await getPublicPlatformSettings();
  if (!settings.support_email && !settings.support_phone) return null;
  return (
    <footer className="text-center text-sm text-slate-600">
      <p className="font-semibold">{settings.platform_name} support</p>
      {settings.support_email && <a className="mt-1 block text-green-700" href={`mailto:${encodeURIComponent(settings.support_email)}`}>{settings.support_email}</a>}
      {settings.support_phone && <a className="mt-1 block text-green-700" href={`tel:${settings.support_phone.replace(/[^+0-9]/g, "")}`}>{settings.support_phone}</a>}
    </footer>
  );
}
