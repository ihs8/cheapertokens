import React, { useState } from 'react';
import { Terminal, Copy, Check, Send, Play, Sparkles, Compass, Monitor, Laptop, Code2, ExternalLink, ShieldCheck } from 'lucide-react';
import { ResellerKey } from '../types/reseller';

interface SetupGuidesProps {
  keys: ResellerKey[];
}

type OperatingSystem = 'windows' | 'macos' | 'linux';
type ToolType = 'claude' | 'codex' | 'vscode';

export const SetupGuides: React.FC<SetupGuidesProps> = ({ keys }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [selectedKeyId, setSelectedKeyId] = useState<number | ''>(keys[0]?.id || '');
  const [useCustomPlaceholder, setUseCustomPlaceholder] = useState(false);

  // OS and Tool selectors for the "🧭 Connect your key" wizard
  const [os, setOs] = useState<OperatingSystem>('windows');
  const [tool, setTool] = useState<ToolType>('claude');

  // Interactive Test Chat
  const [chatPrompt, setChatPrompt] = useState('Analyze this architecture and recommend 3 performance optimizations:');
  const [chatModel, setChatModel] = useState('claude-3-opus-20240229');
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [isCallingApi, setIsCallingApi] = useState(false);

  const selectedKey = keys.find(k => k.id === Number(selectedKeyId)) || keys[0];
  const activeKeyStr = useCustomPlaceholder
    ? 'YOUR_KEY'
    : (selectedKey?.api_key || 'YOUR_KEY');

  const anthropicBaseUrl = 'https://api-key.cheaptokens.space';
  const openaiBaseUrl = 'https://api-key.cheaptokens.space/v1';

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleTestChat = async () => {
    setIsCallingApi(true);
    setChatResponse(null);
    try {
      const res = await fetch('/api/test-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: chatPrompt,
          model: chatModel,
          keyId: selectedKeyId || undefined
        })
      });

      const data = await res.json();
      if (data.content) {
        if (typeof data.content === 'string') {
          setChatResponse(data.content);
        } else if (Array.isArray(data.content) && data.content[0]?.text) {
          setChatResponse(data.content[0].text);
        } else {
          setChatResponse(JSON.stringify(data, null, 2));
        }
      } else if (data.error) {
        setChatResponse(`API Error: ${JSON.stringify(data.error)}`);
      } else {
        setChatResponse(JSON.stringify(data, null, 2));
      }
    } catch (e: any) {
      setChatResponse(`Network Error: ${e.message}`);
    } finally {
      setIsCallingApi(false);
    }
  };

  const cursorConfig = `{
  "models": {
    "custom": [
      {
        "name": "claude-opus-5",
        "apiBase": "${openaiBaseUrl}",
        "apiKey": "${activeKeyStr}"
      },
      {
        "name": "claude-sonnet-5",
        "apiBase": "${openaiBaseUrl}",
        "apiKey": "${activeKeyStr}"
      }
    ]
  }
}`;

  const pythonConfig = `from openai import OpenAI

client = OpenAI(
    base_url="${openaiBaseUrl}",
    api_key="${activeKeyStr}"
)

response = client.chat.completions.create(
    model="claude-opus-5",
    messages=[
        {"role": "system", "content": "You are a senior full-stack architect."},
        {"role": "user", "content": "Explain prompt caching cost savings in 2 bullet points."}
    ]
)
print(response.choices[0].message.content)`;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* 🧭 Connect your key Wizard Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-semibold mb-2">
              <Compass className="w-3.5 h-3.5 text-violet-400" />
              <span>🧭 Connect your key</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              Setup Guide &amp; Client Configurations
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Select your operating system and favorite coding tool to view direct setup instructions.
            </p>
          </div>

          {/* Key Selection and Placeholder Toggle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
            {keys.length > 0 && !useCustomPlaceholder && (
              <select
                value={selectedKeyId}
                onChange={(e) => setSelectedKeyId(Number(e.target.value))}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono shadow-inner"
              >
                {keys.map((k) => (
                  <option key={k.id} value={k.id}>
                    Key #{k.id} ({k.label || 'Key'})
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setUseCustomPlaceholder(!useCustomPlaceholder)}
              className={`text-xs px-3 py-2 rounded-xl font-medium border transition ${
                useCustomPlaceholder
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              {useCustomPlaceholder ? 'Using "YOUR_KEY"' : 'Showing Your Active Key'}
            </button>
          </div>
        </div>

        {/* Operating System Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Choose your operating system:
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'windows', label: 'WINDOWS', icon: '🪟' },
              { id: 'macos', label: 'MACOS', icon: '🍎' },
              { id: 'linux', label: 'LINUX', icon: '🐧' }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setOs(item.id as OperatingSystem)}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm ${
                  os === item.id
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-indigo-500/20 ring-1 ring-violet-400'
                    : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tool Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Choose a tool:
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'claude', label: 'claude', tag: 'Claude Code CLI', color: 'from-violet-600 to-purple-600' },
              { id: 'codex', label: 'codex', tag: 'Codex CLI', color: 'from-emerald-600 to-teal-600' },
              { id: 'vscode', label: 'VScode', tag: 'VS Code Extensions', color: 'from-sky-600 to-blue-600' }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTool(item.id as ToolType)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  tool === item.id
                    ? 'bg-slate-800 text-white border-2 border-violet-400 shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>{item.label}</span>
                <span className="text-[10px] text-slate-500 font-normal">({item.tag})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Instruction Card */}
        <div className="mt-6 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-6">
          {/* Header indicator */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2 font-bold text-sm text-slate-100">
              <span className="text-amber-400">🧭</span>
              <span className="capitalize">{tool === 'vscode' ? 'VS Code' : tool === 'claude' ? 'Claude Code' : 'Codex'}</span>
              <span className="text-slate-500">·</span>
              <span className="capitalize text-violet-300">{os === 'macos' ? 'macOS' : os}</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Endpoint: {tool === 'claude' ? anthropicBaseUrl : openaiBaseUrl}
            </span>
          </div>

          {/* =========================================================================
              WINDOWS GUIDES
              ========================================================================= */}
          {os === 'windows' && tool === 'claude' && (
            <div className="space-y-5 text-xs text-slate-300">
              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1.5 flex items-center space-x-2">
                  <span>1️⃣</span>
                  <span>Install Node.js</span>
                </h4>
                <p className="text-slate-400 mb-2">
                  Download the LTS build (18+ required) from <a href="https://nodejs.org" target="_blank" rel="noreferrer" className="text-violet-400 underline">nodejs.org</a> and install it via the wizard. Verify the install:
                </p>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto">
{`node --version
npm --version`}
                  </pre>
                  <button
                    onClick={() => handleCopy("node --version\nnpm --version", 'win_claude_1')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'win_claude_1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'win_claude_1' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1.5 flex items-center space-x-2">
                  <span>2️⃣</span>
                  <span>Install Claude Code</span>
                </h4>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto">
npm install -g @anthropic-ai/claude-code --registry=https://registry.npmmirror.com
                  </pre>
                  <button
                    onClick={() => handleCopy("npm install -g @anthropic-ai/claude-code --registry=https://registry.npmmirror.com", 'win_claude_2')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'win_claude_2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'win_claude_2' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1.5 flex items-center space-x-2">
                  <span>3️⃣</span>
                  <span>Configure</span>
                </h4>
                <p className="text-slate-400 mb-2">
                  Open <code className="text-amber-300 font-mono">C:\Users\&lt;username&gt;\.claude\settings.json</code> and add:
                </p>
                <div className="relative group mb-3">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto">
{`{"env": {
    "ANTHROPIC_AUTH_TOKEN": "${activeKeyStr}",
    "ANTHROPIC_BASE_URL": "${anthropicBaseUrl}"}}`}
                  </pre>
                  <button
                    onClick={() => handleCopy(`{"env": {\n    "ANTHROPIC_AUTH_TOKEN": "${activeKeyStr}",\n    "ANTHROPIC_BASE_URL": "${anthropicBaseUrl}"}}`, 'win_claude_3_json')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'win_claude_3_json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'win_claude_3_json' ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>

                <p className="text-slate-400 mb-2">
                  Or set environment variables (PowerShell, persistent):
                </p>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto text-[11px]">
{`[System.Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", "${anthropicBaseUrl}", [System.EnvironmentVariableTarget]::User)
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_AUTH_TOKEN", "${activeKeyStr}", [System.EnvironmentVariableTarget]::User)`}
                  </pre>
                  <button
                    onClick={() => handleCopy(`[System.Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", "${anthropicBaseUrl}", [System.EnvironmentVariableTarget]::User)\n[System.Environment]::SetEnvironmentVariable("ANTHROPIC_AUTH_TOKEN", "${activeKeyStr}", [System.EnvironmentVariableTarget]::User)`, 'win_claude_3_ps')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'win_claude_3_ps' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'win_claude_3_ps' ? 'Copied' : 'Copy PowerShell'}</span>
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1.5 flex items-center space-x-2">
                  <span>4️⃣</span>
                  <span>Run</span>
                </h4>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-emerald-400 font-bold overflow-x-auto">
claude
                  </pre>
                  <button
                    onClick={() => handleCopy("claude", 'win_claude_run')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'win_claude_run' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'win_claude_run' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {os === 'windows' && tool === 'codex' && (
            <div className="space-y-5 text-xs text-slate-300">
              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1.5 flex items-center space-x-2">
                  <span>1️⃣</span>
                  <span>Install Node.js</span>
                </h4>
                <p className="text-slate-400">Like Claude Code, this needs Node.js 18+.</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1.5 flex items-center space-x-2">
                  <span>2️⃣</span>
                  <span>Install Codex</span>
                </h4>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto">
npm i -g @openai/codex --registry=https://registry.npmmirror.com
                  </pre>
                  <button
                    onClick={() => handleCopy("npm i -g @openai/codex --registry=https://registry.npmmirror.com", 'win_codex_install')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'win_codex_install' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'win_codex_install' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1.5 flex items-center space-x-2">
                  <span>3️⃣</span>
                  <span>Configure</span>
                </h4>
                <p className="text-slate-400 mb-2">
                  Create <code className="text-amber-300 font-mono">C:\Users\&lt;username&gt;\.codex\config.toml</code>:
                </p>
                <div className="relative group mb-3">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto text-[11px]">
{`model_provider = "custom"
model = "gpt-5.5"  # Codex CLI runs best on gpt-5.5; the newer flagships work in Cursor & other clients
model_reasoning_effort = "xhigh"
disable_response_storage = true

[model_providers.custom]
name = "custom"
wire_api = "responses"
requires_openai_auth = true
base_url = "${openaiBaseUrl}"`}
                  </pre>
                  <button
                    onClick={() => handleCopy(`model_provider = "custom"\nmodel = "gpt-5.5"  # Codex CLI runs best on gpt-5.5; the newer flagships work in Cursor & other clients\nmodel_reasoning_effort = "xhigh"\ndisable_response_storage = true\n\n[model_providers.custom]\nname = "custom"\nwire_api = "responses"\nrequires_openai_auth = true\nbase_url = "${openaiBaseUrl}"`, 'win_codex_toml')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'win_codex_toml' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'win_codex_toml' ? 'Copied' : 'Copy TOML'}</span>
                  </button>
                </div>

                <p className="text-slate-400 mb-2">
                  Create <code className="text-amber-300 font-mono">auth.json</code> in the same <code className="text-slate-300 font-mono">.codex</code> folder:
                </p>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto">
{`{"OPENAI_API_KEY": "${activeKeyStr}"}`}
                  </pre>
                  <button
                    onClick={() => handleCopy(`{"OPENAI_API_KEY": "${activeKeyStr}"}`, 'win_codex_auth')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'win_codex_auth' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'win_codex_auth' ? 'Copied' : 'Copy auth.json'}</span>
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1.5 flex items-center space-x-2">
                  <span>4️⃣</span>
                  <span>Run</span>
                </h4>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-emerald-400 font-bold overflow-x-auto">
codex
                  </pre>
                  <button
                    onClick={() => handleCopy("codex", 'win_codex_run')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'win_codex_run' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'win_codex_run' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {os === 'windows' && tool === 'vscode' && (
            <div className="space-y-5 text-xs text-slate-300">
              <p className="text-slate-400">
                VS Code works with both agents — Claude Code and Codex. First install and configure the CLI you want (the “Claude Code” or “Codex” sections), then connect the extension.
              </p>

              {/* Claude Code for VS Code */}
              <div className="border border-slate-800 p-4 rounded-xl bg-slate-900/50 space-y-3">
                <h4 className="font-bold text-slate-100 text-sm flex items-center space-x-2 text-violet-300">
                  <span>🧩</span>
                  <span>Claude Code for VS Code</span>
                </h4>
                <p className="text-slate-400">Install the “Claude Code for VS Code” extension from the marketplace.</p>
                <p className="text-slate-400">
                  Add to <code className="text-amber-300 font-mono">C:\Users\&lt;username&gt;\.claude\config.json</code>:
                </p>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto">
{`{"primaryApiKey": "${activeKeyStr}"}`}
                  </pre>
                  <button
                    onClick={() => handleCopy(`{"primaryApiKey": "${activeKeyStr}"}`, 'win_vscode_claude')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'win_vscode_claude' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'win_vscode_claude' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  *Use config.json, not settings.json. The Cursor editor uses the same setting.*
                </p>
              </div>

              {/* Codex for VS Code */}
              <div className="border border-slate-800 p-4 rounded-xl bg-slate-900/50 space-y-3">
                <h4 className="font-bold text-slate-100 text-sm flex items-center space-x-2 text-emerald-300">
                  <span>🧩</span>
                  <span>Codex for VS Code</span>
                </h4>
                <p className="text-slate-400">Install the “Codex - OpenAI's coding agent” extension.</p>
                <p className="text-slate-400">
                  Create <code className="text-amber-300 font-mono">C:\Users\&lt;username&gt;\.codex\auth.json</code>:
                </p>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto">
{`{"OPENAI_API_KEY": "${activeKeyStr}"}`}
                  </pre>
                  <button
                    onClick={() => handleCopy(`{"OPENAI_API_KEY": "${activeKeyStr}"}`, 'win_vscode_codex_auth')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'win_vscode_codex_auth' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'win_vscode_codex_auth' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <p className="text-slate-400 mt-2">
                  Create <code className="text-amber-300 font-mono">C:\Users\&lt;username&gt;\.codex\config.toml</code>:
                </p>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto text-[11px]">
{`model_provider = "custom"
model = "gpt-5.5"  # Codex CLI runs best on gpt-5.5; the newer flagships work in Cursor & other clients
model_reasoning_effort = "xhigh"
disable_response_storage = true

[model_providers.custom]
name = "custom"
wire_api = "responses"
requires_openai_auth = true
base_url = "${openaiBaseUrl}"`}
                  </pre>
                  <button
                    onClick={() => handleCopy(`model_provider = "custom"\nmodel = "gpt-5.5"  # Codex CLI runs best on gpt-5.5; the newer flagships work in Cursor & other clients\nmodel_reasoning_effort = "xhigh"\ndisable_response_storage = true\n\n[model_providers.custom]\nname = "custom"\nwire_api = "responses"\nrequires_openai_auth = true\nbase_url = "${openaiBaseUrl}"`, 'win_vscode_codex_toml')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'win_vscode_codex_toml' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'win_vscode_codex_toml' ? 'Copied' : 'Copy TOML'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              macOS GUIDES
              ========================================================================= */}
          {os === 'macos' && tool === 'claude' && (
            <div className="space-y-5 text-xs text-slate-300">
              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1.5 flex items-center space-x-2">
                  <span>1️⃣</span>
                  <span>Install Node.js</span>
                </h4>
                <p className="text-slate-400 mb-2">Via Homebrew:</p>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto">
brew install node
                  </pre>
                  <button
                    onClick={() => handleCopy("brew install node", 'mac_claude_1')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'mac_claude_1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'mac_claude_1' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1.5 flex items-center space-x-2">
                  <span>2️⃣</span>
                  <span>Install Claude Code</span>
                </h4>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto">
npm install -g @anthropic-ai/claude-code
                  </pre>
                  <button
                    onClick={() => handleCopy("npm install -g @anthropic-ai/claude-code", 'mac_claude_2')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'mac_claude_2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'mac_claude_2' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1.5 flex items-center space-x-2">
                  <span>3️⃣</span>
                  <span>Environment variables (zsh, persistent)</span>
                </h4>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto">
{`echo 'export ANTHROPIC_BASE_URL="${anthropicBaseUrl}"' >> ~/.zshrc
echo 'export ANTHROPIC_AUTH_TOKEN="${activeKeyStr}"' >> ~/.zshrc
source ~/.zshrc`}
                  </pre>
                  <button
                    onClick={() => handleCopy(`echo 'export ANTHROPIC_BASE_URL="${anthropicBaseUrl}"' >> ~/.zshrc\necho 'export ANTHROPIC_AUTH_TOKEN="${activeKeyStr}"' >> ~/.zshrc\nsource ~/.zshrc`, 'mac_claude_3')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'mac_claude_3' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'mac_claude_3' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1.5 flex items-center space-x-2">
                  <span>4️⃣</span>
                  <span>Run</span>
                </h4>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-emerald-400 font-bold overflow-x-auto">
claude
                  </pre>
                  <button
                    onClick={() => handleCopy("claude", 'mac_claude_run')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'mac_claude_run' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'mac_claude_run' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {os === 'macos' && tool === 'codex' && (
            <div className="space-y-5 text-xs text-slate-300">
              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1.5 flex items-center space-x-2">
                  <span>1️⃣</span>
                  <span>Install</span>
                </h4>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto">
npm install -g @openai/codex
                  </pre>
                  <button
                    onClick={() => handleCopy("npm install -g @openai/codex", 'mac_codex_1')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'mac_codex_1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'mac_codex_1' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1.5 flex items-center space-x-2">
                  <span>2️⃣</span>
                  <span>Configure</span>
                </h4>
                <p className="text-slate-400 mb-2">
                  Create <code className="text-amber-300 font-mono">~/.codex/config.toml</code>:
                </p>
                <div className="relative group mb-3">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto text-[11px]">
{`model_provider = "custom"
model = "gpt-5.5"  # Codex CLI runs best on gpt-5.5; the newer flagships work in Cursor & other clients
model_reasoning_effort = "xhigh"
disable_response_storage = true

[model_providers.custom]
name = "custom"
wire_api = "responses"
requires_openai_auth = true
base_url = "${openaiBaseUrl}"`}
                  </pre>
                  <button
                    onClick={() => handleCopy(`model_provider = "custom"\nmodel = "gpt-5.5"  # Codex CLI runs best on gpt-5.5; the newer flagships work in Cursor & other clients\nmodel_reasoning_effort = "xhigh"\ndisable_response_storage = true\n\n[model_providers.custom]\nname = "custom"\nwire_api = "responses"\nrequires_openai_auth = true\nbase_url = "${openaiBaseUrl}"`, 'mac_codex_toml')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'mac_codex_toml' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'mac_codex_toml' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <p className="text-slate-400 mb-2">
                  Create <code className="text-amber-300 font-mono">~/.codex/auth.json</code>:
                </p>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto">
{`{"OPENAI_API_KEY": "${activeKeyStr}"}`}
                  </pre>
                  <button
                    onClick={() => handleCopy(`{"OPENAI_API_KEY": "${activeKeyStr}"}`, 'mac_codex_auth')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'mac_codex_auth' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'mac_codex_auth' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1.5 flex items-center space-x-2">
                  <span>3️⃣</span>
                  <span>Run</span>
                </h4>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-emerald-400 font-bold overflow-x-auto">
codex
                  </pre>
                  <button
                    onClick={() => handleCopy("codex", 'mac_codex_run')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'mac_codex_run' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'mac_codex_run' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {os === 'macos' && tool === 'vscode' && (
            <div className="space-y-5 text-xs text-slate-300">
              <p className="text-slate-400">
                VS Code works with both agents — Claude Code and Codex. First install and configure the CLI you want (the “Claude Code” or “Codex” sections), then connect the extension.
              </p>

              <div className="border border-slate-800 p-4 rounded-xl bg-slate-900/50 space-y-3">
                <h4 className="font-bold text-slate-100 text-sm flex items-center space-x-2 text-violet-300">
                  <span>🧩</span>
                  <span>Claude Code for VS Code</span>
                </h4>
                <p className="text-slate-400">Install the “Claude Code for VS Code” extension from the marketplace.</p>
                <p className="text-slate-400">
                  Add to <code className="text-amber-300 font-mono">~/.claude/config.json</code>:
                </p>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto">
{`{"primaryApiKey": "${activeKeyStr}"}`}
                  </pre>
                  <button
                    onClick={() => handleCopy(`{"primaryApiKey": "${activeKeyStr}"}`, 'mac_vscode_claude')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'mac_vscode_claude' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'mac_vscode_claude' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  *Use config.json, not settings.json. The Cursor editor uses the same setting.*
                </p>
              </div>

              <div className="border border-slate-800 p-4 rounded-xl bg-slate-900/50 space-y-3">
                <h4 className="font-bold text-slate-100 text-sm flex items-center space-x-2 text-emerald-300">
                  <span>🧩</span>
                  <span>Codex for VS Code</span>
                </h4>
                <p className="text-slate-400">Install the “Codex - OpenAI's coding agent” extension.</p>
                <p className="text-slate-400">
                  Create <code className="text-amber-300 font-mono">~/.codex/auth.json</code>:
                </p>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto">
{`{"OPENAI_API_KEY": "${activeKeyStr}"}`}
                  </pre>
                  <button
                    onClick={() => handleCopy(`{"OPENAI_API_KEY": "${activeKeyStr}"}`, 'mac_vscode_codex_auth')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'mac_vscode_codex_auth' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'mac_vscode_codex_auth' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <p className="text-slate-400 mt-2">
                  Create <code className="text-amber-300 font-mono">~/.codex/config.toml</code>:
                </p>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto text-[11px]">
{`model_provider = "custom"
model = "gpt-5.5"  # Codex CLI runs best on gpt-5.5; the newer flagships work in Cursor & other clients
model_reasoning_effort = "xhigh"
disable_response_storage = true

[model_providers.custom]
name = "custom"
wire_api = "responses"
requires_openai_auth = true
base_url = "${openaiBaseUrl}"`}
                  </pre>
                  <button
                    onClick={() => handleCopy(`model_provider = "custom"\nmodel = "gpt-5.5"  # Codex CLI runs best on gpt-5.5; the newer flagships work in Cursor & other clients\nmodel_reasoning_effort = "xhigh"\ndisable_response_storage = true\n\n[model_providers.custom]\nname = "custom"\nwire_api = "responses"\nrequires_openai_auth = true\nbase_url = "${openaiBaseUrl}"`, 'mac_vscode_codex_toml')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'mac_vscode_codex_toml' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'mac_vscode_codex_toml' ? 'Copied' : 'Copy TOML'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              LINUX GUIDES
              ========================================================================= */}
          {os === 'linux' && tool === 'claude' && (
            <div className="space-y-5 text-xs text-slate-300">
              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1.5 flex items-center space-x-2">
                  <span>1️⃣</span>
                  <span>Install Node.js</span>
                </h4>
                <p className="text-slate-400 mb-2">Add the NodeSource repo and install:</p>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto">
{`curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs`}
                  </pre>
                  <button
                    onClick={() => handleCopy("curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -\nsudo apt-get install -y nodejs", 'linux_claude_1')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'linux_claude_1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'linux_claude_1' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1.5 flex items-center space-x-2">
                  <span>2️⃣</span>
                  <span>Install Claude Code</span>
                </h4>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto">
npm install -g @anthropic-ai/claude-code
                  </pre>
                  <button
                    onClick={() => handleCopy("npm install -g @anthropic-ai/claude-code", 'linux_claude_2')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'linux_claude_2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'linux_claude_2' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1.5 flex items-center space-x-2">
                  <span>3️⃣</span>
                  <span>Environment variables (bash, persistent)</span>
                </h4>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto">
{`echo 'export ANTHROPIC_BASE_URL="${anthropicBaseUrl}"' >> ~/.bashrc
echo 'export ANTHROPIC_AUTH_TOKEN="${activeKeyStr}"' >> ~/.bashrc
source ~/.bashrc`}
                  </pre>
                  <button
                    onClick={() => handleCopy(`echo 'export ANTHROPIC_BASE_URL="${anthropicBaseUrl}"' >> ~/.bashrc\necho 'export ANTHROPIC_AUTH_TOKEN="${activeKeyStr}"' >> ~/.bashrc\nsource ~/.bashrc`, 'linux_claude_3')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'linux_claude_3' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'linux_claude_3' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1.5 flex items-center space-x-2">
                  <span>4️⃣</span>
                  <span>Run</span>
                </h4>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-emerald-400 font-bold overflow-x-auto">
claude
                  </pre>
                  <button
                    onClick={() => handleCopy("claude", 'linux_claude_run')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'linux_claude_run' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'linux_claude_run' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {os === 'linux' && tool === 'codex' && (
            <div className="space-y-5 text-xs text-slate-300">
              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1.5 flex items-center space-x-2">
                  <span>1️⃣</span>
                  <span>Install</span>
                </h4>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto">
npm install -g @openai/codex
                  </pre>
                  <button
                    onClick={() => handleCopy("npm install -g @openai/codex", 'linux_codex_1')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'linux_codex_1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'linux_codex_1' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1.5 flex items-center space-x-2">
                  <span>2️⃣</span>
                  <span>Configure</span>
                </h4>
                <p className="text-slate-400 mb-2">
                  Create <code className="text-amber-300 font-mono">~/.codex/config.toml</code>:
                </p>
                <div className="relative group mb-3">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto text-[11px]">
{`model_provider = "custom"
model = "gpt-5.5"  # Codex CLI runs best on gpt-5.5; the newer flagships work in Cursor & other clients
model_reasoning_effort = "xhigh"
disable_response_storage = true

[model_providers.custom]
name = "custom"
wire_api = "responses"
requires_openai_auth = true
base_url = "${openaiBaseUrl}"`}
                  </pre>
                  <button
                    onClick={() => handleCopy(`model_provider = "custom"\nmodel = "gpt-5.5"  # Codex CLI runs best on gpt-5.5; the newer flagships work in Cursor & other clients\nmodel_reasoning_effort = "xhigh"\ndisable_response_storage = true\n\n[model_providers.custom]\nname = "custom"\nwire_api = "responses"\nrequires_openai_auth = true\nbase_url = "${openaiBaseUrl}"`, 'linux_codex_toml')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'linux_codex_toml' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'linux_codex_toml' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <p className="text-slate-400 mb-2">
                  Create <code className="text-amber-300 font-mono">~/.codex/auth.json</code>:
                </p>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto">
{`{"OPENAI_API_KEY": "${activeKeyStr}"}`}
                  </pre>
                  <button
                    onClick={() => handleCopy(`{"OPENAI_API_KEY": "${activeKeyStr}"}`, 'linux_codex_auth')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'linux_codex_auth' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'linux_codex_auth' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1.5 flex items-center space-x-2">
                  <span>3️⃣</span>
                  <span>Run</span>
                </h4>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-emerald-400 font-bold overflow-x-auto">
codex
                  </pre>
                  <button
                    onClick={() => handleCopy("codex", 'linux_codex_run')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'linux_codex_run' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'linux_codex_run' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {os === 'linux' && tool === 'vscode' && (
            <div className="space-y-5 text-xs text-slate-300">
              <p className="text-slate-400">
                VS Code works with both agents — Claude Code and Codex. First install and configure the CLI you want (the “Claude Code” or “Codex” sections), then connect the extension.
              </p>

              <div className="border border-slate-800 p-4 rounded-xl bg-slate-900/50 space-y-3">
                <h4 className="font-bold text-slate-100 text-sm flex items-center space-x-2 text-violet-300">
                  <span>🧩</span>
                  <span>Claude Code for VS Code</span>
                </h4>
                <p className="text-slate-400">Install the “Claude Code for VS Code” extension from the marketplace.</p>
                <p className="text-slate-400">
                  Add to <code className="text-amber-300 font-mono">~/.claude/config.json</code>:
                </p>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto">
{`{"primaryApiKey": "${activeKeyStr}"}`}
                  </pre>
                  <button
                    onClick={() => handleCopy(`{"primaryApiKey": "${activeKeyStr}"}`, 'linux_vscode_claude')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'linux_vscode_claude' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'linux_vscode_claude' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  *Use config.json, not settings.json. The Cursor editor uses the same setting.*
                </p>
              </div>

              <div className="border border-slate-800 p-4 rounded-xl bg-slate-900/50 space-y-3">
                <h4 className="font-bold text-slate-100 text-sm flex items-center space-x-2 text-emerald-300">
                  <span>🧩</span>
                  <span>Codex for VS Code</span>
                </h4>
                <p className="text-slate-400">Install the “Codex - OpenAI's coding agent” extension.</p>
                <p className="text-slate-400">
                  Create <code className="text-amber-300 font-mono">~/.codex/auth.json</code>:
                </p>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto">
{`{"OPENAI_API_KEY": "${activeKeyStr}"}`}
                  </pre>
                  <button
                    onClick={() => handleCopy(`{"OPENAI_API_KEY": "${activeKeyStr}"}`, 'linux_vscode_codex_auth')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'linux_vscode_codex_auth' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'linux_vscode_codex_auth' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <p className="text-slate-400 mt-2">
                  Create <code className="text-amber-300 font-mono">~/.codex/config.toml</code>:
                </p>
                <div className="relative group">
                  <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-slate-200 overflow-x-auto text-[11px]">
{`model_provider = "custom"
model = "gpt-5.5"  # Codex CLI runs best on gpt-5.5; the newer flagships work in Cursor & other clients
model_reasoning_effort = "xhigh"
disable_response_storage = true

[model_providers.custom]
name = "custom"
wire_api = "responses"
requires_openai_auth = true
base_url = "${openaiBaseUrl}"`}
                  </pre>
                  <button
                    onClick={() => handleCopy(`model_provider = "custom"\nmodel = "gpt-5.5"  # Codex CLI runs best on gpt-5.5; the newer flagships work in Cursor & other clients\nmodel_reasoning_effort = "xhigh"\ndisable_response_storage = true\n\n[model_providers.custom]\nname = "custom"\nwire_api = "responses"\nrequires_openai_auth = true\nbase_url = "${openaiBaseUrl}"`, 'linux_vscode_codex_toml')}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedSection === 'linux_vscode_codex_toml' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'linux_vscode_codex_toml' ? 'Copied' : 'Copy TOML'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Interactive Test Console */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <Play className="w-4 h-4 text-emerald-400" />
            <span>Interactive Completion Test</span>
          </h3>
          <div className="flex items-center space-x-2">
            <select
              value={chatModel}
              onChange={(e) => setChatModel(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs text-slate-300 rounded-lg px-2.5 py-1"
            >
              <option value="claude-3-opus-20240229">claude-3-opus-20240229 (Opus 5)</option>
              <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet (Sonnet 5)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={chatPrompt}
            onChange={(e) => setChatPrompt(e.target.value)}
            placeholder="Type a test prompt for Claude..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
          />
          <button
            onClick={handleTestChat}
            disabled={isCallingApi || !chatPrompt.trim()}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl shadow-lg transition disabled:opacity-40"
          >
            {isCallingApi ? (
              <span>Running...</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send Request</span>
              </>
            )}
          </button>
        </div>

        {chatResponse && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed shadow-inner">
            <div className="text-[10px] text-violet-400 font-bold uppercase tracking-wider mb-2 flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>Response:</span>
            </div>
            {chatResponse}
          </div>
        )}
      </div>

      {/* Quick Snippets: Cursor & Python */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cursor / Windsurf */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col">
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Cursor / Windsurf Custom Base URL
            </span>
            <button
              onClick={() => handleCopy(cursorConfig, 'cursor')}
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
            >
              {copiedSection === 'cursor' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-300 bg-slate-950/70 overflow-x-auto flex-1">
            {cursorConfig}
          </pre>
        </div>

        {/* Python SDK */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col">
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Python Client (OpenAI SDK Compatible)
            </span>
            <button
              onClick={() => handleCopy(pythonConfig, 'python')}
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
            >
              {copiedSection === 'python' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-300 bg-slate-950/70 overflow-x-auto flex-1">
            {pythonConfig}
          </pre>
        </div>
      </div>
    </div>
  );
};
