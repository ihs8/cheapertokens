import React, { useState } from 'react';
import { Calculator, ArrowRight, Sparkles, DollarSign, Layers, ShieldCheck } from 'lucide-react';
import { ModelWeight } from '../types/reseller';

interface TokenCalculatorProps {
  rateTokensPerStar?: number;
}

export const TokenCalculator: React.FC<TokenCalculatorProps> = ({ rateTokensPerStar = 11700 }) => {
  const [stars, setStars] = useState<number>(100);

  const normalizedTokens = stars * rateTokensPerStar;

  // Telegram Stars real purchase cost (Fragment ~ $0.014 / Star, App store ~ $0.02 / Star)
  const costFragmentUsd = stars * 0.014;
  const costAppStoreUsd = stars * 0.02;

  // Official Anthropic Opus cost: $30 / 1M blended (3:1 mix: 750k in @ $15/M + 250k out @ $75/M)
  const officialOpusValueUsd = (normalizedTokens / 1000000) * 30.0;

  const savingsUsd = Math.max(0, officialOpusValueUsd - costFragmentUsd);
  const savingsPercent = Math.round((savingsUsd / officialOpusValueUsd) * 100);

  const models: ModelWeight[] = [
    {
      name: 'Claude Opus 5',
      provider: 'Anthropic',
      weight: 1.00,
      ratioDescription: 'Baseline Benchmark (1.00)',
      blendedTokensPer100Stars: 100 * rateTokensPerStar,
      badge: 'Flagship'
    },
    {
      name: 'GPT-6 Astra',
      provider: 'OpenAI',
      weight: 1.00,
      ratioDescription: 'Equal to Opus 5 (1.00)',
      blendedTokensPer100Stars: 100 * rateTokensPerStar,
      badge: 'Frontier'
    },
    {
      name: 'GPT-5.6 Sol',
      provider: 'OpenAI',
      weight: 0.54,
      ratioDescription: '~1.85× cheaper than Opus (0.54)',
      blendedTokensPer100Stars: Math.round((100 * rateTokensPerStar) / 0.54)
    },
    {
      name: 'Claude Sonnet 5',
      provider: 'Anthropic',
      weight: 0.40,
      ratioDescription: '2.5× cheaper than Opus (0.40)',
      blendedTokensPer100Stars: Math.round((100 * rateTokensPerStar) / 0.40),
      badge: 'Best Value'
    },
    {
      name: 'Gemini 3.8 Flash',
      provider: 'Google',
      weight: 0.15,
      ratioDescription: '~6.67× cheaper than Opus (0.15)',
      blendedTokensPer100Stars: Math.round((100 * rateTokensPerStar) / 0.15),
      badge: 'High Speed'
    },
    {
      name: 'Grok 4.6',
      provider: 'xAI',
      weight: 0.07,
      ratioDescription: '~14.3× cheaper than Opus (0.07)',
      blendedTokensPer100Stars: Math.round((100 * rateTokensPerStar) / 0.07),
      badge: 'Budget'
    },
  ];

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Interactive Calculator Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-semibold mb-3">
            <Calculator className="w-3.5 h-3.5" />
            <span>Interactive Tokenomics &amp; Cost Simulator</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            How Much Value Do Your Stars Buy?
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Calculate your normalized token balance, raw model tokens, and see direct savings compared to Anthropic and OpenAI official list prices.
          </p>
        </div>

        {/* Input Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 items-center">
          <div className="lg:col-span-6 space-y-4">
            <div className="flex justify-between items-baseline">
              <label className="text-sm font-semibold text-slate-300">
                Telegram Stars Amount
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="10"
                  max="10000"
                  step="50"
                  value={stars}
                  onChange={(e) => setStars(Math.max(1, parseInt(e.target.value, 10) || 0))}
                  className="w-28 text-right bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-base font-bold text-amber-400 focus:outline-none focus:border-amber-400 font-mono"
                />
                <span className="text-sm font-bold text-amber-400">⭐</span>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="50"
              max="2500"
              step="50"
              value={stars}
              onChange={(e) => setStars(parseInt(e.target.value, 10))}
              className="w-full h-2.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />

            {/* Quick buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[50, 100, 250, 500, 1000, 2500].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setStars(val)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    stars === val
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {val.toLocaleString()} ⭐
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              Estimated purchase cost: <span className="text-slate-200 font-semibold">${costFragmentUsd.toFixed(2)} USD</span> (via Fragment) or <span className="text-slate-200 font-semibold">${costAppStoreUsd.toFixed(2)} USD</span> (via In-App Purchase).
            </div>
          </div>

          {/* Outcome Comparison Card */}
          <div className="lg:col-span-6 bg-slate-950/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs text-slate-400 font-medium">Your Normalized Balance</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-violet-300 font-mono">
                  {normalizedTokens.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-medium">Official Anthropic Value</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
                  ${officialOpusValueUsd.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Savings Banner */}
            <div className="bg-gradient-to-r from-emerald-950/50 to-slate-900 border border-emerald-500/40 rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-300">
                    Save ~{savingsPercent}% vs Official Direct Billing
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Pay ~${costFragmentUsd.toFixed(2)} for ${officialOpusValueUsd.toFixed(2)} worth of Claude Opus capacity
                  </div>
                </div>
              </div>
            </div>

            {/* Token capacity distribution breakdown */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[11px]">Standard 3:1 Mix (Benchmark)</div>
                <div className="text-slate-100 font-bold font-mono mt-0.5">
                  {(normalizedTokens * 0.75).toLocaleString()} in / {(normalizedTokens * 0.25).toLocaleString()} out
                </div>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[11px]">Prompt Cache Read (0.1×)</div>
                <div className="text-emerald-400 font-bold font-mono mt-0.5">
                  {(normalizedTokens * 20).toLocaleString()} cached tokens
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Weight Comparison Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-5 border-b border-slate-800">
          <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <Layers className="w-5 h-5 text-violet-400" />
            <span>Supported Models &amp; Multipliers</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Every model is normalized against Claude Opus 5 at a 3:1 input:output ratio. Lower-weight models grant substantially more tokens from the exact same balance.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Model &amp; Provider</th>
                <th className="py-3 px-4 text-center">Cost Multiplier</th>
                <th className="py-3 px-4">Relative Volume</th>
                <th className="py-3 px-4 text-right">Raw Tokens For Your {stars} ⭐</th>
                <th className="py-3 px-4 text-right">Official Market Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {models.map((m) => {
                const rawTokens = Math.round(normalizedTokens / m.weight);
                const officialValue = (rawTokens / 1000000) * (30 * m.weight);

                return (
                  <tr key={m.name} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-100 flex items-center space-x-2">
                        <span>{m.name}</span>
                        {m.badge && (
                          <span className="text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-1.5 py-0.2 rounded font-bold uppercase">
                            {m.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{m.provider}</div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-400">
                      {m.weight.toFixed(2)}×
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {m.ratioDescription}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100">
                      {rawTokens.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-emerald-400">
                      ~${officialValue.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
