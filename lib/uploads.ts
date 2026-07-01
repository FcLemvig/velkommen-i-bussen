import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

export async function saveDriverImage(file: File | null) {
  if (!file || file.size === 0) {
    return undefined;
  }

  const extension = allowedImageTypes.get(file.type);

  if (!extension) {
    throw new Error("Billedet skal være JPG, PNG eller WebP.");
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Billedet må højst fylde 2 MB.");
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "drivers");
  await mkdir(uploadsDir, { recursive: true });

  const filename = `${randomUUID()}.${extension}`;
  const destination = path.join(uploadsDir, filename);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(destination, bytes);

  return `/uploads/drivers/${filename}`;
}
