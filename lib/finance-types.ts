export interface FxRate {
    id: string;
    tenant_id: string;
    effective_date: string; // YYYY-MM-DD
    exchange_rate: number;
    currency_from: string;
    currency_to: string;
    created_at?: string;
    updated_at?: string;
}
