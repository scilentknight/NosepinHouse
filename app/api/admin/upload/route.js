import { uploadController } from "@/modules/upload";

export const runtime = "nodejs";

export async function POST(request) {
  return uploadController.adminUpload(request);
}
