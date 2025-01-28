// src/services/FraudDetectionService.ts
import { Env } from '../types/Env';
import { NormalizedOrder, IPLocation, FraudCheckResult } from '../types';


export class FraudDetectionService {
    constructor(private readonly env: Env) { }

    async checkLocationCorrelation(order: NormalizedOrder): Promise<number> {
        try {
            // 1. Get IP geolocation
            const ipLocation = await this.getIPLocation(order.client_ip!);
            console.log('order ip location', ipLocation?.region)
            const shippingCountry = order.shipping_address.country
            const shippingState = order.shipping_address.province
            const billingCountry = order.billing_address.country
            const billingState = order.billing_address.province
            const ipCountry = ipLocation?.countryCode
            const ipState = ipLocation?.region

            const isShippingbillingMatch = shippingCountry === billingCountry && shippingState === billingState ? 1 : 0;
            const isShippingIpMatch = shippingCountry === ipCountry && shippingState === ipState ? 1 : 0;
            const isBillingIpMatch = billingCountry === ipCountry && billingState === ipState ? 1 : 0;
            // at least 2 of the 3 must match
            const isLocationMatchPass = (isShippingbillingMatch + isShippingIpMatch + isBillingIpMatch) > 1;

            return isShippingbillingMatch + isShippingIpMatch + isBillingIpMatch

        } catch (error) {
            console.error('Error in location correlation check:', error);
            return 0
        }
    }

    private async checkAddressBlocklist(order: NormalizedOrder): Promise<FraudCheckResult> {
        try {
            const addresses = [
                {
                    type: 'shipping',
                    address: `${order.shipping_address.address1}, ${order.shipping_address.city}, ${order.shipping_address.country}`
                },
                {
                    type: 'billing',
                    address: `${order.billing_address.address1}, ${order.billing_address.city}, ${order.billing_address.country}`
                }
            ];

            const blockedAddresses: string[] = [];

            // Check each address against blocklist
            for (const { type, address } of addresses) {
                const isBlocked = await this.isAddressBlocked(address);
                if (isBlocked) {
                    blockedAddresses.push(`${type} address`);
                }
            }

            const passed = blockedAddresses.length === 0;
            const score = passed ? 0 : 100; // Binary score for blocklist

            return {
                passed,
                details: passed ? 'Addresses not found in blocklist' :
                    `Blocked addresses found: ${blockedAddresses.join(', ')}`
            };

        } catch (error) {
            console.error('Error in address blocklist check:', error);
            return {
                passed: true, // Pass on error
                details: `Error checking address blocklist: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    private async getIPLocation(ip: string): Promise<IPLocation | null> {
        try {
            const response = await fetch(`http://ip-api.com/json/${ip}`);
            if (!response.ok) {
                throw new Error(`IP API error: ${response.status}`);
            }

            const data: any = await response.json();
            if (data.status === 'fail') {
                throw new Error(`IP lookup failed: ${data.message}`);
            }

            return {
                lat: data.lat,
                lon: data.lon,
                country: data.country,
                countryCode: data.countryCode,
                region: data.region,
                city: data.city
            };
        } catch (error) {
            console.error('Error getting IP location:', error);
            return null;
        }
    }

    private async isAddressBlocked(address: string): Promise<boolean> {
        try {
            // Query the blocklist_entries table
            const stmt = this.env.DB.prepare(`
                SELECT COUNT(*) as count 
                FROM blocklist_entries 
                WHERE type = 'address' 
                AND value = ?
                AND is_active = true 
                AND (expires_at IS NULL OR expires_at > datetime('now'))
            `);

            const result: any = await stmt.bind(address.toLowerCase()).first();
            return (result?.count || 0) > 0;

        } catch (error) {
            console.error('Error checking address blocklist:', error);
            throw error;
        }
    }
}