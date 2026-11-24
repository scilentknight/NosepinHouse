import DashboardRepository from "./repositories/DashboardRepository";
import DashboardService from "./services/DashboardService";
import DashboardController from "./controllers/DashboardController";

const dashboardRepository = new DashboardRepository();
const dashboardService = new DashboardService(dashboardRepository);
const dashboardController = new DashboardController(dashboardService);

export { dashboardController };
