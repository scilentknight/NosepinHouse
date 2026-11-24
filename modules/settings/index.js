import SettingsRepository from "./repositories/SettingsRepository";
import SettingsService from "./services/SettingsService";
import SettingsController from "./controllers/SettingsController";

const settingsRepository = new SettingsRepository();
const settingsService = new SettingsService(settingsRepository);
const settingsController = new SettingsController(settingsService);

export { settingsController };
