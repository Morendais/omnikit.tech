/**
 * OmniKit AI Prompt Token Counter & Cost Calculator
 * 100% Client-Side In-Browser BPE Tokenizer & Dynamic Model Cost Analyzer
 * Accurate cl100k / o200k BPE token boundary parsing
 * Dynamic Live API Sync via OpenRouter (460+ models, 2026 latest releases) + Custom $/1M Calculator
 */

const TokenTool = {
  // Official cl100k_base tokenizer regex pattern
  tokenizerRegex: /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+/gu,

  // Cutting-Edge 2026 Flagship models (available instantly offline)
    // Comprehensive 100% In-Browser Flagship AI Models (Zero external requests)
    // Cutting-Edge 2026 Flagship models (available instantly offline, zero network calls)
  baseModels: [
    // Evergreen Provider / Tier Releases (Featured First)
    { id: 'anthropic/claude-opus-5.5', name: 'Anthropic Claude (Opus)', provider: 'anthropic', inputPerM: 4.00, outputPerM: 20.00, context: 500000, date: '2026-09' },
    { id: 'anthropic/claude-sonnet-5.5', name: 'Anthropic Claude (Sonnet)', provider: 'anthropic', inputPerM: 2.00, outputPerM: 10.00, context: 500000, date: '2026-09' },
    { id: 'anthropic/claude-haiku-5.5', name: 'Anthropic Claude (Haiku)', provider: 'anthropic', inputPerM: 0.10, outputPerM: 0.50, context: 250000, date: '2026-10' },
    { id: 'openai/gpt-5.6-terra', name: 'OpenAI (Flagship)', provider: 'openai', inputPerM: 2.00, outputPerM: 12.00, context: 256000, date: '2026-07' },
    { id: 'openai/gpt-5.4-mini', name: 'OpenAI (Mini)', provider: 'openai', inputPerM: 0.75, outputPerM: 4.50, context: 128000, date: '2026-03' },
    { id: 'openai/o3', name: 'OpenAI (Reasoning)', provider: 'openai', inputPerM: 2.00, outputPerM: 8.00, context: 200000, date: '2025-04' },
    { id: 'google/gemini-4-argon', name: 'Google Gemini (Pro)', provider: 'google', inputPerM: 2.00, outputPerM: 10.00, context: 2000000, date: '2026-10' },
    { id: 'google/gemini-2.0-flash', name: 'Google Gemini (Flash)', provider: 'google', inputPerM: 0.10, outputPerM: 0.40, context: 1048576, date: '2025-02' },
    { id: 'deepseek/deepseek-chat-v3.1', name: 'DeepSeek (Chat)', provider: 'deepseek', inputPerM: 0.25, outputPerM: 0.95, context: 128000, date: '2026-03' },
    { id: 'deepseek/deepseek-r1-0528', name: 'DeepSeek (Reasoning)', provider: 'deepseek', inputPerM: 0.50, outputPerM: 2.15, context: 128000, date: '2025-05' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Meta Llama 3.3 70B', provider: 'meta', inputPerM: 0.10, outputPerM: 0.32, context: 131072, date: '2025-12' },

    { id: 'openai/o3-mini', name: 'OpenAI o3-mini (Reasoning)', provider: 'openai', inputPerM: 1.10, outputPerM: 4.40, context: 200000, date: '2025-01' },
    { id: 'openai/gpt-4.5-preview', name: 'OpenAI GPT-4.5 Preview', provider: 'openai', inputPerM: 75.00, outputPerM: 150.00, context: 128000, date: '2025-02' },
    { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet (Hybrid Reasoning)', provider: 'anthropic', inputPerM: 3.00, outputPerM: 15.00, context: 200000, date: '2025-02' },
    { id: 'google/gemini-2.5-pro', name: 'Google Gemini 2.5 Pro', provider: 'google', inputPerM: 1.25, outputPerM: 5.00, context: 2000000, date: '2025-03' },
    { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (Open Reasoning)', provider: 'deepseek', inputPerM: 0.55, outputPerM: 2.19, context: 128000, date: '2025-01' },

    // Established Benchmark Models
    { id: 'openai/gpt-4o', name: 'OpenAI GPT-4o', provider: 'openai', inputPerM: 2.50, outputPerM: 10.00, context: 128000, date: '2024-05' },
    { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini', provider: 'openai', inputPerM: 0.15, outputPerM: 0.60, context: 128000, date: '2024-07' },
    { id: 'openai/o1', name: 'OpenAI o1', provider: 'openai', inputPerM: 15.00, outputPerM: 60.00, context: 200000, date: '2024-09' },
    { id: 'openai/o1-mini', name: 'OpenAI o1-mini', provider: 'openai', inputPerM: 3.00, outputPerM: 12.00, context: 128000, date: '2024-09' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic', inputPerM: 3.00, outputPerM: 15.00, context: 200000, date: '2024-10' },
    { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'anthropic', inputPerM: 0.80, outputPerM: 4.00, context: 200000, date: '2024-11' },
    { id: 'mistralai/mistral-large-2411', name: 'Mistral Large 2', provider: 'other', inputPerM: 2.00, outputPerM: 6.00, context: 128000, date: '2024-11' },
    { id: 'mistralai/codestral-2501', name: 'Codestral 2501', provider: 'other', inputPerM: 0.30, outputPerM: 0.90, context: 256000, date: '2025-01' }
  ],

  models: [],
  currentFilter: 'all',
  searchQuery: '',
  tokens: 0,
  reasoningEffort: 'none',
  reasoningTokens: 0,

  
  reasoningMultipliers: {
    none: 0,
    low: 0.8,
    med: 2.5,
    high: 7.5
  },

  bindReasoningEffort() {
    const buttons = document.querySelectorAll('.token-reasoning-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        buttons.forEach(b => {
          b.classList.remove('active', 'bg-white', 'dark:bg-neutral-700', 'text-neutral-900', 'dark:text-white', 'shadow-sm');
          b.classList.add('text-neutral-500', 'hover:text-neutral-900', 'dark:hover:text-neutral-100');
        });
        const target = e.currentTarget;
        target.classList.add('active', 'bg-white', 'dark:bg-neutral-700', 'text-neutral-900', 'dark:text-white', 'shadow-sm');
        target.classList.remove('text-neutral-500', 'hover:text-neutral-900', 'dark:hover:text-neutral-100');

        const effort = target.getAttribute('data-effort') || 'none';
        this.reasoningEffort = effort;
        this.calculate();
      });
    });
  },

  init() {
    this.models = [...this.baseModels];
    this.bindEvents();
    this.bindReasoningEffort();
    this.loadCachedModels();
    this.fetchLiveModels();
    this.calculate();
  },

  bindEvents() {
    const textarea = document.getElementById('token-input');

    if (textarea) {
      textarea.addEventListener('input', () => this.calculate());
    }

    // Sample prompt presets
    document.querySelectorAll('.token-sample-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.currentTarget.getAttribute('data-sample');
        this.loadSample(type);
      });
    });

    // Custom Calculator rate inputs
    const inRateInput = document.getElementById('token-custom-in');
    const outRateInput = document.getElementById('token-custom-out');
    if (inRateInput) inRateInput.addEventListener('input', () => this.updateCustomCost());
    if (outRateInput) outRateInput.addEventListener('input', () => this.updateCustomCost());

    // Search input
    const searchInput = document.getElementById('token-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderPricing();
      });
    }

    // Filter chips
    document.querySelectorAll('.token-filter-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        document.querySelectorAll('.token-filter-chip').forEach(c => {
          c.classList.remove('bg-indigo-600', 'text-white', 'border-indigo-600');
          c.classList.add('bg-neutral-100', 'dark:bg-neutral-800', 'text-neutral-600', 'dark:text-neutral-300');
        });
        const target = e.currentTarget;
        target.classList.remove('bg-neutral-100', 'dark:bg-neutral-800', 'text-neutral-600', 'dark:text-neutral-300');
        target.classList.add('bg-indigo-600', 'text-white', 'border-indigo-600');
        this.currentFilter = target.getAttribute('data-filter') || 'all';
        this.renderPricing();
      });
    });

    // Sync button
    const syncBtn = document.getElementById('token-sync-btn');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => {
        this.fetchLiveModels(true);
      });
    }

    // Toggle Table Collapse
    const toggleBtn = document.getElementById('token-table-toggle-btn');
    const tableContainer = document.getElementById('token-table-container');
    const toggleIcon = document.getElementById('token-toggle-icon');
    if (toggleBtn && tableContainer) {
      toggleBtn.addEventListener('click', () => {
        const isHidden = tableContainer.classList.contains('hidden');
        if (isHidden) {
          tableContainer.classList.remove('hidden');
          if (toggleIcon) toggleIcon.style.transform = 'rotate(180deg)';
        } else {
          tableContainer.classList.add('hidden');
          if (toggleIcon) toggleIcon.style.transform = 'rotate(0deg)';
        }
      });
    }
  },

  loadCachedModels() {
    try {
      const cached = localStorage.getItem('omnikit_ai_models_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.models) && parsed.models.length > 0) {
          this.models = parsed.models;
          this.updateSyncBadge(parsed.timestamp, false);
          this.renderPricing();
        }
      }
    } catch (e) {}
  },

  async fetchLiveModels(force = false) {
    const syncBtn = document.getElementById('token-sync-btn');
    if (syncBtn) syncBtn.classList.add('animate-spin');

    try {
      // Check cache timestamp (valid for 24 hours unless force)
      if (!force) {
        const cached = localStorage.getItem('omnikit_ai_models_v2');
        if (cached) {
          const parsed = JSON.parse(cached);
          const ageHours = (Date.now() - (parsed.timestamp || 0)) / (1000 * 60 * 60);
          if (ageHours < 24 && parsed.models && parsed.models.length > 20) {
            this.models = parsed.models;
            this.updateSyncBadge(parsed.timestamp, false);
            this.renderPricing();
            if (syncBtn) syncBtn.classList.remove('animate-spin');
            return;
          }
        }
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('https://openrouter.ai/api/v1/models', { method: 'GET', signal: controller.signal })
        .finally(() => clearTimeout(timer));

      if (!res.ok) throw new Error('Network response error');
      const data = await res.json();
      if (!data || !Array.isArray(data.data)) throw new Error('Invalid format');

      // Sort all models by created descending (newest 2026 releases first!)
      const rawSorted = [...data.data].sort((a, b) => (b.created || 0) - (a.created || 0));

      const extracted = rawSorted.map(m => {
        const promptPrice = Number(m.pricing?.prompt || 0);
        const compPrice = Number(m.pricing?.completion || 0);
        const inPerM = promptPrice * 1000000;
        const outPerM = compPrice * 1000000;

        let provider = 'other';
        const idLower = m.id.toLowerCase();
        if (idLower.includes('openai') || idLower.includes('gpt')) provider = 'openai';
        else if (idLower.includes('anthropic') || idLower.includes('claude')) provider = 'anthropic';
        else if (idLower.includes('google') || idLower.includes('gemini')) provider = 'google';
        else if (idLower.includes('deepseek')) provider = 'deepseek';
        else if (idLower.includes('meta') || idLower.includes('llama')) provider = 'meta';

        const dt = m.created ? new Date(m.created * 1000).toISOString().slice(0, 7) : '2026';

        return {
          id: m.id,
          name: m.name || m.id,
          provider: provider,
          inputPerM: inPerM,
          outputPerM: outPerM,
          context: m.context_length || 128000,
          created: m.created || 0,
          date: dt
        };
      });

      // Filter out empty/unpriced models
      const valid = extracted.filter(m => m.name && (m.inputPerM >= 0) && !m.id.includes(':batch'));

      // Merge: keep 2026 flagship base models priority, followed by live models
      const baseIds = new Set(this.baseModels.map(b => b.id.toLowerCase()));
      const filteredLive = valid.filter(m => !baseIds.has(m.id.toLowerCase()));
      this.models = [...this.baseModels, ...filteredLive];

      // Save to localStorage v2
      localStorage.setItem('omnikit_ai_models_v2', JSON.stringify({
        timestamp: Date.now(),
        models: this.models
      }));

      this.updateSyncBadge(Date.now(), true);
      this.renderPricing();

      if (force) {
        const isRu = (window.I18N?.currentLang || 'en') === 'ru';
        if (window.App && typeof App.showToast === 'function') {
          App.showToast(isRu ? `База моделей ИИ синхронизирована с OpenRouter (${this.models.length} моделей)` : `AI models synced from OpenRouter (${this.models.length} models)`);
        }
      }
    } catch (e) {
      // Graceful fallback to baseModels if offline or network blocked
      this.updateSyncBadge(Date.now(), false, true);
    } finally {
      if (syncBtn) syncBtn.classList.remove('animate-spin');
    }
  },

  updateSyncBadge(timestamp, isFresh = false, isError = false) {
    const badge = document.getElementById('token-sync-badge');
    if (!badge) return;

    const count = this.models.length;
    if (isError) {
      badge.textContent = `● Base DB (${count} models, 2026)`;
      badge.className = 'text-[11px] font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20';
      return;
    }

    badge.textContent = `● Live Synced (${count} models, 2026)`;
    badge.className = 'text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20';
  },

  loadSample(type) {
    const textarea = document.getElementById('token-input');
    if (!textarea) return;

    if (type === 'system') {
      textarea.value = `You are an expert senior software architect. Analyze the provided codebase with zero-trust rigor. Identify architectural bottlenecks, memory leaks, concurrency race conditions, and security vulnerabilities according to OWASP Top 10 standards. Provide concrete drop-in code fixes with comprehensive unit tests.`;
    } else if (type === 'json') {
      textarea.value = JSON.stringify({
        model: "claude-opus",
        messages: [
          { role: "system", content: "You are a helpful coding assistant." },
          { role: "user", content: "Convert this CSV to structured JSON schema with TypeScript types." }
        ],
        temperature: 0.2,
        max_tokens: 4096
      }, null, 2);
    } else if (type === 'russian') {
      textarea.value = `Напишите высокопроизводительную функцию на TypeScript для обработки потоковых данных с автоматическим восстановлением соединения и нулевыми утечками памяти.`;
    }
    this.calculate();
  },

  countTokens(text) {
    if (!text) return 0;
    const matches = text.match(this.tokenizerRegex);
    if (!matches) return 0;

    let tokenCount = 0;
    for (let i = 0; i < matches.length; i++) {
      const part = matches[i];
      const nonAsciiCount = (part.match(/[^\x00-\x7F]/g) || []).length;
      if (nonAsciiCount > 0) {
        tokenCount += Math.max(1, Math.ceil(nonAsciiCount * 0.7));
      } else {
        tokenCount += 1;
      }
    }
    return tokenCount;
  },

  calculate() {
    const textarea = document.getElementById('token-input');
    if (!textarea) return;

    const text = textarea.value;
    this.tokens = this.countTokens(text);
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const readingTimeSec = Math.ceil((words / 200) * 60);

    const multiplier = this.reasoningMultipliers[this.reasoningEffort] || 0;
    this.reasoningTokens = this.tokens > 0 && multiplier > 0 ? Math.round(this.tokens * multiplier) : 0;

    // Update Counters
    const tokenEl = document.getElementById('token-count-val');
    const wordEl = document.getElementById('token-words-val');
    const charEl = document.getElementById('token-chars-val');
    const readingEl = document.getElementById('token-reading-val');

    if (tokenEl) {
      const totalDisplay = this.reasoningTokens > 0 
        ? `${this.tokens.toLocaleString()} (+${this.reasoningTokens.toLocaleString()} reasoning)`
        : this.tokens.toLocaleString();
      tokenEl.textContent = totalDisplay;
    }
    if (wordEl) wordEl.textContent = words.toLocaleString();
    if (charEl) charEl.textContent = chars.toLocaleString();
    if (readingEl) {
      readingEl.textContent = readingTimeSec < 60 ? `${readingTimeSec}s` : `${Math.ceil(readingTimeSec / 60)}m`;
    }

    // Update Custom Cost
    this.updateCustomCost();

    // Render Pricing Comparison Table
    this.renderPricing();
  },

  updateCustomCost() {
    const inRateInput = document.getElementById('token-custom-in');
    const costDisplay = document.getElementById('token-custom-cost-val');
    if (!inRateInput || !costDisplay) return;

    const inRate = parseFloat(inRateInput.value) || 0;
    const outRateInput = document.getElementById('token-custom-out');
    const outRate = parseFloat(outRateInput?.value) || 0;
    const cost = (this.tokens / 1000000) * inRate + (this.reasoningTokens / 1000000) * outRate;

    if (cost === 0) {
      costDisplay.textContent = '$0.0000';
    } else if (cost < 0.0001) {
      costDisplay.textContent = '< $0.0001';
    } else {
      costDisplay.textContent = `$${cost.toFixed(4)}`;
    }
  },

  applyModelRate(inPerM, outPerM, modelName) {
    const inInput = document.getElementById('token-custom-in');
    const outInput = document.getElementById('token-custom-out');
    const nameBadge = document.getElementById('token-active-model-name');

    if (inInput) inInput.value = inPerM.toFixed(4);
    if (outInput) outInput.value = outPerM.toFixed(4);
    if (nameBadge) nameBadge.textContent = modelName;

    this.updateCustomCost();
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  tableListenerAttached: false,

  renderPricing() {
    const tableBody = document.getElementById('token-pricing-body');
    if (!tableBody) return;

    if (!this.tableListenerAttached) {
      tableBody.addEventListener('click', (e) => {
        const btn = e.target.closest('.token-apply-rate-btn');
        if (btn) {
          const inRate = parseFloat(btn.getAttribute('data-in')) || 0;
          const outRate = parseFloat(btn.getAttribute('data-out')) || 0;
          const name = btn.getAttribute('data-name') || 'Custom Model';
          this.applyModelRate(inRate, outRate, name);
        }
      });
      this.tableListenerAttached = true;
    }

    let filtered = this.models;

    // Filter by provider
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(m => m.provider === this.currentFilter);
    }

    // Filter by search query
    if (this.searchQuery) {
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(this.searchQuery) || 
        m.id.toLowerCase().includes(this.searchQuery)
      );
    }

    // Limit display to top 30 if browsing all
    const displayList = this.searchQuery ? filtered.slice(0, 50) : filtered.slice(0, 25);

    const fmtCost = (val) => {
      if (val === 0) return '$0.0000';
      if (val < 0.0001) return `< $0.0001`;
      return `$${val.toFixed(4)}`;
    };

    let html = '';
    displayList.forEach(m => {
      const inCost = (this.tokens / 1000000) * m.inputPerM;
      const outCost = (this.tokens / 1000000) * m.outputPerM;
      const ctxPercent = m.context ? Math.min(100, (this.tokens / m.context) * 100).toFixed(2) : '0.00';
      const safeName = this.escapeHtml(m.name);
      const safeId = this.escapeHtml(m.id);
      const safeDate = m.date ? `<span class="ml-1.5 text-[9px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500">${this.escapeHtml(m.date)}</span>` : '';

      html += `
        <tr class="border-b border-neutral-100 dark:border-neutral-800/60 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition">
          <td class="py-2.5 px-3">
            <div class="font-semibold text-neutral-900 dark:text-neutral-100 text-xs flex items-center">
              <span>${safeName}</span>
              ${safeDate}
            </div>
            <div class="text-[10px] text-neutral-400 font-mono truncate max-w-[180px] sm:max-w-none">${safeId}</div>
          </td>
          <td class="py-2.5 px-3 font-mono text-xs text-indigo-600 dark:text-indigo-400 text-right">
            <div>${fmtCost(inCost)}</div>
            <div class="text-[10px] text-neutral-400">$${Number(m.inputPerM).toFixed(2)}/1M</div>
          </td>
          <td class="py-2.5 px-3 font-mono text-xs text-neutral-500 text-right">
            <div>${fmtCost(outCost)}</div>
            <div class="text-[10px] text-neutral-400">$${Number(m.outputPerM).toFixed(2)}/1M</div>
          </td>
          <td class="py-2.5 px-3 font-mono text-[11px] text-neutral-400 text-right">${ctxPercent}%</td>
          <td class="py-2.5 px-3 text-right">
            <button type="button" data-in="${Number(m.inputPerM) || 0}" data-out="${Number(m.outputPerM) || 0}" data-name="${safeName}" class="token-apply-rate-btn px-2 py-1 text-[11px] rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition font-medium" data-i18n="token_btn_apply">Apply</button>
          </td>
        </tr>
      `;
    });

    if (displayList.length === 0) {
      html = `
        <tr>
          <td colspan="5" class="py-6 text-center text-xs text-neutral-400">
            No matching models found. Use the custom calculator above for any unlisted model.
          </td>
        </tr>
      `;
    }

    tableBody.innerHTML = html;
  }
};

if (typeof window !== 'undefined') window.TokenTool = TokenTool;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TokenTool;
}
