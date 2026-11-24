import OrderRepository from "./repositories/OrderRepository";
import OrderService from "./services/OrderService";
import OrderController from "./controllers/OrderController";

const orderRepository = new OrderRepository();
const orderService = new OrderService(orderRepository);
const orderController = new OrderController(orderService);

export { orderController };
