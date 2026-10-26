/**
 * OmniKit — Unix Timestamp Converter Engine & UI Module
 * Standalone, 100% Client-Side, Zero Server Computation.
 */

const TimestampTool = {
  _timer: null,
  _isPaused: false,
  _bound: false,
  _langBound: false,

  /**
   * Determine current active language (en, ru, fr, es, de)
   * @returns {'en'|'ru'|'fr'|'es'|'de'}
   */
  getLang() {
    if (typeof window !== 'undefined' && ['en', 'ru', 'fr', 'es', 'de'].includes(window.I18N?.currentLang)) {
      return window.I18N.currentLang;
    }
    return 'en';
  },

  /**
   * 5-Language dictionary for TimestampTool
   */
  MSG: {
    en: {
      pause: '⏸ Pause',
      resume: '▶ Resume',
      pauseAria: 'Pause live clock',
      resumeAria: 'Resume live clock',
      copied: 'Copied to clipboard',
      secCopied: 'Seconds copied!',
      msCopied: 'Milliseconds copied!',
      noTimestamps: 'No timestamps to display',
      colInput: 'Input',
      colStatus: 'Status',
      colSec: 'Seconds',
      colUtc: 'UTC',
      colLocal: 'Local',
      statusOk: 'OK',
      statusInvalid: 'Invalid'
    },
    ru: {
      pause: '⏸ Пауза',
      resume: '▶ Пуск',
      pauseAria: 'Приостановить таймер',
      resumeAria: 'Запустить таймер',
      copied: 'Скопировано в буфер обмена',
      secCopied: 'Секунды скопированы!',
      msCopied: 'Миллисекунды скопированы!',
      noTimestamps: 'Нет меток времени для отображения',
      colInput: 'Ввод',
      colStatus: 'Статус',
      colSec: 'Секунды',
      colUtc: 'UTC',
      colLocal: 'Локальное',
      statusOk: 'ОК',
      statusInvalid: 'Ошибка'
    },
    fr: {
      pause: '⏸ Pause',
      resume: '▶ Reprendre',
      pauseAria: 'Mettre en pause l’horloge',
      resumeAria: 'Reprendre l’horloge',
      copied: 'Copié dans le presse-papiers',
      secCopied: 'Secondes copiées !',
      msCopied: 'Millisecondes copiées !',
      noTimestamps: 'Aucun horodatage à afficher',
      colInput: 'Entrée',
      colStatus: 'Statut',
      colSec: 'Secondes',
      colUtc: 'UTC',
      colLocal: 'Heure locale',
      statusOk: 'OK',
      statusInvalid: 'Invalide'
    },
    es: {
      pause: '⏸ Pausa',
      resume: '▶ Reanudar',
      pauseAria: 'Pausar reloj en vivo',
      resumeAria: 'Reanudar reloj en vivo',
      copied: 'Copiado al portapapeles',
      secCopied: '¡Segundos copiados!',
      msCopied: '¡Milisegundos copiados!',
      noTimestamps: 'No hay marcas de tiempo para mostrar',
      colInput: 'Entrada',
      colStatus: 'Estado',
      colSec: 'Segundos',
      colUtc: 'UTC',
      colLocal: 'Hora local',
      statusOk: 'OK',
      statusInvalid: 'Inválido'
    },
    de: {
      pause: '⏸ Pause',
      resume: '▶ Fortsetzen',
      pauseAria: 'Live-Uhr pausieren',
      resumeAria: 'Live-Uhr fortsetzen',
      copied: 'In die Zwischenablage kopiert',
      secCopied: 'Sekunden kopiert!',
      msCopied: 'Millisekunden kopiert!',
      noTimestamps: 'Keine Zeitstempel zum Anzeigen',
      colInput: 'Eingabe',
      colStatus: 'Status',
      colSec: 'Sekunden',
      colUtc: 'UTC',
      colLocal: 'Lokalzeit',
      statusOk: 'OK',
      statusInvalid: 'Ungültig'
    }
  },

  /**
   * Helper to fetch translated message by key
   * @param {string} key
   * @returns {string}
   */
  msg(key) {
    const lang = this.getLang();
    const table = this.MSG[lang] || this.MSG.en;
    return table[key] || this.MSG.en[key] || '';
  },

  /**
   * Start live ticking clock (seconds and milliseconds)
   */
  startClock() {
    this.stopClock();
    this._isPaused = false;
    this.updateLiveClock();
    if (typeof window !== 'undefined') {
      this._timer = setInterval(() => {
        if (!this._isPaused) {
          this.updateLiveClock();
        }
      }, 1000);
    }
  },

  /**
   * Stop or pause live clock
   */
  stopClock() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this._isPaused = true;
  },

  /**
   * Toggle pause/resume on live ticker
   */
  toggleClock() {
    if (this._isPaused) {
      this.startClock();
    } else {
      this.stopClock();
    }
    this.updateClockToggleBtn();
  },

  /**
   * Update pause/resume button label and icon if available
   */
  updateClockToggleBtn() {
    if (typeof document === 'undefined') return;
    const btn = document.getElementById('ts-btn-clock-toggle') ||
                document.getElementById('epoch-toggle-clock') ||
                document.getElementById('clock-pause-btn');
    if (!btn) return;

    const key = this._isPaused ? 'resume' : 'pause';
    const ariaKey = this._isPaused ? 'resumeAria' : 'pauseAria';
    const text = this.msg(key);
    const ariaText = this.msg(ariaKey);

    const span = (typeof btn.querySelector === 'function') ? btn.querySelector('span') : null;
    const icon = (typeof btn.querySelector === 'function') ? btn.querySelector('i[data-lucide]') : null;

    if (span) {
      span.textContent = text;
    } else {
      btn.textContent = text;
    }

    if (icon) {
      icon.setAttribute('data-lucide', this._isPaused ? 'play' : 'pause');
      if (typeof window !== 'undefined' && window.lucide && typeof window.lucide.createIcons === 'function') {
        try { window.lucide.createIcons(); } catch (_) {}
      }
    }

    if (typeof btn.setAttribute === 'function') {
      btn.setAttribute('aria-label', ariaText);
    }
  },

  updateClockToggleButton() {
    return this.updateClockToggleBtn();
  },

  /**
   * Update live clock elements in DOM
   */
  updateLiveClock() {
    if (typeof document === 'undefined') return;
    const now = Date.now();
    const sec = Math.floor(now / 1000);
    const secEl = document.getElementById('current-epoch-secs');
    const msEl = document.getElementById('current-epoch-ms');
    if (secEl) secEl.textContent = sec.toString();
    if (msEl) msEl.textContent = now.toString();
  },

  /**
   * Convert a timestamp into multiple human-readable formats
   * @param {string|number} tsInput
   * @param {string} [lang]
   * @returns {{ valid: boolean, sec: number|null, ms: number|null, local: string, utc: string, iso: string, relative: string }}
   */
  convertToDate(tsInput, lang) {
    if (tsInput === null || tsInput === undefined) {
      return { valid: false, sec: null, ms: null, local: '—', utc: '—', iso: '—', relative: '—' };
    }

    const trimmed = String(tsInput).trim();
    if (trimmed === '') {
      return { valid: false, sec: null, ms: null, local: '—', utc: '—', iso: '—', relative: '—' };
    }

    const num = Number(trimmed);
    if (!Number.isFinite(num)) {
      return { valid: false, sec: null, ms: null, local: '—', utc: '—', iso: '—', relative: '—' };
    }

    // Auto-detect seconds vs milliseconds:
    // Timestamps with magnitude > 99,999,999,999 (11+ digits) are milliseconds
    let sec, ms;
    if (Math.abs(num) > 99999999999) {
      ms = Math.round(num);
      sec = Math.floor(ms / 1000);
    } else {
      sec = Math.floor(num);
      ms = sec * 1000;
    }

    // Max safe date boundary (+/- 8.64e15 ms)
    if (Math.abs(ms) > 8640000000000000) {
      return { valid: false, sec: null, ms: null, local: '—', utc: '—', iso: '—', relative: '—' };
    }

    const d = new Date(ms);
    if (isNaN(d.getTime())) {
      return { valid: false, sec: null, ms: null, local: '—', utc: '—', iso: '—', relative: '—' };
    }

    const activeLang = lang || this.getLang();

    let localStr = '';
    try {
      localStr = d.toLocaleString(activeLang, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      localStr = d.toLocaleString();
    }

    const relativeStr = this._formatRelativeTime(ms, activeLang);

    return {
      valid: true,
      sec,
      ms,
      local: localStr,
      utc: d.toUTCString(),
      iso: d.toISOString(),
      relative: relativeStr
    };
  },

  /**
   * Format relative time string with Intl or fallback
   * @param {number} targetMs
   * @param {string} [lang]
   * @returns {string}
   */
  _formatRelativeTime(targetMs, lang) {
    const activeLang = lang || this.getLang();
    const diffSec = Math.round((targetMs - Date.now()) / 1000);
    if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
      try {
        const rtf = new Intl.RelativeTimeFormat(activeLang, { numeric: 'auto' });
        const absSec = Math.abs(diffSec);
        if (absSec < 60) return rtf.format(diffSec, 'second');
        const diffMin = Math.round(diffSec / 60);
        if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
        const diffHour = Math.round(diffSec / 3600);
        if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour');
        const diffDay = Math.round(diffSec / 86400);
        if (Math.abs(diffDay) < 30) return rtf.format(diffDay, 'day');
        const diffMonth = Math.round(diffSec / 2592000);
        if (Math.abs(diffMonth) < 12) return rtf.format(diffMonth, 'month');
        const diffYear = Math.round(diffSec / 31536000);
        return rtf.format(diffYear, 'year');
      } catch {
        // Fallback
      }
    }

    const isPast = diffSec < 0;
    const abs = Math.abs(diffSec);
    const suffix = isPast ? 'ago' : 'from now';
    if (abs < 60) return `${abs}s ${suffix}`;
    if (abs < 3600) return `${Math.round(abs / 60)}m ${suffix}`;
    if (abs < 86400) return `${Math.round(abs / 3600)}h ${suffix}`;
    if (abs < 2592000) return `${Math.round(abs / 86400)}d ${suffix}`;
    return `${Math.round(abs / 31536000)}y ${suffix}`;
  },

  /**
   * Convert date string into timestamp
   * @param {string} dateStr
   * @returns {{ valid: boolean, sec: number|null, ms: number|null, iso: string }}
   */
  convertToTimestamp(dateStr) {
    if (dateStr === null || dateStr === undefined) {
      return { valid: false, sec: null, ms: null, iso: '—' };
    }

    const trimmed = String(dateStr).trim();
    if (!trimmed) {
      return { valid: false, sec: null, ms: null, iso: '—' };
    }

    // Strict validation for calendar dates (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss) to reject rollovers like Feb 30
    const m = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (m) {
      const year = parseInt(m[1], 10);
      const month = parseInt(m[2], 10);
      const day = parseInt(m[3], 10);
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        return { valid: false, sec: null, ms: null, iso: '—' };
      }
      const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
      if (day > daysInMonth) {
        return { valid: false, sec: null, ms: null, iso: '—' };
      }
      if (m[4] !== undefined) {
        const hour = parseInt(m[4], 10);
        const min = parseInt(m[5], 10);
        const sec = m[6] !== undefined ? parseInt(m[6], 10) : 0;
        if (hour < 0 || hour > 23 || min < 0 || min > 59 || sec < 0 || sec > 59) {
          return { valid: false, sec: null, ms: null, iso: '—' };
        }
      }
    }

    const d = new Date(trimmed);
    if (isNaN(d.getTime())) {
      return { valid: false, sec: null, ms: null, iso: '—' };
    }

    const ms = d.getTime();
    const sec = Math.floor(ms / 1000);

    return {
      valid: true,
      sec,
      ms,
      iso: d.toISOString()
    };
  },

  /**
   * Apply TTL preset offset in seconds to base timestamp
   * @param {number|null} baseSec
   * @param {number} deltaSec
   * @returns {number}
   */
  applyPreset(baseSec, deltaSec) {
    const base = (typeof baseSec === 'number' && Number.isFinite(baseSec))
      ? baseSec
      : Math.floor(Date.now() / 1000);
    const delta = Number(deltaSec) || 0;
    return Math.floor(base + delta);
  },

  /**
   * Convert multiple lines of timestamps
   * @param {string|Array<string>} textLines
   * @param {string} [lang]
   * @returns {Array<{ raw: string, valid: boolean, sec: number|null, local: string, utc: string }>}
   */
  convertBatch(textLines, lang) {
    if (!textLines) return [];
    let lines = [];
    if (Array.isArray(textLines)) {
      lines = textLines;
    } else if (typeof textLines === 'string') {
      lines = textLines.split(/\r?\n/);
    } else {
      return [];
    }

    const results = [];
    for (const rawLine of lines) {
      const trimmed = String(rawLine).trim();
      if (!trimmed) continue;
      const res = this.convertToDate(trimmed, lang);
      results.push({
        raw: trimmed,
        valid: res.valid,
        sec: res.sec,
        local: res.local,
        utc: res.utc
      });
    }
    return results;
  },

  /**
   * UI: Handle timestamp input change
   */
  handleTsInput() {
    if (typeof document === 'undefined') return;
    const input = document.getElementById('ts-to-date-input');
    if (!input) return;
    const res = this.convertToDate(input.value);

    const localEl = document.getElementById('ts-to-date-local');
    const utcEl = document.getElementById('ts-to-date-utc');
    const relEl = document.getElementById('ts-to-date-relative');
    const isoEl = document.getElementById('ts-to-date-iso');

    if (localEl) localEl.textContent = res.local;
    if (utcEl) utcEl.textContent = res.utc;
    if (relEl) relEl.textContent = res.relative;
    if (isoEl) isoEl.textContent = res.iso;
  },

  updateTsToDate() {
    return this.handleTsInput();
  },

  /**
   * UI: Handle date input change
   */
  handleDateInput() {
    if (typeof document === 'undefined') return;
    const input = document.getElementById('date-to-ts-input');
    if (!input) return;
    const res = this.convertToTimestamp(input.value);

    const secEl = document.getElementById('date-to-ts-sec');
    const msEl = document.getElementById('date-to-ts-ms');
    const isoEl = document.getElementById('date-to-ts-iso');

    if (secEl) secEl.textContent = res.valid ? res.sec.toString() : '—';
    if (msEl) msEl.textContent = res.valid ? res.ms.toString() : '—';
    if (isoEl) isoEl.textContent = res.iso;
  },

  /**
   * UI: Run batch conversion and render into output table
   */
  handleBatchConvert() {
    if (typeof document === 'undefined') return;
    const inputEl = document.getElementById('ts-batch-input');
    const resultsContainer = document.getElementById('ts-batch-results') ||
                             document.getElementById('ts-batch-res') ||
                             document.getElementById('batch-res');
    const tbodyEl = document.getElementById('ts-batch-table-body') ||
                    document.getElementById('batch-table-body');
    if (!inputEl || (!resultsContainer && !tbodyEl)) return;

    const results = this.convertBatch(inputEl.value);

    if (tbodyEl) {
      if (results.length === 0) {
        tbodyEl.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-xs text-neutral-400">${this.msg('noTimestamps')}</td></tr>`;
      } else {
        tbodyEl.innerHTML = results.map(row => {
          const badge = row.valid
            ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">${this.msg('statusOk')}</span>`
            : `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">${this.msg('statusInvalid')}</span>`;
          return `
            <tr class="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
              <td class="py-2 px-3 text-neutral-700 dark:text-neutral-300 font-mono text-xs">${row.raw}</td>
              <td class="py-2 px-3">${badge}</td>
              <td class="py-2 px-3 font-semibold text-indigo-600 dark:text-indigo-400 font-mono text-xs">${row.sec !== null ? row.sec : '—'}</td>
              <td class="py-2 px-3 text-neutral-600 dark:text-neutral-400 text-xs">${row.utc}</td>
              <td class="py-2 px-3 text-neutral-600 dark:text-neutral-400 text-xs">${row.local}</td>
            </tr>
          `;
        }).join('');
      }
    }

    if (resultsContainer) {
      if (results.length === 0) {
        resultsContainer.innerHTML = `<div class="text-sm text-gray-500 py-3 text-center">${this.msg('noTimestamps')}</div>`;
        return;
      }

      let html = `
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm font-mono border-collapse">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 uppercase">
                <th class="py-2 px-3">${this.msg('colInput')}</th>
                <th class="py-2 px-3">${this.msg('colStatus')}</th>
                <th class="py-2 px-3">${this.msg('colSec')}</th>
                <th class="py-2 px-3">${this.msg('colUtc')}</th>
                <th class="py-2 px-3">${this.msg('colLocal')}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
      `;

      for (const row of results) {
        const badge = row.valid
          ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">${this.msg('statusOk')}</span>`
          : `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">${this.msg('statusInvalid')}</span>`;
        html += `
          <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <td class="py-2 px-3 text-gray-700 dark:text-gray-300">${row.raw}</td>
            <td class="py-2 px-3">${badge}</td>
            <td class="py-2 px-3 font-semibold text-indigo-600 dark:text-indigo-400">${row.sec !== null ? row.sec : '—'}</td>
            <td class="py-2 px-3 text-gray-600 dark:text-gray-400 text-xs">${row.utc}</td>
            <td class="py-2 px-3 text-gray-600 dark:text-gray-400 text-xs">${row.local}</td>
          </tr>
        `;
      }

      html += `
            </tbody>
          </table>
        </div>
      `;

      resultsContainer.innerHTML = html;
    }
  },

  renderBatchResults() {
    return this.handleBatchConvert();
  },

  runBatch() {
    return this.handleBatchConvert();
  },

  /**
   * Helper to copy text to clipboard with toast notification
   * @param {string} text
   * @param {string} [label]
   */
  copyToClipboard(text, label) {
    const toastLabel = label || this.msg('copied');
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      if (typeof window !== 'undefined' && window.App && typeof window.App.showToast === 'function') {
        window.App.showToast(toastLabel, 'success');
      } else if (typeof window !== 'undefined' && window.TextTools && typeof window.TextTools.showToast === 'function') {
        window.TextTools.showToast(toastLabel);
      }
    }).catch(() => {});
  },

  copyText(text, label) {
    return this.copyToClipboard(text, label);
  },

  /**
   * Language change handler to update live outputs without losing state
   */
  onLanguageChanged() {
    this.updateClockToggleBtn();
    this.updateTsToDate();
    this.handleDateInput();
    const batchInput = (typeof document !== 'undefined') ? document.getElementById('ts-batch-input') : null;
    if (batchInput && batchInput.value && batchInput.value.trim()) {
      this.runBatch();
    }
  },

  /**
   * Initialize DOM bindings for standalone Unix Timestamp tool
   */
  init() {
    if (!this._langBound && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      this._langBound = true;
      window.addEventListener('languageChanged', () => this.onLanguageChanged());
    }

    if (typeof document === 'undefined') return;

    // Check if the timestamp tool container exists on the current page
    const container = document.getElementById('tool-view-unix-timestamp') ||
                      document.getElementById('current-epoch-secs') ||
                      document.getElementById('ts-to-date-input');
    if (!container) return;

    this.bindEvents();
  },

  bindEvents() {
    if (this._bound) return;
    this._bound = true;

    // Start live clock
    this.startClock();

    // Pause/Resume button
    const toggleClockBtn = document.getElementById('ts-btn-clock-toggle') ||
                           document.getElementById('epoch-toggle-clock') ||
                           document.getElementById('clock-pause-btn');
    if (toggleClockBtn && typeof toggleClockBtn.addEventListener === 'function') {
      toggleClockBtn.addEventListener('click', () => this.toggleClock());
    }

    // Copy buttons for live clock
    const copySecBtn = document.getElementById('ts-btn-copy-sec') || document.getElementById('btn-copy-epoch-sec');
    if (copySecBtn && typeof copySecBtn.addEventListener === 'function') {
      copySecBtn.addEventListener('click', () => {
        const secEl = document.getElementById('current-epoch-secs');
        if (secEl) {
          this.copyToClipboard(secEl.textContent, this.msg('secCopied'));
        }
      });
    }

    const copyMsBtn = document.getElementById('ts-btn-copy-ms') || document.getElementById('btn-copy-epoch-ms');
    if (copyMsBtn && typeof copyMsBtn.addEventListener === 'function') {
      copyMsBtn.addEventListener('click', () => {
        const msEl = document.getElementById('current-epoch-ms');
        if (msEl) {
          this.copyToClipboard(msEl.textContent, this.msg('msCopied'));
        }
      });
    }

    // Timestamp-to-Date inputs
    const tsInput = document.getElementById('ts-to-date-input');
    if (tsInput) {
      if (typeof tsInput.addEventListener === 'function') {
        tsInput.addEventListener('input', () => this.handleTsInput());
      }
      if (!tsInput.value) {
        tsInput.value = Math.floor(Date.now() / 1000).toString();
      }
      this.handleTsInput();
    }

    // Copy buttons for Timestamp-to-Date results
    ['local', 'utc', 'relative', 'iso'].forEach(key => {
      const btn = document.getElementById(`ts-copy-${key}`) || document.getElementById(`btn-copy-ts-${key}`);
      if (btn && typeof btn.addEventListener === 'function') {
        btn.addEventListener('click', () => {
          const el = document.getElementById(`ts-to-date-${key}`);
          if (el && el.textContent && el.textContent !== '—') {
            this.copyToClipboard(el.textContent, this.msg('copied'));
          }
        });
      }
    });

    // Preset buttons (+15m, +1h, +1d, +7d, +30d, now)
    const presetButtons = document.querySelectorAll ? document.querySelectorAll('[data-preset-sec], #ts-preset-15m, #ts-preset-1h, #ts-preset-1d, #ts-preset-7d, #ts-preset-30d, #ts-preset-now, #preset-15m, #preset-1h, #preset-1d, #preset-7d, #preset-30d, #preset-now') : [];
    presetButtons.forEach(btn => {
      if (typeof btn.addEventListener === 'function') {
        btn.addEventListener('click', () => {
          const deltaAttr = btn.getAttribute ? btn.getAttribute('data-preset-sec') : null;
          let delta = 0;
          if (deltaAttr !== null) {
            delta = Number(deltaAttr);
          } else if (btn.id === 'preset-15m' || btn.id === 'ts-preset-15m') delta = 900;
          else if (btn.id === 'preset-1h' || btn.id === 'ts-preset-1h') delta = 3600;
          else if (btn.id === 'preset-1d' || btn.id === 'ts-preset-1d') delta = 86400;
          else if (btn.id === 'preset-7d' || btn.id === 'ts-preset-7d') delta = 604800;
          else if (btn.id === 'preset-30d' || btn.id === 'ts-preset-30d') delta = 2592000;
          else if (btn.id === 'preset-now' || btn.id === 'ts-preset-now') delta = 0;

          if (btn.id === 'preset-now' || btn.id === 'ts-preset-now' || deltaAttr === '0') {
            if (tsInput) tsInput.value = Math.floor(Date.now() / 1000).toString();
          } else {
            const currentSec = tsInput ? Number(tsInput.value) : Math.floor(Date.now() / 1000);
            const nextSec = this.applyPreset(currentSec, delta);
            if (tsInput) tsInput.value = nextSec.toString();
          }
          this.handleTsInput();
        });
      }
    });

    // Date-to-Timestamp inputs
    const dateInput = document.getElementById('date-to-ts-input');
    if (dateInput) {
      if (typeof dateInput.addEventListener === 'function') {
        dateInput.addEventListener('input', () => this.handleDateInput());
        dateInput.addEventListener('change', () => this.handleDateInput());
      }
      if (!dateInput.value) {
        // Default to current local datetime formatted for <input type="datetime-local"> (YYYY-MM-DDTHH:mm)
        const now = new Date();
        const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        dateInput.value = localIso;
      }
      this.handleDateInput();
    }

    // "Set Now" button for Date to Timestamp
    const dateNowBtn = document.getElementById('btn-date-to-ts-now');
    if (dateNowBtn && typeof dateNowBtn.addEventListener === 'function') {
      dateNowBtn.addEventListener('click', () => {
        const now = new Date();
        const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        if (dateInput) {
          dateInput.value = localIso;
          this.handleDateInput();
        }
      });
    }

    // Copy buttons for Date-to-Timestamp results
    ['sec', 'ms'].forEach(unit => {
      const btn = document.getElementById(`btn-copy-date-${unit}`);
      if (btn && typeof btn.addEventListener === 'function') {
        btn.addEventListener('click', () => {
          const el = document.getElementById(`date-to-ts-${unit}`);
          if (el && el.textContent && el.textContent !== '—') {
            this.copyToClipboard(el.textContent, this.msg('copied'));
          }
        });
      }
    });

    // Batch convert controls
    const batchBtn = document.getElementById('ts-batch-btn');
    if (batchBtn && typeof batchBtn.addEventListener === 'function') {
      batchBtn.addEventListener('click', () => this.handleBatchConvert());
    }
    const batchInput = document.getElementById('ts-batch-input');
    if (batchInput && typeof batchInput.addEventListener === 'function') {
      batchInput.addEventListener('input', () => this.handleBatchConvert());
    }
  }
};

if (typeof window !== 'undefined') {
  window.TimestampTool = TimestampTool;
  document.addEventListener('DOMContentLoaded', () => {
    TimestampTool.init();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimestampTool;
}
