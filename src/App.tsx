/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { BotSimulator } from './components/BotSimulator';
import { KeysManager } from './components/KeysManager';
import { PoolOverview } from './components/PoolOverview';
import { TokenCalculator } from './components/TokenCalculator';
import { SetupGuides } from './components/SetupGuides';
import { PricingProfitManager } from './components/PricingProfitManager';
import { SettingsModal } from './components/SettingsModal';
import { ResellerAccount, ResellerKey } from './types/reseller';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('simulator');
  const [account, setAccount] = useState<ResellerAccount | null>(null);
  const [isLiveAccount, setIsLiveAccount] = useState(false);
  const [keys, setKeys] = useState<ResellerKey[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [botStatus, setBotStatus] = useState({ configured: false, running: false });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadAccount = async () => {
    try {
      const res = await fetch('/api/account');
      if (res.ok) {
        const json = await res.json();
        setAccount(json.data);
        setIsLiveAccount(json.isLive);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const res = await fetch('/api/keys');
      if (res.ok) {
        const data = await res.json();
        setKeys(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const res = await fetch('/api/transactions');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadBotStatus = async () => {
    try {
      const res = await fetch('/api/bot/status');
      if (res.ok) {
        const data = await res.json();
        setBotStatus(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const refreshAll = () => {
    loadAccount();
    loadKeys();
    loadTransactions();
    loadBotStatus();
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const handleMintKey = async (tokens: number, label: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens, label })
      });
      const data = await res.json();
      if (data.data?.key) {
        showToast(`🎉 Key #${data.data.key.id} minted successfully!`);
        refreshAll();
        return true;
      } else {
        showToast(`❌ Minting failed: ${JSON.stringify(data.error || 'Unknown error')}`);
        return false;
      }
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
      return false;
    }
  };

  const handleTopupKey = async (keyId: number, tokens: number): Promise<boolean> => {
    try {
      const res = await fetch(`/api/keys/${keyId}/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens })
      });
      const data = await res.json();
      if (data.data?.key) {
        showToast(`⚡ Key #${keyId} topped up with +${tokens.toLocaleString()} tokens!`);
        refreshAll();
        return true;
      } else {
        showToast(`❌ Top-up failed: ${JSON.stringify(data.error || 'Unknown error')}`);
        return false;
      }
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
      return false;
    }
  };

  const handleRevokeKey = async (keyId: number): Promise<boolean> => {
    try {
      const res = await fetch(`/api/keys/${keyId}/revoke`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.data?.status === 'revoked') {
        showToast(`🛑 Key #${keyId} has been revoked.`);
        refreshAll();
        return true;
      } else {
        showToast(`❌ Revoke failed: ${JSON.stringify(data.error || 'Unknown error')}`);
        return false;
      }
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-violet-600 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-violet-500/50 text-slate-100 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        account={account}
        isLiveAccount={isLiveAccount}
        botStatus={botStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Body */}
      <main className="flex-1 pb-16">
        {activeTab === 'simulator' && (
          <BotSimulator onKeyMintedOrUpdated={refreshAll} />
        )}

        {activeTab === 'pricing' && (
          <PricingProfitManager
            wholesaleRate={account?.rate_tokens_per_star || 11700}
            onPricingUpdated={refreshAll}
            showToast={showToast}
          />
        )}

        {activeTab === 'keys' && (
          <KeysManager
            keys={keys}
            isLoading={isLoadingKeys}
            onRefresh={loadKeys}
            onMintKey={handleMintKey}
            onTopupKey={handleTopupKey}
            onRevokeKey={handleRevokeKey}
          />
        )}

        {activeTab === 'pool' && (
          <PoolOverview account={account} transactions={transactions} />
        )}

        {activeTab === 'calculator' && (
          <TokenCalculator rateTokensPerStar={account?.rate_tokens_per_star || 11700} />
        )}

        {activeTab === 'setup' && (
          <SetupGuides keys={keys} />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={refreshAll}
      />
    </div>
  );
}
