/**
 * Utility Extended Tools (100% Client-Side)
 * 1. Transliteration, Slugify & Keyboard Layout Fixer (lj,fdbnm -> добавить)
 * 2. Table Data Converter (CSV <-> JSON)
 * 3. Color Studio (HEX, RGB, HSL + EyeDropper API)
 * 4. JWT Decoder & Unix Timestamp
 */

const UtilityExtended = {
  init() {
    this.bindTranslitAndLayout();
    this.bindTableConverter();
    this.bindColorStudio();
    this.bindJwtAndTimestamp();
  },

  // --- 1. Keyboard Layout Fixer, Translit & Slugify ---
  bindTranslitAndLayout() {
    const input = document.getElementById('translit-input');
    const output = document.getElementById('translit-output');
    if (!input || !output) return;

    // QWERTY <-> ЙЦУКЕН mapping
    const enToRuMap = {
      'q':'й','w':'ц','e':'у','r':'к','t':'е','y':'н','u':'г','i':'ш','o':'щ','p':'з','[':'х',']':'ъ',
      'a':'ф','s':'ы','d':'в','f':'а','g':'п','h':'р','j':'о','k':'л','l':'д',';':'ж','\'':'э',
      'z':'я','x':'ч','c':'с','v':'м','b':'и','n':'т','m':'ь',',':'б','.':'ю','/':'.',
      'Q':'Й','W':'Ц','E':'У','R':'К','T':'Е','Y':'Н','U':'Г','I':'Ш','O':'Щ','P':'З','{':'Х','}':'Ъ',
      'A':'Ф','S':'Ы','D':'В','F':'А','G':'П','H':'Р','J':'О','K':'Л','L':'Д',':':'Ж','"':'Э',
      'Z':'Я','X':'Ч','C':'С','V':'М','B':'И','N':'Т','M':'Ь','<':'Б','>':'Ю','?':','
    };

    const ruToEnMap = {};
    for (const [k, v] of Object.entries(enToRuMap)) {
      ruToEnMap[v] = k;
    }

    // Fix layout button
    document.getElementById('btn-fix-layout')?.addEventListener('click', () => {
      const text = input.value;
      let res = '';
      for (const char of text) {
        if (enToRuMap[char]) res += enToRuMap[char];
        else if (ruToEnMap[char]) res += ruToEnMap[char];
        else res += char;
      }
      output.value = res;
    });

    // Transliteration (GOST 7.79)
    document.getElementById('btn-translit')?.addEventListener('click', () => {
      output.value = this.transliterate(input.value);
    });

    // Slugify for URL
    document.getElementById('btn-slugify')?.addEventListener('click', () => {
      output.value = this.slugify(input.value);
    });

    document.getElementById('btn-translit-copy')?.addEventListener('click', () => {
      if (output.value) {
        navigator.clipboard.writeText(output.value).then(() => {
          const isRu = (window.I18N?.currentLang || 'en') === 'ru';
          if (window.TextTools) TextTools.showToast(isRu ? 'Скопировано!' : 'Copied to clipboard!');
        });
      }
    });
  },

  transliterate(text) {
    if (!text) return '';
    const ruToLat = {
      'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i','й':'y',
      'к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f',
      'х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
      'А':'A','Б':'B','В':'V','Г':'G','Д':'D','Е':'E','Ё':'Yo','Ж':'Zh','З':'Z','И':'I','Й':'Y',
      'К':'K','Л':'L','М':'M','Н':'N','О':'O','П':'P','Р':'R','С':'S','Т':'T','У':'U','Ф':'F',
      'Х':'Kh','Ц':'Ts','Ч':'Ch','Ш':'Sh','Щ':'Shch','Ъ':'','Ы':'Y','Ь':'','Э':'E','Ю':'Yu','Я':'Ya'
    };
    let res = '';
    for (const char of text) {
      res += ruToLat[char] !== undefined ? ruToLat[char] : char;
    }
    return res;
  },

  slugify(text) {
    if (!text) return '';
    return this.transliterate(text.toLowerCase().trim())
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  },

  // --- 2. Table Data Converter (CSV <-> JSON) ---
  bindTableConverter() {
    const input = document.getElementById('table-input');
    const output = document.getElementById('table-output');
    if (!input || !output) return;

    // CSV to JSON
    document.getElementById('btn-csv-to-json')?.addEventListener('click', () => {
      try {
        const text = input.value.trim();
        if (!text) return;
        output.value = this.csvToJson(text);
      } catch (err) {
        const isRu = (window.I18N?.currentLang || 'en') === 'ru';
        alert((isRu ? 'Ошибка парсинга CSV: ' : 'CSV parsing error: ') + err.message);
      }
    });

    // JSON to CSV
    document.getElementById('btn-json-to-csv')?.addEventListener('click', () => {
      try {
        const text = input.value.trim();
        if (!text) return;
        output.value = this.jsonToCsv(text);
      } catch (err) {
        const isRu = (window.I18N?.currentLang || 'en') === 'ru';
        alert((isRu ? 'Ошибка конвертации: ' : 'Conversion error: ') + err.message);
      }
    });

    document.getElementById('btn-table-copy')?.addEventListener('click', () => {
      if (output.value) {
        navigator.clipboard.writeText(output.value).then(() => {
          const isRu = (window.I18N?.currentLang || 'en') === 'ru';
          if (window.TextTools) TextTools.showToast(isRu ? 'Скопировано!' : 'Copied to clipboard!');
        });
      }
    });
  },

  parseCsv(csv) {
    if (!csv || !csv.trim()) return [];
    
    // Auto-detect delimiter from the first line (ignoring characters in quotes)
    const firstLine = csv.split(/\r?\n/)[0] || '';
    let inQuote = false;
    let commaCount = 0, semiCount = 0, tabCount = 0;
    for (let i = 0; i < firstLine.length; i++) {
      const char = firstLine[i];
      if (char === '"') inQuote = !inQuote;
      else if (!inQuote) {
        if (char === ',') commaCount++;
        else if (char === ';') semiCount++;
        else if (char === '\t') tabCount++;
      }
    }
    const delimiter = (semiCount > commaCount && semiCount > tabCount) ? ';' :
                      (tabCount > commaCount && tabCount > semiCount) ? '\t' : ',';

    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;
    let i = 0;

    while (i < csv.length) {
      const char = csv[i];
      const nextChar = csv[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped quote: "" -> "
          currentCell += '"';
          i += 2;
          continue;
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
          i++;
          continue;
        }
      }

      if (!insideQuotes) {
        if (char === delimiter) {
          currentRow.push(currentCell.trim());
          currentCell = '';
          i++;
          continue;
        } else if (char === '\r') {
          if (nextChar === '\n') i++;
          currentRow.push(currentCell.trim());
          if (currentRow.some(c => c !== '')) rows.push(currentRow);
          currentRow = [];
          currentCell = '';
          i++;
          continue;
        } else if (char === '\n') {
          currentRow.push(currentCell.trim());
          if (currentRow.some(c => c !== '')) rows.push(currentRow);
          currentRow = [];
          currentCell = '';
          i++;
          continue;
        }
      }

      currentCell += char;
      i++;
    }

    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c !== '')) rows.push(currentRow);
    }

    return rows;
  },

  csvToJson(csv) {
    if (!csv || !csv.trim()) return '[]';
    const rows = this.parseCsv(csv);
    if (rows.length < 2) return '[]';

    const headers = rows[0];
    const result = [];
    for (let r = 1; r < rows.length; r++) {
      const rowData = rows[r];
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = rowData[idx] !== undefined ? rowData[idx] : '';
      });
      result.push(obj);
    }
    return JSON.stringify(result, null, 2);
  },

  jsonToCsv(jsonStr) {
    if (!jsonStr || !jsonStr.trim()) return '';
    const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    if (!Array.isArray(parsed) || parsed.length === 0) return '';
    const headers = [...new Set(parsed.flatMap(row => (typeof row === 'object' && row !== null) ? Object.keys(row) : []))];
    let csv = headers.map(h => (h.includes(',') || h.includes('"') || h.includes('\n')) ? `"${h.replace(/"/g, '""')}"` : h).join(',') + '\n';
    parsed.forEach(row => {
      if (typeof row !== 'object' || row === null) return;
      const values = headers.map(h => {
        const v = row[h] !== undefined && row[h] !== null ? String(row[h]) : '';
        return (v.includes(',') || v.includes('"') || v.includes('\n')) ? `"${v.replace(/"/g, '""')}"` : v;
      });
      csv += values.join(',') + '\n';
    });
    return csv;
  },

  // --- 3. Color Studio (HEX, RGB, HSL + EyeDropper) ---
  hslToHex(h, s, l) {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  },

  hexToHsl(hex) {
    if (!hex.startsWith('#')) hex = '#' + hex;
    if (hex.length === 4) {
      hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  },

  bindColorStudio() {
    const hexInput = document.getElementById('color-hex');
    const rgbInput = document.getElementById('color-rgb');
    const hslInput = document.getElementById('color-hsl');
    const colorPicker = document.getElementById('color-picker-native');
    const previewBox = document.getElementById('color-preview-box');
    const eyeBtn = document.getElementById('color-eyedropper-btn');
    const activeHexLabel = document.getElementById('cs-active-hex');
    const activeRgbPreview = document.getElementById('cs-active-rgb-preview');
    const sliderHue = document.getElementById('cs-slider-hue');
    const sliderLight = document.getElementById('cs-slider-lightness');
    const valHue = document.getElementById('cs-hue-val');
    const valLight = document.getElementById('cs-light-val');

    if (!hexInput) return;

    const updateFromHex = (hex, updateSliders = true) => {
      if (!hex.startsWith('#')) hex = '#' + hex;
      if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) return;

      if (hex.length === 4) {
        hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
      }

      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);

      const upperHex = hex.toUpperCase();
      if (hexInput.value !== upperHex) hexInput.value = upperHex;
      if (rgbInput) rgbInput.value = `rgb(${r}, ${g}, ${b})`;
      if (activeHexLabel) activeHexLabel.textContent = upperHex;
      if (activeRgbPreview) activeRgbPreview.textContent = `rgb(${r}, ${g}, ${b})`;

      const hsl = this.hexToHsl(upperHex);
      if (hslInput) hslInput.value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
      if (colorPicker && colorPicker.value !== upperHex.toLowerCase()) colorPicker.value = upperHex.toLowerCase();
      if (previewBox) previewBox.style.backgroundColor = upperHex;

      if (updateSliders && sliderHue && sliderLight) {
        sliderHue.value = hsl.h;
        sliderLight.value = hsl.l;
        if (valHue) valHue.textContent = `${hsl.h}°`;
        if (valLight) valLight.textContent = `${hsl.l}%`;
        sliderLight.style.background = `linear-gradient(to right, #000000 0%, hsl(${hsl.h}, 100%, 50%) 50%, #ffffff 100%)`;
      }
    };

    const updateFromSliders = () => {
      const h = parseInt(sliderHue?.value || '239', 10);
      const l = parseInt(sliderLight?.value || '66', 10);
      if (valHue) valHue.textContent = `${h}°`;
      if (valLight) valLight.textContent = `${l}%`;

      if (sliderLight) {
        sliderLight.style.background = `linear-gradient(to right, #000000 0%, hsl(${h}, 100%, 50%) 50%, #ffffff 100%)`;
      }

      const hex = this.hslToHex(h, 100, l);
      updateFromHex(hex, false);
    };

    sliderHue?.addEventListener('input', updateFromSliders);
    sliderLight?.addEventListener('input', updateFromSliders);

    // Preset Swatches
    document.querySelectorAll('.cs-color-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        const c = sw.getAttribute('data-color');
        if (c) updateFromHex(c, true);
      });
    });

    hexInput.addEventListener('input', (e) => updateFromHex(e.target.value, true));
    colorPicker?.addEventListener('input', (e) => updateFromHex(e.target.value, true));

    // Copy buttons
    const bindCopy = (btnId, inputEl) => {
      document.getElementById(btnId)?.addEventListener('click', () => {
        if (inputEl?.value) {
          navigator.clipboard.writeText(inputEl.value).then(() => {
            const isRu = (window.I18N?.currentLang || 'en') === 'ru';
            if (window.TextTools) TextTools.showToast(isRu ? 'Цвет скопирован в буфер!' : 'Color copied to clipboard!');
          });
        }
      });
    };
    bindCopy('cs-copy-hex', hexInput);
    bindCopy('cs-copy-rgb', rgbInput);
    bindCopy('cs-copy-hsl', hslInput);

    // EyeDropper API (Screen color picker)
    if ('EyeDropper' in window && eyeBtn) {
      eyeBtn.addEventListener('click', async () => {
        try {
          const eyeDropper = new EyeDropper();
          const result = await eyeDropper.open();
          updateFromHex(result.sRGBHex, true);
        } catch (e) {
          console.warn('EyeDropper cancelled or unsupported');
        }
      });
    } else if (eyeBtn) {
      eyeBtn.classList.add('hidden');
    }

    updateFromHex('#6366F1', true);
  },

  // --- 4. JWT Decoder & Unix Timestamp ---
  bindJwtAndTimestamp() {
    // JWT Decoder
    const jwtInput = document.getElementById('jwt-input');
    const jwtHeader = document.getElementById('jwt-header');
    const jwtPayload = document.getElementById('jwt-payload');
    const jwtStatus = document.getElementById('jwt-status');

    if (jwtInput) {
      jwtInput.addEventListener('input', () => {
        const token = jwtInput.value.trim();
        if (!token) {
          jwtHeader.value = '';
          jwtPayload.value = '';
          jwtStatus.innerHTML = '';
          return;
        }

        try {
          const isRu = (window.I18N?.currentLang || 'en') === 'ru';
          const decoded = this.decodeJwt(token);
          if (!decoded) throw new Error(isRu ? 'Некорректный формат токена (должно быть 3 части через точку)' : 'Invalid JWT token format (must have 3 parts separated by dots)');

          jwtHeader.value = JSON.stringify(decoded.header, null, 2);
          jwtPayload.value = JSON.stringify(decoded.payload, null, 2);

          // Check expiration if 'exp' claim is present
          if (decoded.payload && decoded.payload.exp) {
            const expDate = new Date(decoded.payload.exp * 1000);
            const isExpired = Date.now() > expDate.getTime();
            const expText = isRu 
              ? (isExpired ? 'Срок действия истек: ' : 'Активен до: ') 
              : (isExpired ? 'Expired: ' : 'Valid until: ');
            jwtStatus.innerHTML = `
              <span class="text-xs font-mono px-2 py-0.5 rounded border ${isExpired ? 'border-red-500/30 bg-red-500/10 text-red-500' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'}">
                ${expText} ${expDate.toLocaleString()}
              </span>
            `;
          } else {
            jwtStatus.innerHTML = `<span class="text-xs font-mono text-neutral-500">${isRu ? 'Поле exp (срок действия) отсутствует' : 'No exp (expiration) claim found'}</span>`;
          }
        } catch (err) {
          jwtHeader.value = '';
          jwtPayload.value = '';
          const isRu = (window.I18N?.currentLang || 'en') === 'ru';
          const safeSpan = document.createElement('span');
          safeSpan.className = 'text-xs font-mono text-red-500';
          safeSpan.textContent = (isRu ? 'Ошибка: ' : 'Error: ') + err.message;
          jwtStatus.innerHTML = '';
          jwtStatus.appendChild(safeSpan);
        }
      });
    }

    // Unix Timestamp Converter
    const epochInput = document.getElementById('timestamp-input');
    const epochResult = document.getElementById('timestamp-result');
    const currentEpoch = document.getElementById('current-epoch-val');

    if (epochInput) {
      const updateEpoch = () => {
        const val = parseInt(epochInput.value, 10);
        if (isNaN(val)) {
          epochResult.textContent = '—';
          return;
        }
        // Detect seconds vs milliseconds
        const isRu = (window.I18N?.currentLang || 'en') === 'ru';
        const date = val > 9999999999 ? new Date(val) : new Date(val * 1000);
        epochResult.textContent = isRu 
          ? `Локальное: ${date.toLocaleString()} • UTC: ${date.toUTCString()}`
          : `Local: ${date.toLocaleString()} • UTC: ${date.toUTCString()}`;
      };

      epochInput.addEventListener('input', updateEpoch);
      epochInput.value = Math.floor(Date.now() / 1000);
      updateEpoch();

      // Current live epoch clock with lifecycle check
      if (currentEpoch) {
        if (this._epochTimer) clearInterval(this._epochTimer);
        this._epochTimer = setInterval(() => {
          if (!document.body.contains(currentEpoch)) {
            clearInterval(this._epochTimer);
            this._epochTimer = null;
            return;
          }
          currentEpoch.textContent = Math.floor(Date.now() / 1000);
        }, 1000);
      }

      document.getElementById('btn-set-current-epoch')?.addEventListener('click', () => {
        epochInput.value = Math.floor(Date.now() / 1000);
        updateEpoch();
      });
    }
  },

  decodeJwt(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.trim().split('.');
    if (parts.length !== 3) return null;
    try {
      const b64decode = (str) => {
        let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
        b64 = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=');
        return decodeURIComponent(escape(atob(b64)));
      };
      return {
        header: JSON.parse(b64decode(parts[0])),
        payload: JSON.parse(b64decode(parts[1]))
      };
    } catch (e) {
      return null;
    }
  }
};

if (typeof window !== 'undefined') window.UtilityExtended = UtilityExtended;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UtilityExtended;
}
