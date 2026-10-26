/**
 * OmniKit — Unit Converter
 * Metric ↔ imperial: length, mass, temperature, area, volume, speed, time, data.
 * Fully localized (EN/RU/FR/ES/DE), instant two-unit conversion, 100% client-side.
 */
const UnitConverter = {
  LOCALE_TAG: { en: 'en-US', ru: 'ru-RU', fr: 'fr-FR', es: 'es-ES', de: 'de-DE' },

  // factor = value in the category base unit (temperature uses formulas instead)
  CATS: [
    {
      id: 'len', names: { ru: 'Длина', en: 'Length', fr: 'Longueur', es: 'Longitud', de: 'Länge' },
      defaults: ['km', 'mi'],
      units: [
        ['mm', 'mm', { ru: 'миллиметр', en: 'millimeter', fr: 'millimètre', es: 'milímetro', de: 'Millimeter' }, 0.001],
        ['cm', 'cm', { ru: 'сантиметр', en: 'centimeter', fr: 'centimètre', es: 'centímetro', de: 'Zentimeter' }, 0.01],
        ['m', 'm', { ru: 'метр', en: 'meter', fr: 'mètre', es: 'metro', de: 'Meter' }, 1],
        ['km', 'km', { ru: 'километр', en: 'kilometer', fr: 'kilomètre', es: 'kilómetro', de: 'Kilometer' }, 1000],
        ['in', 'in', { ru: 'дюйм', en: 'inch', fr: 'pouce', es: 'pulgada', de: 'Zoll' }, 0.0254],
        ['ft', 'ft', { ru: 'фут', en: 'foot', fr: 'pied', es: 'pie', de: 'Fuß' }, 0.3048],
        ['yd', 'yd', { ru: 'ярд', en: 'yard', fr: 'yard', es: 'yarda', de: 'Yard' }, 0.9144],
        ['mi', 'mi', { ru: 'миля', en: 'mile', fr: 'mile', es: 'milla', de: 'Meile' }, 1609.344],
        ['nmi', 'nmi', { ru: 'морская миля', en: 'nautical mile', fr: 'mille marin', es: 'milla náutica', de: 'Seemeile' }, 1852],
      ],
    },
    {
      id: 'mass', names: { ru: 'Масса', en: 'Weight', fr: 'Poids', es: 'Peso', de: 'Gewicht' },
      defaults: ['kg', 'lb'],
      units: [
        ['mg', 'mg', { ru: 'миллиграмм', en: 'milligram', fr: 'milligramme', es: 'miligramo', de: 'Milligramm' }, 1e-6],
        ['g', 'g', { ru: 'грамм', en: 'gram', fr: 'gramme', es: 'gramo', de: 'Gramm' }, 0.001],
        ['kg', 'kg', { ru: 'килограмм', en: 'kilogram', fr: 'kilogramme', es: 'kilogramo', de: 'Kilogramm' }, 1],
        ['t', 't', { ru: 'тонна', en: 'tonne', fr: 'tonne', es: 'tonelada', de: 'Tonne' }, 1000],
        ['lb', 'lb', { ru: 'фунт', en: 'pound', fr: 'livre', es: 'libra', de: 'Pfund' }, 0.45359237],
        ['oz', 'oz', { ru: 'унция', en: 'ounce', fr: 'once', es: 'onza', de: 'Unze' }, 0.028349523125],
        ['st', 'st', { ru: 'стоун', en: 'stone', fr: 'stone', es: 'stone', de: 'Stone' }, 6.35029318],
      ],
    },
    {
      id: 'temp', names: { ru: 'Температура', en: 'Temperature', fr: 'Température', es: 'Temperatura', de: 'Temperatur' },
      defaults: ['c', 'f'],
      units: [
        ['c', '°C', { ru: 'Цельсий', en: 'Celsius', fr: 'Celsius', es: 'Celsius', de: 'Celsius' }, 1],
        ['f', '°F', { ru: 'Фаренгейт', en: 'Fahrenheit', fr: 'Fahrenheit', es: 'Fahrenheit', de: 'Fahrenheit' }, 1],
        ['k', 'K', { ru: 'Кельвин', en: 'Kelvin', fr: 'Kelvin', es: 'Kelvin', de: 'Kelvin' }, 1],
      ],
    },
    {
      id: 'area', names: { ru: 'Площадь', en: 'Area', fr: 'Surface', es: 'Área', de: 'Fläche' },
      defaults: ['m2', 'ft2'],
      units: [
        ['cm2', 'cm²', { ru: 'квадратный сантиметр', en: 'square centimeter', fr: 'centimètre carré', es: 'centímetro cuadrado', de: 'Quadratzentimeter' }, 0.0001],
        ['m2', 'm²', { ru: 'квадратный метр', en: 'square meter', fr: 'mètre carré', es: 'metro cuadrado', de: 'Quadratmeter' }, 1],
        ['ha', 'ha', { ru: 'гектар', en: 'hectare', fr: 'hectare', es: 'hectárea', de: 'Hektar' }, 10000],
        ['km2', 'km²', { ru: 'квадратный километр', en: 'square kilometer', fr: 'kilomètre carré', es: 'kilómetro cuadrado', de: 'Quadratkilometer' }, 1e6],
        ['ft2', 'ft²', { ru: 'квадратный фут', en: 'square foot', fr: 'pied carré', es: 'pie cuadrado', de: 'Quadratfuß' }, 0.09290304],
        ['ac', 'ac', { ru: 'акр', en: 'acre', fr: 'acre', es: 'acre', de: 'Acre' }, 4046.8564224],
        ['mi2', 'mi²', { ru: 'квадратная миля', en: 'square mile', fr: 'mile carré', es: 'milla cuadrada', de: 'Quadratmeile' }, 2589988.110336],
      ],
    },
    {
      id: 'vol', names: { ru: 'Объём', en: 'Volume', fr: 'Volume', es: 'Volumen', de: 'Volumen' },
      defaults: ['l', 'gal'],
      units: [
        ['ml', 'ml', { ru: 'миллилитр', en: 'milliliter', fr: 'millilitre', es: 'mililitro', de: 'Milliliter' }, 0.001],
        ['l', 'l', { ru: 'литр', en: 'liter', fr: 'litre', es: 'litro', de: 'Liter' }, 1],
        ['m3', 'm³', { ru: 'кубический метр', en: 'cubic meter', fr: 'mètre cube', es: 'metro cúbico', de: 'Kubikmeter' }, 1000],
        ['pt', 'pt', { ru: 'пинта (US)', en: 'pint (US)', fr: 'pinte (US)', es: 'pinta (EE. UU.)', de: 'Pint (US)' }, 0.473176473],
        ['gal', 'gal', { ru: 'галлон (US)', en: 'gallon (US)', fr: 'gallon (US)', es: 'galón (EE. UU.)', de: 'Gallone (US)' }, 3.785411784],
        ['bbl', 'bbl', { ru: 'баррель нефти', en: 'oil barrel', fr: 'baril de pétrole', es: 'barril de petróleo', de: 'Ölfass' }, 158.987294928],
      ],
    },
    {
      id: 'speed', names: { ru: 'Скорость', en: 'Speed', fr: 'Vitesse', es: 'Velocidad', de: 'Geschwindigkeit' },
      defaults: ['kmh', 'mph'],
      units: [
        ['ms', 'm/s', { ru: 'метр в секунду', en: 'meter per second', fr: 'mètre par seconde', es: 'metro por segundo', de: 'Meter pro Sekunde' }, 1],
        ['kmh', 'km/h', { ru: 'километр в час', en: 'kilometer per hour', fr: 'kilomètre par heure', es: 'kilómetro por hora', de: 'Kilometer pro Stunde' }, 1 / 3.6],
        ['mph', 'mph', { ru: 'миля в час', en: 'mile per hour', fr: 'mile par heure', es: 'milla por hora', de: 'Meile pro Stunde' }, 0.44704],
        ['kn', 'kn', { ru: 'узел', en: 'knot', fr: 'nœud', es: 'nudo', de: 'Knoten' }, 1852 / 3600],
        ['fts', 'ft/s', { ru: 'фут в секунду', en: 'foot per second', fr: 'pied par seconde', es: 'pie por segundo', de: 'Fuß pro Sekunde' }, 0.3048],
      ],
    },
    {
      id: 'time', names: { ru: 'Время', en: 'Time', fr: 'Temps', es: 'Tiempo', de: 'Zeit' },
      defaults: ['h', 'min'],
      units: [
        ['ms', 'ms', { ru: 'миллисекунда', en: 'millisecond', fr: 'milliseconde', es: 'milisegundo', de: 'Millisekunde' }, 0.001],
        ['s', 's', { ru: 'секунда', en: 'second', fr: 'seconde', es: 'segundo', de: 'Sekunde' }, 1],
        ['min', 'min', { ru: 'минута', en: 'minute', fr: 'minute', es: 'minuto', de: 'Minute' }, 60],
        ['h', 'h', { ru: 'час', en: 'hour', fr: 'heure', es: 'hora', de: 'Stunde' }, 3600],
        ['d', 'd', { ru: 'сутки', en: 'day', fr: 'jour', es: 'día', de: 'Tag' }, 86400],
        ['wk', 'wk', { ru: 'неделя', en: 'week', fr: 'semaine', es: 'semana', de: 'Woche' }, 604800],
        ['mo', 'mo', { ru: 'месяц (30 дней)', en: 'month (30 days)', fr: 'mois (30 jours)', es: 'mes (30 días)', de: 'Monat (30 Tage)' }, 2592000],
        ['yr', 'yr', { ru: 'год (365 дней)', en: 'year (365 days)', fr: 'an (365 jours)', es: 'año (365 días)', de: 'Jahr (365 Tage)' }, 31536000],
      ],
    },
    {
      id: 'data', names: { ru: 'Данные', en: 'Data', fr: 'Données', es: 'Datos', de: 'Daten' },
      defaults: ['MB', 'GB'],
      units: [
        ['bit', 'bit', { ru: 'бит', en: 'bit', fr: 'bit', es: 'bit', de: 'Bit' }, 0.125],
        ['B', 'B', { ru: 'байт', en: 'byte', fr: 'octet', es: 'byte', de: 'Byte' }, 1],
        ['KB', 'KB', { ru: 'килобайт', en: 'kilobyte', fr: 'kilooctet', es: 'kilobyte', de: 'Kilobyte' }, 1024],
        ['MB', 'MB', { ru: 'мегабайт', en: 'megabyte', fr: 'mégaoctet', es: 'megabyte', de: 'Megabyte' }, 1048576],
        ['GB', 'GB', { ru: 'гигабайт', en: 'gigabyte', fr: 'gigaoctet', es: 'gigabyte', de: 'Gigabyte' }, 1073741824],
        ['TB', 'TB', { ru: 'терабайт', en: 'terabyte', fr: 'teraoctet', es: 'terabyte', de: 'Terabyte' }, 1099511627776],
      ],
    },
  ],

  cat: 'len',

  init() {
    this.buildTabs();
    this.buildSelects(null);
    if (!this._bound) {
      this._bound = true;
      ['uc-from', 'uc-to'].forEach((id) => {
        const el = document.getElementById(id);
        el?.addEventListener('change', () => this.convert());
      });
      const val = document.getElementById('uc-value');
      val?.addEventListener('input', () => this.convert());
      document.getElementById('uc-swap')?.addEventListener('click', () => {
        const f = document.getElementById('uc-from');
        const t = document.getElementById('uc-to');
        if (f && t) {
          const v = f.value;
          f.value = t.value;
          t.value = v;
        }
        // Carry the exact result into the input (not the rounded display text)
        // so swapping back and forth never accumulates rounding drift.
        if (val && this.lastResult !== undefined && isFinite(this.lastResult)) {
          val.value = String(this.lastResult);
          this.convert();
        }
      });
      // Live relabel when the user switches site language without a reload
      window.addEventListener('languageChanged', () => this.rebuildLabels());
    }
    this.setCat(this.cat || 'len', false);
  },

  lang() {
    const l = window.I18N?.currentLang || 'en';
    return this.LOCALE_TAG[l] ? l : 'en';
  },

  buildTabs() {
    const tabs = document.getElementById('uc-cats');
    if (!tabs) return;
    const l = this.lang();
    tabs.textContent = '';
    for (const c of this.CATS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.cat = c.id;
      b.className = 'uc-cat px-3 py-1.5 rounded-full text-xs font-bold border transition';
      b.textContent = c.names[l] || c.names.en;
      b.addEventListener('click', () => this.setCat(c.id));
      tabs.appendChild(b);
    }
  },

  buildSelects(keep) {
    const cat = this.CATS.find((c) => c.id === this.cat) || this.CATS[0];
    const l = this.lang();
    for (const selId of ['uc-from', 'uc-to']) {
      const sel = document.getElementById(selId);
      if (!sel) continue;
      const prev = keep ? sel.value : null;
      sel.textContent = '';
      for (const [uid, sym, names] of cat.units) {
        const o = document.createElement('option');
        o.value = uid;
        o.textContent = `${sym} — ${names[l] || names.en}`;
        sel.appendChild(o);
      }
      if (prev && cat.units.some((u) => u[0] === prev)) sel.value = prev;
    }
  },

  rebuildLabels() {
    this.buildTabs();
    this.buildSelects(true);
    this.markActiveCat();
    this.convert();
  },

  markActiveCat() {
    document.querySelectorAll('.uc-cat').forEach((b) => {
      const active = b.dataset.cat === this.cat;
      b.className = 'uc-cat px-3 py-1.5 rounded-full text-xs font-bold border transition ' + (active
        ? 'bg-indigo-600 border-indigo-600 text-white'
        : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:border-indigo-400');
    });
  },

  setCat(id, keepUnits) {
    const cat = this.CATS.find((c) => c.id === id) || this.CATS[0];
    this.cat = cat.id;
    this.buildSelects(!keepUnits ? false : true);
    if (!keepUnits) {
      const [f, t] = cat.defaults;
      const fe = document.getElementById('uc-from');
      const te = document.getElementById('uc-to');
      if (fe) fe.value = f;
      if (te) te.value = t;
    }
    this.markActiveCat();
    this.convert();
  },

  toBase(cat, uid, v) {
    if (cat.id !== 'temp') {
      const u = cat.units.find((x) => x[0] === uid);
      return v * u[3];
    }
    if (uid === 'c') return v;
    if (uid === 'f') return (v - 32) * 5 / 9;
    return v - 273.15;
  },
  fromBase(cat, uid, v) {
    if (cat.id !== 'temp') {
      const u = cat.units.find((x) => x[0] === uid);
      return v / u[3];
    }
    if (uid === 'c') return v;
    if (uid === 'f') return v * 9 / 5 + 32;
    return v + 273.15;
  },

  fmt(n) {
    if (!isFinite(n)) return '—';
    if (n === 0) return '0';
    const abs = Math.abs(n);
    const tag = this.LOCALE_TAG[this.lang()] || 'en-US';
    if (abs >= 1e15 || abs < 1e-9) return n.toExponential(6).replace(/\.?0+e/, 'e');
    if (abs >= 1000) return n.toLocaleString(tag, { maximumFractionDigits: 6 }).replace(/[\u00A0\u202F\s]/g, ' ');
    return String(parseFloat(n.toPrecision(10)));
  },

  convert() {
    const valEl = document.getElementById('uc-value');
    const out = document.getElementById('uc-out');
    const rate = document.getElementById('uc-rate');
    if (!valEl || !out) return;
    const cat = this.CATS.find((c) => c.id === this.cat);
    const from = document.getElementById('uc-from').value;
    const to = document.getElementById('uc-to').value;

    const raw = valEl.value.trim().replace(/[\s\u00A0\u202F]/g, '').replace(',', '.');
    if (raw === '') {
      out.textContent = '—';
      if (rate) rate.textContent = '';
      valEl.classList.remove('uc-invalid');
      return;
    }
    const v = Number(raw);
    if (isNaN(v) || raw.length > 30) {
      valEl.classList.add('uc-invalid');
      out.textContent = '—';
      if (rate) rate.textContent = '';
      return;
    }
    valEl.classList.remove('uc-invalid');

    const result = this.fromBase(cat, to, this.toBase(cat, from, v));
    this.lastResult = result;
    out.textContent = this.fmt(result);

    if (rate) {
      const one = this.fromBase(cat, to, this.toBase(cat, from, 1));
      const fSym = cat.units.find((x) => x[0] === from)[1];
      const tSym = cat.units.find((x) => x[0] === to)[1];
      rate.textContent = `1 ${fSym} = ${this.fmt(one)} ${tSym}`;
    }
  },
};

if (typeof window !== 'undefined') {
  window.UnitConverter = UnitConverter;
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tool-view-unit-converter')) UnitConverter.init();
  });
}
if (typeof module !== 'undefined') module.exports = UnitConverter;
