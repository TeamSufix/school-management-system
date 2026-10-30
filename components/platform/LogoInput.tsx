"use client";

import { logoSizeLimit } from "@/lib/platform/logo";

export default function LogoInput() {
  return (
    <label className="block">
      School logo
      <input type="file" name="logo" accept="image/png,image/jpeg" className="mt-1 block w-full rounded-lg border p-2"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.setCustomValidity(file && file.size > logoSizeLimit ? "Choose a logo smaller than 512 KB." : "");
          event.target.reportValidity();
        }} />
      <span className="text-sm text-slate-500">PNG or JPEG, at most 512 KB and 4096 × 4096 pixels. Leave empty to keep the existing logo.</span>
    </label>
  );
}
