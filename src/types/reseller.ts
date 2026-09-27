export interface ResellerAccount {
  tier: number;
  rate_tokens_per_star: number;
  stars_as_reseller: number;
  next_tier_at_stars: number;
  pool_tokens: number;
  pool_stars: number;
  min_tokens_per_key: number;
  max_tokens_per_op: number;
  max_stars_per_op: number;
  api_base: string;
}

export interface ResellerKey {
  id: number;
  api_key?: string; // only returned on creation (POST /keys)
  base_url: string;
  label: string;
  tokens_total: number;
  tokens_remaining: number | null;
  remaining_as_of: string | null;
  status: 'active' | 'revoked';
  created_at: string;
  owner_telegram_id?: number | string;
  owner_telegram_name?: string;
}

export interface MintKeyResponse {
  key: ResellerKey;
  charged_stars: number;
  operation_id: string;
  retry_with_new_key: boolean;
}

export interface TopupKeyResponse {
  key: ResellerKey;
  added_tokens: number;
  charged_stars: number;
  operation_id: string;
  retry_with_new_key: boolean;
}

export interface RevokeKeyResponse {
  id: number;
  status: 'revoked';
  tokens_remaining_at_revoke: number;
}

export interface UsagePoint {
  timestamp: string;
  delta_tokens: number;
  cumulative_tokens?: number;
}

export interface KeyUsageResponse {
  key_id: number;
  since: string;
  until: string;
  usage: UsagePoint[];
}

export interface StarPackage {
  stars: number;
  tokens: number;
  label: string;
  popular?: boolean;
  savingsPercent: number;
}

export interface RetailPackageConfig {
  stars: number;
  tokens: number;
  label?: string;
  popular?: boolean;
}

export interface FlagshipModelRate {
  id: string;
  name: string;
  provider: string;
  officialPricePer1M: number;
  ourRatePer1M: number;
  ratioDescription?: string;
  enabled: boolean;
}

export interface ResellerPricingSettings {
  customBaseUrl: string;
  profitMarginPercent: number; // e.g. 25
  retailTokensPerStar: number; // e.g. 8775
  packages: RetailPackageConfig[];
  flagshipModels?: FlagshipModelRate[];
}

export interface ModelWeight {
  name: string;
  provider: string;
  weight: number;
  ratioDescription: string;
  blendedTokensPer100Stars: number;
  badge?: string;
}
