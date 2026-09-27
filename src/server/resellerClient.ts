import { ResellerAccount, ResellerKey, MintKeyResponse, TopupKeyResponse, RevokeKeyResponse, KeyUsageResponse } from '../types/reseller';
import { storage } from './storage';
import { randomUUID } from 'crypto';

const BASE_URL = 'https://api-router.opustokens.workers.dev/reseller';

export class ResellerClient {
  private getHeaders(idempotencyKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'OpusTokens-TelegramBot/1.0'
    };
    const rk = storage.getResellerKey();
    if (rk) {
      headers['Authorization'] = `Bearer ${rk}`;
    }
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return headers;
  }

  async getAccount(): Promise<{ data: ResellerAccount; isLive: boolean; error?: string }> {
    const rk = storage.getResellerKey();
    if (!rk || !rk.startsWith('rk_')) {
      return { data: storage.getMockAccount(), isLive: false };
    }

    try {
      const res = await fetch(`${BASE_URL}/account`, {
        headers: this.getHeaders(),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        return {
          data: storage.getMockAccount(),
          isLive: false,
          error: errorJson?.error?.type || `HTTP ${res.status}`
        };
      }

      const data = await res.json() as ResellerAccount;
      return { data, isLive: true };
    } catch (err: any) {
      return {
        data: storage.getMockAccount(),
        isLive: false,
        error: err?.message || 'Connection failed'
      };
    }
  }

  async mintKey(params: {
    tokens: number;
    label?: string;
    telegramUserId?: number | string;
    telegramUserName?: string;
  }): Promise<{ data: MintKeyResponse; isLive: boolean; error?: any }> {
    const rk = storage.getResellerKey();
    const idempotencyKey = `mint-${Date.now()}-${randomUUID().slice(0, 12)}`;

    if (!rk || !rk.startsWith('rk_')) {
      // High-fidelity sandbox minting
      const mockKeyId = Math.floor(1000 + Math.random() * 9000);
      const generatedApiKey = `sk-opus-${randomUUID().replace(/-/g, '').slice(0, 24)}`;
      const rate = storage.getMockAccount().rate_tokens_per_star;
      const chargedStars = Math.ceil(params.tokens / rate);

      const newKey: ResellerKey = {
        id: mockKeyId,
        api_key: generatedApiKey,
        base_url: storage.getEffectiveBaseUrl(),
        label: params.label || `tg_${params.telegramUserId || 'client'}_${mockKeyId}`,
        tokens_total: params.tokens,
        tokens_remaining: params.tokens,
        remaining_as_of: new Date().toISOString(),
        status: 'active',
        created_at: new Date().toISOString(),
        owner_telegram_id: params.telegramUserId,
        owner_telegram_name: params.telegramUserName
      };

      storage.saveKey(newKey);
      storage.updateMockPool(chargedStars, params.tokens);

      const result: MintKeyResponse = {
        key: newKey,
        charged_stars: chargedStars,
        operation_id: `op_mock_${randomUUID().slice(0, 16)}`,
        retry_with_new_key: false
      };

      return { data: result, isLive: false };
    }

    try {
      const res = await fetch(`${BASE_URL}/keys`, {
        method: 'POST',
        headers: this.getHeaders(idempotencyKey),
        body: JSON.stringify({
          tokens: params.tokens,
          label: params.label
        })
      });

      const body = await res.json();
      if (!res.ok) {
        return {
          data: null as any,
          isLive: true,
          error: body
        };
      }

      const mintData = body as MintKeyResponse;
      if (mintData.key) {
        mintData.key.owner_telegram_id = params.telegramUserId;
        mintData.key.owner_telegram_name = params.telegramUserName;
        if (storage.getEffectiveBaseUrl()) {
          mintData.key.base_url = storage.getEffectiveBaseUrl();
        }
        storage.saveKey(mintData.key);
      }

      return { data: mintData, isLive: true };
    } catch (err: any) {
      return {
        data: null as any,
        isLive: true,
        error: { message: err?.message || 'Network request failed' }
      };
    }
  }

  async topupKey(params: {
    keyId: number;
    tokens: number;
  }): Promise<{ data: TopupKeyResponse; isLive: boolean; error?: any }> {
    const rk = storage.getResellerKey();
    const idempotencyKey = `topup-${Date.now()}-${randomUUID().slice(0, 12)}`;

    if (!rk || !rk.startsWith('rk_')) {
      const rate = storage.getMockAccount().rate_tokens_per_star;
      const chargedStars = Math.ceil(params.tokens / rate);
      const updatedKey = storage.topupKey(params.keyId, params.tokens);
      storage.updateMockPool(chargedStars, params.tokens);

      if (!updatedKey) {
        return { data: null as any, isLive: false, error: { type: 'not_found' } };
      }

      return {
        data: {
          key: updatedKey,
          added_tokens: params.tokens,
          charged_stars: chargedStars,
          operation_id: `op_mock_topup_${randomUUID().slice(0, 16)}`,
          retry_with_new_key: false
        },
        isLive: false
      };
    }

    try {
      const res = await fetch(`${BASE_URL}/keys/${params.keyId}/topup`, {
        method: 'POST',
        headers: this.getHeaders(idempotencyKey),
        body: JSON.stringify({ tokens: params.tokens })
      });

      const body = await res.json();
      if (!res.ok) {
        return { data: null as any, isLive: true, error: body };
      }

      const topupData = body as TopupKeyResponse;
      if (topupData.key) {
        storage.saveKey(topupData.key);
      }
      return { data: topupData, isLive: true };
    } catch (err: any) {
      return { data: null as any, isLive: true, error: { message: err?.message || 'Topup failed' } };
    }
  }

  async revokeKey(keyId: number): Promise<{ data: RevokeKeyResponse; isLive: boolean; error?: any }> {
    const rk = storage.getResellerKey();

    if (!rk || !rk.startsWith('rk_')) {
      const revoked = storage.revokeKey(keyId);
      if (!revoked) {
        return { data: null as any, isLive: false, error: { type: 'not_found' } };
      }
      return {
        data: {
          id: keyId,
          status: 'revoked',
          tokens_remaining_at_revoke: revoked.tokens_remaining ?? 0
        },
        isLive: false
      };
    }

    try {
      const res = await fetch(`${BASE_URL}/keys/${keyId}/revoke`, {
        method: 'POST',
        headers: this.getHeaders()
      });

      const body = await res.json();
      if (!res.ok) {
        return { data: null as any, isLive: true, error: body };
      }

      storage.revokeKey(keyId);
      return { data: body as RevokeKeyResponse, isLive: true };
    } catch (err: any) {
      return { data: null as any, isLive: true, error: { message: err?.message || 'Revoke failed' } };
    }
  }

  async listKeys(): Promise<ResellerKey[]> {
    const rk = storage.getResellerKey();

    if (!rk || !rk.startsWith('rk_')) {
      return storage.getAllKeys();
    }

    try {
      const res = await fetch(`${BASE_URL}/keys?limit=100`, {
        headers: this.getHeaders()
      });
      if (res.ok) {
        const body = await res.json();
        const apiKeys = (body?.keys || []) as ResellerKey[];
        // Merge with local storage metadata (like owner_telegram_name, api_key)
        for (const k of apiKeys) {
          const local = storage.getKey(k.id);
          if (local) {
            k.api_key = local.api_key;
            k.owner_telegram_id = local.owner_telegram_id;
            k.owner_telegram_name = local.owner_telegram_name;
          }
          if (storage.getEffectiveBaseUrl()) {
            k.base_url = storage.getEffectiveBaseUrl();
          }
          storage.saveKey(k);
        }
        return storage.getAllKeys();
      }
    } catch (e) {
      // fallback
    }
    return storage.getAllKeys();
  }

  async getKeyUsage(keyId: number): Promise<KeyUsageResponse> {
    const rk = storage.getResellerKey();
    if (!rk || !rk.startsWith('rk_')) {
      // Generate realistic demo usage graph
      const points = [];
      const now = Date.now();
      for (let i = 24; i >= 0; i--) {
        const time = new Date(now - i * 3600000).toISOString();
        const delta = Math.floor(Math.random() * 25000) + (i % 4 === 0 ? 40000 : 5000);
        points.push({ timestamp: time, delta_tokens: delta });
      }
      return {
        key_id: keyId,
        since: new Date(now - 86400000).toISOString(),
        until: new Date(now).toISOString(),
        usage: points
      };
    }

    try {
      const res = await fetch(`${BASE_URL}/keys/${keyId}/usage`, {
        headers: this.getHeaders()
      });
      if (res.ok) {
        return (await res.json()) as KeyUsageResponse;
      }
    } catch (e) {
      // fallback
    }
    return {
      key_id: keyId,
      since: new Date(Date.now() - 86400000).toISOString(),
      until: new Date().toISOString(),
      usage: []
    };
  }
}

export const resellerClient = new ResellerClient();
