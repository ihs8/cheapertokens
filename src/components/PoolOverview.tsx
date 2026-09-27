import React from 'react';
import { Wallet, Sparkles, TrendingUp, ShieldCheck, ArrowRight, Clock, Award } from 'lucide-react';
import { ResellerAccount } from '../types/reseller';

interface PoolOverviewProps {
  account: ResellerAccount | null;
  transactions: any[];
}

export const PoolOverview: React.FC<PoolOverviewProps> = ({ account, transactions }) => {
  if (!account) return null;

  const tiers = [
    { name: 'Retail', minStars: 0, rate: 9000, per100: '900k' },
    { name: 'Tier 1', minStars: 5000, rate: 11700, per100: '1.17M' },
    { name: 'Tier 2', minStars: 10000, rate: 14400, per100: '1.44M' },
    { name: 'Tier 3', minStars: 25000, rate: 18000, per100: '1.80M' },
  ];

  const currentTier = tiers[account.tier] || tiers[1];
  const nextTierStars = account.next_tier_at_stars;
  const progressPercent = Math.min(
    100,
    Math.round((account.stars_as_reseller / nextTierStars) * 100)
  );

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pool Balance */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Pool Balance</span>
            <Wallet className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-amber-400 font-mono">
              {account.pool_stars.toLocaleString()}
            </span>
            <span className="text-sm font-semibold text-amber-300/80">⭐ Stars</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            ≈ <span className="text-slate-200 font-medium">{account.pool_tokens.toLocaleString()}</span> Opus 5 tokens
          </div>
        </div>

        {/* Current Rate */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Your Wholesale Rate</span>
            <Sparkles className="w-4 h-4 text-violet-400" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-3xl font-extrabold text-slate-100 font-mono">
              {account.rate_tokens_per_star.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">tokens / ⭐</span>
          </div>
          <div className="text-xs text-emerald-400 mt-2 font-medium">
            100 ⭐ = {(account.rate_tokens_per_star * 100).toLocaleString()} tokens
          </div>
        </div>

        {/* Reseller Tier */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Reseller Tier</span>
            <Award className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-100">
              Tier {account.tier}
            </span>
            <span className="text-xs text-sky-400 font-semibold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
              Active
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Total Spent: <span className="text-slate-200">{account.stars_as_reseller.toLocaleString()} ⭐</span>
          </div>
        </div>

        {/* Limits */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Mint Boundaries</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xs text-slate-300 space-y-1 mt-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Min per key:</span>
              <span className="font-mono text-slate-200">{(account.min_tokens_per_key / 1000).toFixed(0)}k</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Max per mint:</span>
              <span className="font-mono text-slate-200">{(account.max_tokens_per_op / 1000000).toFixed(0)}M</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Max stars/op:</span>
              <span className="font-mono text-slate-200">{account.max_stars_per_op.toLocaleString()} ⭐</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tier Ladder & Progress */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-violet-400" />
              <span>Volume Tier Progression</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Your rate grows permanently with total Stars paid as a reseller.
            </p>
          </div>
          <div className="text-xs text-slate-400">
            Next Tier at: <strong className="text-amber-400">{nextTierStars.toLocaleString()} ⭐</strong> ({nextTierStars - account.stars_as_reseller} ⭐ remaining)
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-700 shadow"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 font-medium">
            <span>{account.stars_as_reseller.toLocaleString()} Stars Paid</span>
            <span>{progressPercent}% towards next discount tier</span>
          </div>
        </div>

        {/* Tier Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {tiers.map((t, idx) => {
            const isCurrent = account.tier === idx;
            return (
              <div
                key={t.name}
                className={`p-4 rounded-xl border transition ${
                  isCurrent
                    ? 'bg-violet-950/40 border-violet-500/60 shadow-lg shadow-violet-500/10'
                    : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isCurrent ? 'text-violet-300' : 'text-slate-400'}`}>
                    {t.name}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] bg-violet-500/30 text-violet-200 px-2 py-0.5 rounded-full font-bold">
                      Current
                    </span>
                  )}
                </div>
                <div className="text-lg font-bold text-slate-100 font-mono">
                  {t.per100} <span className="text-xs text-slate-400 font-sans">/ 100 ⭐</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  From {t.minStars.toLocaleString()} Stars paid
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Funding Guide & Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-gradient-to-br from-indigo-950/30 via-slate-900 to-slate-900 border border-indigo-500/20 rounded-2xl p-5 space-y-3">
          <h4 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
            <span className="text-indigo-400">💡</span>
            <span>How Pool Funding Works</span>
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            <strong>The pool is separate from your personal bot wallet.</strong>
          </p>
          <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
            <li>Only the <em>Fund the pool</em> button on your reseller panel in Telegram fills it.</li>
            <li>Telegram limits a single Stars invoice to <strong>10,000 ⭐</strong> max.</li>
            <li>Every API key minted via <code className="text-violet-300">POST /keys</code> deducts Stars from this pool.</li>
            <li>If the upstream refuses an API mint, the Stars go straight back to your pool.</li>
          </ul>
        </div>

        {/* Transactions Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-violet-400" />
              <span>Recent Bot &amp; Key Operations</span>
            </h4>
            <span className="text-xs text-slate-500">{transactions.length} events</span>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No key minting or top-up operations recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-56">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-500 uppercase sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">User / Label</th>
                    <th className="py-2 px-3 text-right">Stars Paid</th>
                    <th className="py-2 px-3 text-right">Tokens</th>
                    <th className="py-2 px-3 text-right text-emerald-400">Profit</th>
                    <th className="py-2 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {transactions.slice(0, 8).map((tx, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 capitalize font-medium text-slate-200">
                        {tx.action === 'mint' ? '🔑 Mint' : '⚡ Topup'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-sky-300">@{tx.telegramUserName || 'user'}</span>
                        <span className="text-slate-500 ml-1">({tx.keyLabel || `#${tx.keyId}`})</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-400">
                        {tx.stars} ⭐
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-violet-300">
                        +{tx.tokens.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                        {tx.profitStars ? `+${tx.profitStars} ⭐` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
