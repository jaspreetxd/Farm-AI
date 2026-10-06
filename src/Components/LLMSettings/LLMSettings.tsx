import { useState, useEffect, useRef } from 'react';
import {
  LuSettings2, LuX, LuZap, LuCpu, LuChevronDown,
  LuCheck, LuInfo, LuWifi, LuShield, LuSparkles
} from 'react-icons/lu';
import { getLLMConfig, type LLMProvider } from '../../services/LLMService/llmService';
import './LLMSettings.css';

const GROQ_MODELS = [
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', desc: 'Most capable', badge: 'Best' },
  { id: 'openai/gpt-oss-20b',  label: 'GPT-OSS 20B',  desc: 'Balanced speed', badge: 'Fast' },
  { id: 'qwen/qwen3.8-27b',    label: 'Qwen 3.8 27B',  desc: 'Strong reasoning', badge: '' },
  { id: 'allam-2-7b',          label: 'Allam 2 7B',    desc: 'Lightweight', badge: 'Lite' },
];

const OLLAMA_MODELS = [
  { id: 'llama3.2',   label: 'Llama 3.2',  desc: 'Meta general-purpose', badge: '' },
  { id: 'qwen3:latest', label: 'Qwen 3',   desc: 'Fast & efficient', badge: 'Fast' },
  { id: 'mistral',    label: 'Mistral 7B', desc: 'High quality 7B', badge: '' },
  { id: 'gemma3',     label: 'Gemma 3',    desc: 'Google lightweight', badge: '' },
  { id: 'phi4-mini',  label: 'Phi-4 Mini', desc: 'Microsoft compact', badge: 'Lite' },
];

const PROVIDER_INFO = {
  auto:   { icon: <LuSparkles />, color: 'auto',   title: 'Auto',         subtitle: 'Groq → Ollama fallback' },
  groq:   { icon: <LuZap />,   color: 'groq',   title: 'Groq Cloud',   subtitle: 'Ultra-fast cloud API' },
  ollama: { icon: <LuCpu />,   color: 'ollama', title: 'Ollama Local', subtitle: 'Private on-device AI' },
};

function getInitialSettings() {
  const config = getLLMConfig();
  const configuredOllamaModel = config.ollamaModel || 'llama3.2';
  const knownOllamaModel = OLLAMA_MODELS.some((model) => model.id === configuredOllamaModel);
  return {
    provider: config.provider,
    groqModel: config.groqModel || 'openai/gpt-oss-120b',
    ollamaUrl: config.ollamaBaseUrl || 'http://localhost:11434',
    ollamaModel: knownOllamaModel ? configuredOllamaModel : 'custom',
    customModel: knownOllamaModel ? '' : configuredOllamaModel,
  };
}

export default function LLMSettings() {
  const [initialSettings] = useState(getInitialSettings);
  const [open, setOpen]               = useState(false);
  const [provider, setProvider]       = useState<LLMProvider>(initialSettings.provider);
  const [groqModel, setGroqModel]     = useState(initialSettings.groqModel);
  const [ollamaUrl, setOllamaUrl]     = useState(initialSettings.ollamaUrl);
  const [ollamaModel, setOllamaModel] = useState(initialSettings.ollamaModel);
  const [customModel, setCustomModel] = useState(initialSettings.customModel);
  const [saved, setSaved]             = useState(false);
  const [groqDdOpen, setGroqDdOpen]   = useState(false);
  const [ollamaDdOpen, setOllamaDdOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (open && modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setOpen(false);
        setGroqDdOpen(false);
        setOllamaDdOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSave = () => {
    localStorage.setItem('farm_ai_llm_provider', provider);
    localStorage.setItem('farm_ai_groq_model', groqModel);
    localStorage.setItem('farm_ai_ollama_url', ollamaUrl.trim());
    const finalOllamaModel = ollamaModel === 'custom' ? customModel.trim() : ollamaModel;
    localStorage.setItem('farm_ai_ollama_model', finalOllamaModel);

    setSaved(true);
    setTimeout(() => { setSaved(false); setOpen(false); }, 1400);
  };

  const pInfo = PROVIDER_INFO[provider];
  const selGroq  = GROQ_MODELS.find(m => m.id === groqModel);
  const selOllama = OLLAMA_MODELS.find(m => m.id === ollamaModel);

  return (
    <>
      {/* ─── Navbar trigger ─── */}
      <button
        id="llm-settings-btn"
        className={`llm-trigger ${open ? 'active' : ''}`}
        onClick={() => setOpen(v => !v)}
        title="AI Engine Settings"
        aria-label="Open AI Engine Settings"
      >
        <LuSettings2 className={`trigger-gear ${open ? 'spinning' : ''}`} />
        <span className="trigger-label">{pInfo.title}</span>
        <span className={`trigger-dot dot-${pInfo.color}`} />
      </button>

      {/* ─── Backdrop ─── */}
      {open && (
        <div className="llm-backdrop animate-fade-in" aria-hidden="true" />
      )}

      {/* ─── Panel ─── */}
      {open && (
        <div
          className="llm-panel glass animate-slide-up"
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label="AI Engine Settings"
        >
          {/* Glow accent */}
          <div className={`panel-glow glow-${pInfo.color}`} />

          {/* ── Header ── */}
          <div className="panel-header">
            <div className="panel-header-left">
              <div className={`header-icon-wrap icon-${pInfo.color}`}>
                <LuSettings2 />
              </div>
              <div>
                <p className="panel-title">AI Engine</p>
                <p className="panel-subtitle">Configure your inference provider</p>
              </div>
            </div>
            <button className="panel-close" onClick={() => setOpen(false)} aria-label="Close">
              <LuX />
            </button>
          </div>

          {/* ── Active Status Bar ── */}
          <div className={`status-bar status-${pInfo.color}`}>
            <span className={`status-dot dot-${pInfo.color} pulse`} />
            <span className="status-icon">{pInfo.icon}</span>
            <span className="status-text">
              Active: <strong>{pInfo.title}</strong> — {pInfo.subtitle}
            </span>
          </div>

          <div className="panel-body">

            {/* ── Provider Selection ── */}
            <div className="section-block">
              <p className="section-title"><LuShield className="section-icon" /> Select Provider</p>
              <div className="provider-grid">
                {(Object.entries(PROVIDER_INFO) as [LLMProvider, typeof PROVIDER_INFO['auto']][]).map(([p, info]) => (
                  <button
                    key={p}
                    id={`provider-${p}`}
                    className={`provider-card ${provider === p ? `selected sel-${info.color}` : ''}`}
                    onClick={() => setProvider(p)}
                  >
                    <span className={`card-icon card-icon-${info.color}`}>{info.icon}</span>
                    <span className="card-title">{info.title}</span>
                    <span className="card-sub">{info.subtitle}</span>
                    {p === 'auto' && <span className="card-rec">Recommended</span>}
                    {provider === p && <span className="card-check"><LuCheck /></span>}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Groq Model (shown when groq or auto) ── */}
            {(provider === 'groq' || provider === 'auto') && (
              <div className="section-block">
                <p className="section-title"><LuZap className="section-icon groq-col" /> Groq Model</p>
                <div className="info-chip">
                  <LuWifi className="chip-icon" />
                  <span>API key configured by admin · Cloud inference</span>
                </div>
                <div className="select-wrap">
                  <button
                    id="groq-model-select"
                    className="sel-btn"
                    onClick={() => { setGroqDdOpen(v => !v); setOllamaDdOpen(false); }}
                  >
                    <span className={`sel-dot dot-groq`} />
                    <div className="sel-text">
                      <span className="sel-name">{selGroq?.label ?? groqModel}</span>
                      <span className="sel-desc">{selGroq?.desc ?? ''}</span>
                    </div>
                    {selGroq?.badge && <span className="model-pill pill-groq">{selGroq.badge}</span>}
                    <LuChevronDown className={`sel-chevron ${groqDdOpen ? 'open' : ''}`} />
                  </button>
                  {groqDdOpen && (
                    <ul className="dropdown">
                      {GROQ_MODELS.map(m => (
                        <li key={m.id}>
                          <button
                            className={`dd-opt ${groqModel === m.id ? 'dd-active' : ''}`}
                            onClick={() => { setGroqModel(m.id); setGroqDdOpen(false); }}
                          >
                            {groqModel === m.id
                              ? <LuCheck className="dd-check" />
                              : <span className="dd-spacer" />}
                            <div className="dd-text">
                              <span className="dd-name">{m.label}</span>
                              <span className="dd-desc">{m.desc}</span>
                            </div>
                            {m.badge && <span className="model-pill pill-groq">{m.badge}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* ── Ollama Config (shown when ollama or auto) ── */}
            {(provider === 'ollama' || provider === 'auto') && (
              <div className="section-block">
                <p className="section-title"><LuCpu className="section-icon ollama-col" /> Ollama (Local)</p>
                <div className="info-chip info-chip-dim">
                  <LuCpu className="chip-icon" />
                  <span>Runs privately on your device · No data sent to cloud</span>
                </div>

                <label className="field-label" htmlFor="ollama-url">Server URL</label>
                <input
                  id="ollama-url"
                  type="text"
                  className="field-input"
                  placeholder="http://localhost:11434"
                  value={ollamaUrl}
                  onChange={e => setOllamaUrl(e.target.value)}
                />

                <label className="field-label mt" htmlFor="ollama-model-select">Model</label>
                <div className="select-wrap">
                  <button
                    id="ollama-model-select"
                    className="sel-btn"
                    onClick={() => { setOllamaDdOpen(v => !v); setGroqDdOpen(false); }}
                  >
                    <span className="sel-dot dot-ollama" />
                    <div className="sel-text">
                      <span className="sel-name">
                        {ollamaModel === 'custom' ? (customModel || 'Custom…') : (selOllama?.label ?? ollamaModel)}
                      </span>
                      <span className="sel-desc">
                        {ollamaModel === 'custom' ? 'Enter your model name below' : (selOllama?.desc ?? '')}
                      </span>
                    </div>
                    {selOllama?.badge && ollamaModel !== 'custom' && (
                      <span className="model-pill pill-ollama">{selOllama.badge}</span>
                    )}
                    <LuChevronDown className={`sel-chevron ${ollamaDdOpen ? 'open' : ''}`} />
                  </button>
                  {ollamaDdOpen && (
                    <ul className="dropdown">
                      {OLLAMA_MODELS.map(m => (
                        <li key={m.id}>
                          <button
                            className={`dd-opt ${ollamaModel === m.id ? 'dd-active' : ''}`}
                            onClick={() => { setOllamaModel(m.id); setOllamaDdOpen(false); }}
                          >
                            {ollamaModel === m.id
                              ? <LuCheck className="dd-check" />
                              : <span className="dd-spacer" />}
                            <div className="dd-text">
                              <span className="dd-name">{m.label}</span>
                              <span className="dd-desc">{m.desc}</span>
                            </div>
                            {m.badge && <span className="model-pill pill-ollama">{m.badge}</span>}
                          </button>
                        </li>
                      ))}
                      <li className="dd-divider" />
                      <li>
                        <button
                          className={`dd-opt ${ollamaModel === 'custom' ? 'dd-active' : ''}`}
                          onClick={() => { setOllamaModel('custom'); setOllamaDdOpen(false); }}
                        >
                          {ollamaModel === 'custom' ? <LuCheck className="dd-check" /> : <span className="dd-spacer" />}
                          <div className="dd-text">
                            <span className="dd-name">Custom model…</span>
                            <span className="dd-desc">Enter any installed Ollama model</span>
                          </div>
                        </button>
                      </li>
                    </ul>
                  )}
                </div>

                {ollamaModel === 'custom' && (
                  <input
                    id="ollama-custom-model"
                    type="text"
                    className="field-input mt"
                    placeholder="e.g. phi3:mini or deepseek-r1"
                    value={customModel}
                    onChange={e => setCustomModel(e.target.value)}
                  />
                )}

                <p className="hint-row">
                  <LuInfo className="hint-icon" />
                  Run <code>ollama run {ollamaModel === 'custom' ? (customModel || 'your-model') : ollamaModel}</code> to start the server.
                </p>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="panel-footer">
            <button className="cancel-btn" onClick={() => setOpen(false)}>Cancel</button>
            <button
              id="llm-save-btn"
              className={`save-btn ${saved ? 'saved' : ''}`}
              onClick={handleSave}
            >
              {saved ? <><LuCheck className="save-icon" /> Applied!</> : 'Save & Apply'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
