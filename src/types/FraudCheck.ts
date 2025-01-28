// src/types/FraudCheck.ts
export interface IPLocation {
    lat: number;
    lon: number;
    country: string;
    countryCode: string;
    region: string;
    city: string;
}

export interface FraudCheckResult {
    passed: boolean;
    details: string;
}