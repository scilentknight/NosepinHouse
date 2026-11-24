import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import AppError from "@/core/errors/AppError";

const ALLOWED_FOLDERS = ["categories", "brands", "products", "variants", "banners", "invoices", "payment", "avatars"];
const ALLOWED_MIME_TO_EXT = {
  "image/jpg": "jpg",
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export default class UploadService {
  async uploadAdminFile(file, folder) {
    if (!(file instanceof File)) throw new AppError(400, "No file provided");
    if (typeof folder !== "string" || !ALLOWED_FOLDERS.includes(folder)) {
      throw new AppError(400, "Invalid upload folder");
    }
    const ext = ALLOWED_MIME_TO_EXT[file.type];
    if (!ext) throw new AppError(400, "Unsupported file type. Use JPG, JPEG, PNG, WEBP, or GIF.");
    if (file.size > MAX_SIZE_BYTES) throw new AppError(400, "File exceeds the 10MB limit");
    const filename = `${randomUUID()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);
    return { url: `/uploads/${folder}/${filename}` };
  }

  async uploadUserAvatar(file) {
    const folder = "avatars";
    if (!(file instanceof File)) throw new AppError(400, "No file provided");
    const ext = ALLOWED_MIME_TO_EXT[file.type];
    if (!ext) throw new AppError(400, "Unsupported file type. Use JPG, JPEG, PNG, WEBP, or GIF.");
    if (file.size > MAX_SIZE_BYTES) throw new AppError(400, "File exceeds the 10MB limit");
    const filename = `${randomUUID()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);
    return { url: `/uploads/${folder}/${filename}` };
  }
}
