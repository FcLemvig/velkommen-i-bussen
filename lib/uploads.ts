const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function saveDriverImage(file: File | null) {
  if (!file || file.size === 0) {
    return undefined;
  }

  if (!allowedImageTypes.has(file.type)) {
    throw new Error("Billedet skal være JPG, PNG eller WebP.");
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Billedet må højst fylde 2 MB.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString("base64");

  return `data:${file.type};base64,${base64}`;
}
