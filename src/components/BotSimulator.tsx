import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, Check, Copy, RefreshCw, Key, ShieldCheck, ExternalLink } from 'lucide-react';
import { BotReply } from '../server/bot';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  buttons?: { text: string; callback_data?: string; url?: string }[][];
  invoice?: {
    title: string;
    description: string;
    payload: string;
    currency: string;
    stars: number;
  };
  timestamp: string;
}

interface BotSimulatorProps {
  onKeyMintedOrUpdated?: () => void;
}

export const BotSimulator: React.FC<BotSimulatorProps> = ({ onKeyMintedOrUpdated }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<any | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Initial /start on mount
  useEffect(() => {
    sendAction({ text: '/start' });
  }, []);

  const sendAction = async (input: { text?: string; callbackData?: string }) => {
    if (isLoading) return;
    setIsLoading(true);

    // If user typed a message, add it locally immediately
    if (input.text) {
      const userMsg: Message = {
        id: `user_${Date.now()}`,
        sender: 'user',
        text: input.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, userMsg]);
    }

    try {
      const res = await fetch('/api/bot/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '987654321',
          userName: 'AlexDeveloper',
          text: input.text,
          callbackData: input.callbackData
        })
      });

      const reply: BotReply = await res.json();

      const botMsg: Message = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: reply.text,
        buttons: reply.buttons,
        invoice: reply.invoice,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);

      // If a key was minted or topped up, trigger refresh
      if (input.callbackData?.startsWith('pay_')) {
        onKeyMintedOrUpdated?.();
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          sender: 'bot',
          text: '⚠️ Failed to connect to bot router service. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
      setInputValue('');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      // Bold + Inline Code formatting
      const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);

      return (
        <div key={idx} className={line.trim() === '' ? 'h-2' : 'min-h-[1.2rem]'}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              const code = part.slice(1, -1);
              const isKey = code.startsWith('sk-');
              return (
                <span
                  key={pIdx}
                  className={`font-mono text-xs px-1.5 py-0.5 rounded mx-0.5 ${
                    isKey
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40 select-all cursor-pointer'
                      : 'bg-slate-900/90 text-sky-300 border border-slate-700/50'
                  }`}
                  onClick={isKey ? () => handleCopy(code, code) : undefined}
                  title={isKey ? 'Click to copy API key' : undefined}
                >
                  {code}
                </span>
              );
            }
            return <span key={pIdx}>{part}</span>;
          })}
        </div>
      );
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Header Info */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold text-lg">
            🤖
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-semibold text-slate-100 text-base">Telegram Bot Interactive Simulator</h2>
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Connected
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Test user key minting, Telegram Stars payments, and top-ups live in your browser.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setMessages([]);
              sendAction({ text: '/start' });
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-600/50 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Chat</span>
          </button>
        </div>
      </div>

      {/* Telegram App Frame */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[650px]">
        {/* Telegram Topbar */}
        <div className="bg-slate-900 border-b border-slate-800 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
                ⚡
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900"></span>
            </div>
            <div>
              <div className="font-medium text-sm text-slate-100 flex items-center space-x-1.5">
                <span>Cheaper Tokens Bot</span>
                <span className="text-xs text-slate-500 font-mono">@cheaper_tokens_bot</span>
              </div>
              <p className="text-[11px] text-emerald-400">bot • active</p>
            </div>
          </div>

          {/* Quick command buttons */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => sendAction({ text: '/generate' })}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-violet-300 px-2.5 py-1 rounded-md border border-slate-700 font-medium transition"
            >
              /generate
            </button>
            <button
              onClick={() => sendAction({ text: '/mykeys' })}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700 font-medium transition"
            >
              /mykeys
            </button>
            <button
              onClick={() => sendAction({ text: '/rates' })}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700 font-medium transition hidden sm:inline-block"
            >
              /rates
            </button>
          </div>
        </div>

        {/* Message Flow */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950">
          {messages.map((msg) => {
            const isBot = msg.sender === 'bot';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isBot ? 'justify-start' : 'justify-end'}`}
              >
                {isBot && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow">
                    ⚡
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[75%] space-y-2`}>
                  {/* Speech Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md ${
                      isBot
                        ? 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-sm'
                        : 'bg-indigo-600 text-white rounded-tr-sm font-medium'
                    }`}
                  >
                    {renderFormattedText(msg.text)}

                    <div className={`text-[10px] mt-1 text-right ${isBot ? 'text-slate-500' : 'text-indigo-200'}`}>
                      {msg.timestamp}
                    </div>
                  </div>

                  {/* Telegram Stars Invoice Card if present */}
                  {msg.invoice && (
                    <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-xl p-3.5 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-amber-300 flex items-center space-x-1">
                          <span>⭐</span>
                          <span>Telegram Stars Invoice</span>
                        </span>
                        <span className="font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                          {msg.invoice.stars} XTR
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs">{msg.invoice.description}</p>
                    </div>
                  )}

                  {/* Inline Keyboard Buttons */}
                  {msg.buttons && msg.buttons.length > 0 && (
                    <div className="grid gap-1.5 pt-1">
                      {msg.buttons.map((row, rIdx) => (
                        <div key={rIdx} className="flex gap-1.5 flex-wrap">
                          {row.map((btn, bIdx) => (
                            <button
                              key={bIdx}
                              onClick={() => {
                                if (btn.callback_data) {
                                  sendAction({ callbackData: btn.callback_data });
                                }
                              }}
                              disabled={isLoading}
                              className="flex-1 min-w-[140px] text-xs font-medium py-2 px-3 rounded-xl bg-slate-800/95 hover:bg-slate-700 text-violet-200 hover:text-white border border-slate-700/80 hover:border-violet-500/50 shadow-sm transition active:scale-[0.98] disabled:opacity-50 text-center"
                            >
                              {btn.text}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {!isBot && (
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 text-xs font-bold shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center space-x-2 text-slate-500 text-xs pl-11">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce delay-100"></span>
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce delay-200"></span>
              <span>Bot is typing...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (inputValue.trim()) {
              sendAction({ text: inputValue });
            }
          }}
          className="bg-slate-900 border-t border-slate-800 p-3 flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a command (/start, /generate, /topup, /mykeys, /rates)..."
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="p-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl shadow-md disabled:opacity-40 transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
