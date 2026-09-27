import React, { useState } from 'react';
import { Key, Plus, RefreshCw, AlertTriangle, Check, Copy, ExternalLink, Activity, ArrowUpRight, Ban } from 'lucide-react';
import { ResellerKey, KeyUsageResponse } from '../types/reseller';

interface KeysManagerProps {
  keys: ResellerKey[];
  isLoading: boolean;
  onRefresh: () => void;
  onMintKey: (tokens: number, label: string) => Promise<boolean>;
  onTopupKey: (keyId: number, tokens: number) => Promise<boolean>;
  onRevokeKey: (keyId: number) => Promise<boolean>;
}

export const KeysManager: React.FC<KeysManagerProps> = ({
  keys,
  isLoading,
  onRefresh,
  onMintKey,
  onTopupKey,
  onRevokeKey
}) => {
  const [showMintModal, setShowMintModal] = useState(false);
  const [mintTokens, setMintTokens] = useState<number>(1170000);
  const [mintLabel, setMintLabel] = useState<string>('');
  const [isMinting, setIsMinting] = useState(false);

  const [topupKeyId, setTopupKeyId] = useState<number | null>(null);
  const [topupTokens, setTopupTokens] = useState<number>(1170000);
  const [isToppingUp, setIsToppingUp] = useState(false);

  const [revokeKeyId, setRevokeKeyId] = useState<number | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const [selectedUsageKey, setSelectedUsageKey] = useState<ResellerKey | null>(null);
  const [usageData, setUsageData] = useState<KeyUsageResponse | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const submitMint = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMinting(true);
    const success = await onMintKey(mintTokens, mintLabel || `client_${Date.now().toString().slice(-4)}`);
    setIsMinting(false);
    if (success) {
      setShowMintModal(false);
      setMintLabel('');
    }
  };

  const submitTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupKeyId) return;
    setIsToppingUp(true);
    const success = await onTopupKey(topupKeyId, topupTokens);
    setIsToppingUp(false);
    if (success) {
      setTopupKeyId(null);
    }
  };

  const submitRevoke = async () => {
    if (!revokeKeyId) return;
    setIsRevoking(true);
    const success = await onRevokeKey(revokeKeyId);
    setIsRevoking(false);
    if (success) {
      setRevokeKeyId(null);
    }
  };

  const openUsageModal = async (key: ResellerKey) => {
    setSelectedUsageKey(key);
    setLoadingUsage(true);
    try {
      const res = await fetch(`/api/keys/${key.id}/usage`);
      if (res.ok) {
        const data = await res.json();
        setUsageData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsage(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <Key className="w-5 h-5 text-violet-400" />
            <span>Minted API Keys ({keys.length})</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage customer sub-keys, check remaining Opus 5 tokens, issue top-ups, or revoke keys.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition"
            title="Refresh keys list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowMintModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-violet-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Mint New Key</span>
          </button>
        </div>
      </div>

      {/* Keys List / Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {keys.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Key className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No keys minted yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Mint your first sub-key or test the creation flow using the Telegram Bot simulator.
            </p>
            <button
              onClick={() => setShowMintModal(true)}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg"
            >
              Mint Key Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Key ID &amp; Label</th>
                  <th className="py-3.5 px-4">API Key &amp; Base URL</th>
                  <th className="py-3.5 px-4">Balance / Quota</th>
                  <th className="py-3.5 px-4">Owner / Origin</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {keys.map((k) => {
                  const remaining = k.tokens_remaining !== null ? k.tokens_remaining : k.tokens_total;
                  const percent = Math.min(100, Math.max(0, Math.round((remaining / k.tokens_total) * 100)));
                  const isRevoked = k.status === 'revoked';

                  return (
                    <tr key={k.id} className="hover:bg-slate-800/40 transition">
                      {/* ID & Label */}
                      <td className="py-4 px-4">
                        <div className="font-mono text-sm font-semibold text-slate-100 flex items-center space-x-1.5">
                          <span>#{k.id}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[140px]" title={k.label}>
                          {k.label || 'No label'}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(k.created_at).toLocaleDateString()}
                        </div>
                      </td>

                      {/* API Key & Base URL */}
                      <td className="py-4 px-4">
                        {k.api_key ? (
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs bg-slate-950 px-2 py-1 rounded border border-slate-800 text-amber-300">
                              {k.api_key.slice(0, 10)}...{k.api_key.slice(-4)}
                            </span>
                            <button
                              onClick={() => handleCopy(k.api_key!, `key_${k.id}`)}
                              className="text-slate-400 hover:text-white p-1"
                              title="Copy API Key"
                            >
                              {copiedId === `key_${k.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Hidden (Shown at mint)</span>
                        )}
                        <div className="text-[11px] text-slate-400 font-mono mt-1 flex items-center space-x-1">
                          <span>{k.base_url}</span>
                          <button
                            onClick={() => handleCopy(k.base_url, `url_${k.id}`)}
                            className="text-slate-500 hover:text-slate-300"
                            title="Copy Base URL"
                          >
                            {copiedId === `url_${k.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Balance & Quota Progress */}
                      <td className="py-4 px-4 min-w-[180px]">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-200">
                            {remaining.toLocaleString()}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            / {k.tokens_total.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isRevoked
                                ? 'bg-rose-500'
                                : percent > 50
                                ? 'bg-emerald-500'
                                : percent > 20
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {k.remaining_as_of ? `Fresh as of ${new Date(k.remaining_as_of).toLocaleTimeString()}` : 'Awaiting first poll'}
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="py-4 px-4 text-xs">
                        {k.owner_telegram_name ? (
                          <div className="text-sky-300 font-medium">@{k.owner_telegram_name.replace('@', '')}</div>
                        ) : (
                          <div className="text-slate-400">Direct Reseller Mint</div>
                        )}
                        {k.owner_telegram_id && (
                          <div className="text-[10px] text-slate-500 font-mono">ID: {k.owner_telegram_id}</div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isRevoked
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isRevoked ? 'Revoked' : 'Active'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => openUsageModal(k)}
                          className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
                          title="View Usage History"
                        >
                          <Activity className="w-3.5 h-3.5 inline mr-1 text-violet-400" />
                          Usage
                        </button>
                        {!isRevoked && (
                          <>
                            <button
                              onClick={() => {
                                setTopupKeyId(k.id);
                                setTopupTokens(1170000);
                              }}
                              className="px-2.5 py-1 text-xs bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white rounded-lg border border-violet-500/30 transition"
                            >
                              Top-up
                            </button>
                            <button
                              onClick={() => setRevokeKeyId(k.id)}
                              className="px-2.5 py-1 text-xs bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg border border-rose-500/20 transition"
                            >
                              Revoke
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mint Key Modal */}
      {showMintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <Key className="w-5 h-5 text-violet-400" />
                <span>Mint New API Key</span>
              </h3>
              <button
                onClick={() => setShowMintModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitMint} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Token Allocation (Normalized Opus 5 Tokens)
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {[
                    { label: '1.17M Tok (~100 ⭐)', val: 1170000 },
                    { label: '2.92M Tok (~250 ⭐)', val: 2925000 },
                    { label: '5.85M Tok (~500 ⭐)', val: 5850000 },
                    { label: '11.7M Tok (~1000 ⭐)', val: 11700000 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setMintTokens(preset.val)}
                      className={`text-xs p-2 rounded-lg border text-left transition ${
                        mintTokens === preset.val
                          ? 'bg-violet-600/30 border-violet-500 text-violet-200'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="100000"
                  max="180000000"
                  step="10000"
                  value={mintTokens}
                  onChange={(e) => setMintTokens(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Label (Optional, 1–64 characters)
                </label>
                <input
                  type="text"
                  placeholder="e.g. client_alice_cursor"
                  maxLength={64}
                  value={mintLabel}
                  onChange={(e) => setMintLabel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Pool deduction:</span>
                  <span className="font-semibold text-amber-400">
                    ~{Math.ceil(mintTokens / 11700)} Stars
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Market Value:</span>
                  <span className="text-emerald-400">
                    ~${((mintTokens / 1000000) * 30).toFixed(2)} USD
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMintModal(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMinting}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl shadow-lg transition disabled:opacity-50"
                >
                  {isMinting ? 'Minting...' : 'Mint Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Topup Modal */}
      {topupKeyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Top-up Key #{topupKeyId}</h3>
            <form onSubmit={submitTopup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Additional Tokens to Add
                </label>
                <input
                  type="number"
                  min="100000"
                  step="10000"
                  value={topupTokens}
                  onChange={(e) => setTopupTokens(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTopupKeyId(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isToppingUp}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl shadow-lg transition disabled:opacity-50"
                >
                  {isToppingUp ? 'Adding Tokens...' : 'Add Tokens'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {revokeKeyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-slate-100">Revoke Key #{revokeKeyId}?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Revoking will immediately deactivate this API key. Clients using this key in Cursor or Claude Code will be refused.
              <br /><br />
              <strong className="text-amber-400">Important:</strong> According to reseller rules, remaining tokens on revoked keys are <strong>not refunded</strong> back to your pool.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setRevokeKeyId(null)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRevoke}
                disabled={isRevoking}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-xl shadow-lg transition disabled:opacity-50"
              >
                {isRevoking ? 'Revoking...' : 'Permanently Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Usage History Modal */}
      {selectedUsageKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-violet-400" />
                  <span>Usage History: Key #{selectedUsageKey.id}</span>
                </h3>
                <p className="text-xs text-slate-400">Hourly poller deltas in normalized Opus 5 tokens.</p>
              </div>
              <button
                onClick={() => setSelectedUsageKey(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {loadingUsage ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Loading usage telemetry...
              </div>
            ) : usageData && usageData.usage.length > 0 ? (
              <div className="space-y-4">
                {/* Visual Bar chart preview */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-end space-x-1.5 h-36 pt-4">
                    {usageData.usage.slice(-24).map((point, pIdx) => {
                      const maxVal = Math.max(...usageData.usage.map(u => u.delta_tokens), 1);
                      const heightPercent = Math.min(100, Math.round((point.delta_tokens / maxVal) * 100));
                      return (
                        <div key={pIdx} className="flex-1 flex flex-col items-center group relative">
                          <div
                            className="w-full bg-violet-500/70 hover:bg-violet-400 rounded-t transition"
                            style={{ height: `${Math.max(6, heightPercent)}%` }}
                          />
                          {/* Tooltip */}
                          <div className="absolute -top-8 bg-slate-800 border border-slate-700 px-2 py-1 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-10">
                            {point.delta_tokens.toLocaleString()} tokens
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-2">
                    <span>24h ago</span>
                    <span>Recent activity</span>
                    <span>Now</span>
                  </div>
                </div>

                {/* Table of recent points */}
                <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-500 uppercase sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Timestamp</th>
                        <th className="py-2 px-3 text-right">Tokens Consumed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {usageData.usage.slice(-10).reverse().map((pt, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 text-slate-400">
                            {new Date(pt.timestamp).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-violet-300">
                            +{pt.delta_tokens.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500 text-xs">
                No usage recorded yet by the hourly poller for this key.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
