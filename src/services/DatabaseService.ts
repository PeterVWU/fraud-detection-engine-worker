// src/services/DatabaseService.ts
import { Env } from '../types/Env';
import { NormalizedOrder, FraudCheckResult } from '../types';

export class DatabaseService {
    constructor(private readonly env: Env) { }

    async saveFraudulentOrder(
        order: NormalizedOrder,
        fraudResult: FraudCheckResult,
        ipLocation: { city: string; country: string; } | null
    ): Promise<void> {
        // First check if order exists
        const checkStmt = this.env.DB.prepare(`
            SELECT order_number FROM fraudulent_orders 
            WHERE order_number = ? AND platform_type = ?
        `);

        const exists = await checkStmt.bind(
            order.order_number,
            order.platform_type
        ).first();

        if (exists) {
            console.log(`Order ${order.order_number} already exists in database, skipping...`);
            return;
        }

        const insertStmt = this.env.DB.prepare(`
            INSERT INTO fraudulent_orders (
                order_number, platform_type, customer_email, customer_name,
                total_amount, shipping_address, shipping_city, shipping_country,
                client_ip, ip_city, ip_country, fraud_score, fraud_reasons,
                duoplane_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        await insertStmt.bind(
            order.order_number,
            order.platform_type,
            order.customer_data.email,
            `${order.customer_data.first_name} ${order.customer_data.last_name}`,
            order.total_amount,
            order.shipping_address.address1,
            order.shipping_address.city,
            order.shipping_address.country,
            order.client_ip || null,
            ipLocation?.city || null,
            ipLocation?.country || null,
            0,
            fraudResult.details,
            order.metadata?.duoplane_id.replace(/\.0$/, '')
        ).run();
    }

    async isAddressBlocked(address: string, city: string, country: string): Promise<boolean> {
        const stmt = this.env.DB.prepare(`
            SELECT COUNT(*) as count 
            FROM blocked_addresses 
            WHERE address = ? 
            AND city = ? 
            AND country = ?
            AND is_active = true 
            AND (expires_at IS NULL OR expires_at > datetime('now'))
        `);

        const result: any = await stmt.bind(
            address.toLowerCase(),
            city.toLowerCase(),
            country.toUpperCase()
        ).first();

        return (result?.count || 0) > 0;
    }

    async addBlockedAddress(
        address: string,
        city: string,
        country: string,
        reason: string,
        createdBy: string,
        expiresAt?: Date
    ): Promise<void> {
        const stmt = this.env.DB.prepare(`
            INSERT INTO blocked_addresses (
                address, city, country, reason, created_by, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        await stmt.bind(
            address.toLowerCase(),
            city.toLowerCase(),
            country.toUpperCase(),
            reason,
            createdBy,
            expiresAt?.toISOString()
        ).run();
    }

    async getFraudulentOrders(
        status: string = 'pending_review',
        limit: number = 50
    ): Promise<any[]> {
        const stmt: any = this.env.DB.prepare(`
            SELECT * FROM fraudulent_orders 
            WHERE status = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        `);

        return stmt.bind(status, limit).all();
    }

    async updateFraudulentOrderStatus(
        orderId: string,
        status: 'confirmed_fraud' | 'false_positive',
        reviewedBy: string
    ): Promise<void> {
        const stmt = this.env.DB.prepare(`
            UPDATE fraudulent_orders 
            SET status = ?, 
                reviewed_at = datetime('now'),
                reviewed_by = ?
            WHERE id = ?
        `);

        await stmt.bind(status, reviewedBy, orderId).run();
    }
}