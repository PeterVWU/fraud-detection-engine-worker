import { OrderService, } from "./services/OrderService";
import { Env } from "./types";
export default {
	// async fetch(request, env: Env, ctx): Promise<Response> {
	// 	return new Response('Hello World!');
	// },
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {

		const orderService = new OrderService(env);
		const results = await orderService.processRecentOrders();
		console.log('Processing results:', results);
		return results;
	}
}
