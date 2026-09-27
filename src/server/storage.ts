import { ResellerAccount, ResellerKey, ResellerPricingSettings, RetailPackageConfig } from '../types/reseller';

interface StoredTransaction {
  id: string;
  telegramUserId: number | string;
  telegramUserName: string;
  action: 'mint' | 'topup';
  keyId?: number;
  stars: number;
  tokens: number;
  profitStars?: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  keyLabel?: string;
  operationId?: string;
  telegramPaymentChargeId?: string;
}

class AppStorage {
  private keys: Map<number, ResellerKey> = new Map();
  private userKeys: Map<string, number[]> = new Map(); // telegramUserId -> keyIds[]
  private transactions: StoredTransaction[] = [];
  private resellerKey: string = process.env.OPUSTOKENS_RESELLER_KEY || '';
  private botToken: string = process.env.TELEGRAM_BOT_TOKEN || '';

  private pricingSettings: ResellerPricingSettings = {
    customBaseUrl: '',
    profitMarginPercent: 25,
    retailTokensPerStar: 8775,
    packages: [
      { stars: 100, tokens: 900000, label: '100 ⭐ (900k Tokens)', popular: false },
      { stars: 250, tokens: 2300000, label: '250 ⭐ (2.3M Tokens)', popular: true },
      { stars: 500, tokens: 4700000, label: '500 ⭐ (4.7M Tokens)', popular: false },
      { stars: 1000, tokens: 9500000, label: '1,000 ⭐ (9.5M Tokens)', popular: false }
    ],
    flagshipModels: [
      { id: 'astra', name: 'GPT-6 Astra', provider: 'OpenAI', officialPricePer1M: 20.00, ourRatePer1M: 2.14, ratioDescription: '3:1 input:output mix', enabled: true },
      { id: 'opus5', name: 'Claude Opus 5', provider: 'Anthropic', officialPricePer1M: 10.00, ourRatePer1M: 2.23, ratioDescription: '3:1 input:output mix', enabled: true },
      { id: 'sonnet', name: 'Claude Sonnet', provider: 'Anthropic', officialPricePer1M: 4.00, ourRatePer1M: 0.89, ratioDescription: '3:1 input:output mix', enabled: true },
      { id: 'terra', name: 'Claude Terra', provider: 'Anthropic', officialPricePer1M: 4.50, ourRatePer1M: 0.48, ratioDescription: '3:1 input:output mix', enabled: true }
    ]
  };

  // Mock account state when no live reseller key is configured
  private mockAccount: ResellerAccount = {
    tier: 1,
    rate_tokens_per_star: 11700,
    stars_as_reseller: 6200,
    next_tier_at_stars: 10000,
    pool_tokens: 11700000,
    pool_stars: 1000,
    min_tokens_per_key: 1170000,
    max_tokens_per_op: 180000000,
    max_stars_per_op: 10000,
    api_base: 'https://api-router.opustokens.workers.dev/v1'
  };

  private hostUrl: string = '';

  constructor() {
    // Seed initial demo keys if empty
    this.saveKey({
      id: 1001,
      api_key: 'sk-opus-demo-9938102a91b84920a0efb',
      base_url: 'https://api.yourdomain.com/v1',
      label: 'tg_demo_cursor_dev',
      tokens_total: 2340000,
      tokens_remaining: 1820000,
      remaining_as_of: new Date(Date.now() - 3600000).toISOString(),
      status: 'active',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      owner_telegram_id: '12345678',
      owner_telegram_name: '@alice_developer'
    });

    this.saveKey({
      id: 1002,
      api_key: 'sk-opus-demo-1102948bbcae491290cca',
      base_url: 'https://api.yourdomain.com/v1',
      label: 'tg_demo_claude_code',
      tokens_total: 1170000,
      tokens_remaining: 940000,
      remaining_as_of: new Date(Date.now() - 1800000).toISOString(),
      status: 'active',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      owner_telegram_id: '12345678',
      owner_telegram_name: '@alice_developer'
    });
  }

  setHostUrl(url: string) {
    this.hostUrl = url.trim();
  }

  getHostUrl(): string {
    return this.hostUrl;
  }

  getResellerKey(): string {
    return this.resellerKey || process.env.OPUSTOKENS_RESELLER_KEY || '';
  }

  setResellerKey(key: string) {
    this.resellerKey = key.trim();
  }

  getBotToken(): string {
    return this.botToken || process.env.TELEGRAM_BOT_TOKEN || '';
  }

  setBotToken(token: string) {
    this.botToken = token.trim();
  }

  getMockAccount(): ResellerAccount {
    return this.mockAccount;
  }

  updateMockPool(deductStars: number, deductTokens: number) {
    this.mockAccount.pool_stars = Math.max(0, this.mockAccount.pool_stars - deductStars);
    this.mockAccount.pool_tokens = Math.max(0, this.mockAccount.pool_tokens - deductTokens);
  }

  saveKey(key: ResellerKey) {
    this.keys.set(key.id, key);
    if (key.owner_telegram_id) {
      const uId = String(key.owner_telegram_id);
      const existing = this.userKeys.get(uId) || [];
      if (!existing.includes(key.id)) {
        this.userKeys.set(uId, [...existing, key.id]);
      }
    }
  }

  getKey(id: number): ResellerKey | undefined {
    return this.keys.get(id);
  }

  getAllKeys(): ResellerKey[] {
    return Array.from(this.keys.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  getUserKeys(telegramUserId: string | number): ResellerKey[] {
    const ids = this.userKeys.get(String(telegramUserId)) || [];
    return ids.map(id => this.keys.get(id)).filter(Boolean) as ResellerKey[];
  }

  revokeKey(id: number): ResellerKey | null {
    const key = this.keys.get(id);
    if (!key) return null;
    key.status = 'revoked';
    this.keys.set(id, key);
    return key;
  }

  topupKey(id: number, addedTokens: number): ResellerKey | null {
    const key = this.keys.get(id);
    if (!key) return null;
    key.tokens_total += addedTokens;
    if (key.tokens_remaining !== null) {
      key.tokens_remaining += addedTokens;
    } else {
      key.tokens_remaining = addedTokens;
    }
    key.remaining_as_of = new Date().toISOString();
    this.keys.set(id, key);
    return key;
  }

  addTransaction(tx: StoredTransaction) {
    this.transactions.unshift(tx);
  }

  getTransactions(): StoredTransaction[] {
    return this.transactions;
  }

  getPricingSettings(): ResellerPricingSettings {
    return this.pricingSettings;
  }

  updatePricingSettings(settings: Partial<ResellerPricingSettings>) {
    if (settings.customBaseUrl !== undefined) {
      this.pricingSettings.customBaseUrl = settings.customBaseUrl.trim();
    }
    if (settings.profitMarginPercent !== undefined) {
      this.pricingSettings.profitMarginPercent = settings.profitMarginPercent;
      const wholesaleRate = this.mockAccount.rate_tokens_per_star || 11700;
      this.pricingSettings.retailTokensPerStar = Math.floor(
        wholesaleRate * (1 - settings.profitMarginPercent / 100)
      );
    }
    if (settings.retailTokensPerStar !== undefined) {
      this.pricingSettings.retailTokensPerStar = settings.retailTokensPerStar;
      const wholesaleRate = this.mockAccount.rate_tokens_per_star || 11700;
      this.pricingSettings.profitMarginPercent = Math.max(
        0,
        Math.round(((wholesaleRate - settings.retailTokensPerStar) / wholesaleRate) * 100)
      );
    }
    if (settings.packages && Array.isArray(settings.packages)) {
      this.pricingSettings.packages = settings.packages;
    }
    if (settings.flagshipModels && Array.isArray(settings.flagshipModels)) {
      this.pricingSettings.flagshipModels = settings.flagshipModels;
    }
  }

  getEffectiveBaseUrl(): string {
    if (this.pricingSettings.customBaseUrl && this.pricingSettings.customBaseUrl.trim().length > 0) {
      return this.pricingSettings.customBaseUrl.trim();
    }
    if (process.env.CUSTOM_BASE_URL && process.env.CUSTOM_BASE_URL.trim().length > 0) {
      return process.env.CUSTOM_BASE_URL.trim();
    }
    if (this.hostUrl && this.hostUrl.trim().length > 0) {
      return this.hostUrl.trim();
    }
    return 'https://api.yourdomain.com/v1';
  }
}

export const storage = new AppStorage();
