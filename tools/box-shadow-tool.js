/**
 * OmniKit — CSS Box-Shadow Generator Engine & UI Module
 * Standalone, 100% Client-Side, Zero Server Computation.
 */

const BoxShadowTool = {
  layers: [],
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
   * 5-Language dictionary for BoxShadowTool
   */
  MSG: {
    en: {
      layer: 'Layer',
      active: 'Active',
      inset: 'Inset',
      dupLayer: 'Duplicate layer',
      delLayer: 'Remove layer',
      xOffset: 'Shift X',
      yOffset: 'Shift Y',
      blur: 'Blur',
      spread: 'Spread',
      color: 'Shadow Color',
      opacity: 'Opacity',
      cssCopied: 'CSS copied!',
      twCopied: 'Tailwind class copied!'
    },
    ru: {
      layer: 'Слой',
      active: 'Активен',
      inset: 'Внутр. (Inset)',
      dupLayer: 'Дублировать слой',
      delLayer: 'Удалить слой',
      xOffset: 'Смещение X',
      yOffset: 'Смещение Y',
      blur: 'Размытие (Blur)',
      spread: 'Размах (Spread)',
      color: 'Цвет тени',
      opacity: 'Прозрачность',
      cssCopied: 'CSS скопирован!',
      twCopied: 'Tailwind класс скопирован!'
    },
    fr: {
      layer: 'Calque',
      active: 'Actif',
      inset: 'Intérieur (Inset)',
      dupLayer: 'Dupliquer le calque',
      delLayer: 'Supprimer le calque',
      xOffset: 'Décalage X',
      yOffset: 'Décalage Y',
      blur: 'Flou (Blur)',
      spread: 'Étalement (Spread)',
      color: 'Couleur de l’ombre',
      opacity: 'Opacité',
      cssCopied: 'CSS copié !',
      twCopied: 'Classe Tailwind copiée !'
    },
    es: {
      layer: 'Capa',
      active: 'Activa',
      inset: 'Interior (Inset)',
      dupLayer: 'Duplicar capa',
      delLayer: 'Eliminar capa',
      xOffset: 'Desplazamiento X',
      yOffset: 'Desplazamiento Y',
      blur: 'Desenfoque (Blur)',
      spread: 'Propagación (Spread)',
      color: 'Color de sombra',
      opacity: 'Opacidad',
      cssCopied: '¡CSS copiado!',
      twCopied: '¡Clase Tailwind copiada!'
    },
    de: {
      layer: 'Ebene',
      active: 'Aktiv',
      inset: 'Innen (Inset)',
      dupLayer: 'Ebene duplizieren',
      delLayer: 'Ebene löschen',
      xOffset: 'Versatz X',
      yOffset: 'Versatz Y',
      blur: 'Weichzeichner (Blur)',
      spread: 'Ausbreitung (Spread)',
      color: 'Schattenfarbe',
      opacity: 'Deckkraft',
      cssCopied: 'CSS kopiert!',
      twCopied: 'Tailwind-Klasse kopiert!'
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

  presets: {
    soft: [
      { x: 0, y: 4, blur: 6, spread: -1, color: '#000000', alpha: 0.1, inset: false, active: true },
      { x: 0, y: 2, blur: 4, spread: -1, color: '#000000', alpha: 0.06, inset: false, active: true }
    ],
    medium: [
      { x: 0, y: 10, blur: 15, spread: -3, color: '#000000', alpha: 0.1, inset: false, active: true },
      { x: 0, y: 4, blur: 6, spread: -2, color: '#000000', alpha: 0.05, inset: false, active: true }
    ],
    float: [
      { x: 0, y: 20, blur: 25, spread: -5, color: '#000000', alpha: 0.15, inset: false, active: true },
      { x: 0, y: 10, blur: 10, spread: -5, color: '#000000', alpha: 0.04, inset: false, active: true }
    ],
    hard: [
      { x: 5, y: 5, blur: 0, spread: 0, color: '#000000', alpha: 1, inset: false, active: true }
    ],
    glow: [
      { x: 0, y: 0, blur: 20, spread: 2, color: '#3b82f6', alpha: 0.6, inset: false, active: true }
    ],
    inner: [
      { x: 0, y: 2, blur: 4, spread: 0, color: '#000000', alpha: 0.15, inset: true, active: true }
    ]
  },

  /**
   * Initialize module, apply default preset and bind listeners if in DOM
   */
  init() {
    if (this.layers.length === 0) {
      this.applyPreset('soft');
    }

    if (!this._langBound && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      this._langBound = true;
      window.addEventListener('languageChanged', () => {
        this.renderControls();
        this.renderPreview();
      });
    }

    if (typeof document === 'undefined') return;

    this.bindEvents();
    this.renderControls();
    this.renderPreview();
  },

  onLanguageChanged() {
    this.renderControls();
    this.renderPreview();
  },

  bindEvents() {
    if (this._bound) return;
    this._bound = true;

    // Add layer button
    const addBtn = document.getElementById('shadow-btn-add-layer') ||
                   document.getElementById('shadow-add-layer-btn') ||
                   document.getElementById('shadow-btn-add');
    if (addBtn && typeof addBtn.addEventListener === 'function') {
      addBtn.addEventListener('click', () => {
        this.addLayer();
      });
    }

    // Preset buttons
    const presetBtns = document.querySelectorAll ? document.querySelectorAll('[data-shadow-preset], #shadow-preset-soft, #shadow-preset-medium, #shadow-preset-float, #shadow-preset-hard, #shadow-preset-glow, #shadow-preset-inner') : [];
    presetBtns.forEach(btn => {
      if (typeof btn.addEventListener === 'function') {
        btn.addEventListener('click', () => {
          let presetName = btn.getAttribute ? btn.getAttribute('data-shadow-preset') : btn.dataset?.shadowPreset;
          if (!presetName && btn.id && btn.id.startsWith('shadow-preset-')) {
            presetName = btn.id.replace('shadow-preset-', '');
          }
          if (presetName) {
            this.applyPreset(presetName);
          }
        });
      }
    });

    // Copy CSS button
    const copyCssBtn = document.getElementById('shadow-btn-copy-css') ||
                       document.getElementById('shadow-copy-css-btn');
    if (copyCssBtn && typeof copyCssBtn.addEventListener === 'function') {
      copyCssBtn.addEventListener('click', () => {
        this.copyCss();
      });
    }

    // Copy Tailwind button
    const copyTwBtn = document.getElementById('shadow-btn-copy-tailwind') ||
                      document.getElementById('shadow-copy-tailwind-btn');
    if (copyTwBtn && typeof copyTwBtn.addEventListener === 'function') {
      copyTwBtn.addEventListener('click', () => {
        this.copyTailwind();
      });
    }

    // Canvas background color selector
    const canvasBgInput = document.getElementById('shadow-bg-color') ||
                          document.getElementById('shadow-canvas-bg');
    const previewCanvas = document.getElementById('shadow-preview-stage') ||
                          document.getElementById('shadow-preview-canvas') ||
                          document.querySelector?.('.shadow-preview-area');
    if (canvasBgInput && previewCanvas && typeof canvasBgInput.addEventListener === 'function') {
      canvasBgInput.addEventListener('input', (e) => {
        previewCanvas.style.backgroundColor = e.target.value;
      });
    }

    // Box background color selector
    const boxBgInput = document.getElementById('shadow-card-color') ||
                       document.getElementById('shadow-box-bg');
    const previewBox = document.getElementById('shadow-preview-box') ||
                       document.getElementById('shadow-preview-target');
    if (boxBgInput && previewBox && typeof boxBgInput.addEventListener === 'function') {
      boxBgInput.addEventListener('input', (e) => {
        previewBox.style.backgroundColor = e.target.value;
      });
    }

    // Border radius slider
    const radiusInput = document.getElementById('shadow-border-radius');
    if (radiusInput && previewBox && typeof radiusInput.addEventListener === 'function') {
      radiusInput.addEventListener('input', (e) => {
        previewBox.style.borderRadius = `${e.target.value}px`;
        const radiusVal = document.getElementById('shadow-val-border-radius');
        if (radiusVal) radiusVal.textContent = `${e.target.value}px`;
      });
    }

    // Dedicated sliders in #shadow-layer-controls
    const sliderX = document.getElementById('shadow-offset-x');
    const sliderY = document.getElementById('shadow-offset-y');
    const sliderBlur = document.getElementById('shadow-blur');
    const sliderSpread = document.getElementById('shadow-spread');
    const colorPicker = document.getElementById('shadow-color');
    const sliderOpacity = document.getElementById('shadow-opacity');
    const toggleInset = document.getElementById('shadow-inset');

    const getActive = () => this.layers[this.selectedLayerIndex || 0] || this.layers[0];

    if (typeof sliderX?.addEventListener === 'function') {
      sliderX.addEventListener('input', (e) => {
        const l = getActive();
        if (l) {
          const val = Number(e.target.value);
          this.updateLayer(l.id, 'x', val);
          const v = document.getElementById('shadow-val-offset-x');
          if (v) v.textContent = `${val}px`;
        }
      });
    }

    if (typeof sliderY?.addEventListener === 'function') {
      sliderY.addEventListener('input', (e) => {
        const l = getActive();
        if (l) {
          const val = Number(e.target.value);
          this.updateLayer(l.id, 'y', val);
          const v = document.getElementById('shadow-val-offset-y');
          if (v) v.textContent = `${val}px`;
        }
      });
    }

    if (typeof sliderBlur?.addEventListener === 'function') {
      sliderBlur.addEventListener('input', (e) => {
        const l = getActive();
        if (l) {
          const val = Math.max(0, Number(e.target.value));
          this.updateLayer(l.id, 'blur', val);
          const v = document.getElementById('shadow-val-blur');
          if (v) v.textContent = `${val}px`;
        }
      });
    }

    if (typeof sliderSpread?.addEventListener === 'function') {
      sliderSpread.addEventListener('input', (e) => {
        const l = getActive();
        if (l) {
          const val = Number(e.target.value);
          this.updateLayer(l.id, 'spread', val);
          const v = document.getElementById('shadow-val-spread');
          if (v) v.textContent = `${val}px`;
        }
      });
    }

    if (typeof colorPicker?.addEventListener === 'function') {
      colorPicker.addEventListener('input', (e) => {
        const l = getActive();
        if (l) {
          this.updateLayer(l.id, 'color', e.target.value);
          const v = document.getElementById('shadow-val-color');
          if (v) v.textContent = e.target.value;
        }
      });
    }

    if (typeof sliderOpacity?.addEventListener === 'function') {
      sliderOpacity.addEventListener('input', (e) => {
        const l = getActive();
        if (l) {
          const pct = Number(e.target.value);
          this.updateLayer(l.id, 'alpha', pct / 100);
          const v = document.getElementById('shadow-val-opacity');
          if (v) v.textContent = `${pct}%`;
        }
      });
    }

    if (typeof toggleInset?.addEventListener === 'function') {
      toggleInset.addEventListener('change', (e) => {
        const l = getActive();
        if (l) {
          this.updateLayer(l.id, 'inset', e.target.checked);
        }
      });
    }
  },

  /**
   * Helper to format hex/rgb/rgba into standard rgba(r, g, b, alpha)
   * @param {string} color
   * @param {number} [alpha]
   * @returns {string}
   */
  formatColor(color, alpha) {
    if (!color) color = '#000000';
    const a = (alpha !== undefined && alpha !== null) ? Number(alpha) : 1;
    const safeAlpha = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));

    color = String(color).trim();

    // If already rgba(...)
    if (color.startsWith('rgba(')) {
      const match = color.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
      if (match) {
        const finalAlpha = (alpha !== undefined && alpha !== null) ? safeAlpha : Number(match[4] || 1);
        return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${finalAlpha})`;
      }
    }

    // If rgb(...)
    if (color.startsWith('rgb(')) {
      const match = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
      if (match) {
        return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${safeAlpha})`;
      }
    }

    // Hex parsing
    if (color.startsWith('#')) {
      let hex = color.slice(1);
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      } else if (hex.length === 4) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      if (hex.length >= 6) {
        const r = parseInt(hex.substring(0, 2), 16) || 0;
        const g = parseInt(hex.substring(2, 4), 16) || 0;
        const b = parseInt(hex.substring(4, 6), 16) || 0;
        return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
      }
    }

    return color;
  },

  /**
   * Helper to convert any color into a 6-digit hex string for <input type="color">
   * @param {string} color
   * @returns {string}
   */
  toHexColor(color) {
    if (!color) return '#000000';
    color = String(color).trim();
    if (color.startsWith('#')) {
      if (color.length === 4) {
        return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
      }
      if (color.length >= 7) return color.slice(0, 7);
      return color;
    }
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const r = Number(rgbMatch[1]).toString(16).padStart(2, '0');
      const g = Number(rgbMatch[2]).toString(16).padStart(2, '0');
      const b = Number(rgbMatch[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    return '#000000';
  },

  /**
   * Add a new shadow layer
   * @param {Object} [props]
   * @returns {Object}
   */
  addLayer(props = {}) {
    const newLayer = {
      id: props.id || ('layer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)),
      x: props.x !== undefined ? Number(props.x) : 0,
      y: props.y !== undefined ? Number(props.y) : 4,
      blur: props.blur !== undefined ? Math.max(0, Number(props.blur)) : 6,
      spread: props.spread !== undefined ? Number(props.spread) : 0,
      color: props.color || '#000000',
      alpha: props.alpha !== undefined ? Number(props.alpha) : (props.opacity !== undefined ? Number(props.opacity) : 0.1),
      inset: Boolean(props.inset),
      active: props.active !== undefined ? Boolean(props.active) : true
    };
    this.layers.push(newLayer);
    if (typeof document !== 'undefined') {
      this.renderControls();
      this.renderPreview();
    }
    return newLayer;
  },

  /**
   * Remove a shadow layer by ID
   * @param {string} id
   * @returns {boolean}
   */
  removeLayer(id) {
    const idx = this.layers.findIndex(l => l && l.id === id);
    if (idx === -1) return false;
    this.layers.splice(idx, 1);
    if (typeof document !== 'undefined') {
      this.renderControls();
      this.renderPreview();
    }
    return true;
  },

  /**
   * Duplicate an existing shadow layer
   * @param {string} id
   * @returns {Object|null}
   */
  duplicateLayer(id) {
    const layer = this.layers.find(l => l && l.id === id);
    if (!layer) return null;
    const copyProps = {
      ...layer,
      id: 'layer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)
    };
    const idx = this.layers.indexOf(layer);
    this.layers.splice(idx + 1, 0, copyProps);
    if (typeof document !== 'undefined') {
      this.renderControls();
      this.renderPreview();
    }
    return copyProps;
  },

  /**
   * Update layer property or dictionary of properties
   * @param {string} id
   * @param {string|Object} keyOrProps
   * @param {*} [val]
   * @returns {Object|null}
   */
  updateLayer(id, keyOrProps, val) {
    const layer = this.layers.find(l => l && l.id === id);
    if (!layer) return null;

    if (typeof keyOrProps === 'object' && keyOrProps !== null) {
      for (const [k, v] of Object.entries(keyOrProps)) {
        this._setLayerProp(layer, k, v);
      }
    } else if (typeof keyOrProps === 'string') {
      this._setLayerProp(layer, keyOrProps, val);
    }

    if (typeof document !== 'undefined') {
      this.renderPreview();
    }
    return layer;
  },

  _setLayerProp(layer, key, val) {
    if (key === 'x' || key === 'y' || key === 'blur' || key === 'spread') {
      layer[key] = Number(val) || 0;
    } else if (key === 'alpha' || key === 'opacity') {
      const num = Number(val);
      layer.alpha = isNaN(num) ? 1 : Math.max(0, Math.min(1, num));
    } else if (key === 'inset' || key === 'active') {
      layer[key] = Boolean(val);
    } else if (key === 'color') {
      layer.color = String(val);
    } else {
      layer[key] = val;
    }
  },

  /**
   * Get all active layers
   * @returns {Array<Object>}
   */
  getActiveLayers() {
    return this.layers.filter(l => l && l.active);
  },

  /**
   * Format CSS box-shadow for a single layer
   * @param {Object} layer
   * @returns {string}
   */
  formatLayerCss(layer) {
    const parts = [];
    if (layer.inset) {
      parts.push('inset');
    }
    parts.push(`${layer.x || 0}px`);
    parts.push(`${layer.y || 0}px`);
    parts.push(`${layer.blur || 0}px`);
    if (layer.spread !== undefined && layer.spread !== null && Number(layer.spread) !== 0) {
      parts.push(`${layer.spread}px`);
    }
    parts.push(this.formatColor(layer.color, layer.alpha));
    return parts.join(' ');
  },

  /**
   * Format Tailwind class segment for a single layer
   * @param {Object} layer
   * @returns {string}
   */
  formatLayerTailwind(layer) {
    const parts = [];
    if (layer.inset) {
      parts.push('inset');
    }
    parts.push(`${layer.x || 0}px`);
    parts.push(`${layer.y || 0}px`);
    parts.push(`${layer.blur || 0}px`);
    if (layer.spread !== undefined && layer.spread !== null && Number(layer.spread) !== 0) {
      parts.push(`${layer.spread}px`);
    }
    const colorNoSpaces = this.formatColor(layer.color, layer.alpha).replace(/\s+/g, '');
    parts.push(colorNoSpaces);
    return parts.join('_');
  },

  /**
   * Generate CSS box-shadow string
   * @param {boolean} [fullDeclaration=false] If true, returns "box-shadow: ...;"
   * @returns {string}
   */
  generateCss(fullDeclaration = false) {
    const active = this.getActiveLayers();
    if (active.length === 0) {
      return fullDeclaration ? 'box-shadow: none;' : 'none';
    }
    const value = active.map(l => this.formatLayerCss(l)).join(', ');
    return fullDeclaration ? `box-shadow: ${value};` : value;
  },

  /**
   * Get CSS value string only (alias)
   * @returns {string}
   */
  generateCssValue() {
    return this.generateCss(false);
  },

  /**
   * Get full CSS rule declaration (alias)
   * @returns {string}
   */
  generateCssRule() {
    return this.generateCss(true);
  },

  /**
   * Generate Tailwind arbitrary class string
   * @returns {string}
   */
  generateTailwind() {
    const active = this.getActiveLayers();
    if (active.length === 0) {
      return 'shadow-none';
    }
    const parts = active.map(l => this.formatLayerTailwind(l));
    return `shadow-[${parts.join(',')}]`;
  },

  /**
   * Apply a preset configuration
   * @param {string} name
   * @returns {Array<Object>|false}
   */
  applyPreset(name) {
    if (!name || !this.presets[name]) return false;
    const presetLayers = this.presets[name];
    this.layers = presetLayers.map((l, idx) => ({
      ...l,
      id: 'layer_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substr(2, 5)
    }));
    if (typeof document !== 'undefined') {
      this.renderControls();
      this.renderPreview();
    }
    return this.layers;
  },

  /**
   * Update preview box styles and output code displays
   */
  renderPreview() {
    if (typeof document === 'undefined') return;

    const previewBox = document.getElementById('shadow-preview-box') ||
                       document.getElementById('shadow-preview-target') ||
                       document.querySelector('.shadow-preview-element');
    const cssValue = this.generateCss(false);
    const cssRule = this.generateCss(true);
    const twClass = this.generateTailwind();

    if (previewBox) {
      previewBox.style.boxShadow = cssValue;
    }

    const cssOutput = document.getElementById('shadow-css-output') ||
                      document.getElementById('shadow-output-css') ||
                      document.getElementById('shadow-css-code') ||
                      document.getElementById('shadow-css-val');
    if (cssOutput) {
      if (cssOutput.tagName === 'INPUT' || cssOutput.tagName === 'TEXTAREA') {
        cssOutput.value = cssRule;
      } else {
        cssOutput.textContent = cssRule;
      }
    }

    const twOutput = document.getElementById('shadow-tailwind-output') ||
                     document.getElementById('shadow-output-tailwind') ||
                      document.getElementById('shadow-tailwind-code') ||
                      document.getElementById('shadow-tailwind-val');
    if (twOutput) {
      if (twOutput.tagName === 'INPUT' || twOutput.tagName === 'TEXTAREA') {
        twOutput.value = twClass;
      } else {
        twOutput.textContent = twClass;
      }
    }
  },

  syncSliders() {
    if (typeof document === 'undefined') return;
    const l = this.layers[this.selectedLayerIndex || 0] || this.layers[0];
    if (!l) return;

    const sliderX = document.getElementById('shadow-offset-x');
    const sliderY = document.getElementById('shadow-offset-y');
    const sliderBlur = document.getElementById('shadow-blur');
    const sliderSpread = document.getElementById('shadow-spread');
    const colorPicker = document.getElementById('shadow-color');
    const sliderOpacity = document.getElementById('shadow-opacity');
    const toggleInset = document.getElementById('shadow-inset');

    if (sliderX) { sliderX.value = l.x; const v = document.getElementById('shadow-val-offset-x'); if (v) v.textContent = `${l.x}px`; }
    if (sliderY) { sliderY.value = l.y; const v = document.getElementById('shadow-val-offset-y'); if (v) v.textContent = `${l.y}px`; }
    if (sliderBlur) { sliderBlur.value = l.blur; const v = document.getElementById('shadow-val-blur'); if (v) v.textContent = `${l.blur}px`; }
    if (sliderSpread) { sliderSpread.value = l.spread; const v = document.getElementById('shadow-val-spread'); if (v) v.textContent = `${l.spread}px`; }
    if (colorPicker) { const hex = this.toHexColor(l.color); colorPicker.value = hex; const v = document.getElementById('shadow-val-color'); if (v) v.textContent = hex; }
    if (sliderOpacity) { const pct = Math.round((l.alpha !== undefined ? l.alpha : 1) * 100); sliderOpacity.value = pct; const v = document.getElementById('shadow-val-opacity'); if (v) v.textContent = `${pct}%`; }
    if (toggleInset) { toggleInset.checked = Boolean(l.inset); }
  },

  /**
   * Render dynamic controls for all layers in DOM
   */
  renderControls() {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('shadow-layers-container') ||
                      document.getElementById('shadow-layers-list');
    if (!container) return;

    container.innerHTML = '';

    this.layers.forEach((layer, index) => {
      const card = document.createElement('div');
      card.className = 'shadow-layer-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-3';
      card.dataset.layerId = layer.id;

      const hexColor = this.toHexColor(layer.color);
      const alphaPercent = Math.round((layer.alpha !== undefined ? layer.alpha : 1) * 100);

      card.innerHTML = `
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-sm text-slate-800 dark:text-slate-200">
              ${this.msg('layer')} #${index + 1}
            </span>
            <label class="inline-flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
              <input type="checkbox" class="layer-active-toggle rounded text-indigo-600 focus:ring-indigo-500" ${layer.active ? 'checked' : ''}>
              <span>${this.msg('active')}</span>
            </label>
            <label class="inline-flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer ml-2">
              <input type="checkbox" class="layer-inset-toggle rounded text-indigo-600 focus:ring-indigo-500" ${layer.inset ? 'checked' : ''}>
              <span>${this.msg('inset')}</span>
            </label>
          </div>
          <div class="flex items-center gap-1">
            <button type="button" class="layer-dup-btn p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="${this.msg('dupLayer')}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            </button>
            <button type="button" class="layer-del-btn p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors ${this.layers.length <= 1 ? 'opacity-40 cursor-not-allowed' : ''}" title="${this.msg('delLayer')}" ${this.layers.length <= 1 ? 'disabled' : ''}>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 text-xs">
          <!-- X Offset -->
          <div class="space-y-1">
            <div class="flex justify-between text-slate-500">
              <span>${this.msg('xOffset')}</span>
              <span class="font-mono text-slate-700 dark:text-slate-300 val-x">${layer.x}px</span>
            </div>
            <input type="range" min="-100" max="100" value="${layer.x}" class="slider-x w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer">
          </div>

          <!-- Y Offset -->
          <div class="space-y-1">
            <div class="flex justify-between text-slate-500">
              <span>${this.msg('yOffset')}</span>
              <span class="font-mono text-slate-700 dark:text-slate-300 val-y">${layer.y}px</span>
            </div>
            <input type="range" min="-100" max="100" value="${layer.y}" class="slider-y w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer">
          </div>

          <!-- Blur -->
          <div class="space-y-1">
            <div class="flex justify-between text-slate-500">
              <span>${this.msg('blur')}</span>
              <span class="font-mono text-slate-700 dark:text-slate-300 val-blur">${layer.blur}px</span>
            </div>
            <input type="range" min="0" max="100" value="${layer.blur}" class="slider-blur w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer">
          </div>

          <!-- Spread -->
          <div class="space-y-1">
            <div class="flex justify-between text-slate-500">
              <span>${this.msg('spread')}</span>
              <span class="font-mono text-slate-700 dark:text-slate-300 val-spread">${layer.spread}px</span>
            </div>
            <input type="range" min="-50" max="50" value="${layer.spread}" class="slider-spread w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 pt-1 text-xs">
          <!-- Color Picker -->
          <div class="space-y-1">
            <span class="text-slate-500">${this.msg('color')}</span>
            <div class="flex items-center gap-2">
              <input type="color" value="${hexColor}" class="color-picker h-8 w-12 rounded cursor-pointer border border-slate-300 dark:border-slate-700 bg-transparent p-0">
              <span class="font-mono text-xs text-slate-600 dark:text-slate-400 val-hex">${hexColor}</span>
            </div>
          </div>

          <!-- Opacity -->
          <div class="space-y-1">
            <div class="flex justify-between text-slate-500">
              <span>${this.msg('opacity')}</span>
              <span class="font-mono text-slate-700 dark:text-slate-300 val-opacity">${alphaPercent}%</span>
            </div>
            <input type="range" min="0" max="100" value="${alphaPercent}" class="slider-opacity w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer">
          </div>
        </div>
      `;

      // Event listeners for this card
      const toggleActive = card.querySelector('.layer-active-toggle');
      toggleActive?.addEventListener('change', (e) => {
        this.updateLayer(layer.id, 'active', e.target.checked);
      });

      const toggleInset = card.querySelector('.layer-inset-toggle');
      toggleInset?.addEventListener('change', (e) => {
        this.updateLayer(layer.id, 'inset', e.target.checked);
      });

      const dupBtn = card.querySelector('.layer-dup-btn');
      dupBtn?.addEventListener('click', () => {
        this.duplicateLayer(layer.id);
      });

      const delBtn = card.querySelector('.layer-del-btn');
      delBtn?.addEventListener('click', () => {
        if (this.layers.length > 1) {
          this.removeLayer(layer.id);
        }
      });

      // Range sliders
      const sliderX = card.querySelector('.slider-x');
      const valX = card.querySelector('.val-x');
      sliderX?.addEventListener('input', (e) => {
        const v = Number(e.target.value);
        if (valX) valX.textContent = `${v}px`;
        this.updateLayer(layer.id, 'x', v);
      });

      const sliderY = card.querySelector('.slider-y');
      const valY = card.querySelector('.val-y');
      sliderY?.addEventListener('input', (e) => {
        const v = Number(e.target.value);
        if (valY) valY.textContent = `${v}px`;
        this.updateLayer(layer.id, 'y', v);
      });

      const sliderBlur = card.querySelector('.slider-blur');
      const valBlur = card.querySelector('.val-blur');
      sliderBlur?.addEventListener('input', (e) => {
        const v = Number(e.target.value);
        if (valBlur) valBlur.textContent = `${v}px`;
        this.updateLayer(layer.id, 'blur', v);
      });

      const sliderSpread = card.querySelector('.slider-spread');
      const valSpread = card.querySelector('.val-spread');
      sliderSpread?.addEventListener('input', (e) => {
        const v = Number(e.target.value);
        if (valSpread) valSpread.textContent = `${v}px`;
        this.updateLayer(layer.id, 'spread', v);
      });

      // Color & Opacity
      const colorPicker = card.querySelector('.color-picker');
      const valHex = card.querySelector('.val-hex');
      colorPicker?.addEventListener('input', (e) => {
        const c = e.target.value;
        if (valHex) valHex.textContent = c;
        this.updateLayer(layer.id, 'color', c);
      });

      const sliderOpacity = card.querySelector('.slider-opacity');
      const valOpacity = card.querySelector('.val-opacity');
      sliderOpacity?.addEventListener('input', (e) => {
        const pct = Number(e.target.value);
        if (valOpacity) valOpacity.textContent = `${pct}%`;
        this.updateLayer(layer.id, 'alpha', pct / 100);
      });

      container.appendChild(card);
    });
    this.syncSliders();
  },

  /**
   * Copy CSS rule to clipboard with feedback
   * @returns {string}
   */
  copyCss() {
    const text = this.generateCss(true);
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast(this.msg('cssCopied'));
      }).catch(() => {});
    }
    return text;
  },

  /**
   * Copy Tailwind arbitrary class to clipboard with feedback
   * @returns {string}
   */
  copyTailwind() {
    const text = this.generateTailwind();
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast(this.msg('twCopied'));
      }).catch(() => {});
    }
    return text;
  },

  /**
   * Show toast feedback
   * @param {string} msg
   */
  showToast(msg) {
    if (typeof window === 'undefined') return;
    if (window.App && typeof window.App.showToast === 'function') {
      window.App.showToast(msg, 'success');
    } else if (window.TextTools && typeof window.TextTools.showToast === 'function') {
      window.TextTools.showToast(msg);
    } else if (typeof window.showToast === 'function') {
      window.showToast(msg);
    }
  }
};

if (typeof window !== 'undefined') {
  window.BoxShadowTool = BoxShadowTool;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => BoxShadowTool.init());
  } else {
    BoxShadowTool.init();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BoxShadowTool;
}
