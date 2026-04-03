/** Max payload size for stored data URLs (~4MB). */
export const MAX_IMAGE_DATA_URL_LENGTH = 4 * 1024 * 1024;

const dataUrlRe = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i;

export function isValidImageDataUrl(s: string): boolean {
  if (typeof s !== "string" || s.length === 0) return false;
  if (s.length > MAX_IMAGE_DATA_URL_LENGTH) return false;
  return dataUrlRe.test(s);
}

/** Pool avatar: base64 data URL or legacy https URL. */
export function isValidPoolPicture(s: string): boolean {
  if (isValidImageDataUrl(s)) return true;
  if (/^https:\/\/.+/i.test(s) && s.length <= 4096) return true;
  return false;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("read failed"));
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function fileFromClipboardDataTransfer(
  dt: DataTransfer,
): File | null {
  if (dt.files?.length) {
    const f = dt.files[0];
    if (f?.type.startsWith("image/")) return f;
  }
  const items = dt.items;
  if (!items) return null;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const f = item.getAsFile();
      if (f) return f;
    }
  }
  return null;
}
