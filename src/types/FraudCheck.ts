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
    ruleId: string;
    passed: boolean;
    score: number;
    details: string;
}