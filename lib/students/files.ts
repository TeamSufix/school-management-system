export const recordSizeLimit = 5 * 1024 * 1024;

export function sanitizeFileName(name: string) {
  const cleaned = name.replace(/[\\/]/g, " ").replace(/[^\w .()-]/g, "").trim();
  return (cleaned || "document").slice(0, 200);
}

export function inspectRecordFile(bytes: Uint8Array, fileName: string) {
  if (!bytes.length || bytes.length > recordSizeLimit) return null;
  const extension = fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase() : "";
  if (extension === "pdf") {
    return bytes[0] === 37 && bytes[1] === 80 && bytes[2] === 68 && bytes[3] === 70
      ? { extension: "pdf", contentType: "application/pdf" }
      : null;
  }
  if (extension === "png" && bytes.length >= 8 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) {
    return { extension: "png", contentType: "image/png" };
  }
  if (extension === "jpg" || extension === "jpeg") {
    return bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217
      ? { extension: "jpg", contentType: "image/jpeg" }
      : null;
  }
  return null;
}
