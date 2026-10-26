/**
 * OmniKit Office & Marketing Utilities
 * 1. Diff Checker (Text comparison)
 * 2. Number to Words (Сумма прописью + НДС)
 * 3. RegEx Tester (Live pattern evaluator)
 * 4. UTM Generator & URL Encoder/Decoder
 */

const OfficeTools = {
  init() {
    this.bindDiffChecker();
    this.bindNumToWords();
    this.bindRegExTester();
    this.bindUtmGenerator();
  },

  // --- 1. Diff Checker ---
  bindDiffChecker() {
    const textA = document.getElementById('diff-original');
    const textB = document.getElementById('diff-modified');
    const output = document.getElementById('diff-output');
    const compareBtn = document.getElementById('diff-compare-btn');
    const clearBtn = document.getElementById('diff-clear-btn');
    const sampleBtn = document.getElementById('diff-sample-btn');

    if (!textA || !textB || !output) return;

    sampleBtn?.addEventListener('click', () => {
      const isRu = (window.I18N?.currentLang || 'en') === 'ru';
      if (isRu) {
        textA.value = 'OmniKit — бесплатный онлайн конвертер.\nРаботает быстро и безопасно на сервере.\nВсе файлы сохраняются в базу данных.';
        textB.value = 'OmniKit — мощный набор онлайн утилит в браузере.\nРаботает молниеносно и безопасно на вашем устройстве.\nФайлы не загружаются на сервер и не сохраняются.';
      } else {
        textA.value = 'OmniKit is a free in-browser file converter.\nIt operates quickly and reliably on a remote server.\nAll processed files are stored into a database.';
        textB.value = 'OmniKit is a client-side suite of online tools.\nIt operates lightning-fast and privately on your device.\nFiles are processed locally and never stored on servers.';
      }
      compare();
    });

    clearBtn?.addEventListener('click', () => {
      textA.value = '';
      textB.value = '';
      output.innerHTML = '';
      output.classList.add('hidden');
    });

    const compare = () => {
      const aLines = textA.value.split('\n');
      const bLines = textB.value.split('\n');
      const maxLen = Math.max(aLines.length, bLines.length);

      let html = '<div class="space-y-1 font-mono text-xs">';
      let changes = 0;

      for (let i = 0; i < maxLen; i++) {
        const lineA = aLines[i] ?? '';
        const lineB = bLines[i] ?? '';

        if (lineA === lineB) {
          html += `<div class="p-1 rounded text-neutral-600 dark:text-neutral-400 select-all"><span class="text-neutral-400 select-none mr-2">${i + 1}</span>  ${this.escapeHtml(lineA)}</div>`;
        } else {
          changes++;
          if (lineA) {
            html += `<div class="p-1 rounded bg-red-500/10 text-red-600 dark:text-red-400 select-all"><span class="text-red-400 select-none mr-2">${i + 1}</span>- ${this.escapeHtml(lineA)}</div>`;
          }
          if (lineB) {
            html += `<div class="p-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 select-all"><span class="text-emerald-400 select-none mr-2">${i + 1}</span>+ ${this.escapeHtml(lineB)}</div>`;
          }
        }
      }
      html += '</div>';

      const isRu = (window.I18N?.currentLang || 'en') === 'ru';
      output.innerHTML = `
        <div class="mb-3 flex items-center justify-between text-xs pb-2 border-b border-neutral-200 dark:border-neutral-800">
          <span class="font-semibold text-neutral-700 dark:text-neutral-300">
            ${isRu ? `Результат сравнения: ${changes} изменений` : `Diff result: ${changes} lines changed`}
          </span>
          <span class="text-[11px] text-neutral-500 font-mono">
            <span class="text-emerald-500 font-bold">+ ${isRu ? 'Добавлено' : 'Added'}</span> • <span class="text-red-500 font-bold">- ${isRu ? 'Удалено' : 'Deleted'}</span>
          </span>
        </div>
        ${html}
      `;
      output.classList.remove('hidden');
    };

    compareBtn?.addEventListener('click', compare);
  },

  // --- 2. Number / Currency to Words ---
  bindNumToWords() {
    const input = document.getElementById('num2words-input');
    const currencySelect = document.getElementById('num2words-currency');
    const vatCheck = document.getElementById('num2words-vat');
    const resultBox = document.getElementById('num2words-result');
    const copyBtn = document.getElementById('num2words-copy');

    if (!input || !resultBox) return;

    const convert = () => {
      const val = parseFloat(input.value.replace(/\s+/g, '').replace(',', '.'));
      const isRu = (window.I18N?.currentLang || 'en') === 'ru';

      if (isNaN(val) || val < 0) {
        resultBox.textContent = isRu ? 'Введите корректное число' : 'Please enter a valid positive number';
        return;
      }

      const curr = currencySelect?.value || 'rub';
      const withVat = vatCheck?.checked || false;

      const integerPart = Math.floor(val);
      const kopecks = Math.round((val - integerPart) * 100);

      const currencyNames = {
        rub: { one: 'рубль', few: 'рубля', many: 'рублей', kopOne: 'копейка', kopFew: 'копейки', kopMany: 'копеек' },
        usd: { one: 'доллар США', few: 'доллара США', many: 'долларов США', kopOne: 'цент', kopFew: 'цента', kopMany: 'центов' },
        eur: { one: 'евро', few: 'евро', many: 'евро', kopOne: 'евроцент', kopFew: 'евроцента', kopMany: 'евроцентов' },
        kzt: { one: 'тенге', few: 'тенге', many: 'тенге', kopOne: 'тиын', kopFew: 'тиына', kopMany: 'тиын' },
        byn: { one: 'белорусский рубль', few: 'белорусских рубля', many: 'белорусских рублей', kopOne: 'копейка', kopFew: 'копейки', kopMany: 'копеек' }
      };

      const c = currencyNames[curr] || currencyNames.rub;
      const rubWord = this.pluralize(integerPart, c.one, c.few, c.many);
      const kopWord = this.pluralize(kopecks, c.kopOne, c.kopFew, c.kopMany);

      let text = '';
      if (isRu) {
        const words = this.spellRussianNumber(integerPart);
        text = `${words} ${rubWord} ${kopecks.toString().padStart(2, '0')} ${kopWord}`;
        text = text.charAt(0).toUpperCase() + text.slice(1);
        if (withVat) {
          const vatVal = (val * 20 / 120).toFixed(2);
          text += ` (в том числе НДС 20%: ${vatVal} руб.)`;
        }
      } else {
        const words = this.spellEnglishNumber(integerPart);
        const currEn = { rub: 'Russian Rubles', usd: 'US Dollars', eur: 'Euros', kzt: 'Kazakh Tenge', byn: 'Belarusian Rubles' }[curr] || 'Units';
        text = `${words} ${currEn} and ${kopecks}/100`;
        text = text.charAt(0).toUpperCase() + text.slice(1);
        if (withVat) {
          const vatVal = (val * 20 / 120).toFixed(2);
          text += ` (including 20% VAT: ${vatVal})`;
        }
      }

      resultBox.textContent = text;
    };

    [input, currencySelect, vatCheck].forEach(el => {
      el?.addEventListener('input', convert);
      el?.addEventListener('change', convert);
    });

    copyBtn?.addEventListener('click', () => {
      if (resultBox.textContent) {
        navigator.clipboard.writeText(resultBox.textContent).then(() => {
          if (window.TextTools) {
            const isRu = (window.I18N?.currentLang || 'en') === 'ru';
            TextTools.showToast(isRu ? 'Сумма скопирована!' : 'Amount copied to clipboard!');
          }
        });
      }
    });

    window.addEventListener('languageChanged', convert);
    convert();
  },

  // --- 3. RegEx Tester ---
  bindRegExTester() {
    const patternInput = document.getElementById('regex-pattern');
    const flagsInput = document.getElementById('regex-flags');
    const flagG = document.getElementById('regex-flag-g');
    const flagI = document.getElementById('regex-flag-i');
    const flagM = document.getElementById('regex-flag-m');
    const textInput = document.getElementById('regex-test-text') || document.getElementById('regex-text');
    const highlightBox = document.getElementById('regex-highlight');
    const matchCountEl = document.getElementById('regex-match-count') || document.getElementById('regex-count');
    const matchListEl = document.getElementById('regex-matches-list');

    if (!patternInput || !textInput) return;

    if (!textInput.dataset.userEdited) {
      const isRuInit = (window.I18N?.currentLang || 'en') === 'ru';
      textInput.value = isRuInit
        ? 'Контактная информация:\nEmail: support@omnikit.tech или admin@example.com\nСайт: https://omnikit.tech\nIP адрес сервера: 198.51.100.42\nТелефон: +7 (999) 123-45-67'
        : 'Contact Information:\nEmail: support@omnikit.tech or admin@example.com\nWebsite: https://omnikit.tech\nServer IP: 198.51.100.42\nPhone: +1 (800) 555-0199';
    }

    textInput.addEventListener('input', () => {
      textInput.dataset.userEdited = 'true';
    });

    window.addEventListener('languageChanged', (e) => {
      if (!textInput.dataset.userEdited) {
        const lang = e?.detail?.lang || window.I18N?.currentLang || 'en';
        textInput.value = lang === 'ru'
          ? 'Контактная информация:\nEmail: support@omnikit.tech или admin@example.com\nСайт: https://omnikit.tech\nIP адрес сервера: 198.51.100.42\nТелефон: +7 (999) 123-45-67'
          : 'Contact Information:\nEmail: support@omnikit.tech or admin@example.com\nWebsite: https://omnikit.tech\nServer IP: 198.51.100.42\nPhone: +1 (800) 555-0199';
        testRegex();
      }
    });

    const testRegex = () => {
      const pattern = patternInput.value;
      const text = textInput.value;
      const isRu = (window.I18N?.currentLang || 'en') === 'ru';

      if (!pattern) {
        if (highlightBox) highlightBox.innerHTML = this.escapeHtml(text);
        if (matchCountEl) matchCountEl.textContent = '0';
        if (matchListEl) matchListEl.innerHTML = '';
        return;
      }

      let flags = '';
      if (flagsInput) {
        flags = flagsInput.value.trim();
      } else {
        if (flagG?.checked) flags += 'g';
        if (flagI?.checked) flags += 'i';
        if (flagM?.checked) flags += 'm';
      }

      try {
        const re = new RegExp(pattern, flags);
        const matches = [];
        let match;

        if (flags.includes('g')) {
          let safety = 0;
          while ((match = re.exec(text)) !== null && safety < 1000) {
            matches.push({ match: match[0], index: match.index });
            if (re.lastIndex === match.index) re.lastIndex++;
            safety++;
          }
        } else {
          match = re.exec(text);
          if (match) matches.push({ match: match[0], index: match.index });
        }

        if (matchCountEl) {
          matchCountEl.textContent = `${matches.length} ${isRu ? 'совпадений' : 'matches'}`;
        }

        // Highlight text
        if (highlightBox) {
          let lastIdx = 0;
          let highlighted = '';
          matches.forEach(m => {
            highlighted += this.escapeHtml(text.substring(lastIdx, m.index));
            highlighted += `<mark class="bg-amber-300 dark:bg-amber-600/70 text-black dark:text-white rounded px-0.5">${this.escapeHtml(m.match)}</mark>`;
            lastIdx = m.index + m.match.length;
          });
          highlighted += this.escapeHtml(text.substring(lastIdx));
          highlightBox.innerHTML = highlighted;
        }

        if (matchListEl) {
          matchListEl.innerHTML = matches.slice(0, 50).map((m, i) => `
            <span class="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-mono text-[11px]">
              #${i + 1}: ${this.escapeHtml(m.match)}
            </span>
          `).join('');
        }
      } catch (e) {
        if (matchCountEl) matchCountEl.textContent = isRu ? 'Синтаксическая ошибка RegEx' : 'RegEx Syntax Error';
      }
    };

    [patternInput, flagsInput, textInput, flagG, flagI, flagM].forEach(el => {
      el?.addEventListener('input', testRegex);
      el?.addEventListener('change', testRegex);
    });

    // Preset buttons
    document.querySelectorAll('.regex-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.pattern) {
          patternInput.value = btn.dataset.pattern;
          if (flagsInput && btn.dataset.flags) flagsInput.value = btn.dataset.flags;
          testRegex();
          return;
        }

        const preset = btn.dataset.preset;
        const isRu = (window.I18N?.currentLang || 'en') === 'ru';
        const presets = {
          email: { p: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', t: 'Support email: support@omnikit.tech or sales@example.org' },
          phone: {
            p: '(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|(?:\+7|8)[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{2}[-.\s]?\d{2}\b',
            t: isRu ? 'Контакты: +7 (999) 123-45-67 или 8-800-555-35-35, Server IP: 198.51.100.42' : 'Customer Support: +1 (800) 555-0199, Server IP: 198.51.100.42'
          },
          ip: { p: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', t: 'Server IPs: 127.0.0.1 and 198.51.100.42 active' },
          url: { p: 'https?:\\/\\/[\\w.-]+(?:\\.[\\w\\.-]+)+[\\w\\-\\._~:/?#[\\]@!\\$&\'\\(\\)\\*\\+,;=.]+', t: 'Check https://omnikit.tech/heic-to-jpg today' }
        };

        if (presets[preset]) {
          patternInput.value = presets[preset].p;
          textInput.value = presets[preset].t;
          if (flagsInput) flagsInput.value = 'gm';
          if (flagG) flagG.checked = true;
          testRegex();
        }
      });
    });

    testRegex();
  },

  // --- 4. UTM Generator & URL Encoder/Decoder ---
  bindUtmGenerator() {
    const urlInput = document.getElementById('utm-url');
    const sourceInput = document.getElementById('utm-source');
    const mediumInput = document.getElementById('utm-medium');
    const campaignInput = document.getElementById('utm-campaign');
    const contentInput = document.getElementById('utm-content');
    const termInput = document.getElementById('utm-term');
    const resultInput = document.getElementById('utm-result');
    const copyBtn = document.getElementById('utm-copy-btn') || document.getElementById('utm-copy');

    if (!urlInput || !resultInput) return;

    const buildUrl = () => {
      let base = urlInput.value.trim();
      if (!base) {
        resultInput.value = '';
        return;
      }
      if (!base.startsWith('http://') && !base.startsWith('https://')) {
        base = 'https://' + base;
      }

      try {
        const u = new URL(base);
        if (sourceInput?.value.trim()) u.searchParams.set('utm_source', sourceInput.value.trim());
        if (mediumInput?.value.trim()) u.searchParams.set('utm_medium', mediumInput.value.trim());
        if (campaignInput?.value.trim()) u.searchParams.set('utm_campaign', campaignInput.value.trim());
        if (contentInput?.value.trim()) u.searchParams.set('utm_content', contentInput.value.trim());
        if (termInput?.value.trim()) u.searchParams.set('utm_term', termInput.value.trim());

        resultInput.value = u.toString();
      } catch (e) {
        resultInput.value = base;
      }
    };

    [urlInput, sourceInput, mediumInput, campaignInput, contentInput, termInput].forEach(el => {
      el?.addEventListener('input', buildUrl);
    });

    copyBtn?.addEventListener('click', () => {
      if (resultInput.value) {
        navigator.clipboard.writeText(resultInput.value).then(() => {
          if (window.TextTools) {
            const isRu = (window.I18N?.currentLang || 'en') === 'ru';
            TextTools.showToast(isRu ? 'UTM ссылка скопирована!' : 'UTM Link copied to clipboard!');
          }
        });
      }
    });

    document.getElementById('utm-btn-encode')?.addEventListener('click', () => {
      if (resultInput.value) {
        resultInput.value = encodeURI(resultInput.value);
      }
    });

    document.getElementById('utm-btn-decode')?.addEventListener('click', () => {
      if (resultInput.value) {
        try {
          resultInput.value = decodeURI(resultInput.value);
        } catch (e) {}
      }
    });

    buildUrl();
  },

  // --- Helper math & string spelling ---
  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  pluralize(n, one, few, many) {
    n = Math.abs(n) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return many;
    if (n1 > 1 && n1 < 5) return few;
    if (n1 === 1) return one;
    return many;
  },

  spellRussianNumber(n) {
    if (isNaN(n)) return '';
    if (n === 0) return 'ноль';
    if (n < 0) return 'минус ' + this.spellRussianNumber(Math.abs(n));
    const ones = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
    const onesFem = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
    const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
    const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
    const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];

    const triad = (num, female = false) => {
      const h = Math.floor(num / 100);
      const rem = num % 100;
      const t = Math.floor(rem / 10);
      const o = rem % 10;
      const res = [];
      if (h) res.push(hundreds[h]);
      if (t === 1) {
        res.push(teens[o]);
      } else {
        if (t) res.push(tens[t]);
        if (o) res.push(female ? onesFem[o] : ones[o]);
      }
      return res.join(' ');
    };

    const billions = Math.floor(n / 1000000000);
    const millions = Math.floor((n % 1000000000) / 1000000);
    const thousands = Math.floor((n % 1000000) / 1000);
    const units = n % 1000;

    const parts = [];
    if (billions) parts.push(`${triad(billions)} ${this.pluralize(billions, 'миллиард', 'миллиарда', 'миллиардов')}`);
    if (millions) parts.push(`${triad(millions)} ${this.pluralize(millions, 'миллион', 'миллиона', 'миллионов')}`);
    if (thousands) parts.push(`${triad(thousands, true)} ${this.pluralize(thousands, 'тысяча', 'тысячи', 'тысяч')}`);
    if (units) parts.push(triad(units, false));

    return parts.join(' ').trim();
  },

  spellEnglishNumber(n) {
    if (isNaN(n)) return '';
    if (n === 0) return 'zero';
    if (n < 0) return 'minus ' + this.spellEnglishNumber(Math.abs(n));
    const a = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    const inWords = (num) => {
      if (num < 20) return a[num];
      const digit = num % 10;
      if (num < 100) return b[Math.floor(num / 10)] + (digit ? '-' + a[digit] : '');
      if (num < 1000) return a[Math.floor(num / 100)] + ' hundred' + (num % 100 === 0 ? '' : ' and ' + inWords(num % 100));
      if (num < 1000000) return inWords(Math.floor(num / 1000)) + ' thousand' + (num % 1000 !== 0 ? ' ' + inWords(num % 1000) : '');
      if (num < 1000000000) return inWords(Math.floor(num / 1000000)) + ' million' + (num % 1000000 !== 0 ? ' ' + inWords(num % 1000000) : '');
      return inWords(Math.floor(num / 1000000000)) + ' billion' + (num % 1000000000 !== 0 ? ' ' + inWords(num % 1000000000) : '');
    };

    return inWords(n);
  }
};

if (typeof window !== 'undefined') window.OfficeTools = OfficeTools;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OfficeTools;
}
