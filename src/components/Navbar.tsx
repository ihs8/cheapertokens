import React from 'react';
import { Bot, Key, Wallet, Calculator, Terminal, Settings, DollarSign } from 'lucide-react';
import { ResellerAccount } from '../types/reseller';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  account: ResellerAccount | null;
  isLiveAccount: boolean;
  botStatus: { configured: boolean; running: boolean };
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  account,
  isLiveAccount,
  botStatus,
  onOpenSettings
}) => {
  const tabs = [
    { id: 'simulator', label: 'Telegram Bot', icon: Bot, badge: botStatus.running ? 'Live' : 'Sim' },
    { id: 'pricing', label: 'Pricing & Profit', icon: DollarSign, badge: 'Profits' },
    { id: 'keys', label: 'API Keys', icon: Key },
    { id: 'pool', label: 'Pool & Reseller', icon: Wallet },
    { id: 'calculator', label: 'Economics & Rates', icon: Calculator },
    { id: 'setup', label: 'Client Setup & Chat', icon: Terminal },
  ];

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-xl">
              ⚡
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-100 tracking-tight">Cheaper Tokens</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Reseller &amp; Bot
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Telegram Stars AI Bot &amp; Multi-Model Router</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/25'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                        tab.badge === 'Live'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Status & Settings */}
          <div className="flex items-center space-x-3">
            {account && (
              <div className="hidden lg:flex items-center space-x-3 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-slate-400">Pool:</span>
                  <span className="font-semibold text-amber-400">{account.pool_stars.toLocaleString()} ⭐</span>
                </div>
                <span className="text-slate-600">|</span>
                <div className="flex items-center space-x-1">
                  <span className="text-slate-400">Tier {account.tier}:</span>
                  <span className="font-medium text-violet-300">{account.rate_tokens_per_star.toLocaleString()} tok/⭐</span>
                </div>
              </div>
            )}

            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-800 hover:border-slate-700 transition"
              title="API & Bot Configuration"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Bar */}
      <div className="md:hidden flex overflow-x-auto border-t border-slate-800 px-2 py-1.5 space-x-1 scrollbar-none bg-slate-900/95">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition ${
                isActive ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
