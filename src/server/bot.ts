import { Bot, InlineKeyboard } from 'grammy';
import { storage } from './storage';
import { resellerClient } from './resellerClient';

export function getBotPackages() {
  const settings = storage.getPricingSettings();
  if (settings.packages && settings.packages.length > 0) {
    return settings.packages.map(p => ({
      stars: p.stars,
      tokens: p.tokens,
      label: p.label || `${p.stars} ⭐ (${(p.tokens >= 1000000 ? (p.tokens / 1000000).toFixed(2) + 'M' : (p.tokens / 1000).toFixed(0) + 'k')} Tokens)`,
      popular: p.popular ?? false,
      savingsPercent: Math.min(98, Math.max(70, Math.round((1 - (p.stars * 0.015) / ((p.tokens / 1000000) * 30)) * 100)))
    }));
  }
  const retailRate = settings.retailTokensPerStar || 8775;
  return [
    { stars: 100, tokens: retailRate * 100, label: `100 ⭐ (${(retailRate * 100 / 1000000).toFixed(2)}M Tokens)`, popular: false, savingsPercent: 94 },
    { stars: 250, tokens: retailRate * 250, label: `250 ⭐ (${(retailRate * 250 / 1000000).toFixed(2)}M Tokens)`, popular: true, savingsPercent: 95 },
    { stars: 500, tokens: retailRate * 500, label: `500 ⭐ (${(retailRate * 500 / 1000000).toFixed(2)}M Tokens)`, popular: false, savingsPercent: 95 },
    { stars: 1000, tokens: retailRate * 1000, label: `1,000 ⭐ (${(retailRate * 1000 / 1000000).toFixed(2)}M Tokens)`, popular: false, savingsPercent: 96 }
  ];
}

export interface BotReply {
  text: string;
  buttons?: { text: string; callback_data?: string; url?: string }[][];
  invoice?: {
    title: string;
    description: string;
    payload: string;
    currency: string;
    stars: number;
  };
}

// Interactive command processor used by both the real Telegram Bot and Web Simulator
export function calculateOfficialComparison(stars: number, tokens: number) {
  // Telegram Stars purchase cost for user:
  // Telegram App Store price: ~$0.02/Star (Fragment price ~$0.014/Star)
  const userStarsCostUsd = stars * 0.02;
  const userStarsFragmentUsd = stars * 0.014;

  // Official Anthropic list price for Claude Opus (3:1 mix: $15 in / $75 out) = $30.00 / 1M tokens
  const officialCostUsd = (tokens / 1_000_000) * 30.0;

  const userSavingsUsd = Math.max(0, officialCostUsd - userStarsCostUsd);
  const savingsPercent = officialCostUsd > 0
    ? Math.min(99, Math.max(0, Math.round((userSavingsUsd / officialCostUsd) * 100)))
    : 0;

  return {
    userStarsCostUsd,
    userStarsFragmentUsd,
    officialCostUsd,
    userSavingsUsd,
    savingsPercent
  };
}

export function getFlagshipRates(pricingSettings = storage.getPricingSettings()) {
  const retailTokensPerStar = pricingSettings.retailTokensPerStar || 8775;
  const profitMarginPercent = pricingSettings.profitMarginPercent ?? 25;

  const packs = [
    { stars: 100, astra: '937.5k', fable: '187.5k', opus5: '900k' },
    { stars: 300, astra: '3.5M', fable: '703.1k', opus5: '3.3M' },
    { stars: 750, astra: '10.5M', fable: '2.1M', opus5: '10.1M' },
    { stars: 1500, astra: '25.3M', fable: '5M', opus5: '24.3M' },
    { stars: 3000, astra: '53.4M', fable: '10.6M', opus5: '51.3M' },
    { stars: 6000, astra: '112.5M', fable: '22.5M', opus5: '108M' }
  ];

  // Price per 1M tokens — official vs ours (dynamically reacting to profit margin setup):
  // 1 Star cost to user is $0.02 USD (100 Stars = $2.00)
  // Opus 5: cost per 1M tokens = (1,000,000 / retailTokensPerStar) * 0.02
  const oursOpus5 = (1_000_000 / retailTokensPerStar) * 0.02;
  // Astra: at 937.5k for 100⭐ vs 900k Opus (1.04167x)
  const oursAstra = (1_000_000 / (retailTokensPerStar * (937.5 / 900))) * 0.02;
  // Sonnet: delivers 2.5x more tokens (weight 0.40)
  const oursSonnet = (1_000_000 / (retailTokensPerStar / 0.40)) * 0.02;
  // Terra: delivers 4.65x more tokens (weight 0.215)
  const oursTerra = (1_000_000 / (retailTokensPerStar / 0.215)) * 0.02;

  const priceComparison = [
    {
      model: 'Astra',
      fullName: 'GPT-6 Astra',
      official: 20.00,
      ours: Number(oursAstra.toFixed(2)),
      discountPct: Math.round(((20.00 - oursAstra) / 20.00) * 100)
    },
    {
      model: 'Opus5',
      fullName: 'Claude Opus 5',
      official: 10.00,
      ours: Number(oursOpus5.toFixed(2)),
      discountPct: Math.round(((10.00 - oursOpus5) / 10.00) * 100)
    },
    {
      model: 'Sonnet',
      fullName: 'Claude Sonnet',
      official: 4.00,
      ours: Number(oursSonnet.toFixed(2)),
      discountPct: Math.round(((4.00 - oursSonnet) / 4.00) * 100)
    },
    {
      model: 'Terra',
      fullName: 'Claude Terra',
      official: 4.50,
      ours: Number(oursTerra.toFixed(2)),
      discountPct: Math.round(((4.50 - oursTerra) / 4.50) * 100)
    }
  ];

  return {
    packs,
    priceComparison,
    profitMarginPercent,
    retailTokensPerStar
  };
}

export function getWhiteLabelBaseUrl(): string {
  const custom = storage.getPricingSettings().customBaseUrl;
  if (custom && custom.trim().length > 0 && !custom.includes('opustokens.workers.dev')) {
    return custom.trim();
  }
  const effective = storage.getEffectiveBaseUrl();
  if (effective && !effective.includes('opustokens.workers.dev')) {
    return effective;
  }
  return 'https://api-key.cheaptokens.space';
}

export function getConnectGuide(os: 'win' | 'mac' | 'linux', tool: 'claude' | 'codex' | 'vscode', apiKey: string = 'YOUR_KEY') {
  const anthropicBaseUrl = 'https://api-key.cheaptokens.space';
  const openaiBaseUrl = 'https://api-key.cheaptokens.space/v1';

  if (os === 'win') {
    if (tool === 'claude') {
      return `🧭 **Claude Code · Windows**\n\n` +
        `1️⃣ **Install Node.js**\n` +
        `Download the LTS build (18+ required) from nodejs.org and install it via the wizard.\n` +
        `Verify the install:\n\n` +
        `\`\`\`shell\n` +
        `node --version\n` +
        `npm --version\n` +
        `\`\`\`\n\n` +
        `2️⃣ **Install Claude Code**\n\n` +
        `\`\`\`shell\n` +
        `npm install -g @anthropic-ai/claude-code --registry=https://registry.npmmirror.com\n` +
        `\`\`\`\n\n` +
        `3️⃣ **Configure**\n` +
        `Open \`C:\\Users\\<username>\\.claude\\settings.json\` and add:\n\n` +
        `\`\`\`json\n` +
        `{"env": {\n` +
        `    "ANTHROPIC_AUTH_TOKEN": "${apiKey}",\n` +
        `    "ANTHROPIC_BASE_URL": "${anthropicBaseUrl}"}}\n` +
        `\`\`\`\n\n` +
        `Or set environment variables (PowerShell, persistent):\n\n` +
        `\`\`\`powershell\n` +
        `[System.Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", "${anthropicBaseUrl}", [System.EnvironmentVariableTarget]::User)\n` +
        `[System.Environment]::SetEnvironmentVariable("ANTHROPIC_AUTH_TOKEN", "${apiKey}", [System.EnvironmentVariableTarget]::User)\n` +
        `\`\`\`\n\n` +
        `4️⃣ **Run**\n\n` +
        `\`\`\`shell\n` +
        `claude\n` +
        `\`\`\``;
    }
    if (tool === 'codex') {
      return `🧭 **Codex · Windows**\n\n` +
        `1️⃣ **Install Node.js**\n` +
        `Like Claude Code, this needs Node.js 18+.\n\n` +
        `2️⃣ **Install Codex**\n\n` +
        `\`\`\`shell\n` +
        `npm i -g @openai/codex --registry=https://registry.npmmirror.com\n` +
        `\`\`\`\n\n` +
        `3️⃣ **Configure**\n` +
        `Create \`C:\\Users\\<username>\\.codex\\config.toml\`:\n\n` +
        `\`\`\`toml\n` +
        `model_provider = "custom"\n` +
        `model = "gpt-5.5"  # Codex CLI runs best on gpt-5.5; the newer flagships work in Cursor & other clients\n` +
        `model_reasoning_effort = "xhigh"\n` +
        `disable_response_storage = true\n\n` +
        `[model_providers.custom]\n` +
        `name = "custom"\n` +
        `wire_api = "responses"\n` +
        `requires_openai_auth = true\n` +
        `base_url = "${openaiBaseUrl}"\n` +
        `\`\`\`\n\n` +
        `Create \`auth.json\` in the same \`.codex\` folder:\n\n` +
        `\`\`\`json\n` +
        `{"OPENAI_API_KEY": "${apiKey}"}\n` +
        `\`\`\`\n\n` +
        `4️⃣ **Run**\n\n` +
        `\`\`\`shell\n` +
        `codex\n` +
        `\`\`\``;
    }
    if (tool === 'vscode') {
      return `🧭 **VS Code · Windows**\n\n` +
        `VS Code works with both agents — Claude Code and Codex. First install and configure the CLI you want (the “Claude Code” or “Codex” sections), then connect the extension.\n\n` +
        `🧩 **Claude Code for VS Code**\n` +
        `Install the “Claude Code for VS Code” extension from the marketplace.\n` +
        `Add to \`C:\\Users\\<username>\\.claude\\config.json\`:\n\n` +
        `\`\`\`json\n` +
        `{"primaryApiKey": "${apiKey}"}\n` +
        `\`\`\`\n` +
        `*Use config.json, not settings.json. The Cursor editor uses the same setting.*\n\n` +
        `🧩 **Codex for VS Code**\n` +
        `Install the “Codex - OpenAI's coding agent” extension.\n` +
        `Create \`C:\\Users\\<username>\\.codex\\auth.json\`:\n\n` +
        `\`\`\`json\n` +
        `{"OPENAI_API_KEY": "${apiKey}"}\n` +
        `\`\`\`\n\n` +
        `Create \`C:\\Users\\<username>\\.codex\\config.toml\`:\n\n` +
        `\`\`\`toml\n` +
        `model_provider = "custom"\n` +
        `model = "gpt-5.5"  # Codex CLI runs best on gpt-5.5; the newer flagships work in Cursor & other clients\n` +
        `model_reasoning_effort = "xhigh"\n` +
        `disable_response_storage = true\n\n` +
        `[model_providers.custom]\n` +
        `name = "custom"\n` +
        `wire_api = "responses"\n` +
        `requires_openai_auth = true\n` +
        `base_url = "${openaiBaseUrl}"\n` +
        `\`\`\``;
    }
  }

  if (os === 'mac') {
    if (tool === 'claude') {
      return `🧭 **Claude Code · macOS**\n\n` +
        `1️⃣ **Install Node.js**\n` +
        `Via Homebrew:\n\n` +
        `\`\`\`shell\n` +
        `brew install node\n` +
        `\`\`\`\n\n` +
        `2️⃣ **Install Claude Code**\n\n` +
        `\`\`\`shell\n` +
        `npm install -g @anthropic-ai/claude-code\n` +
        `\`\`\`\n\n` +
        `3️⃣ **Environment variables (zsh, persistent)**\n\n` +
        `\`\`\`shell\n` +
        `echo 'export ANTHROPIC_BASE_URL="${anthropicBaseUrl}"' >> ~/.zshrc\n` +
        `echo 'export ANTHROPIC_AUTH_TOKEN="${apiKey}"' >> ~/.zshrc\n` +
        `source ~/.zshrc\n` +
        `\`\`\`\n\n` +
        `4️⃣ **Run**\n\n` +
        `\`\`\`shell\n` +
        `claude\n` +
        `\`\`\``;
    }
    if (tool === 'codex') {
      return `🧭 **Codex · macOS**\n\n` +
        `1️⃣ **Install**\n\n` +
        `\`\`\`shell\n` +
        `npm install -g @openai/codex\n` +
        `\`\`\`\n\n` +
        `2️⃣ **Configure**\n` +
        `Create \`~/.codex/config.toml\`:\n\n` +
        `\`\`\`toml\n` +
        `model_provider = "custom"\n` +
        `model = "gpt-5.5"  # Codex CLI runs best on gpt-5.5; the newer flagships work in Cursor & other clients\n` +
        `model_reasoning_effort = "xhigh"\n` +
        `disable_response_storage = true\n\n` +
        `[model_providers.custom]\n` +
        `name = "custom"\n` +
        `wire_api = "responses"\n` +
        `requires_openai_auth = true\n` +
        `base_url = "${openaiBaseUrl}"\n` +
        `\`\`\`\n\n` +
        `Create \`~/.codex/auth.json\`:\n\n` +
        `\`\`\`json\n` +
        `{"OPENAI_API_KEY": "${apiKey}"}\n` +
        `\`\`\`\n\n` +
        `3️⃣ **Run**\n\n` +
        `\`\`\`shell\n` +
        `codex\n` +
        `\`\`\``;
    }
    if (tool === 'vscode') {
      return `🧭 **VS Code · macOS**\n\n` +
        `VS Code works with both agents — Claude Code and Codex. First install and configure the CLI you want (the “Claude Code” or “Codex” sections), then connect the extension.\n\n` +
        `🧩 **Claude Code for VS Code**\n` +
        `Install the “Claude Code for VS Code” extension from the marketplace.\n` +
        `Add to \`~/.claude/config.json\`:\n\n` +
        `\`\`\`json\n` +
        `{"primaryApiKey": "${apiKey}"}\n` +
        `\`\`\`\n` +
        `*Use config.json, not settings.json. The Cursor editor uses the same setting.*\n\n` +
        `🧩 **Codex for VS Code**\n` +
        `Install the “Codex - OpenAI's coding agent” extension.\n` +
        `Create \`~/.codex/auth.json\`:\n\n` +
        `\`\`\`json\n` +
        `{"OPENAI_API_KEY": "${apiKey}"}\n` +
        `\`\`\`\n\n` +
        `Create \`~/.codex/config.toml\`:\n\n` +
        `\`\`\`toml\n` +
        `model_provider = "custom"\n` +
        `model = "gpt-5.5"  # Codex CLI runs best on gpt-5.5; the newer flagships work in Cursor & other clients\n` +
        `model_reasoning_effort = "xhigh"\n` +
        `disable_response_storage = true\n\n` +
        `[model_providers.custom]\n` +
        `name = "custom"\n` +
        `wire_api = "responses"\n` +
        `requires_openai_auth = true\n` +
        `base_url = "${openaiBaseUrl}"\n` +
        `\`\`\``;
    }
  }

  // Linux
  if (tool === 'claude') {
    return `🧭 **Claude Code · Linux**\n\n` +
      `1️⃣ **Install Node.js**\n` +
      `Add the NodeSource repo and install:\n\n` +
      `\`\`\`shell\n` +
      `curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -\n` +
      `sudo apt-get install -y nodejs\n` +
      `\`\`\`\n\n` +
      `2️⃣ **Install Claude Code**\n\n` +
      `\`\`\`shell\n` +
      `npm install -g @anthropic-ai/claude-code\n` +
      `\`\`\`\n\n` +
      `3️⃣ **Environment variables (bash, persistent)**\n\n` +
      `\`\`\`shell\n` +
      `echo 'export ANTHROPIC_BASE_URL="${anthropicBaseUrl}"' >> ~/.bashrc\n` +
      `echo 'export ANTHROPIC_AUTH_TOKEN="${apiKey}"' >> ~/.bashrc\n` +
      `source ~/.bashrc\n` +
      `\`\`\`\n\n` +
      `4️⃣ **Run**\n\n` +
      `\`\`\`shell\n` +
      `claude\n` +
      `\`\`\``;
  }
  if (tool === 'codex') {
    return `🧭 **Codex · Linux**\n\n` +
      `1️⃣ **Install**\n\n` +
      `\`\`\`shell\n` +
      `npm install -g @openai/codex\n` +
      `\`\`\`\n\n` +
      `2️⃣ **Configure**\n` +
      `Create \`~/.codex/config.toml\`:\n\n` +
      `\`\`\`toml\n` +
      `model_provider = "custom"\n` +
      `model = "gpt-5.5"  # Codex CLI runs best on gpt-5.5; the newer flagships work in Cursor & other clients\n` +
      `model_reasoning_effort = "xhigh"\n` +
      `disable_response_storage = true\n\n` +
      `[model_providers.custom]\n` +
      `name = "custom"\n` +
      `wire_api = "responses"\n` +
      `requires_openai_auth = true\n` +
      `base_url = "${openaiBaseUrl}"\n` +
      `\`\`\`\n\n` +
      `Create \`~/.codex/auth.json\`:\n\n` +
      `\`\`\`json\n` +
      `{"OPENAI_API_KEY": "${apiKey}"}\n` +
      `\`\`\`\n\n` +
      `3️⃣ **Run**\n\n` +
      `\`\`\`shell\n` +
      `codex\n` +
      `\`\`\``;
  }
  // Linux VS Code
  return `🧭 **VS Code · Linux**\n\n` +
    `VS Code works with both agents — Claude Code and Codex. First install and configure the CLI you want (the “Claude Code” or “Codex” sections), then connect the extension.\n\n` +
    `🧩 **Claude Code for VS Code**\n` +
    `Install the “Claude Code for VS Code” extension from the marketplace.\n` +
    `Add to \`~/.claude/config.json\`:\n\n` +
    `\`\`\`json\n` +
    `{"primaryApiKey": "${apiKey}"}\n` +
    `\`\`\`\n` +
    `*Use config.json, not settings.json. The Cursor editor uses the same setting.*\n\n` +
    `🧩 **Codex for VS Code**\n` +
    `Install the “Codex - OpenAI's coding agent” extension.\n` +
    `Create \`~/.codex/auth.json\`:\n\n` +
    `\`\`\`json\n` +
    `{"OPENAI_API_KEY": "${apiKey}"}\n` +
    `\`\`\`\n\n` +
    `Create \`~/.codex/config.toml\`:\n\n` +
    `\`\`\`toml\n` +
    `model_provider = "custom"\n` +
    `model = "gpt-5.5"  # Codex CLI runs best on gpt-5.5; the newer flagships work in Cursor & other clients\n` +
    `model_reasoning_effort = "xhigh"\n` +
    `disable_response_storage = true\n\n` +
    `[model_providers.custom]\n` +
    `name = "custom"\n` +
    `wire_api = "responses"\n` +
    `requires_openai_auth = true\n` +
    `base_url = "${openaiBaseUrl}"\n` +
    `\`\`\``;
}

export async function processBotAction(
  userId: number | string,
  userName: string,
  input: { text?: string; callbackData?: string }
): Promise<BotReply> {
  const cb = input.callbackData;
  const text = input.text?.trim() || '';
  const pricing = storage.getPricingSettings();
  const whiteLabelBaseUrl = getWhiteLabelBaseUrl();
  const packages = getBotPackages();

  // 1. Handle callback buttons
  if (cb === 'menu_start' || text === '/start') {
    const keys = storage.getUserKeys(userId);
    const activeKeysCount = keys.filter(k => k.status === 'active').length;
    const retailRate = pricing.retailTokensPerStar || 8775;
    const samplePackage = packages[0] || { stars: 100, tokens: 900000 };
    const sampleComp = calculateOfficialComparison(samplePackage.stars, samplePackage.tokens);

    return {
      text: `👋 **Welcome to Cheaper Tokens Bot!**\n\n` +
        `Get direct, ultra-high-speed API access to **Claude Opus 5, Sonnet 5, GPT-6, and Gemini 3.8 Flash** using Telegram Stars at up to **90%+ off official API list prices**.\n\n` +
        `💎 **Your Account Overview:**\n` +
        `• Active Keys: \`${activeKeysCount}\`\n` +
        `• Standard Rate: \`${retailRate.toLocaleString()} tokens / 1 ⭐\`\n` +
        `• **Example Tier**: \`${samplePackage.stars} ⭐\` = \`${samplePackage.tokens.toLocaleString()} tokens\`\n` +
        `  ↳ Official API Cost: ~$${sampleComp.officialCostUsd.toFixed(2)} → **You save ~$${sampleComp.userSavingsUsd.toFixed(2)} (${sampleComp.savingsPercent}% OFF)!**\n\n` +
        `Choose an action below to get started:`,
      buttons: [
        [
          { text: '🔑 Generate New API Key', callback_data: 'flow_generate' },
          { text: '⚡ Top-up Existing Key', callback_data: 'flow_topup' }
        ],
        [
          { text: '📋 My Keys & Balance', callback_data: 'flow_mykeys' },
          { text: '💡 Rates & Multipliers', callback_data: 'flow_rates' }
        ],
        [
          { text: '🛠️ Integration Setup Guide', callback_data: 'flow_guide' }
        ]
      ]
    };
  }

  // 2. Generate Key Flow
  if (cb === 'flow_generate' || text === '/generate') {
    const buttons = packages.map(pkg => {
      const comp = calculateOfficialComparison(pkg.stars, pkg.tokens);
      return [
        {
          text: `${pkg.popular ? '🔥 ' : ''}${pkg.label} (Save $${Math.round(comp.userSavingsUsd)})`,
          callback_data: `mint_stars_${pkg.stars}`
        }
      ];
    });
    buttons.push([{ text: '« Back to Menu', callback_data: 'menu_start' }]);

    const savingsList = packages.slice(0, 4).map(pkg => {
      const comp = calculateOfficialComparison(pkg.stars, pkg.tokens);
      const tokenStr = pkg.tokens >= 1_000_000
        ? `${(pkg.tokens / 1_000_000).toFixed(1)}M`
        : `${Math.round(pkg.tokens / 1_000)}k`;
      return `• **${pkg.stars} ⭐** (${tokenStr} Tokens): Official ~$${comp.officialCostUsd.toFixed(0)} → **Save ~$${comp.userSavingsUsd.toFixed(0)} (${comp.savingsPercent}% OFF)**`;
    }).join('\n');

    return {
      text: `🔑 **Generate API Key — Cheaper Tokens**\n\n` +
        `Select a Telegram Stars package to mint your dedicated key.\n\n` +
        `📊 **Official API Price Comparison:**\n` +
        `${savingsList}\n\n` +
        `*Keys are delivered immediately and compatible with Cursor, Claude Code, Windsurf, and Python/Node SDKs.*`,
      buttons
    };
  }

  // 3. Purchase / Mint Selection Triggered
  if (cb && cb.startsWith('mint_stars_')) {
    const stars = parseInt(cb.replace('mint_stars_', ''), 10);
    const pkg = packages.find(p => p.stars === stars) || {
      stars,
      tokens: stars * (pricing.retailTokensPerStar || 8775),
      label: `${stars} ⭐`
    };

    const comp = calculateOfficialComparison(pkg.stars, pkg.tokens);

    return {
      text: `💳 **Confirm Order: Cheaper Tokens API Key**\n\n` +
        `📦 **Selected Tier**: \`${pkg.stars} ⭐\` (\`${pkg.tokens.toLocaleString()}\` Tokens)\n\n` +
        `📊 **Official API Price vs. Cheaper Tokens:**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🏢 **Official API Price**: \`~$${comp.officialCostUsd.toFixed(2)} USD\`\n` +
        `⭐ **Cheaper Tokens Cost**: \`${pkg.stars} ⭐\` (~$${comp.userStarsCostUsd.toFixed(2)} USD)\n` +
        `─────────────────────────\n` +
        `💰 **YOUR NET PROFIT / SAVINGS**: \`+$${comp.userSavingsUsd.toFixed(2)} USD\`\n` +
        `🚀 **DISCOUNT**: \`${comp.savingsPercent}% CHEAPER than Official API!\`\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `• **Included Models**: Claude Opus 5, Sonnet 5, GPT-6 Astra, Gemini 3.8 Flash, Grok 4.6\n` +
        `• **Prompt Caching**: 90% discount on cache reads (0.1× standard cost)\n` +
        `• **Validity**: Zero expiration date. Pay only for what you run.\n\n` +
        `Tap **Pay with Stars** below to mint your key instantly.`,
      invoice: {
        title: `Cheaper Tokens Key (${pkg.tokens.toLocaleString()} Tokens)`,
        description: `Dedicated AI API key loaded with ${pkg.tokens.toLocaleString()} normalized tokens. Save ~$${comp.userSavingsUsd.toFixed(0)} vs official rates!`,
        payload: JSON.stringify({ action: 'mint', stars: pkg.stars, tokens: pkg.tokens, userId, userName }),
        currency: 'XTR',
        stars: pkg.stars
      },
      buttons: [
        [
          { text: `⭐ Pay ${pkg.stars} Stars (Save ~$${comp.userSavingsUsd.toFixed(0)} USD)`, callback_data: `pay_mint_${pkg.stars}_${pkg.tokens}` }
        ],
        [
          { text: '« Choose Another Package', callback_data: 'flow_generate' }
        ]
      ]
    };
  }

  // 4. Payment Execution (Simulation & Live Webhook Handler)
  if (cb && cb.startsWith('pay_mint_')) {
    const [, , starsStr, tokensStr] = cb.split('_');
    const stars = parseInt(starsStr, 10);
    const tokens = parseInt(tokensStr, 10);

    const result = await resellerClient.mintKey({
      tokens,
      label: `tg_${userName.replace(/[^a-zA-Z0-9_]/g, '')}_${userId}`,
      telegramUserId: userId,
      telegramUserName: userName
    });

    if (result.error || !result.data?.key) {
      return {
        text: `❌ **Minting Error**\n\n` +
          `Failed to mint key: \`${JSON.stringify(result.error?.message || result.error || 'Unknown error')}\`\n\n` +
          `If this was an idempotency or pool issue, please retry or contact support.`,
        buttons: [[{ text: '« Back to Menu', callback_data: 'menu_start' }]]
      };
    }

    const minted = result.data.key;
    const chargedWholesaleStars = result.data.charged_stars || Math.ceil(tokens / 11700);
    const profitStars = Math.max(0, stars - chargedWholesaleStars);

    storage.addTransaction({
      id: `tx_${Date.now()}`,
      telegramUserId: userId,
      telegramUserName: userName,
      action: 'mint',
      keyId: minted.id,
      stars,
      tokens,
      profitStars,
      status: 'completed',
      createdAt: new Date().toISOString(),
      keyLabel: minted.label,
      operationId: result.data.operation_id
    });

    return {
      text: `🎉 **API Key Minted Successfully!**\n\n` +
        `🔑 **Key ID**: \`${minted.id}\`\n` +
        `🏷️ **Label**: \`${minted.label}\`\n` +
        `💰 **Tokens Total**: \`${minted.tokens_total.toLocaleString()}\`\n` +
        `🌐 **Base URL**:\n\`${whiteLabelBaseUrl}\`\n\n` +
        `🔐 **API Key (Copy now - shown only once!)**:\n\`${minted.api_key}\`\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `**Quick Setup (Cursor / Claude Code):**\n` +
        `• Set Base URL to: \`${whiteLabelBaseUrl}\`\n` +
        `• Set API Key to: \`${minted.api_key}\`\n` +
        `• Models: \`claude-opus-5\`, \`claude-sonnet-5\`, \`gpt-6-astra\`, \`gemini-3.8-flash\``,
      buttons: [
        [
          { text: '📋 View All My Keys', callback_data: 'flow_mykeys' },
          { text: '⚡ Top-up This Key', callback_data: `topup_key_${minted.id}` }
        ],
        [
          { text: '« Main Menu', callback_data: 'menu_start' }
        ]
      ]
    };
  }

  // 5. My Keys Flow
  if (cb === 'flow_mykeys' || text === '/mykeys') {
    const keys = storage.getUserKeys(userId);

    if (keys.length === 0) {
      return {
        text: `📋 **You don't have any keys yet.**\n\nClick below to mint your first API key!`,
        buttons: [
          [{ text: '🔑 Mint My First Key', callback_data: 'flow_generate' }],
          [{ text: '« Main Menu', callback_data: 'menu_start' }]
        ]
      };
    }

    let msg = `📋 **Your Active API Keys (${keys.length})**\n\n`;
    const buttons: { text: string; callback_data: string }[][] = [];

    keys.forEach((k, idx) => {
      const remaining = k.tokens_remaining !== null ? k.tokens_remaining.toLocaleString() : 'Syncing...';
      const statusIcon = k.status === 'active' ? '🟢' : '🔴';
      msg += `**#${idx + 1} Key ID: \`${k.id}\`** ${statusIcon}\n` +
        `• Label: \`${k.label}\`\n` +
        `• Balance: \`${remaining}\` / \`${k.tokens_total.toLocaleString()}\`\n` +
        `• Status: \`${k.status.toUpperCase()}\`\n\n`;

      if (k.status === 'active') {
        buttons.push([
          { text: `⚡ Top-up #${k.id}`, callback_data: `topup_key_${k.id}` },
          { text: `❌ Revoke #${k.id}`, callback_data: `confirm_revoke_${k.id}` }
        ]);
      }
    });

    buttons.push([{ text: '« Main Menu', callback_data: 'menu_start' }]);

    return { text: msg, buttons };
  }

  // 6. Top-up Key Selection Flow
  if (cb === 'flow_topup' || text === '/topup') {
    const keys = storage.getUserKeys(userId).filter(k => k.status === 'active');
    if (keys.length === 0) {
      return {
        text: `⚡ **Top-up Key**\n\nYou do not have any active keys to top up. Please mint a key first.`,
        buttons: [
          [{ text: '🔑 Mint a Key', callback_data: 'flow_generate' }],
          [{ text: '« Main Menu', callback_data: 'menu_start' }]
        ]
      };
    }

    const buttons = keys.map(k => [
      {
        text: `Key #${k.id} (${k.label})`,
        callback_data: `topup_key_${k.id}`
      }
    ]);
    buttons.push([{ text: '« Main Menu', callback_data: 'menu_start' }]);

    return {
      text: `⚡ **Select a Key to Top-up:**`,
      buttons
    };
  }

  if (cb && cb.startsWith('topup_key_')) {
    const keyId = parseInt(cb.replace('topup_key_', ''), 10);
    const key = storage.getKey(keyId);
    if (!key) {
      return {
        text: `❌ Key #${keyId} not found.`,
        buttons: [[{ text: '« Back', callback_data: 'flow_mykeys' }]]
      };
    }

    const buttons = packages.map(pkg => {
      const comp = calculateOfficialComparison(pkg.stars, pkg.tokens);
      return [
        {
          text: `+${pkg.label} (Save $${Math.round(comp.userSavingsUsd)})`,
          callback_data: `topup_select_${keyId}_${pkg.stars}_${pkg.tokens}`
        }
      ];
    });
    buttons.push([{ text: '« Back', callback_data: 'flow_mykeys' }]);

    return {
      text: `⚡ **Top-up Key #${keyId}** (\`${key.label}\`)\n\n` +
        `Current Balance: \`${(key.tokens_remaining ?? key.tokens_total).toLocaleString()} tokens\`\n\n` +
        `Select amount to add to this key (with massive savings vs official pricing):`,
      buttons
    };
  }

  // Top-up Confirmation & Stars Invoice Flow
  if (cb && cb.startsWith('topup_select_')) {
    const [, , keyIdStr, starsStr, tokensStr] = cb.split('_');
    const keyId = parseInt(keyIdStr, 10);
    const stars = parseInt(starsStr, 10);
    const tokens = parseInt(tokensStr, 10);
    const key = storage.getKey(keyId);
    const comp = calculateOfficialComparison(stars, tokens);

    return {
      text: `⚡ **Confirm Top-up for Key #${keyId}** (\`${key?.label || 'API Key'}\`)\n\n` +
        `• **Stars**: \`${stars} ⭐\`\n` +
        `• **Tokens Added**: \`+${tokens.toLocaleString()} tokens\`\n` +
        `• **New Balance**: \`${((key?.tokens_remaining ?? key?.tokens_total ?? 0) + tokens).toLocaleString()} tokens\`\n\n` +
        `📊 **Official Price vs. Cheaper Tokens:**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🏢 **Official API Price**: \`~$${comp.officialCostUsd.toFixed(2)} USD\`\n` +
        `⭐ **Cheaper Tokens Cost**: \`${stars} ⭐\` (~$${comp.userStarsCostUsd.toFixed(2)} USD)\n` +
        `─────────────────────────\n` +
        `💰 **YOU SAVE / PROFIT**: \`+$${comp.userSavingsUsd.toFixed(2)} USD\`\n` +
        `🚀 **DISCOUNT**: \`${comp.savingsPercent}% OFF Official Rates!\`\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Click **Pay with Stars** to complete checkout via Telegram Stars.`,
      invoice: {
        title: `Top-up Key #${keyId} (+${tokens.toLocaleString()} Tokens)`,
        description: `Adds ${tokens.toLocaleString()} tokens to your Cheaper Tokens key #${keyId}. Save ~$${comp.userSavingsUsd.toFixed(0)} vs official rates!`,
        payload: JSON.stringify({ action: 'topup', keyId, stars, tokens, userId, userName }),
        currency: 'XTR',
        stars
      },
      buttons: [
        [
          { text: `⭐ Pay ${stars} Stars (Save ~$${comp.userSavingsUsd.toFixed(0)} USD)`, callback_data: `pay_topup_${keyId}_${stars}_${tokens}` }
        ],
        [
          { text: `« Back to Key #${keyId}`, callback_data: `topup_key_${keyId}` }
        ]
      ]
    };
  }

  // Top-up Payment Execution
  if (cb && cb.startsWith('pay_topup_')) {
    const [, , keyIdStr, starsStr, tokensStr] = cb.split('_');
    const keyId = parseInt(keyIdStr, 10);
    const stars = parseInt(starsStr, 10);
    const tokens = parseInt(tokensStr, 10);

    const result = await resellerClient.topupKey({ keyId, tokens });
    if (result.error || !result.data?.key) {
      return {
        text: `❌ **Top-up Failed**\n\nError: \`${JSON.stringify(result.error)}\``,
        buttons: [[{ text: '« My Keys', callback_data: 'flow_mykeys' }]]
      };
    }

    const updated = result.data.key;
    const chargedWholesaleStars = result.data.charged_stars || Math.ceil(tokens / 11700);
    const profitStars = Math.max(0, stars - chargedWholesaleStars);

    storage.addTransaction({
      id: `tx_${Date.now()}`,
      telegramUserId: userId,
      telegramUserName: userName,
      action: 'topup',
      keyId,
      stars,
      tokens,
      profitStars,
      status: 'completed',
      createdAt: new Date().toISOString(),
      keyLabel: updated.label,
      operationId: result.data.operation_id
    });

    return {
      text: `✅ **Top-up Complete for Key #${keyId}!**\n\n` +
        `• Added: \`+${tokens.toLocaleString()} tokens\`\n` +
        `• New Total Balance: \`${(updated.tokens_remaining ?? updated.tokens_total).toLocaleString()} tokens\`\n` +
        `• Charged: \`${stars} ⭐\``,
      buttons: [
        [{ text: '📋 View All Keys', callback_data: 'flow_mykeys' }],
        [{ text: '« Main Menu', callback_data: 'menu_start' }]
      ]
    };
  }

  // 7. Revoke Key Flow
  if (cb && cb.startsWith('confirm_revoke_')) {
    const keyId = parseInt(cb.replace('confirm_revoke_', ''), 10);
    return {
      text: `⚠️ **Are you sure you want to revoke Key #${keyId}?**\n\n` +
        `*Warning:* Revoking kills the key immediately and does **not** refund remaining tokens back to the pool.`,
      buttons: [
        [{ text: `🛑 Yes, Permanently Revoke #${keyId}`, callback_data: `do_revoke_${keyId}` }],
        [{ text: '« Cancel', callback_data: 'flow_mykeys' }]
      ]
    };
  }

  if (cb && cb.startsWith('do_revoke_')) {
    const keyId = parseInt(cb.replace('do_revoke_', ''), 10);
    const result = await resellerClient.revokeKey(keyId);

    return {
      text: `🛑 **Key #${keyId} Revoked.**\n\nStatus: \`${result.data?.status || 'revoked'}\`\nThis key can no longer be used for API inference calls.`,
      buttons: [
        [{ text: '📋 View Keys', callback_data: 'flow_mykeys' }],
        [{ text: '« Main Menu', callback_data: 'menu_start' }]
      ]
    };
  }

  // 8. Model Multipliers & Rates
  if (cb === 'flow_rates' || text === '/rates' || text === '/pricing') {
    return {
      text: `💡 **Cheaper Tokens Unit & Model Multipliers**\n\n` +
        `**The Normalized Standard:**\n` +
        `1 balance token = 1 token of **Claude Opus 5** at a **3:1 input:output ratio**.\n\n` +
        `**Model Weights (relative to 1M real tokens):**\n` +
        `• **Claude Opus 5**: \`1.00\` (Baseline Yardstick)\n` +
        `• **GPT-6 Astra**: \`1.00\` (1× Opus cost)\n` +
        `• **GPT-5.6 Sol**: \`0.54\` (~1.85× cheaper)\n` +
        `• **Claude Sonnet 5**: \`0.40\` (2.5× cheaper)\n` +
        `• **Gemini 3.8 Flash**: \`0.15\` (~6.7× cheaper)\n` +
        `• **Grok 4.6**: \`0.07\` (~14.3× cheaper)\n\n` +
        `**Composition Modifiers:**\n` +
        `• **Fresh Input**: \`1.0×\`\n` +
        `• **Cached Context**: \`0.1×\` *(90% discount on prompt cache read!)*\n` +
        `• **Output & Reasoning**: \`5.0×\` *(Reasoning tokens bill at output rate)*`,
      buttons: [
        [{ text: '🔑 Mint a Key Now', callback_data: 'flow_generate' }],
        [{ text: '« Main Menu', callback_data: 'menu_start' }]
      ]
    };
  }

  // 9. Interactive Integration Setup Guide (Connect your key)
  if (cb === 'flow_guide' || text === '/guide' || text === '/help') {
    return {
      text: `🧭 **Connect your key**\n\n` +
        `Choose your operating system:`,
      buttons: [
        [
          { text: '🪟 WINDOWS', callback_data: 'guide_os_win' },
          { text: '🍎 MACOS', callback_data: 'guide_os_mac' },
          { text: '🐧 LINUX', callback_data: 'guide_os_linux' }
        ],
        [
          { text: '« Main Menu', callback_data: 'menu_start' }
        ]
      ]
    };
  }

  // OS Selected: Windows
  if (cb === 'guide_os_win') {
    return {
      text: `🧭 **Windows**\n\n` +
        `Choose a tool:`,
      buttons: [
        [
          { text: '🟣 Claude Code', callback_data: 'guide_tool_win_claude' },
          { text: '🟢 Codex', callback_data: 'guide_tool_win_codex' },
          { text: '🔵 VS Code', callback_data: 'guide_tool_win_vscode' }
        ],
        [
          { text: '🧭 Choose Another OS', callback_data: 'flow_guide' },
          { text: '« Main Menu', callback_data: 'menu_start' }
        ]
      ]
    };
  }

  // OS Selected: macOS
  if (cb === 'guide_os_mac') {
    return {
      text: `🧭 **macOS**\n\n` +
        `Choose a tool:`,
      buttons: [
        [
          { text: '🟣 Claude Code', callback_data: 'guide_tool_mac_claude' },
          { text: '🟢 Codex', callback_data: 'guide_tool_mac_codex' },
          { text: '🔵 VS Code', callback_data: 'guide_tool_mac_vscode' }
        ],
        [
          { text: '🧭 Choose Another OS', callback_data: 'flow_guide' },
          { text: '« Main Menu', callback_data: 'menu_start' }
        ]
      ]
    };
  }

  // OS Selected: Linux
  if (cb === 'guide_os_linux') {
    return {
      text: `🧭 **Linux**\n\n` +
        `Choose a tool:`,
      buttons: [
        [
          { text: '🟣 Claude Code', callback_data: 'guide_tool_linux_claude' },
          { text: '🟢 Codex', callback_data: 'guide_tool_linux_codex' },
          { text: '🔵 VS Code', callback_data: 'guide_tool_linux_vscode' }
        ],
        [
          { text: '🧭 Choose Another OS', callback_data: 'flow_guide' },
          { text: '« Main Menu', callback_data: 'menu_start' }
        ]
      ]
    };
  }

  // Tool Selected under OS
  if (cb && cb.startsWith('guide_tool_')) {
    const [, , osPart, toolPart] = cb.split('_');
    const validOs = (osPart === 'win' || osPart === 'mac' || osPart === 'linux') ? osPart : 'win';
    const validTool = (toolPart === 'claude' || toolPart === 'codex' || toolPart === 'vscode') ? toolPart : 'claude';

    const userKeys = storage.getUserKeys(userId);
    const activeKey = userKeys.find(k => k.status === 'active')?.api_key || 'YOUR_KEY';
    const guideText = getConnectGuide(validOs, validTool, activeKey);

    return {
      text: guideText,
      buttons: [
        [
          { text: '« Choose Another Tool', callback_data: `guide_os_${validOs}` },
          { text: '🧭 Change OS', callback_data: 'flow_guide' }
        ],
        [
          { text: '« Main Menu', callback_data: 'menu_start' }
        ]
      ]
    };
  }

  // Fallback
  return {
    text: `🤖 I didn't recognize that command. Use the buttons below or type /start.`,
    buttons: [[{ text: '« Back to Main Menu', callback_data: 'menu_start' }]]
  };
}

// Telegram Live Bot Runner
export class TelegramBotService {
  private bot: Bot | null = null;
  private isRunning: boolean = false;

  async start(): Promise<{ success: boolean; message: string }> {
    const token = storage.getBotToken();
    if (!token) {
      return { success: false, message: 'No TELEGRAM_BOT_TOKEN configured. Running in simulator mode.' };
    }

    try {
      this.bot = new Bot(token);

      // Commands
      this.bot.command(['start', 'help', 'generate', 'topup', 'mykeys', 'rates', 'pricing', 'guide'], async (ctx) => {
        const text = ctx.message?.text || '/start';
        const reply = await processBotAction(
          ctx.from?.id || 1,
          ctx.from?.username || ctx.from?.first_name || 'User',
          { text }
        );
        await this.sendReply(ctx, reply);
      });

      // Callbacks
      this.bot.on('callback_query:data', async (ctx) => {
        const callbackData = ctx.callbackQuery.data;
        await ctx.answerCallbackQuery();
        const reply = await processBotAction(
          ctx.from?.id || 1,
          ctx.from?.username || ctx.from?.first_name || 'User',
          { callbackData }
        );
        await this.sendReply(ctx, reply);
      });

      // Handle Telegram Stars Pre-Checkout Query
      this.bot.on('pre_checkout_query', async (ctx) => {
        try {
          // Telegram Stars require approving the pre-checkout query within 10 seconds
          await ctx.answerPreCheckoutQuery(true);
        } catch (err: any) {
          console.error('Error answering pre_checkout_query:', err?.message);
          await ctx.answerPreCheckoutQuery(false, {
            error_message: 'Checkout confirmation timeout or error. Please try again.'
          });
        }
      });

      // Handle Successful Telegram Stars Payment
      this.bot.on(':successful_payment', async (ctx) => {
        const payment = ctx.message?.successful_payment;
        if (!payment) return;
        try {
          const payload = JSON.parse(payment.invoice_payload);
          const userId = ctx.from?.id || payload.userId || 1;
          const userName = ctx.from?.username || ctx.from?.first_name || 'Customer';
          const starsPaid = payment.total_amount; // Paid in XTR (Telegram Stars)

          const whiteLabelBaseUrl = getWhiteLabelBaseUrl();

          if (payload.action === 'mint') {
            const tokens = payload.tokens;
            const mintResult = await resellerClient.mintKey({
              tokens,
              label: `tg_${userName.replace(/[^a-zA-Z0-9_]/g, '')}_${userId}`,
              telegramUserId: userId,
              telegramUserName: userName
            });

            if (mintResult.data?.key) {
              const k = mintResult.data.key;
              const chargedWholesaleStars = mintResult.data.charged_stars || Math.ceil(tokens / 11700);
              const profitStars = Math.max(0, starsPaid - chargedWholesaleStars);

              storage.addTransaction({
                id: `tx_${Date.now()}`,
                telegramUserId: userId,
                telegramUserName: userName,
                action: 'mint',
                keyId: k.id,
                stars: starsPaid,
                tokens,
                profitStars,
                status: 'completed',
                createdAt: new Date().toISOString(),
                keyLabel: k.label,
                operationId: mintResult.data.operation_id,
                telegramPaymentChargeId: payment.telegram_payment_charge_id
              });

              const keyboard = new InlineKeyboard()
                .text('📋 View My Keys', 'flow_mykeys')
                .text('⚡ Top-up Key', `topup_key_${k.id}`)
                .row()
                .text('« Main Menu', 'menu_start');

              await ctx.reply(
                `🎉 **Payment of ${starsPaid} ⭐ Verified!**\n\n` +
                `Your dedicated AI API key has been minted successfully:\n\n` +
                `🔑 **Key ID**: \`${k.id}\`\n` +
                `🏷️ **Label**: \`${k.label}\`\n` +
                `💰 **Tokens**: \`${k.tokens_total.toLocaleString()}\`\n` +
                `🌐 **Base URL**:\n\`${whiteLabelBaseUrl}\`\n\n` +
                `🔐 **API Key (Copy now - shown once!)**:\n\`${k.api_key}\`\n\n` +
                `━━━━━━━━━━━━━━━━━━━\n` +
                `**Quick Setup:**\n` +
                `• Cursor: Set Base URL to \`${whiteLabelBaseUrl}\` and paste API key.\n` +
                `• Claude Code: \`export ANTHROPIC_BASE_URL="${whiteLabelBaseUrl}"\``,
                { parse_mode: 'Markdown', reply_markup: keyboard }
              );
            } else {
              await ctx.reply(
                `❌ Payment of ${starsPaid} ⭐ received, but key creation failed: \`${mintResult.error?.message || 'Upstream error'}\`.\n\n` +
                `Please contact the bot administrator with your Telegram ID: ${userId}.`
              );
            }
          } else if (payload.action === 'topup' && payload.keyId) {
            const tokens = payload.tokens;
            const topupResult = await resellerClient.topupKey({ keyId: payload.keyId, tokens });

            if (topupResult.data?.key) {
              const updated = topupResult.data.key;
              const chargedWholesaleStars = topupResult.data.charged_stars || Math.ceil(tokens / 11700);
              const profitStars = Math.max(0, starsPaid - chargedWholesaleStars);

              storage.addTransaction({
                id: `tx_${Date.now()}`,
                telegramUserId: userId,
                telegramUserName: userName,
                action: 'topup',
                keyId: payload.keyId,
                stars: starsPaid,
                tokens,
                profitStars,
                status: 'completed',
                createdAt: new Date().toISOString(),
                keyLabel: updated.label,
                operationId: topupResult.data.operation_id,
                telegramPaymentChargeId: payment.telegram_payment_charge_id
              });

              const keyboard = new InlineKeyboard()
                .text('📋 View My Keys', 'flow_mykeys')
                .row()
                .text('« Main Menu', 'menu_start');

              await ctx.reply(
                `⚡ **Payment of ${starsPaid} ⭐ Verified!**\n\n` +
                `Key #${payload.keyId} topped up successfully:\n` +
                `• **Added**: \`+${tokens.toLocaleString()} tokens\`\n` +
                `• **New Balance**: \`${(updated.tokens_remaining ?? updated.tokens_total).toLocaleString()} tokens\``,
                { parse_mode: 'Markdown', reply_markup: keyboard }
              );
            } else {
              await ctx.reply(`❌ Top-up failed: ${topupResult.error?.message || 'Unknown error'}`);
            }
          }
        } catch (e: any) {
          console.error('Error handling successful payment:', e);
          await ctx.reply(`Payment was registered, but an error occurred: ${e.message}`);
        }
      });

      // Start polling
      this.bot.start({
        onStart: (info) => {
          this.isRunning = true;
          console.log(`Telegram Bot @${info.username} started successfully!`);
        }
      });

      return { success: true, message: 'Bot started successfully via polling.' };
    } catch (err: any) {
      this.isRunning = false;
      return { success: false, message: `Failed to initialize bot: ${err?.message}` };
    }
  }

  private async sendReply(ctx: any, reply: BotReply) {
    // If the reply includes a Telegram Stars invoice, send the official Telegram Stars invoice card!
    if (reply.invoice) {
      try {
        const invoiceButtons = new InlineKeyboard()
          .pay(`⭐ Pay ${reply.invoice.stars} Stars`)
          .row();

        if (reply.buttons && reply.buttons.length > 0) {
          reply.buttons.forEach(row => {
            row.forEach(btn => {
              // Exclude duplicate simulation pay buttons on live Telegram Stars invoice
              if (!btn.callback_data?.startsWith('pay_mint_') && !btn.callback_data?.startsWith('pay_topup_')) {
                invoiceButtons.text(btn.text, btn.callback_data || 'menu_start');
              }
            });
            invoiceButtons.row();
          });
        }

        // According to https://core.telegram.org/bots/payments-stars:
        // currency must be 'XTR' and provider_token must be an empty string ""
        await ctx.replyWithInvoice(
          reply.invoice.title,
          reply.invoice.description,
          reply.invoice.payload,
          'XTR',
          [{ label: reply.invoice.title, amount: reply.invoice.stars }],
          {
            provider_token: '',
            reply_markup: invoiceButtons
          }
        );
        return;
      } catch (invoiceErr: any) {
        console.warn('Could not send live Stars invoice card (Bot payments may not be enabled on BotFather):', invoiceErr?.message);
        // Graceful fallback to regular text + buttons with helpful note
      }
    }

    const keyboard = reply.buttons ? new InlineKeyboard(
      reply.buttons.map(row =>
        row.map(btn => {
          if (btn.url) return InlineKeyboard.url(btn.text, btn.url);
          return InlineKeyboard.text(btn.text, btn.callback_data || 'menu_start');
        })
      )
    ) : undefined;

    await ctx.reply(reply.text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  getStatus() {
    return {
      configured: Boolean(storage.getBotToken()),
      running: this.isRunning
    };
  }
}

export const botService = new TelegramBotService();
