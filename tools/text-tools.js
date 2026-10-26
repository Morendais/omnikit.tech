/**
 * Text & Social Media Utilities
 * Подсчет символов, лимиты Telegram / Twitter, форматирование и очистка
 */

const TextTools = {
  init() {
    this.bindCounter();
    this.bindCaseConverter();
    this.bindDedicatedCaseConverter();
    this.bindCleaners();
    this.bindTelegramHelpers();
    window.addEventListener('languageChanged', () => {
      const textarea = document.getElementById('text-counter-input');
      if (textarea) this.updateStats(textarea.value);
    });
  },

  bindCounter() {
    const textarea = document.getElementById('text-counter-input');
    if (!textarea) return;

    textarea.addEventListener('input', () => this.updateStats(textarea.value));
    
    document.getElementById('text-clear-btn')?.addEventListener('click', () => {
      textarea.value = '';
      this.updateStats('');
    });

    document.getElementById('text-copy-btn')?.addEventListener('click', () => {
      const isRu = typeof window !== 'undefined' && window.I18N?.currentLang === 'en' ? false : true;
      navigator.clipboard.writeText(textarea.value).then(() => {
        this.showToast(isRu ? 'Текст скопирован в буфер обмена!' : 'Text copied to clipboard!');
      });
    });
  },

  updateStats(text) {
    const totalChars = text.length;
    const noSpaces = text.replace(/\s/g, '').length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const paragraphs = text.trim() ? text.split(/\n+/).length : 0;
    const readingTime = Math.ceil(words / 180); // ~180 words per minute average

    const setEl = (id, val) => {
      if (typeof document === "undefined") return;
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    const isRu = typeof window !== 'undefined' && window.I18N?.currentLang === 'en' ? false : true;
    setEl('stat-chars', totalChars);
    setEl('stat-no-spaces', noSpaces);
    setEl('stat-words', words);
    setEl('stat-paragraphs', paragraphs);
    setEl('stat-reading', `${readingTime} ${isRu ? 'мин' : 'min'}`);

    // Social Limits
    this.updateLimit('tg-caption', totalChars, 1024);
    this.updateLimit('tg-post', totalChars, 4096);
    this.updateLimit('twitter', totalChars, 280);
    this.updateLimit('instagram', totalChars, 2200);

    return { totalChars, noSpaces, words, paragraphs, readingTime };
  },

  updateLimit(id, current, max) {
    if (typeof document === "undefined") return;
    const percent = Math.min(Math.round((current / max) * 100), 100);
    const bar = document.getElementById(`limit-bar-${id}`);
    const badge = document.getElementById(`limit-badge-${id}`);

    if (bar) {
      bar.style.width = `${percent}%`;
      if (current > max) {
        bar.className = 'h-1 rounded bg-red-600 transition-all';
      } else if (percent > 85) {
        bar.className = 'h-1 rounded bg-amber-500 transition-all';
      } else {
        bar.className = 'h-1 rounded bg-neutral-800 dark:bg-neutral-200 transition-all';
      }
    }

    if (badge) {
      badge.textContent = `${current}/${max}`;
      if (current > max) {
        badge.className = 'text-xs font-mono font-medium text-red-500';
      } else {
        badge.className = 'text-xs font-mono text-neutral-500';
      }
    }
  },

  bindCaseConverter() {
    const textarea = document.getElementById('text-counter-input');
    if (!textarea) return;

    const convert = (fn) => {
      textarea.value = fn(textarea.value);
      this.updateStats(textarea.value);
    };

    document.getElementById('btn-case-upper')?.addEventListener('click', () => convert(t => t.toUpperCase()));
    document.getElementById('btn-case-lower')?.addEventListener('click', () => convert(t => t.toLowerCase()));
    document.getElementById('btn-case-title')?.addEventListener('click', () => convert(t => {
      return t.replace(/\b\w/g, l => l.toUpperCase());
    }));
    document.getElementById('btn-case-camel')?.addEventListener('click', () => convert(t => {
      return t.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
    }));
    document.getElementById('btn-case-snake')?.addEventListener('click', () => convert(t => {
      return t.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^\wа-яА-ЯёЁ_]/g, '');
    }));
  },

  bindCleaners() {
    const textarea = document.getElementById('text-counter-input');
    if (!textarea) return;

    document.getElementById('btn-clean-spaces')?.addEventListener('click', () => {
      textarea.value = textarea.value.replace(/[ \t]+/g, ' ').trim();
      this.updateStats(textarea.value);
    });

    document.getElementById('btn-clean-lines')?.addEventListener('click', () => {
      textarea.value = textarea.value.replace(/\n\s*\n/g, '\n').trim();
      this.updateStats(textarea.value);
    });

    document.getElementById('btn-clean-html')?.addEventListener('click', () => {
      let text = textarea.value || '';
      let prev;
      do {
        prev = text;
        text = text.replace(/<[^<>]*>/g, '');
      } while (text !== prev);
      text = text.replace(/[<>]/g, '');
      textarea.value = text.trim();
      this.updateStats(textarea.value);
    });
  },

  bindTelegramHelpers() {
    const textarea = document.getElementById('text-counter-input');
    if (!textarea) return;

    const wrapSelected = (prefix, suffix) => {
      const isRu = typeof window !== 'undefined' && window.I18N?.currentLang === 'en' ? false : true;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = textarea.value.substring(start, end) || (isRu ? 'текст' : 'text');
      const replacement = `${prefix}${selected}${suffix}`;
      textarea.setRangeText(replacement, start, end, 'select');
      this.updateStats(textarea.value);
    };

    document.getElementById('btn-tg-spoiler')?.addEventListener('click', () => wrapSelected('||', '||'));
    document.getElementById('btn-tg-bold')?.addEventListener('click', () => wrapSelected('**', '**'));
    document.getElementById('btn-tg-italic')?.addEventListener('click', () => wrapSelected('*', '*'));
    document.getElementById('btn-tg-code')?.addEventListener('click', () => wrapSelected('`', '`'));
  },

  bindDedicatedCaseConverter() {
    const input = document.getElementById('case-conv-input');
    const output = document.getElementById('case-conv-output');
    if (!input || !output) return;

    const transform = (fn) => {
      const res = fn(input.value);
      output.value = res;
      this.updateCaseStats(input.value, res);
    };

    // Case Buttons
    document.getElementById('btn-case-upper-full')?.addEventListener('click', () => transform(t => t.toUpperCase()));
    document.getElementById('btn-case-lower-full')?.addEventListener('click', () => transform(t => t.toLowerCase()));
    document.getElementById('btn-case-title-full')?.addEventListener('click', () => transform(t => {
      return t.toLowerCase().replace(/(^|\s|[^\p{L}\p{N}])([\p{L}])/gu, (m, p1, p2) => p1 + p2.toUpperCase());
    }));
    document.getElementById('btn-case-sentence-full')?.addEventListener('click', () => transform(t => {
      return t.toLowerCase().replace(/(^\s*[\p{L}]|[.!?]\s+[\p{L}])/gu, c => c.toUpperCase());
    }));
    document.getElementById('btn-case-camel-full')?.addEventListener('click', () => transform(t => {
      const words = t.trim().split(/[\s_\-\.\/\\]+/).filter(Boolean);
      if (!words.length) return '';
      return words[0].toLowerCase() + words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
    }));
    document.getElementById('btn-case-pascal-full')?.addEventListener('click', () => transform(t => {
      const words = t.trim().split(/[\s_\-\.\/\\]+/).filter(Boolean);
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
    }));
    document.getElementById('btn-case-snake-full')?.addEventListener('click', () => transform(t => {
      return t.trim().toLowerCase().replace(/[\s\-\.\/\\]+/g, '_').replace(/_{2,}/g, '_');
    }));
    document.getElementById('btn-case-kebab-full')?.addEventListener('click', () => transform(t => {
      return t.trim().toLowerCase().replace(/[\s_\.\/\\]+/g, '-').replace(/-{2,}/g, '-');
    }));
    document.getElementById('btn-case-constant-full')?.addEventListener('click', () => transform(t => {
      return t.trim().toUpperCase().replace(/[\s\-\.\/\\]+/g, '_').replace(/_{2,}/g, '_');
    }));
    document.getElementById('btn-case-dot-full')?.addEventListener('click', () => transform(t => {
      return t.trim().toLowerCase().replace(/[\s_\-\/\\]+/g, '.').replace(/\.{2,}/g, '.');
    }));

    // Helpers
    document.getElementById('btn-case-clean-spaces')?.addEventListener('click', () => transform(t => t.replace(/[ \t]+/g, ' ').trim()));
    document.getElementById('btn-case-clean-lines')?.addEventListener('click', () => transform(t => t.replace(/\n\s*\n/g, '\n').trim()));
    document.getElementById('btn-case-dedup')?.addEventListener('click', () => transform(t => {
      const lines = t.split('\n');
      return Array.from(new Set(lines)).join('\n');
    }));

    document.getElementById('btn-case-copy')?.addEventListener('click', () => {
      if (!output.value) return;
      navigator.clipboard.writeText(output.value).then(() => {
        const isRu = typeof window !== 'undefined' && window.I18N?.currentLang === 'en' ? false : true;
        this.showToast(isRu ? 'Результат скопирован!' : 'Converted text copied!');
      });
    });

    document.getElementById('btn-case-swap')?.addEventListener('click', () => {
      const tmp = input.value;
      input.value = output.value;
      output.value = tmp;
      this.updateCaseStats(input.value, output.value);
    });

    document.getElementById('btn-case-clear')?.addEventListener('click', () => {
      input.value = '';
      output.value = '';
      this.updateCaseStats('', '');
    });

    input.addEventListener('input', () => {
      this.updateCaseStats(input.value, output.value);
    });
  },

  updateCaseStats(inText, outText) {
    const charsIn = document.getElementById('case-stat-chars-in');
    const wordsIn = document.getElementById('case-stat-words-in');
    const charsOut = document.getElementById('case-stat-chars-out');
    const wordsOut = document.getElementById('case-stat-words-out');

    if (charsIn) charsIn.textContent = (inText || '').length;
    if (wordsIn) wordsIn.textContent = (inText || '').trim() ? (inText || '').trim().split(/\s+/).length : 0;
    if (charsOut) charsOut.textContent = (outText || '').length;
    if (wordsOut) wordsOut.textContent = (outText || '').trim() ? (outText || '').trim().split(/\s+/).length : 0;
  },

  showToast(msg) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'fixed bottom-6 right-6 z-50 px-4 py-2 rounded border border-neutral-700 bg-neutral-900 text-neutral-100 text-xs font-mono shadow-lg flex items-center gap-2 transition-all duration-150 opacity-0 translate-y-1 pointer-events-none';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.remove('opacity-0', 'translate-y-1');
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-1');
    }, 2000);
  }
};

if (typeof window !== 'undefined') window.TextTools = TextTools;
if (typeof module !== 'undefined' && module.exports) module.exports = TextTools;
