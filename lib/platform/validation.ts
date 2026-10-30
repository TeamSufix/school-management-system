export const schoolTypes = ["nursery", "primary", "junior_high", "senior_high", "combined", "other"] as const;

export function isWebsite(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return value.length <= 2048 && ["https:", "http:"].includes(url.protocol) && !url.username && !url.password && !!url.hostname;
  } catch { return false; }
}

export function validatePlatformSettings(name: string, email: string, phone: string) {
  if (!name || name.length > 100) return "Platform name must contain 1 to 100 characters.";
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return "Enter a valid support email address.";
  if (phone.length > 40) return "Support phone must contain at most 40 characters.";
  return null;
}
