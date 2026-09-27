import React, { useState, useEffect } from 'react';
import { DollarSign, Globe, Percent, Save, RefreshCw, Check, Sparkles, Plus, Trash2, ArrowRight, ShieldCheck, HelpCircle, Copy, Code, ChevronDown, ChevronUp, Zap, Sliders, TrendingUp, RotateCcw, Star } from 'lucide-react';
import { RetailPackageConfig, ResellerPricingSettings, FlagshipModelRate } from '../types/reseller';

interface PricingProfitManagerProps {
  wholesaleRate: number;
  onPricingUpdated: () => void;
  showToast: (msg: string) => void;
}

export const PricingProfitManager: React.FC<PricingProfitManagerProps> = ({
  wholesaleRate = 11700,
  onPricingUpdated,
  showToast
}) => {
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [profitMargin, setProfitMargin] = useState<number>(25);
  const [packages, setPackages] = useState<RetailPackageConfig[]>([]);
  const [flagshipModels, setFlagshipModels] = useState<FlagshipModelRate[]>([
    { id: 'astra', name: 'GPT-6 Astra', provider: 'OpenAI', officialPricePer1M: 20.00, ourRatePer1M: 2.14, ratioDescription: '3:1 input:output mix', enabled: true },
    { id: 'opus5', name: 'Claude Opus 5', provider: 'Anthropic', officialPricePer1M: 10.00, ourRatePer1M: 2.23, ratioDescription: '3:1 input:output mix', enabled: true },
    { id: 'sonnet', name: 'Claude Sonnet', provider: 'Anthropic', officialPricePer1M: 4.00, ourRatePer1M: 0.89, ratioDescription: '3:1 input:output mix', enabled: true },
    { id: 'terra', name: 'Claude Terra', provider: 'Anthropic', officialPricePer1M: 4.50, ourRatePer1M: 0.48, ratioDescription: '3:1 input:output mix', enabled: true }
  ]);
  const [hostUrl, setHostUrl] = useState('');
  const [autoSyncPackages, setAutoSyncPackages] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [workerBrandName, setWorkerBrandName] = useState('MyBrand AI');
  const [workerBotUrl, setWorkerBotUrl] = useState('https://t.me/your_bot');
  const [copiedWorkerCode, setCopiedWorkerCode] = useState(false);

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1_000_000) {
      const m = (tokens / 1_000_000).toFixed(2).replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1');
      return `${m}M`;
    }
    if (tokens >= 1_000) {
      return `${Math.round(tokens / 1_000)}k`;
    }
    return tokens.toLocaleString();
  };

  const generatePackageLabel = (stars: number, tokens: number): string => {
    return `${stars.toLocaleString()} ⭐ (${formatTokens(tokens)} Tokens)`;
  };

  const loadPricing = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/pricing');
      if (res.ok) {
        const data = await res.json();
        setCustomBaseUrl(data.settings?.customBaseUrl || '');
        setProfitMargin(data.settings?.profitMarginPercent ?? 25);
        setPackages(data.settings?.packages || []);
        if (data.settings?.flagshipModels && Array.isArray(data.settings.flagshipModels)) {
          setFlagshipModels(data.settings.flagshipModels);
        }
        setHostUrl(data.hostUrl || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPricing();
  }, []);

  const retailRate = Math.floor(wholesaleRate * (1 - profitMargin / 100));

  // Dynamic profit input handler that updates packages in real-time
  const handleProfitMarginChange = (newMargin: number) => {
    const clamped = Math.max(0, Math.min(85, newMargin));
    setProfitMargin(clamped);

    if (autoSyncPackages) {
      const dynamicRetailRate = Math.floor(wholesaleRate * (1 - clamped / 100));
      setPackages(prev =>
        prev.map(pkg => {
          const calculatedTokens = Math.floor(pkg.stars * dynamicRetailRate);
          return {
            ...pkg,
            tokens: calculatedTokens,
            label: generatePackageLabel(pkg.stars, calculatedTokens)
          };
        })
      );
    }
  };

  const handleApplyMarginToAll = (marginToApply: number = profitMargin) => {
    const dynamicRetailRate = Math.floor(wholesaleRate * (1 - marginToApply / 100));
    const updated = packages.map((pkg) => {
      const calculatedTokens = Math.floor(pkg.stars * dynamicRetailRate);
      return {
        ...pkg,
        tokens: calculatedTokens,
        label: generatePackageLabel(pkg.stars, calculatedTokens)
      };
    });
    setPackages(updated);
    showToast(`Applied ${marginToApply}% profit margin to all packages`);
  };

  // Specific package stars change
  const handlePackageStarsChange = (index: number, newStars: number) => {
    const updated = [...packages];
    const currentPkg = updated[index];
    
    if (newStars <= 0) {
      updated[index] = {
        ...currentPkg,
        stars: 0,
        tokens: 0,
        label: '0 ⭐ (0 Tokens)'
      };
      setPackages(updated);
      return;
    }

    const stars = newStars;
    
    // Determine target margin for this package
    const wholesaleCost = currentPkg.tokens > 0 ? Math.ceil(currentPkg.tokens / wholesaleRate) : 0;
    const profitStars = Math.max(0, currentPkg.stars - wholesaleCost);
    const pkgMargin = currentPkg.stars > 0 ? (profitStars / currentPkg.stars) : (profitMargin / 100);

    const dynamicRate = Math.floor(wholesaleRate * (1 - pkgMargin));
    const newTokens = Math.floor(stars * dynamicRate);

    updated[index] = {
      ...currentPkg,
      stars,
      tokens: newTokens,
      label: generatePackageLabel(stars, newTokens)
    };
    setPackages(updated);
  };

  // Specific package profit percentage change
  const handlePackageMarginChange = (index: number, newMarginPercent: number) => {
    const clamped = Math.max(0, Math.min(85, newMarginPercent || 0));
    const updated = [...packages];
    const currentPkg = updated[index];
    const pkgRetailRate = Math.floor(wholesaleRate * (1 - clamped / 100));
    const calculatedTokens = Math.floor(currentPkg.stars * pkgRetailRate);

    updated[index] = {
      ...currentPkg,
      tokens: calculatedTokens,
      label: generatePackageLabel(currentPkg.stars, calculatedTokens)
    };
    setPackages(updated);
  };

  // Specific package tokens change (manual override)
  const handlePackageTokensChange = (index: number, newTokens: number) => {
    const updated = [...packages];
    const tokens = Math.max(0, newTokens || 0);
    updated[index] = {
      ...updated[index],
      tokens,
      label: generatePackageLabel(updated[index].stars, tokens)
    };
    setPackages(updated);
  };

  const handlePackageChange = (index: number, field: keyof RetailPackageConfig, value: any) => {
    const updated = [...packages];
    updated[index] = { ...updated[index], [field]: value };
    setPackages(updated);
  };

  const handleResetLabel = (index: number) => {
    const updated = [...packages];
    const pkg = updated[index];
    updated[index] = {
      ...pkg,
      label: generatePackageLabel(pkg.stars, pkg.tokens)
    };
    setPackages(updated);
  };

  const handleDuplicatePackage = (index: number) => {
    const pkg = packages[index];
    const newStars = Math.round(pkg.stars * 1.5);
    const newTokens = Math.round(pkg.tokens * 1.5);
    const duplicated: RetailPackageConfig = {
      ...pkg,
      stars: newStars,
      tokens: newTokens,
      label: generatePackageLabel(newStars, newTokens),
      popular: false
    };
    const updated = [...packages];
    updated.splice(index + 1, 0, duplicated);
    setPackages(updated);
    showToast('Package cloned! Adjust values as desired.');
  };

  const handleAddPackage = () => {
    const newStars = 750;
    const currentRetailRate = Math.floor(wholesaleRate * (1 - profitMargin / 100));
    const newTokens = Math.floor(newStars * currentRetailRate);
    setPackages([
      ...packages,
      {
        stars: newStars,
        tokens: newTokens,
        label: generatePackageLabel(newStars, newTokens),
        popular: false
      }
    ]);
    showToast('Added new 750 ⭐ package with current profit margin!');
  };

  const handleLoadFlagshipPacks = () => {
    const flagshipDefaults: RetailPackageConfig[] = [
      { stars: 100, tokens: 900000, label: '100 ⭐ (900k Tokens)', popular: false },
      { stars: 300, tokens: 3300000, label: '300 ⭐ (3.3M Tokens)', popular: true },
      { stars: 750, tokens: 10100000, label: '750 ⭐ (10.1M Tokens)', popular: false },
      { stars: 1500, tokens: 24300000, label: '1,500 ⭐ (24.3M Tokens)', popular: false },
      { stars: 3000, tokens: 51300000, label: '3,000 ⭐ (51.3M Tokens)', popular: false },
      { stars: 6000, tokens: 108000000, label: '6,000 ⭐ (108M Tokens)', popular: false }
    ];
    setPackages(flagshipDefaults);
    showToast('Loaded 6 official Flagship Packs (100⭐ to 6,000⭐)!');
  };

  const handleRemovePackage = (index: number) => {
    if (packages.length <= 1) {
      showToast('You must maintain at least one package');
      return;
    }
    setPackages(packages.filter((_, i) => i !== index));
  };

  const handleAddFlagshipModel = () => {
    const newId = `model_${Date.now()}`;
    setFlagshipModels([
      ...flagshipModels,
      {
        id: newId,
        name: 'New Frontier Model',
        provider: 'Custom',
        officialPricePer1M: 15.00,
        ourRatePer1M: 1.80,
        ratioDescription: '3:1 input:output mix',
        enabled: true
      }
    ]);
    showToast('Added new model row. Configure name, official price & our rate below.');
  };

  const handleUpdateFlagshipModel = (index: number, field: keyof FlagshipModelRate, value: any) => {
    const updated = [...flagshipModels];
    updated[index] = { ...updated[index], [field]: value };
    setFlagshipModels(updated);
  };

  const handleRemoveFlagshipModel = (index: number) => {
    setFlagshipModels(flagshipModels.filter((_, i) => i !== index));
    showToast('Removed model from flagship configuration');
  };

  const handleResetFlagshipModels = () => {
    const defaults: FlagshipModelRate[] = [
      { id: 'astra', name: 'GPT-6 Astra', provider: 'OpenAI', officialPricePer1M: 20.00, ourRatePer1M: 2.14, ratioDescription: '3:1 input:output mix', enabled: true },
      { id: 'opus5', name: 'Claude Opus 5', provider: 'Anthropic', officialPricePer1M: 10.00, ourRatePer1M: 2.23, ratioDescription: '3:1 input:output mix', enabled: true },
      { id: 'sonnet', name: 'Claude Sonnet', provider: 'Anthropic', officialPricePer1M: 4.00, ourRatePer1M: 0.89, ratioDescription: '3:1 input:output mix', enabled: true },
      { id: 'terra', name: 'Claude Terra', provider: 'Anthropic', officialPricePer1M: 4.50, ourRatePer1M: 0.48, ratioDescription: '3:1 input:output mix', enabled: true }
    ];
    setFlagshipModels(defaults);
    showToast('Reset flagship models to default rates!');
  };

  const handleAutoCalculateRatesFromMargin = () => {
    const currentRetailRate = Math.floor(wholesaleRate * (1 - profitMargin / 100));
    const baseOpusCost = (1_000_000 / currentRetailRate) * 0.02;

    const updated = flagshipModels.map((m) => {
      let multiplier = 1.0;
      const lower = m.name.toLowerCase();
      if (lower.includes('astra')) multiplier = 900 / 937.5;
      else if (lower.includes('opus')) multiplier = 1.0;
      else if (lower.includes('sonnet')) multiplier = 0.40;
      else if (lower.includes('terra')) multiplier = 0.215;
      else if (lower.includes('flash')) multiplier = 0.15;
      else if (lower.includes('sol')) multiplier = 0.54;

      const calcRate = Number((baseOpusCost * multiplier).toFixed(2));
      return {
        ...m,
        ourRatePer1M: calcRate
      };
    });
    setFlagshipModels(updated);
    showToast(`Recalculated our rates per 1M tokens based on active ${profitMargin}% margin!`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate packages have positive stars and tokens
    const invalidPkg = packages.find(p => !p.stars || p.stars <= 0 || !p.tokens || p.tokens <= 0);
    if (invalidPkg) {
      showToast('⚠️ Please ensure all packages have valid Stars and Token amounts greater than 0.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customBaseUrl: customBaseUrl.trim(),
          profitMarginPercent: profitMargin,
          retailTokensPerStar: retailRate,
          packages,
          flagshipModels
        })
      });

      if (res.ok) {
        showToast('✅ Pricing & Flagship Models updated successfully!');
        onPricingUpdated();
      } else {
        showToast('❌ Failed to update pricing settings');
      }
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-violet-950/60 via-slate-900 to-slate-900 border border-violet-500/30 p-6 sm:p-7 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-semibold mb-2">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Reseller Profit Engine</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
            Pricing, Margins &amp; Custom Base URL
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Control the exact profit margin you earn on every Telegram Stars purchase, customize user-facing packages, and configure your own custom endpoint URL.
          </p>
        </div>

        <button
          onClick={loadPricing}
          disabled={isLoading}
          className="p-3 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition shrink-0 self-start md:self-center"
          title="Refresh pricing"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Custom Base URL / White-label */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-lg space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Custom Base URL (White-label Endpoint)</h3>
                <p className="text-xs text-slate-400">
                  Override the default upstream URL shown to customers and used in Cursor / Claude Code.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Client Base URL Endpoint
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={customBaseUrl}
                onChange={(e) => setCustomBaseUrl(e.target.value)}
                placeholder="https://api-router.opustokens.workers.dev/v1 (Default)"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setCustomBaseUrl(hostUrl)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-medium rounded-xl border border-slate-700 transition whitespace-nowrap"
              >
                Use App's Built-in Proxy
              </button>
              <button
                type="button"
                onClick={() => setCustomBaseUrl('')}
                className="px-3 py-2.5 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-xl transition"
              >
                Reset Default
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sky-300 font-medium">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  <span>How Custom Base URL Works:</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWorkerModal(!showWorkerModal)}
                  className="flex items-center space-x-1.5 px-3 py-1 bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white rounded-lg border border-violet-500/30 text-xs font-semibold transition"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>{showWorkerModal ? 'Hide Cloudflare Worker Code' : 'View Cloudflare Worker Code'}</span>
                  {showWorkerModal ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                </button>
              </div>

              <ul className="text-slate-400 space-y-1 pl-6 list-disc">
                <li>
                  <strong>Direct Endpoint:</strong> You can set <code className="text-emerald-400 font-mono">https://api.yourdomain.com</code> without <code className="text-slate-300">/v1</code>! Our Worker maps your domain root directly to upstream <code className="text-violet-300 font-mono">/v1</code>.
                </li>
                <li>
                  <strong>Anti-Leak Protection:</strong> If anyone types your naked domain in a browser (<code className="text-amber-300 font-mono">https://api.yourdomain.com/</code>), the Worker intercepts it and shows your own brand page or redirects to your bot. It blocks the upstream owner's Telegram redirect.
                </li>
                <li>
                  <strong>App's Built-in Proxy:</strong> <code className="text-emerald-300 font-mono">{hostUrl ? hostUrl.replace('/v1', '') : 'https://your-app-domain.com'}</code> — your app server also reverse-proxies requests directly to upstream without needing a separate worker.
                </li>
              </ul>

              {/* Collapsible Cloudflare Worker Code */}
              {showWorkerModal && (
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                        <span>⚡ Cloudflare Worker Code Generator</span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                          api.yourdomain.com == upstream/v1
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Paste this into your Cloudflare Worker. It routes all traffic directly to upstream <code className="text-violet-300">/v1</code> while guarding your brand.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const code = `/**
 * Custom Base URL Gateway
 * Maps: https://api.yourdomain.com/* ==> https://api-router.opustokens.workers.dev/v1/*
 * Blocks upstream TG redirect on naked domain visit
 */
const BRAND_NAME = "${workerBrandName}";
const BOT_LINK = "${workerBotUrl}";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. If someone visits naked root ("/") in browser: show your brand or redirect to your bot
    if (path === "/" || path === "" || path === "/docs") {
      const html = \`<!DOCTYPE html>
<html>
<head><title>\${BRAND_NAME} Gateway</title><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#0b0f19;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="background:#131c2e;padding:32px;border-radius:16px;text-align:center;max-width:400px;border:1px solid #1f293d;">
    <h2 style="margin:0 0 8px;">\${BRAND_NAME}</h2>
    <p style="color:#9ca3af;font-size:14px;">High-speed AI API Gateway for Claude Opus 5 & GPT-6.</p>
    <a href="\${BOT_LINK}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;margin-top:10px;">Open Telegram Bot</a>
    <div style="margin-top:20px;font-family:monospace;background:#0b0f19;padding:8px;border-radius:6px;font-size:12px;color:#818cf8;">Base URL: \${url.origin}</div>
  </div>
</body>
</html>\`;
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    // 2. Map https://api.yourdomain.com/* directly to upstream /v1/*
    // Strip accidental /v1 if client SDK already appended it
    const cleanPath = path.startsWith("/v1/") ? path.replace("/v1/", "/") : path;
    const upstreamUrl = new URL("/v1" + cleanPath + url.search, "https://api-router.opustokens.workers.dev");

    const headers = new Headers(request.headers);
    headers.set("Host", "api-router.opustokens.workers.dev");

    const newRequest = new Request(upstreamUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
      redirect: "manual" // Blocks any upstream redirect attempt
    });

    try {
      const response = await fetch(newRequest);
      // Block upstream 301/302 redirects to Telegram
      if (response.status >= 300 && response.status < 400) {
        return new Response(JSON.stringify({ error: "redirect_blocked", message: "Upstream redirect was safely intercepted." }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
      return response;
    } catch (err) {
      return new Response(JSON.stringify({ error: "gateway_error", message: err.message }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};`;
                        navigator.clipboard.writeText(code);
                        setCopiedWorkerCode(true);
                        showToast('Cloudflare Worker code copied to clipboard!');
                        setTimeout(() => setCopiedWorkerCode(false), 2500);
                      }}
                      className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition shrink-0"
                    >
                      {copiedWorkerCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedWorkerCode ? 'Copied!' : 'Copy Worker Code'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold uppercase">Your Brand Name</label>
                      <input
                        type="text"
                        value={workerBrandName}
                        onChange={(e) => setWorkerBrandName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold uppercase">Your Telegram Bot Link</label>
                      <input
                        type="text"
                        value={workerBotUrl}
                        onChange={(e) => setWorkerBotUrl(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 mt-0.5"
                      />
                    </div>
                  </div>

                  <pre className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto leading-relaxed">
{`// Cloudflare Worker: api.yourdomain.com == api-router.opustokens.workers.dev/v1
const BRAND_NAME = "${workerBrandName}";
const BOT_LINK = "${workerBotUrl}";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Intercept root visit to prevent Telegram redirect
    if (path === "/" || path === "" || path === "/docs") {
      return new Response(\`<!DOCTYPE html><html>...</html>\`, {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // Map: https://api.yourdomain.com/* => https://api-router.opustokens.workers.dev/v1/*
    const cleanPath = path.startsWith("/v1/") ? path.replace("/v1/", "/") : path;
    const upstreamUrl = new URL("/v1" + cleanPath + url.search, "https://api-router.opustokens.workers.dev");

    const headers = new Headers(request.headers);
    headers.set("Host", "api-router.opustokens.workers.dev");

    return fetch(new Request(upstreamUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
      redirect: "manual" // Block upstream Telegram redirects
    }));
  }
};`}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Profit Margin Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-lg space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-slate-100">Profit Margin &amp; Dynamic Pricing Engine</h3>
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                    <Zap className="w-3 h-3 animate-pulse" />
                    <span>Live Dynamic Sync</span>
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Wholesale Cost: <strong className="text-amber-400 font-mono">{wholesaleRate.toLocaleString()} tokens / 1 ⭐</strong>
                  <span className="mx-2 text-slate-600">•</span>
                  Retail Rate: <strong className="text-emerald-400 font-mono">{retailRate.toLocaleString()} tokens / 1 ⭐</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  checked={autoSyncPackages}
                  onChange={(e) => setAutoSyncPackages(e.target.checked)}
                  className="rounded border-slate-700 accent-emerald-500 w-3.5 h-3.5"
                />
                <span className="text-xs font-semibold">Auto-Sync Packages</span>
              </label>

              <button
                type="button"
                onClick={() => handleApplyMarginToAll(profitMargin)}
                className="px-3.5 py-1.5 bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white rounded-xl text-xs font-semibold border border-violet-500/30 transition flex items-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Apply {profitMargin}% to All</span>
              </button>
            </div>
          </div>

          {/* Margin Slider & Calculation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Global Profit Margin Input
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Updates package token quantities and profits dynamically
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1 rounded-xl border border-emerald-500/40 shadow-inner">
                  <input
                    type="number"
                    min="0"
                    max="85"
                    value={profitMargin}
                    onChange={(e) => handleProfitMarginChange(parseInt(e.target.value, 10) || 0)}
                    className="w-16 bg-transparent text-center font-extrabold text-emerald-400 font-mono text-lg focus:outline-none"
                  />
                  <span className="text-emerald-400 font-bold text-lg">%</span>
                </div>
              </div>

              {/* Slider */}
              <div className="space-y-1">
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="1"
                  value={profitMargin}
                  onChange={(e) => handleProfitMarginChange(parseInt(e.target.value, 10))}
                  className="w-full h-3 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono px-1">
                  <span>0% (Wholesale pass-through)</span>
                  <span>25% (Standard)</span>
                  <span>50%</span>
                  <span>80% (High Margin)</span>
                </div>
              </div>

              {/* Quick margin presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[10, 15, 20, 25, 30, 35, 40, 50].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleProfitMarginChange(m)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                      profitMargin === m
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {m}%
                  </button>
                ))}
              </div>
            </div>

            {/* Live Comparison Card */}
            <div className="lg:col-span-5 bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Live Unit Rate Breakdown
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-violet-500/10 text-violet-300 rounded border border-violet-500/20">
                  Tier Active
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Wholesale cost:</span>
                <span className="font-mono text-amber-400 font-bold">{wholesaleRate.toLocaleString()} tokens / ⭐</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Customer retail rate:</span>
                <span className="font-mono text-emerald-400 font-bold">{retailRate.toLocaleString()} tokens / ⭐</span>
              </div>

              <div className="border-t border-slate-800 pt-2 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium">Profit per 100 ⭐ sold:</span>
                  <span className="font-mono text-emerald-300 font-bold">
                    +{Math.round(100 * (profitMargin / 100))} ⭐ <span className="text-[11px] text-slate-400 font-normal">(~${(100 * (profitMargin / 100) * 0.014).toFixed(2)})</span>
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium">Profit per 1,000 ⭐ sold:</span>
                  <span className="font-mono text-emerald-300 font-bold bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                    +{Math.round(1000 * (profitMargin / 100))} ⭐ <span className="text-[11px] text-emerald-400/80 font-normal">(~${(1000 * (profitMargin / 100) * 0.014).toFixed(2)})</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Retail Packages Table */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-bold text-slate-200">
                    Customer Telegram Star Packages &amp; Exact Profits
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 text-[10px] font-mono border border-violet-500/20">
                    {packages.length} Packages Configured
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Adjust the profit input globally above or customize individual package margins below. Delivered tokens and profits update dynamically.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleLoadFlagshipPacks}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 hover:border-amber-500/40 text-xs font-semibold rounded-xl shadow-sm transition"
                  title="Load the 6 official Flagship tiers (100⭐ to 6,000⭐)"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>Load Flagships (100⭐-6000⭐)</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddPackage}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl shadow-md transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Package</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950/60 shadow-inner">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Stars Paid</th>
                    <th className="py-3 px-4 text-emerald-400">Target Profit %</th>
                    <th className="py-3 px-4">Tokens Delivered</th>
                    <th className="py-3 px-4">Button Label in Telegram</th>
                    <th className="py-3 px-4">Wholesale Cost</th>
                    <th className="py-3 px-4 text-emerald-400">Your Exact Profit (⭐)</th>
                    <th className="py-3 px-4 text-sky-400">Customer Savings vs Official</th>
                    <th className="py-3 px-4 text-center">Popular</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {packages.map((pkg, idx) => {
                    const wholesaleCost = Math.ceil(pkg.tokens / wholesaleRate);
                    const profitStars = Math.max(0, pkg.stars - wholesaleCost);
                    const pkgMargin = pkg.stars > 0 ? Math.round((profitStars / pkg.stars) * 100) : 0;
                    const usdValue = (profitStars * 0.014).toFixed(2);

                    return (
                      <tr key={idx} className="hover:bg-slate-850/50 transition">
                        {/* Stars Paid */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              min="1"
                              step="any"
                              value={pkg.stars || ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                handlePackageStarsChange(idx, isNaN(val) ? 0 : val);
                              }}
                              className="w-20 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-lg px-2 py-1 text-center font-bold text-amber-400 font-mono text-xs focus:outline-none"
                            />
                            <span className="text-amber-400 font-bold">⭐</span>
                          </div>
                        </td>

                        {/* Target Profit % Input */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              min="0"
                              max="85"
                              step="any"
                              value={pkgMargin}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                handlePackageMarginChange(idx, isNaN(val) ? 0 : val);
                              }}
                              className="w-16 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-2 py-1 text-center font-bold text-emerald-400 font-mono text-xs focus:outline-none"
                            />
                            <span className="text-emerald-400 font-bold">%</span>
                          </div>
                        </td>

                        {/* Tokens Delivered */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <input
                              type="number"
                              min="1000"
                              step="any"
                              value={pkg.tokens || ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                handlePackageTokensChange(idx, isNaN(val) ? 0 : val);
                              }}
                              className="w-32 bg-slate-900 border border-slate-700 focus:border-violet-500 rounded-lg px-2 py-1 text-right font-bold text-violet-300 font-mono text-xs focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5 text-right">
                              ~{formatTokens(pkg.tokens)}
                            </span>
                          </div>
                        </td>

                        {/* Label in Telegram */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1.5">
                            <input
                              type="text"
                              value={pkg.label || ''}
                              onChange={(e) => handlePackageChange(idx, 'label', e.target.value)}
                              className="w-48 bg-slate-900 border border-slate-700 focus:border-violet-500 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleResetLabel(idx)}
                              title="Reset label to standard format"
                              className="p-1 text-slate-500 hover:text-violet-400 rounded transition"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Wholesale Cost */}
                        <td className="py-3 px-4">
                          <div className="font-mono">
                            <span className="font-bold text-amber-400/90">{wholesaleCost} ⭐</span>
                            <div className="text-[10px] text-slate-500">
                              {(wholesaleCost * wholesaleRate).toLocaleString()} tkn
                            </div>
                          </div>
                        </td>

                        {/* Exact Profit */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold">
                              <span>+{profitStars} ⭐</span>
                              <span className="text-[10px] text-emerald-400/80 font-normal">
                                (~${usdValue})
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                              <span>Margin:</span>
                              <span className="text-emerald-400 font-bold font-mono">{pkgMargin}%</span>
                            </div>
                          </div>
                        </td>

                        {/* Customer Savings vs Official */}
                        <td className="py-3 px-4">
                          {(() => {
                            const officialValue = (pkg.tokens / 1000000) * 30.0;
                            const userCostUsd = pkg.stars * 0.02;
                            const customerSavingsUsd = Math.max(0, officialValue - userCostUsd);
                            const customerSavingsPct = officialValue > 0 ? Math.round((customerSavingsUsd / officialValue) * 100) : 0;
                            return (
                              <div className="space-y-0.5">
                                <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 font-mono font-bold text-[11px]">
                                  <span>Save ~${customerSavingsUsd.toFixed(0)}</span>
                                  <span className="text-emerald-400">({customerSavingsPct}% OFF)</span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  Official ~$${officialValue.toFixed(1)} vs ~${userCostUsd.toFixed(1)}
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Popular badge */}
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(pkg.popular)}
                            onChange={(e) => handlePackageChange(idx, 'popular', e.target.checked)}
                            className="rounded border-slate-700 accent-violet-600 w-4 h-4 cursor-pointer"
                          />
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              type="button"
                              onClick={() => handleDuplicatePackage(idx)}
                              className="text-slate-400 hover:text-violet-300 p-1 rounded hover:bg-slate-800 transition"
                              title="Clone package"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemovePackage(idx)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition"
                              title="Delete package"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 📊 Token Rates & Flagship Models Manager */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>📊 Flagship Models &amp; Rate Manager</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                Model Pricing, Official Comparison &amp; Rate per 1M Tokens
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Customize model names, official market list prices, and your rate per 1M tokens. The system calculates customer discounts in real-time.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAutoCalculateRatesFromMargin}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-sky-300 border border-slate-800 hover:border-sky-500/40 text-xs font-semibold rounded-xl shadow-sm transition"
                title="Automatically calculate our rate per 1M tokens from the current profit margin slider"
              >
                <Zap className="w-3.5 h-3.5 text-sky-400" />
                <span>Auto-calc from Margin ({profitMargin}%)</span>
              </button>

              <button
                type="button"
                onClick={handleResetFlagshipModels}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-semibold rounded-xl transition"
                title="Reset to default flagship list"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>

              <button
                type="button"
                onClick={handleAddFlagshipModel}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Model</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950/60 shadow-inner">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Model Name</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4 text-slate-300">Official Price ($ / 1M)</th>
                  <th className="py-3 px-4 text-emerald-400">Our Rate ($ / 1M tokens)</th>
                  <th className="py-3 px-4 text-sky-400">Customer Discount</th>
                  <th className="py-3 px-4 text-center">Active</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {flagshipModels.map((m, idx) => {
                  const official = Number(m.officialPricePer1M) || 0;
                  const ours = Number(m.ourRatePer1M) || 0;
                  const savingsUsd = Math.max(0, official - ours);
                  const discountPct = official > 0 ? Math.round((savingsUsd / official) * 100) : 0;

                  return (
                    <tr key={m.id || idx} className="hover:bg-slate-850/50 transition font-sans">
                      {/* Model Name */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => handleUpdateFlagshipModel(idx, 'name', e.target.value)}
                          placeholder="e.g. GPT-6 Astra"
                          className="w-44 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-400"
                        />
                      </td>

                      {/* Provider */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={m.provider}
                          onChange={(e) => handleUpdateFlagshipModel(idx, 'provider', e.target.value)}
                          placeholder="e.g. OpenAI"
                          className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                        />
                      </td>

                      {/* Official Price ($ / 1M) */}
                      <td className="py-3 px-4">
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1.5 text-slate-500 font-mono text-xs">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={m.officialPricePer1M}
                            onChange={(e) => handleUpdateFlagshipModel(idx, 'officialPricePer1M', parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-6 pr-2 py-1 text-xs text-slate-200 font-mono font-semibold focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </td>

                      {/* Our Rate ($ / 1M tokens) */}
                      <td className="py-3 px-4">
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1.5 text-emerald-400 font-mono text-xs font-bold">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={m.ourRatePer1M}
                            onChange={(e) => handleUpdateFlagshipModel(idx, 'ourRatePer1M', parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-emerald-500/40 rounded-lg pl-6 pr-2 py-1 text-xs text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-400 shadow-sm"
                          />
                        </div>
                      </td>

                      {/* Customer Discount & Savings */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-[11px]">
                            <span>-{discountPct}% OFF</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Save ${savingsUsd.toFixed(2)} / 1M
                          </div>
                        </div>
                      </td>

                      {/* Active toggle */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={m.enabled}
                          onChange={(e) => handleUpdateFlagshipModel(idx, 'enabled', e.target.checked)}
                          className="rounded border-slate-700 accent-amber-500 w-4 h-4 cursor-pointer"
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              const clone = { ...m, id: `model_${Date.now()}` };
                              setFlagshipModels([...flagshipModels, clone]);
                              showToast(`Cloned ${m.name}`);
                            }}
                            className="text-slate-400 hover:text-amber-300 p-1 rounded hover:bg-slate-800 transition"
                            title="Clone model"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFlagshipModel(idx)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition"
                            title="Delete model"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 px-1">
            <span>
              💡 Changes saved here configure the official list prices and our rate per 1M tokens in storage for future publication.
            </span>
            <span className="font-mono text-amber-400 font-semibold">
              {flagshipModels.filter(m => m.enabled).length} of {flagshipModels.length} Models Active
            </span>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end space-x-4">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center space-x-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-2xl shadow-xl shadow-violet-600/30 transition active:scale-[0.98] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save & Publish Pricing'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
