import UploadService from "./services/UploadService";
import UploadController from "./controllers/UploadController";

const uploadService = new UploadService();
const uploadController = new UploadController(uploadService);

export { uploadController };
