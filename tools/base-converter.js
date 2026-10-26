/**
 * OmniKit — Number Base Converter
 * Top: instant two-base conversion (2–36, fractions, BigInt-exact).
 * Bottom: calculator with operands in any bases (+ − × ÷ AND OR XOR).
 * 100% client-side.
 */
const BaseConverter = {
  DIGITS: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  NAMED: { 2: 'BIN', 8: 'OCT', 10: 'DEC', 16: 'HEX' },

  // UI strings for the five site languages
  MSG: {
    en: { expand: 'Expand to decimal: ', division: 'Division with remainder (from {d}): ', rem: 'rem.', base: 'base', same: 'Same base — the number stays the same.', divzero: 'Division by zero', bits: 'Bitwise ops need non-negative numbers', invalid: 'Invalid digit for the selected base' },
    ru: { expand: 'Разложение в десятичную: ', division: 'Деление с остатком (из {d}): ', rem: 'ост.', base: 'основание', same: 'Основания совпадают — число не меняется.', divzero: 'Деление на ноль', bits: 'Побитовые операции — только для неотрицательных чисел', invalid: 'Недопустимая цифра для выбранной системы счисления' },
    fr: { expand: 'Développement en décimal : ', division: 'Division avec reste (de {d}) : ', rem: 'rest.', base: 'base', same: "Mêmes bases — le nombre ne change pas.", divzero: 'Division par zéro', bits: 'Opérations binaires : nombres non négatifs uniquement', invalid: 'Chiffre invalide pour la base choisie' },
    es: { expand: 'Desarrollo a decimal: ', division: 'División con resto (de {d}): ', rem: 'resto', base: 'base', same: 'Misma base: el número no cambia.', divzero: 'División por cero', bits: 'Las operaciones bit a bit requieren números no negativos', invalid: 'Dígito no válido para la base elegida' },
    de: { expand: 'Entfaltung zur Dezimalzahl: ', division: 'Division mit Rest (von {d}): ', rem: 'Rest', base: 'Basis', same: 'Gleiche Basen — die Zahl bleibt gleich.', divzero: 'Division durch null', bits: 'Bitoperationen nur mit nichtnegativen Zahlen', invalid: 'Ungültige Ziffer für die gewählte Basis' },
  },

  msg(key, vars) {
    const m = (this.MSG[window.I18N?.currentLang || 'en'] || this.MSG.en);
    let v = m[key] || this.MSG.en[key] || key;
    if (vars) for (const [k, val] of Object.entries(vars)) v = v.split('{' + k + '}').join(val);
    return v;
  },

  updateOpLabels() {
    const sel = document.getElementById('bc-op');
    if (!sel) return;
    const l = window.I18N?.currentLang || 'en';
    const dict = (window.I18N?.translations && window.I18N.translations[l]) ||
                 (window.I18N_LOCALES && window.I18N_LOCALES[l] && window.I18N_LOCALES[l].dict) || {};
    const fallback = (window.I18N?.translations && window.I18N.translations.en) || {};
    const t = (k, fb) => dict[k] || fallback[k] || fb;
    const map = {
      add: t('bc_op_add', '+  Addition'),
      sub: t('bc_op_sub', '−  Subtraction'),
      mul: t('bc_op_mul', '×  Multiplication'),
      div: t('bc_op_div', '÷  Division'),
      and: t('bc_op_and', 'AND  (bitwise)'),
      or: t('bc_op_or', 'OR  (bitwise)'),
      xor: t('bc_op_xor', 'XOR  (bitwise)'),
    };
    for (const opt of sel.options) {
      if (map[opt.value]) opt.textContent = map[opt.value];
    }
  },

  onLanguageChanged() {
    this.updateOpLabels();
    this.convert();
    this.calculate();
  },

  init() {
    this.fillBaseSelect('bc-from-base', 10);
    this.fillBaseSelect('bc-to-base', 16);
    this.fillBaseSelect('bc-ca-base', 2);
    this.fillBaseSelect('bc-cb-base', 16);
    this.fillBaseSelect('bc-cres-base', 10);

    if (!this._bound) {
      this._bound = true;

      // --- converter ---
      const num = document.getElementById('bc-num-input');
      const from = document.getElementById('bc-from-base');
      const to = document.getElementById('bc-to-base');
      const swap = document.getElementById('bc-swap');
      [num, from, to].forEach((el) => {
        el?.addEventListener('input', () => this.convert());
        el?.addEventListener('change', () => this.convert());
      });
      swap?.addEventListener('click', () => {
        if (from && to) {
          const f = from.value;
          from.value = to.value;
          to.value = f;
        }
        // Carry the previous result into the input so "swap" = continue converting.
        const out = document.getElementById('bc-out');
        if (num && out && /^[0-9A-Za-z.]+$/.test(out.textContent)) num.value = out.textContent;
        this.convert();
      });

      // --- calculator ---
      ['bc-ca', 'bc-cb', 'bc-ca-base', 'bc-cb-base', 'bc-op', 'bc-cres-base'].forEach((id) => {
        const el = document.getElementById(id);
        el?.addEventListener('input', () => this.calculate());
        el?.addEventListener('change', () => this.calculate());
      });

      window.addEventListener('languageChanged', () => this.onLanguageChanged());
    }

    this.updateOpLabels();
    this.convert();
    this.calculate();
  },

  el(key) { return document.getElementById('bc-' + key + '-input'); },

  t(key, ru, en) {
    if (window.I18N && typeof window.I18N.t === 'function') {
      const v = window.I18N.t(key);
      if (v && v !== key) return v;
    }
    return ((window.I18N?.currentLang || 'en') === 'ru') ? ru : en;
  },

  fillBaseSelect(id, selected) {
    const el = document.getElementById(id);
    if (!el || el.options.length) return;
    let html = '';
    for (let b = 2; b <= 36; b++) {
      const label = this.NAMED[b] ? `${b} — ${this.NAMED[b]}` : String(b);
      html += `<option value="${b}"${b === selected ? ' selected' : ''}>${label}</option>`;
    }
    el.innerHTML = html;
  },

  showError(msg) {
    const err = document.getElementById('bc-error');
    if (!err) return;
    if (!msg) { err.classList.add('hidden'); err.textContent = ''; return; }
    err.textContent = msg;
    err.classList.remove('hidden');
  },

  // ---------- parsing / formatting ----------
  parseValue(str, base) {
    let s = String(str || '').trim().replace(/[\s_\u00A0\u202F]/g, '');
    if (!s) return { int: 0n, frac: 0, fracLen: 0, empty: true };
    const neg = s.startsWith('-');
    if (neg || s.startsWith('+')) s = s.slice(1);

    // Strip common programming base prefixes if matching
    if (base === 16 && /^0x/i.test(s)) s = s.slice(2);
    else if (base === 2 && /^0b/i.test(s)) s = s.slice(2);
    else if (base === 8 && /^0o/i.test(s)) s = s.slice(2);

    if (!s) return null;

    const parts = s.split('.');
    if (parts.length > 2) return null;
    const [ipRaw, fpRaw = ''] = parts;
    const digits = this.DIGITS.slice(0, base);
    const upperIp = ipRaw.toUpperCase();
    const upperFp = fpRaw.toUpperCase();
    for (const ch of upperIp + upperFp) {
      if (!digits.includes(ch)) return null;
    }
    let int = 0n;
    const B = BigInt(base);
    for (const ch of upperIp) {
      int = int * B + BigInt(digits.indexOf(ch));
    }
    let frac = 0;
    if (upperFp) {
      let scale = 1;
      for (const ch of upperFp) {
        scale /= base;
        frac += digits.indexOf(ch) * scale;
      }
    }
    if (neg) int = -int;
    return { int, frac: neg ? -frac : frac, fracLen: upperFp.length };
  },

  bigToBase(v, base) {
    if (v === 0n) return '0';
    const neg = v < 0n;
    let n = neg ? -v : v;
    const B = BigInt(base);
    let out = '';
    while (n > 0n) {
      out = this.DIGITS[Number(n % B)] + out;
      n /= B;
    }
    return (neg ? '-' : '') + out;
  },

  fracToBase(frac, base, maxDigits = 12) {
    if (!frac || frac <= 0) return '';
    let out = '';
    let f = frac;
    for (let i = 0; i < maxDigits && f > 1e-12; i++) {
      f *= base;
      const d = Math.floor(f);
      out += this.DIGITS[d];
      f -= d;
    }
    return out.replace(/0+$/, '');
  },

  format(value, base) {
    const ip = this.bigToBase(value.int, base);
    const fp = this.fracToBase(Math.abs(value.frac), base);
    return fp ? ip + '.' + fp : ip;
  },

  // ---------- converter ----------
  convert() {
    const numEl = document.getElementById('bc-num-input');
    const out = document.getElementById('bc-out');
    const stepsEl = document.getElementById('bc-steps');
    if (!numEl || !out) return;

    const raw = numEl.value.trim();
    if (!raw) {
      out.textContent = '—';
      this.showError('');
      if (stepsEl) stepsEl.innerHTML = '';
      return;
    }

    const from = parseInt(document.getElementById('bc-from-base')?.value, 10) || 10;
    const to = parseInt(document.getElementById('bc-to-base')?.value, 10) || 10;

    const parsed = this.parseValue(raw, from);
    if (parsed === null) {
      out.textContent = '—';
      numEl.classList.add('bc-invalid');
      this.showError(this.msg("invalid"));
      if (stepsEl) stepsEl.innerHTML = '';
      return;
    }
    numEl.classList.remove('bc-invalid');
    this.showError('');
    out.textContent = this.format(parsed, to);
    if (stepsEl) this.renderSteps(parsed, raw, from, to);
  },

  renderSteps(value, raw, from, to) {
    const box = document.getElementById('bc-steps');
    if (!box) return;
    const rows = [];
    const dec = value.int < 0n ? -value.int : value.int;

    if (from !== 10) {
      let clean = String(raw || '').trim().replace(/^[-+]/, '').replace(/[\s_\u00A0\u202F]/g, '');
      if (from === 16 && /^0x/i.test(clean)) clean = clean.slice(2);
      else if (from === 2 && /^0b/i.test(clean)) clean = clean.slice(2);
      else if (from === 8 && /^0o/i.test(clean)) clean = clean.slice(2);
      const digitsOnly = (clean.split('.')[0] || '0').toUpperCase();
      const parts = [];
      const B = BigInt(from);
      for (let i = 0; i < Math.min(digitsOnly.length, 12); i++) {
        const d = this.DIGITS.indexOf(digitsOnly[i]);
        if (d <= 0) continue;
        const p = BigInt(digitsOnly.length - 1 - i);
        const termVal = BigInt(d) * (B ** p);
        parts.push(p === 0n ? `${d}` : `${digitsOnly[i]}·${from}^${p} = ${termVal}`);
      }
      rows.push(this.msg('expand') + (parts.join(' + ') || '0') + ` = ${dec}`);
    }

    if (to !== 10) {
      const B = BigInt(to);
      const divisions = [];
      let v = dec;
      while (v > 0n && divisions.length < 12) {
        const r = v % B;
        divisions.push(`${v} ÷ ${to} = ${v / B} ${this.msg('rem')} ${this.DIGITS[Number(r)]}`);
        v /= B;
      }
      const target = this.bigToBase(dec, to);
      if (divisions.length) {
        rows.push(this.msg('division', { d: dec }) + divisions.join(' → ') + ` ⇒ ${target} (${this.msg('base')} ${to})`);
      } else {
        rows.push(`${dec} = ${target} (${this.msg('base')} ${to})`);
      }
    }

    if (!rows.length) rows.push(this.msg('same'));
    box.innerHTML = rows.map((r) => `<div class="font-mono break-all leading-relaxed">${r}</div>`).join('');
  },

  // ---------- calculator ----------
  calculate() {
    const aEl = document.getElementById('bc-ca');
    const bEl = document.getElementById('bc-cb');
    const out = document.getElementById('bc-cres-out');
    const subEl = document.getElementById('bc-cres-sub');
    if (!aEl || !bEl || !out) return;

    const baseA = parseInt(document.getElementById('bc-ca-base')?.value, 10) || 10;
    const baseB = parseInt(document.getElementById('bc-cb-base')?.value, 10) || 10;
    const baseR = parseInt(document.getElementById('bc-cres-base')?.value, 10) || 10;
    const op = document.getElementById('bc-op')?.value || 'add';

    const A = this.parseValue(aEl.value, baseA);
    const B = this.parseValue(bEl.value, baseB);
    const invalid = (el) => {
      el.classList.add('bc-invalid');
      out.textContent = '—';
      if (subEl) subEl.textContent = '';
      this.showError(this.msg("invalid"));
    };
    if (A === null) return invalid(aEl);
    if (B === null) return invalid(bEl);
    aEl.classList.remove('bc-invalid');
    bEl.classList.remove('bc-invalid');

    const a = A.int;
    const b = B.int;
    let res = 0n;
    let rem = null;
    let errKey = null;

    switch (op) {
      case 'add': res = a + b; break;
      case 'sub': res = a - b; break;
      case 'mul': res = a * b; break;
      case 'div':
        if (b === 0n) { errKey = ['divzero']; break; }
        res = a / b;
        rem = a % b;
        break;
      case 'and': case 'or': case 'xor':
        if (a < 0n || b < 0n) { errKey = ['bits']; break; }
        res = op === 'and' ? a & b : (op === 'or' ? a | b : a ^ b);
        break;
    }

    if (errKey) {
      this.showError(this.msg(errKey[0]));
      out.textContent = '—';
      if (subEl) subEl.textContent = '';
      return;
    }
    this.showError('');

    out.textContent = this.bigToBase(res, baseR);
    if (subEl) {
      const decNote = `${res}` + (rem !== null ? (rem !== 0n ? ` ${this.msg('rem')} ${rem}` : '') : '');
      subEl.textContent = `= ${decNote}₁₀`;
    }
  }
};

if (typeof window !== 'undefined') {
  window.BaseConverter = BaseConverter;
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tool-view-base-converter')) BaseConverter.init();
  });
}
if (typeof module !== 'undefined') module.exports = BaseConverter;
