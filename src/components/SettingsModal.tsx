import React, { useState, useEffect } from 'react';
import { Settings, Key, Bot, Shield, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [resellerKey, setResellerKey] = useState('');
  const [botToken, setBotToken] = useState('');
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/config')
        .then(r => r.json())
        .then(d => setConfigStatus(d))
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const payload: any = {};
      if (resellerKey.trim()) payload.resellerKey = resellerKey.trim();
      if (botToken.trim()) payload.botToken = botToken.trim();

      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSavedSuccess(true);
        setResellerKey('');
        setBotToken('');
        const updated = await fetch('/api/config').then(r => r.json());
        setConfigStatus(updated);
        onSaved();
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">API &amp; Bot Configuration</h3>
              <p className="text-xs text-slate-400">Connect your live OpusTokens reseller key and Telegram Bot.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">
            ✕
          </button>
        </div>

        {/* Current Status Pills */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="text-slate-500 flex items-center space-x-1">
              <Key className="w-3.5 h-3.5" />
              <span>Reseller Key:</span>
            </div>
            <div className="mt-1 font-mono font-medium">
              {configStatus?.hasResellerKey ? (
                <span className="text-emerald-400">Connected ({configStatus.maskedResellerKey})</span>
              ) : (
                <span className="text-amber-400">Sandbox / Demo Mode</span>
              )}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="text-slate-500 flex items-center space-x-1">
              <Bot className="w-3.5 h-3.5" />
              <span>Telegram Bot:</span>
            </div>
            <div className="mt-1 font-mono font-medium">
              {configStatus?.hasBotToken ? (
                <span className="text-emerald-400">Live Polling ({configStatus.maskedBotToken})</span>
              ) : (
                <span className="text-sky-400">Simulator Active</span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              OpusTokens Reseller Token (<code className="text-violet-300">rk_...</code>)
            </label>
            <input
              type="password"
              placeholder={configStatus?.hasResellerKey ? '•••••••••••••••••••• (Leave blank to keep)' : 'rk_... (From reseller panel)'}
              value={resellerKey}
              onChange={(e) => setResellerKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Obtain from the Telegram reseller panel via <em>API token</em>. All requests are securely proxied server-side.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Telegram Bot Token (<code className="text-violet-300">@BotFather</code>)
            </label>
            <input
              type="password"
              placeholder={configStatus?.hasBotToken ? '•••••••••••••••••••• (Leave blank to keep)' : '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ'}
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Optional: Starts real-time Telegram polling so users can talk to your bot directly on Telegram.
            </p>
          </div>

          {savedSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-xs text-emerald-300">
              <Check className="w-4 h-4 shrink-0" />
              <span>Configuration successfully saved!</span>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSaving || (!resellerKey.trim() && !botToken.trim())}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl shadow-lg transition disabled:opacity-40"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
