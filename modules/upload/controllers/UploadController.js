import { ok, handleApiError } from "@/lib/api";
import { requireAdmin, requireUser } from "@/lib/session";

export default class UploadController {
  constructor(uploadService) {
    this.uploadService = uploadService;
  }

  async adminUpload(request) {
    try {
      await requireAdmin();
      const formData = await request.formData();
      const file = formData.get("file");
      const folder = formData.get("folder");
      const result = await this.uploadService.uploadAdminFile(file, folder);
      return ok(result);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async userUpload(request) {
    try {
      await requireUser();
      const formData = await request.formData();
      const file = formData.get("file");
      const result = await this.uploadService.uploadUserAvatar(file);
      return ok(result);
    } catch (error) {
      return handleApiError(error);
    }
  }
}
