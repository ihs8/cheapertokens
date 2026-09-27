import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { storage } from './src/server/storage';
import { resellerClient } from './src/server/resellerClient';
import { botService, processBotAction, getFlagshipRates } from './src/server/bot';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  app.use((req, _res, next) => {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    if (host && !storage.getHostUrl()) {
      storage.setHostUrl(`${proto}://${host}/v1`);
    }
    next();
  });

  // Reseller Account
  app.get('/api/account', async (req, res) => {
    try {
      const account = await resellerClient.getAccount();
      res.json(account);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Keys Management
  app.get('/api/keys', async (req, res) => {
    try {
      const keys = await resellerClient.listKeys();
      res.json(keys);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/keys', async (req, res) => {
    try {
      const { tokens, label, telegramUserId, telegramUserName } = req.body;
      if (!tokens || tokens <= 0) {
        return res.status(400).json({ error: 'Valid tokens amount required' });
      }
      const result = await resellerClient.mintKey({
        tokens: Number(tokens),
        label,
        telegramUserId,
        telegramUserName
      });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/keys/:id', async (req, res) => {
    const key = storage.getKey(Number(req.params.id));
    if (!key) return res.status(404).json({ error: 'Key not found' });
    res.json(key);
  });

  app.post('/api/keys/:id/topup', async (req, res) => {
    try {
      const keyId = Number(req.params.id);
      const { tokens } = req.body;
      if (!tokens || tokens <= 0) {
        return res.status(400).json({ error: 'Valid tokens amount required' });
      }
      const result = await resellerClient.topupKey({ keyId, tokens: Number(tokens) });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/keys/:id/revoke', async (req, res) => {
    try {
      const keyId = Number(req.params.id);
      const result = await resellerClient.revokeKey(keyId);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/keys/:id/usage', async (req, res) => {
    try {
      const keyId = Number(req.params.id);
      const usage = await resellerClient.getKeyUsage(keyId);
      res.json(usage);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Transactions
  app.get('/api/transactions', (req, res) => {
    res.json(storage.getTransactions());
  });

  // Bot Simulator & Live Bot endpoints
  app.get('/api/bot/status', (req, res) => {
    res.json(botService.getStatus());
  });

  app.post('/api/bot/action', async (req, res) => {
    try {
      const { userId = '12345678', userName = 'user', text, callbackData } = req.body;
      const reply = await processBotAction(userId, userName, { text, callbackData });
      res.json(reply);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Settings & Configuration
  app.get('/api/config', (req, res) => {
    const rk = storage.getResellerKey();
    const botToken = storage.getBotToken();
    res.json({
      hasResellerKey: Boolean(rk),
      maskedResellerKey: rk ? `${rk.slice(0, 7)}...${rk.slice(-4)}` : null,
      hasBotToken: Boolean(botToken),
      maskedBotToken: botToken ? `${botToken.slice(0, 6)}...${botToken.slice(-4)}` : null
    });
  });

  app.post('/api/config', async (req, res) => {
    const { resellerKey, botToken } = req.body;
    if (resellerKey !== undefined) {
      storage.setResellerKey(resellerKey);
    }
    if (botToken !== undefined) {
      storage.setBotToken(botToken);
      if (botToken) {
        await botService.start();
      }
    }
    res.json({ success: true, message: 'Configuration saved' });
  });

  // Reseller Pricing & Custom Base URL
  app.get('/api/pricing', async (req, res) => {
    try {
      const accountData = await resellerClient.getAccount();
      const wholesaleRate = accountData.data?.rate_tokens_per_star || 11700;
      const settings = storage.getPricingSettings();
      const effectiveBaseUrl = storage.getEffectiveBaseUrl();

      res.json({
        settings,
        wholesaleRate,
        effectiveBaseUrl,
        hostUrl: `${req.protocol}://${req.get('host')}/v1`,
        flagshipRates: getFlagshipRates(settings)
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/pricing', (req, res) => {
    try {
      const { customBaseUrl, profitMarginPercent, retailTokensPerStar, packages, flagshipModels } = req.body;
      storage.updatePricingSettings({
        customBaseUrl,
        profitMarginPercent,
        retailTokensPerStar,
        packages,
        flagshipModels
      });
      const updatedSettings = storage.getPricingSettings();
      res.json({
        success: true,
        settings: updatedSettings,
        flagshipRates: getFlagshipRates(updatedSettings)
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/flagship-models', (_req, res) => {
    try {
      const settings = storage.getPricingSettings();
      res.json({ models: settings.flagshipModels || [] });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/flagship-models', (req, res) => {
    try {
      const { models } = req.body;
      if (Array.isArray(models)) {
        storage.updatePricingSettings({ flagshipModels: models });
      }
      res.json({ success: true, models: storage.getPricingSettings().flagshipModels });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/flagship-rates', (_req, res) => {
    try {
      const settings = storage.getPricingSettings();
      res.json(getFlagshipRates(settings));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Custom Reverse Proxy for Client AI Calls (Cursor, Claude Code, Python)
  // Supports base_url being directly https://api.yourdomain.com or https://api.yourdomain.com/v1
  app.post(['/messages', '/chat/completions', '/models', '/v1/messages', '/v1/chat/completions', '/v1/models'], async (req, res) => {
    const authHeader = req.headers['authorization'] || '';
    const anthropicVer = req.headers['anthropic-version'] || '2023-06-01';
    let targetPath = req.path;
    if (!targetPath.startsWith('/v1')) {
      targetPath = `/v1${targetPath}`;
    }

    if (!authHeader) {
      return res.status(401).json({
        error: { type: 'unauthorized', message: 'Missing Authorization header with api_key' }
      });
    }

    try {
      const upstreamRes = await fetch(`https://api-router.opustokens.workers.dev${targetPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader as string,
          'anthropic-version': anthropicVer as string,
          'User-Agent': 'OpusTokens-CustomProxy/1.0'
        },
        body: JSON.stringify(req.body)
      });

      const status = upstreamRes.status;
      const contentType = upstreamRes.headers.get('content-type') || 'application/json';
      res.setHeader('Content-Type', contentType);

      const data = await upstreamRes.json().catch(() => ({}));
      res.status(status).json(data);
    } catch (err: any) {
      res.status(502).json({
        error: { type: 'upstream_unavailable', message: err.message || 'Custom proxy failed to reach upstream router' }
      });
    }
  });

  // Test inference proxy with Claude Opus / Sonnet
  app.post('/api/test-chat', async (req, res) => {
    const { message, model = 'claude-3-opus-20240229', keyId } = req.body;
    let apiKey = storage.getResellerKey();
    if (keyId) {
      const key = storage.getKey(Number(keyId));
      if (key?.api_key) apiKey = key.api_key;
    }

    if (!apiKey) {
      // Simulate intelligent mock response
      return res.json({
        content: `[Simulated Claude Opus 5 Response]\n\nHello! I am Claude Opus 5 connected via the OpusTokens router. Your request was received with prompt caching active (billed at 0.1x). How can I assist with your software architecture or reasoning tasks today?`,
        model,
        usage: { input_tokens: 42, output_tokens: 58 }
      });
    }

    try {
      const response = await fetch('https://api-router.opustokens.workers.dev/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          messages: [{ role: 'user', content: message || 'Hello' }]
        })
      });

      const data = await response.json();
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Start live telegram bot polling if bot token is in environment
  if (process.env.TELEGRAM_BOT_TOKEN) {
    botService.start().then(r => console.log('Bot status:', r.message));
  }

  // Mount Vite development middlewares
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
});
