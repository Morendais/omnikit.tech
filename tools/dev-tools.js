/**
 * Developer & Security Tools
 * Генератор паролей, WebCrypto хеширование, Base64 и валидатор JSON
 */

const DevTools = {
  init() {
    this.bindPasswordGenerator();
    this.bindHashGenerator();
    this.bindBase64Tool();
    this.bindJsonFormatter();
  },

  // --- 1. Password Generator ---
  bindPasswordGenerator() {
    const lenSlider = document.getElementById('pass-len');
    const lenVal = document.getElementById('pass-len-val');
    const resultInput = document.getElementById('pass-result');
    const genBtn = document.getElementById('pass-gen-btn');
    const copyBtn = document.getElementById('pass-copy-btn');
    const strengthBar = document.getElementById('pass-strength-bar');
    const strengthText = document.getElementById('pass-strength-text');

    if (!lenSlider || !resultInput) return;

    lenSlider.addEventListener('input', (e) => {
      lenVal.textContent = e.target.value;
      this.generatePassword();
    });

    ['pass-upper', 'pass-lower', 'pass-numbers', 'pass-symbols', 'pass-no-ambiguous'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => this.generatePassword());
    });

    genBtn?.addEventListener('click', () => this.generatePassword());
    copyBtn?.addEventListener('click', () => {
      if (!resultInput.value) return;
      navigator.clipboard.writeText(resultInput.value).then(() => {
        const isRu = (window.I18N?.currentLang || 'en') === 'ru';
        TextTools.showToast(isRu ? 'Пароль скопирован!' : 'Password copied to clipboard!');
      });
    });

    this.generatePassword();
  },

  generatePassword(customLen, customUpper, customLower, customNumbers, customSymbols) {
    const doc = typeof document !== 'undefined' ? document : null;
    const len = customLen || parseInt(doc?.getElementById('pass-len')?.value || '16', 10);
    const useUpper = customUpper !== undefined ? customUpper : (doc?.getElementById('pass-upper')?.checked ?? true);
    const useLower = customLower !== undefined ? customLower : (doc?.getElementById('pass-lower')?.checked ?? true);
    const useNumbers = customNumbers !== undefined ? customNumbers : (doc?.getElementById('pass-numbers')?.checked ?? true);
    const useSymbols = customSymbols !== undefined ? customSymbols : (doc?.getElementById('pass-symbols')?.checked ?? true);
    const noAmbiguous = doc?.getElementById('pass-no-ambiguous')?.checked ?? false;

    let chars = '';
    if (useUpper) chars += noAmbiguous ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useLower) chars += noAmbiguous ? 'abcdefghijkmnopqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
    if (useNumbers) chars += noAmbiguous ? '23456789' : '0123456789';
    if (useSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';

    // Cryptographically secure random values with unbiased rejection sampling
    const cryptoObj = (typeof window !== 'undefined' && window.crypto) || (typeof crypto !== 'undefined' ? crypto : null);
    if (!cryptoObj || !cryptoObj.getRandomValues) {
      throw new Error('Secure random unavailable');
    }
    const maxValid = Math.floor(0xffffffff / chars.length) * chars.length;
    let password = '';
    const temp = new Uint32Array(1);
    while (password.length < len) {
      cryptoObj.getRandomValues(temp);
      const val = temp[0];
      if (val < maxValid) {
        password += chars[val % chars.length];
      }
    }

    const input = document.getElementById('pass-result');
    if (input) input.value = password;

    if (doc) this.calcPasswordStrength(password, chars.length);
    return password;
  },

  calcPasswordStrength(password, poolSize) {
    const bar = document.getElementById('pass-strength-bar');
    const text = document.getElementById('pass-strength-text');
    if (!bar || !text) return;

    const entropy = Math.round(password.length * Math.log2(poolSize || 26));

    const isRu = (window.I18N?.currentLang || 'en') === 'ru';
    if (entropy < 40) {
      bar.style.width = '25%';
      bar.className = 'h-1 rounded bg-red-600 transition-all';
      text.textContent = isRu ? `Низкая энтропия (${entropy} бит)` : `Weak (${entropy} bits)`;
      text.className = 'text-xs font-mono text-red-500';
    } else if (entropy < 60) {
      bar.style.width = '50%';
      bar.className = 'h-1 rounded bg-amber-500 transition-all';
      text.textContent = isRu ? `Умеренная (${entropy} бит)` : `Moderate (${entropy} bits)`;
      text.className = 'text-xs font-mono text-amber-500';
    } else if (entropy < 80) {
      bar.style.width = '75%';
      bar.className = 'h-1 rounded bg-neutral-700 dark:bg-neutral-300 transition-all';
      text.textContent = isRu ? `Высокая (${entropy} бит)` : `Strong (${entropy} bits)`;
      text.className = 'text-xs font-mono text-neutral-700 dark:text-neutral-300';
    } else {
      bar.style.width = '100%';
      bar.className = 'h-1 rounded bg-neutral-900 dark:bg-neutral-100 transition-all';
      text.textContent = isRu ? `Криптостойкий (${entropy} бит)` : `Cryptographic (${entropy} bits)`;
      text.className = 'text-xs font-mono text-neutral-900 dark:text-neutral-100 font-medium';
    }
  },

  // --- 2. WebCrypto Hash Generator ---
  bindHashGenerator() {
    const input = document.getElementById('hash-input');
    if (!input) return;

    const compute = async () => {
      const text = input.value;
      if (!text) {
        ['sha256', 'sha512', 'sha1', 'md5'].forEach(id => {
          const el = document.getElementById(`hash-res-${id}`);
          if (el) el.value = '';
        });
        return;
      }

      const enc = new TextEncoder();
      const data = enc.encode(text);

      // SHA-256
      const buf256 = await crypto.subtle.digest('SHA-256', data);
      const el256 = document.getElementById('hash-res-sha256');
      if (el256) el256.value = this.bufferToHex(buf256);

      // SHA-512
      const buf512 = await crypto.subtle.digest('SHA-512', data);
      const el512 = document.getElementById('hash-res-sha512');
      if (el512) el512.value = this.bufferToHex(buf512);

      // SHA-1
      const buf1 = await crypto.subtle.digest('SHA-1', data);
      const el1 = document.getElementById('hash-res-sha1');
      if (el1) el1.value = this.bufferToHex(buf1);

      // Simple MD5 (client side simulation via cyrb53 or standard)
      const elMd5 = document.getElementById('hash-res-md5');
      if (elMd5) elMd5.value = this.fastMd5(text);
    };

    input.addEventListener('input', compute);

    // Copy buttons
    document.querySelectorAll('.copy-hash-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = e.currentTarget.dataset.target;
        const val = document.getElementById(targetId)?.value;
        if (val) {
          navigator.clipboard.writeText(val).then(() => {
            const isRu = (window.I18N?.currentLang || 'en') === 'ru';
            TextTools.showToast(isRu ? 'Хеш скопирован!' : 'Hash copied to clipboard!');
          });
        }
      });
    });
  },

  bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  fastMd5(string) {
    // Standard compact MD5 implementation
    function md5cycle(x, k) {
      var a = x[0], b = x[1], c = x[2], d = x[3];
      a = ff(a, b, c, d, k[0], 7, -680876936);
      d = ff(d, a, b, c, k[1], 12, -389564586);
      c = ff(c, d, a, b, k[2], 17, 606105819);
      b = ff(b, c, d, a, k[3], 22, -1044525330);
      a = ff(a, b, c, d, k[4], 7, -176418897);
      d = ff(d, a, b, c, k[5], 12, 1200080426);
      c = ff(c, d, a, b, k[6], 17, -1473231341);
      b = ff(b, c, d, a, k[7], 22, -45705983);
      a = ff(a, b, c, d, k[8], 7, 1770035416);
      d = ff(d, a, b, c, k[9], 12, -1958414417);
      c = ff(c, d, a, b, k[10], 17, -42063);
      b = ff(b, c, d, a, k[11], 22, -1990404162);
      a = ff(a, b, c, d, k[12], 7, 1804603682);
      d = ff(d, a, b, c, k[13], 12, -40341101);
      c = ff(c, d, a, b, k[14], 17, -1502002290);
      b = ff(b, c, d, a, k[15], 22, 1236535329);
      a = gg(a, b, c, d, k[1], 5, -165796510);
      d = gg(d, a, b, c, k[6], 9, -1069501632);
      c = gg(c, d, a, b, k[11], 14, 643717713);
      b = gg(b, c, d, a, k[0], 20, -373897302);
      a = gg(a, b, c, d, k[5], 5, -701558691);
      d = gg(d, a, b, c, k[10], 9, 38016083);
      c = gg(c, d, a, b, k[15], 14, -660478335);
      b = gg(b, c, d, a, k[4], 20, -405537848);
      a = gg(a, b, c, d, k[9], 5, 568446438);
      d = gg(d, a, b, c, k[14], 9, -1019803690);
      c = gg(c, d, a, b, k[3], 14, -187363961);
      b = gg(b, c, d, a, k[8], 20, 1163531501);
      a = gg(a, b, c, d, k[13], 5, -1444681467);
      d = gg(d, a, b, c, k[2], 9, -51403784);
      c = gg(c, d, a, b, k[7], 14, 1735328473);
      b = gg(b, c, d, a, k[12], 20, -1926607734);
      a = hh(a, b, c, d, k[5], 4, -378558);
      d = hh(d, a, b, c, k[8], 11, -2022574463);
      c = hh(c, d, a, b, k[11], 16, 1839030562);
      b = hh(b, c, d, a, k[14], 23, -35309556);
      a = hh(a, b, c, d, k[1], 4, -1530992060);
      d = hh(d, a, b, c, k[4], 11, 1272893353);
      c = hh(c, d, a, b, k[7], 16, -155497632);
      b = hh(b, c, d, a, k[10], 23, -1094730640);
      a = hh(a, b, c, d, k[13], 4, 681279174);
      d = hh(d, a, b, c, k[0], 11, -358537222);
      c = hh(c, d, a, b, k[3], 16, -722521979);
      b = hh(b, c, d, a, k[6], 23, 76029189);
      a = hh(a, b, c, d, k[9], 4, -640364487);
      d = hh(d, a, b, c, k[12], 11, -421815835);
      c = hh(c, d, a, b, k[15], 16, 530742520);
      b = hh(b, c, d, a, k[2], 23, -995338651);
      a = ii(a, b, c, d, k[0], 6, -198630844);
      d = ii(d, a, b, c, k[7], 10, 1126891415);
      c = ii(c, d, a, b, k[14], 15, -1416354905);
      b = ii(b, c, d, a, k[5], 21, -57434055);
      a = ii(a, b, c, d, k[12], 6, 1700485571);
      d = ii(d, a, b, c, k[3], 10, -1894986606);
      c = ii(c, d, a, b, k[10], 15, -1051523);
      b = ii(b, c, d, a, k[1], 21, -2054922799);
      a = ii(a, b, c, d, k[8], 6, 1873313359);
      d = ii(d, a, b, c, k[15], 10, -30611744);
      c = ii(c, d, a, b, k[6], 15, -1560198380);
      b = ii(b, c, d, a, k[13], 21, 1309151649);
      a = ii(a, b, c, d, k[4], 6, -145523070);
      d = ii(d, a, b, c, k[11], 10, -1120210379);
      c = ii(c, d, a, b, k[2], 15, 718787259);
      b = ii(b, c, d, a, k[9], 21, -343485551);
      x[0] = add32(a, x[0]); x[1] = add32(b, x[1]); x[2] = add32(c, x[2]); x[3] = add32(d, x[3]);
    }
    function cmn(q, a, b, x, s, t) { a = add32(add32(a, q), add32(x, t)); return add32((a << s) | (a >>> (32 - s)), b); }
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
    function add32(a, b) { return (a + b) & 0xFFFFFFFF; }
    function md5blk(s) {
      var nblk = ((s.length + 8) >> 6) + 1, blks = new Array(nblk * 16);
      for (var i = 0; i < nblk * 16; i++) blks[i] = 0;
      for (i = 0; i < s.length; i++) blks[i >> 2] |= s.charCodeAt(i) << ((i % 4) * 8);
      blks[i >> 2] |= 0x80 << ((i % 4) * 8);
      blks[nblk * 16 - 2] = s.length * 8;
      return blks;
    }
    var x = md5blk(unescape(encodeURIComponent(string)));
    var h = [1732584193, -271733879, -1732584194, 271733878];
    for (var i = 0; i < x.length; i += 16) {
      var old = h.slice(0);
      md5cycle(h, x.slice(i, i + 16));
    }
    var hex = '';
    for (var i = 0; i < 4; i++) {
      for (var j = 0; j < 4; j++) {
        hex += ((h[i] >> (j * 8)) & 0xFF).toString(16).padStart(2, '0');
      }
    }
    return hex;
  },

  // --- 3. Base64 Tool ---
  bindBase64Tool() {
    const input = document.getElementById('b64-input');
    const output = document.getElementById('b64-output');
    if (!input || !output) return;

    document.getElementById('b64-encode-btn')?.addEventListener('click', () => {
      try {
        output.value = btoa(unescape(encodeURIComponent(input.value)));
      } catch (e) {
        const isRu = (window.I18N?.currentLang || 'en') === 'ru';
        alert(isRu ? 'Ошибка кодирования в Base64' : 'Error encoding to Base64');
      }
    });

    document.getElementById('b64-decode-btn')?.addEventListener('click', () => {
      try {
        output.value = decodeURIComponent(escape(atob(input.value.trim())));
      } catch (e) {
        const isRu = (window.I18N?.currentLang || 'en') === 'ru';
        alert(isRu ? 'Некорректная строка Base64' : 'Invalid Base64 string');
      }
    });

    document.getElementById('b64-copy-btn')?.addEventListener('click', () => {
      if (!output.value) return;
      navigator.clipboard.writeText(output.value).then(() => {
        const isRu = (window.I18N?.currentLang || 'en') === 'ru';
        TextTools.showToast(isRu ? 'Результат скопирован!' : 'Result copied to clipboard!');
      });
    });
  },

  // --- 4. JSON Formatter & Validator ---
  bindJsonFormatter() {
    const input = document.getElementById('json-input');
    const status = document.getElementById('json-status');
    if (!input) return;

    document.getElementById('json-format-btn')?.addEventListener('click', () => {
      if (!input.value.trim()) return;
      const isRu = (window.I18N?.currentLang || 'en') === 'ru';
      try {
        const parsed = JSON.parse(input.value);
        input.value = JSON.stringify(parsed, null, 2);
        status.innerHTML = `<span class="text-xs font-mono px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">${isRu ? '2 пробела' : '2 spaces'}</span>`;
      } catch (e) {
        const safeSpan = document.createElement('span');
        safeSpan.className = 'text-xs font-mono px-2 py-0.5 rounded border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400';
        safeSpan.textContent = e.message;
        status.innerHTML = '';
        status.appendChild(safeSpan);
      }
    });

    document.getElementById('json-minify-btn')?.addEventListener('click', () => {
      if (!input.value.trim()) return;
      const isRu = (window.I18N?.currentLang || 'en') === 'ru';
      try {
        const parsed = JSON.parse(input.value);
        input.value = JSON.stringify(parsed);
        status.innerHTML = `<span class="text-xs font-mono px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">${isRu ? '1 строка' : 'Minified'}</span>`;
      } catch (e) {
        const safeSpan = document.createElement('span');
        safeSpan.className = 'text-xs font-mono px-2 py-0.5 rounded border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400';
        safeSpan.textContent = e.message;
        status.innerHTML = '';
        status.appendChild(safeSpan);
      }
    });

    document.getElementById('json-copy-btn')?.addEventListener('click', () => {
      if (!input.value) return;
      const isRu = (window.I18N?.currentLang || 'en') === 'ru';
      navigator.clipboard.writeText(input.value).then(() => {
        TextTools.showToast(isRu ? 'JSON скопирован!' : 'JSON copied to clipboard!');
      });
    });
  }
};

if (typeof window !== 'undefined') window.DevTools = DevTools;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DevTools;
}
