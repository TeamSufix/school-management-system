export const logoSizeLimit = 512 * 1024;

function validDimensions(width: number, height: number) {
  return width > 0 && height > 0 && width <= 4096 && height <= 4096;
}

export function inspectLogo(bytes: Uint8Array): { extension: string; contentType: string } | null {
  if (bytes.length > logoSizeLimit || bytes.length < 24) return null;
  const png = [137, 80, 78, 71, 13, 10, 26, 10];
  if (png.every((value, index) => bytes[index] === value)) {
    if (String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR") return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(8) !== 13 || !validDimensions(view.getUint32(16), view.getUint32(20))) return null;
    return { extension: "png", contentType: "image/png" };
  }
  if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[bytes.length - 2] !== 255 || bytes[bytes.length - 1] !== 217) return null;
  let offset = 2;
  const frames = new Set([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207]);
  while (offset + 3 < bytes.length) {
    if (bytes[offset++] !== 255) return null;
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 218 || marker === 217) return null;
    if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) return null;
    if (frames.has(marker)) {
      if (length < 8) return null;
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      return validDimensions(width, height) ? { extension: "jpg", contentType: "image/jpeg" } : null;
    }
    offset += length;
  }
  return null;
}
