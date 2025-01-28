//src/index.ts

import { WorkerEntrypoint } from "cloudflare:workers";
import { OrderService, } from "./services/OrderService";
import { DatabaseService } from "./services/DatabaseService";
import { Env } from "./types";

export default class FraudDetectionWorker extends WorkerEntrypoint {
	async fetch(request: Request): Promise<Response> {
		try {
			const env = this.env as Env;
			const url = new URL(request.url);
			const path = url.pathname;
			const databaseService = new DatabaseService(env);

			if (path === '/processRecentOrders') {
				const orderService = new OrderService(env);
				const results = await orderService.processRecentOrders();

				return new Response(JSON.stringify(results), {
					headers: { 'Content-Type': 'application/json' },
				});
			} else if (path === '/getFraudulentOrders') {
				const orders = await databaseService.getFraudulentOrders();

				return new Response(JSON.stringify(orders), {
					headers: { 'Content-Type': 'application/json' },
				});
			} else if (path === 'updateFraudulentOrderStatus') {
				const { order }: any = await request.json()
				databaseService.updateFraudulentOrderStatus(order.orderId, order.status, order.reviewedBy)

				return new Response(JSON.stringify({ message: 'status update success' }), {
					headers: { 'Content-Type': 'application/json' },
				});
			}
			return new Response('no url found')
		} catch (error) {
			return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	}
	async scheduled(controller: ScheduledController) {
		const env = this.env as Env
		const orderService = new OrderService(env);
		const results = await orderService.processRecentOrders();
		console.log('Processing results:', results);
	}

	async processRecentOrders(): Promise<any> {
		const env = this.env as Env
		const orderService = new OrderService(env);
		const results = await orderService.processRecentOrders();
		return results;
	}

	async getFraudulentOrders(): Promise<any> {
		const env = this.env as Env
		const databaseService = new DatabaseService(env);
		const orders = await databaseService.getFraudulentOrders();
		return orders;
	}

	async updateFraudulentOrderStatus(orderId: string, status: "confirmed_fraud" | "false_positive", reviewedBy: string): Promise<any> {
		const env = this.env as Env
		const databaseService = new DatabaseService(env);
		await databaseService.updateFraudulentOrderStatus(orderId, status, reviewedBy);
		return { message: 'status update success' };
	}
};

