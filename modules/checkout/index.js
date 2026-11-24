import CheckoutService from "./services/CheckoutService";
import CheckoutController from "./controllers/CheckoutController";

const checkoutService = new CheckoutService();
const checkoutController = new CheckoutController(checkoutService);

export { checkoutController };
