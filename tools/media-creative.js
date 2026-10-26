/**
 * OmniKit Creative Media Tools
 * 1. Professional Watermark Studio (Multi-layer, Draggable, Dual-Slider HSL Color Picker, Fonts, Outline, Logos)
 * 2. SVG Optimizer & SVG to PNG Converter
 */

const MediaCreative = {
  watermarkImage: null,
  watermarkLayers: [],
  activeLayerId: null,
  layerCounter: 0,

  // Dragging State
  isDraggingLayer: false,
  dragStartMouseX: 0,
  dragStartMouseY: 0,
  dragStartLayerX: 0,
  dragStartLayerY: 0,

  init() {
    this.bindWatermark();
    this.bindSvgTool();
    window.addEventListener('languageChanged', () => {
      if (this.watermarkImage) this.updateLayersUI();
    });
  },

  t(ru, en) {
    const lang = (window.I18N && window.I18N.currentLang) || (window.I18n && window.I18n.currentLang) || 'en';
    return lang === 'en' ? en : ru;
  },

  escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // Color helper: HSL to Hex
  hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  },

  // ========================================================
  // --- 1. Watermark Studio (Multi-layer & Interactive) ---
  // ========================================================
  bindWatermark() {
    const input = document.getElementById('wm-image-input');
    const dropzone = document.getElementById('wm-dropzone');
    const controls = document.getElementById('wm-controls');
    const canvas = document.getElementById('wm-canvas');
    const downloadBtn = document.getElementById('wm-download');
    const resetBtn = document.getElementById('wm-reset');

    const addTextBtn = document.getElementById('wm-add-text-btn');
    const logoInput = document.getElementById('wm-logo-input');

    if (!input || !dropzone || !canvas) return;

    const handleBaseImage = (file) => {
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.watermarkImage = img;
          controls?.classList.remove('hidden');
          dropzone?.classList.add('hidden');

          if (this.watermarkLayers.length === 0) {
            this.addTextLayer('OmniKit.tech');
          } else {
            this.renderWatermark();
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    };

    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', (e) => e.preventDefault());
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer?.files?.length) handleBaseImage(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', (e) => {
      if (e.target.files?.length) handleBaseImage(e.target.files[0]);
    });

    addTextBtn?.addEventListener('click', () => this.addTextLayer('OmniKit.tech'));

    logoInput?.addEventListener('change', (e) => {
      if (e.target.files?.length) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (evt) => {
          const img = new Image();
          img.onload = () => {
            this.addImageLayer(img, file.name);
          };
          img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      }
    });

    resetBtn?.addEventListener('click', () => {
      this.watermarkImage = null;
      this.watermarkLayers = [];
      this.activeLayerId = null;
      controls?.classList.add('hidden');
      dropzone?.classList.remove('hidden');
      input.value = '';
    });

    downloadBtn?.addEventListener('click', () => {
      const savedActive = this.activeLayerId;
      this.activeLayerId = null;
      this.renderWatermark();

      canvas.toBlob((blob) => {
        this.activeLayerId = savedActive;
        this.renderWatermark();

        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'watermarked-image.png';
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    });

    this.bindCanvasInteractions(canvas);
  },

  addTextLayer(initialText = 'OmniKit.tech') {
    if (!this.watermarkImage) return;
    const canvas = document.getElementById('wm-canvas');
    const w = canvas?.width || 1000;
    const h = canvas?.height || 800;

    const baseFontSize = Math.max(20, Math.round((w / 1000) * 44));

    const layer = {
      id: ++this.layerCounter,
      type: 'text',
      text: initialText,
      fontSize: baseFontSize,
      fontFamily: 'sans-serif', // 'sans-serif' | 'serif' | 'monospace' | 'Impact' | 'cursive'
      isBold: true,
      isItalic: false,
      isAllCaps: false,
      hue: 0,
      lightness: 100, // starts white (h:0, s:100, l:100)
      color: '#ffffff',
      opacity: 0.75,
      hasOutline: true,
      outlineColor: '#000000',
      hasBox: false,
      boxColor: '#000000',
      boxOpacity: 0.5,
      hasShadow: true,
      rotation: 0,
      repeat: false,
      x: Math.round(w * 0.55),
      y: Math.round(h * 0.85),
      w: 220,
      h: baseFontSize
    };

    this.watermarkLayers.push(layer);
    this.activeLayerId = layer.id;
    this.updateLayersUI();
    this.renderWatermark();
  },

  addImageLayer(img, name) {
    if (!this.watermarkImage) return;
    const canvas = document.getElementById('wm-canvas');
    const w = canvas?.width || 1000;
    const h = canvas?.height || 800;

    const maxSide = Math.round(Math.min(w, h) * 0.22);
    const aspect = img.naturalWidth / img.naturalHeight;
    let lw = maxSide;
    let lh = maxSide / aspect;
    if (aspect < 1) {
      lh = maxSide;
      lw = maxSide * aspect;
    }

    const defaultName = this.t('Логотип', 'Logo');
    const layer = {
      id: ++this.layerCounter,
      type: 'image',
      img: img,
      name: name || defaultName,
      opacity: 0.85,
      rotation: 0,
      scale: 1.0,
      x: w - lw - 40,
      y: h - lh - 40,
      w: lw,
      h: lh
    };

    this.watermarkLayers.push(layer);
    this.activeLayerId = layer.id;
    this.updateLayersUI();
    this.renderWatermark();
  },

  bindCanvasInteractions(canvas) {
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const onDown = (e) => {
      if (!this.watermarkImage) return;
      const pos = getPos(e);

      // Hit-test in reverse order (topmost layer first)
      let hitLayer = null;
      for (let i = this.watermarkLayers.length - 1; i >= 0; i--) {
        const l = this.watermarkLayers[i];
        if (l.repeat) continue;

        const left = l.x - 12;
        const top = l.y - (l.type === 'text' ? l.h : 0) - 12;
        const right = left + l.w + 24;
        const bottom = top + l.h + 24;

        if (pos.x >= left && pos.x <= right && pos.y >= top && pos.y <= bottom) {
          hitLayer = l;
          break;
        }
      }

      if (hitLayer) {
        this.activeLayerId = hitLayer.id;
        this.isDraggingLayer = true;
        this.dragStartMouseX = pos.x;
        this.dragStartMouseY = pos.y;
        this.dragStartLayerX = hitLayer.x;
        this.dragStartLayerY = hitLayer.y;
        this.updateLayersUI();
        this.renderWatermark();
        e.preventDefault();
      }
    };

    const onMove = (e) => {
      if (!this.isDraggingLayer) return;
      const pos = getPos(e);
      const active = this.watermarkLayers.find(l => l.id === this.activeLayerId);
      if (active) {
        const dx = pos.x - this.dragStartMouseX;
        const dy = pos.y - this.dragStartMouseY;
        active.x = Math.round(this.dragStartLayerX + dx);
        active.y = Math.round(this.dragStartLayerY + dy);
        this.renderWatermark();
      }
      e.preventDefault();
    };

    const onUp = () => {
      this.isDraggingLayer = false;
    };

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    canvas.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  },

  renderWatermark() {
    const canvas = document.getElementById('wm-canvas');
    if (!canvas || !this.watermarkImage) return;

    const ctx = canvas.getContext('2d');
    const img = this.watermarkImage;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // 1. Draw base image
    ctx.drawImage(img, 0, 0);

    // 2. Draw each layer
    this.watermarkLayers.forEach(l => {
      ctx.save();
      ctx.globalAlpha = l.opacity;

      if (l.type === 'text') {
        const textToDraw = l.isAllCaps ? l.text.toUpperCase() : l.text;
        const stylePrefix = (l.isItalic ? 'italic ' : '') + (l.isBold ? 'bold ' : '');
        ctx.font = `${stylePrefix}${l.fontSize}px ${l.fontFamily}`;

        const metrics = ctx.measureText(textToDraw);
        l.w = metrics.width;
        l.h = l.fontSize;

        if (l.repeat) {
          // Tile repeat mode across image
          ctx.rotate(-Math.PI / 6);
          const stepX = l.fontSize * 8;
          const stepY = l.fontSize * 4;
          ctx.fillStyle = l.color;
          if (l.hasShadow) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 6;
          }
          for (let x = -canvas.width; x < canvas.width * 2; x += stepX) {
            for (let y = -canvas.height; y < canvas.height * 2; y += stepY) {
              if (l.hasOutline) {
                ctx.lineWidth = Math.max(2, Math.round(l.fontSize * 0.08));
                ctx.strokeStyle = l.outlineColor || '#000000';
                ctx.strokeText(textToDraw, x, y);
              }
              ctx.fillText(textToDraw, x, y);
            }
          }
        } else {
          ctx.translate(l.x + l.w / 2, l.y - l.h / 2);
          if (l.rotation) ctx.rotate(l.rotation);
          ctx.translate(-(l.x + l.w / 2), -(l.y - l.h / 2));

          // Background pill/box if enabled
          if (l.hasBox) {
            ctx.fillStyle = l.boxColor || '#000000';
            ctx.globalAlpha = l.opacity * (l.boxOpacity || 0.6);
            const padX = l.fontSize * 0.35;
            const padY = l.fontSize * 0.2;
            const rx = l.fontSize * 0.25;
            const bx = l.x - padX;
            const by = l.y - l.h - padY;
            const bw = l.w + padX * 2;
            const bh = l.h + padY * 2;

            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, rx) : ctx.rect(bx, by, bw, bh);
            ctx.fill();
            ctx.globalAlpha = l.opacity;
          }

          // Shadow
          if (l.hasShadow) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
            ctx.shadowBlur = Math.max(4, Math.round(l.fontSize * 0.2));
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 2;
          }

          // Outline if enabled
          if (l.hasOutline) {
            ctx.lineWidth = Math.max(2, Math.round(l.fontSize * 0.1));
            ctx.strokeStyle = l.outlineColor || '#000000';
            ctx.lineJoin = 'round';
            ctx.strokeText(textToDraw, l.x, l.y);
          }

          // Main text fill
          ctx.fillStyle = l.color;
          ctx.fillText(textToDraw, l.x, l.y);

          // Bounding box indicator for active layer
          if (l.id === this.activeLayerId) {
            ctx.restore();
            ctx.save();
            ctx.translate(l.x + l.w / 2, l.y - l.h / 2);
            if (l.rotation) ctx.rotate(l.rotation);
            ctx.translate(-(l.x + l.w / 2), -(l.y - l.h / 2));

            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = Math.max(2, Math.round(canvas.width / 550));
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(l.x - 8, l.y - l.h - 6, l.w + 16, l.h + 12);
          }
        }
      } else if (l.type === 'image') {
        if (l.img && l.img.complete) {
          const curW = l.w * (l.scale || 1.0);
          const curH = l.h * (l.scale || 1.0);

          ctx.translate(l.x + curW / 2, l.y + curH / 2);
          if (l.rotation) ctx.rotate(l.rotation);
          ctx.drawImage(l.img, -curW / 2, -curH / 2, curW, curH);

          if (l.id === this.activeLayerId) {
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = Math.max(2, Math.round(canvas.width / 550));
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(-curW / 2 - 6, -curH / 2 - 6, curW + 12, curH + 12);
          }
        }
      }

      ctx.restore();
    });
  },

  updateLayersUI() {
    const listEl = document.getElementById('wm-layers-list');
    const inspectorEl = document.getElementById('wm-layer-inspector');
    if (!listEl || !inspectorEl) return;

    // Render layer chips
    listEl.innerHTML = this.watermarkLayers.map((l, idx) => {
      const isActive = l.id === this.activeLayerId;
      let label = l.type === 'image' ? (l.name || this.t('Логотип', 'Logo')) : `"${l.text || ''}"`;

      return `
        <button type="button" class="wm-layer-chip px-2.5 py-1 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 shrink-0 ${isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:border-indigo-400'}" data-layer-id="${l.id}">
          <span class="truncate max-w-[130px]">${this.escapeHtml(label)}</span>
          <span class="wm-del-chip text-neutral-400 hover:text-rose-400 ml-1 p-0.5">✕</span>
        </button>
      `;
    }).join('');

    // Bind chip clicks
    listEl.querySelectorAll('.wm-layer-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const id = parseInt(chip.getAttribute('data-layer-id'), 10);
        if (e.target.classList.contains('wm-del-chip')) {
          this.removeLayer(id);
        } else {
          this.activeLayerId = id;
          this.updateLayersUI();
          this.renderWatermark();
        }
      });
    });

    const active = this.watermarkLayers.find(l => l.id === this.activeLayerId);
    if (!active) {
      inspectorEl.innerHTML = `<div class="text-neutral-400 text-center py-3">${this.t('Выберите фото и добавьте текст или логотип для настройки', 'Select a photo and add text or logo to customize')}</div>`;
      return;
    }

    if (active.type === 'text') {
      const currentHue = active.hue !== undefined ? active.hue : 0;
      const currentLight = active.lightness !== undefined ? active.lightness : 100;

      inspectorEl.innerHTML = `
        <!-- Row 1: Text Input & Presets -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="md:col-span-2">
            <label class="block text-neutral-600 dark:text-neutral-400 font-medium mb-1">${this.t('Текст водяного знака:', 'Watermark text:')}</label>
            <input type="text" id="wm-insp-text" value="${this.escapeHtml(active.text)}" class="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-medium text-xs">
          </div>
          <div>
            <label class="block text-neutral-600 dark:text-neutral-400 font-medium mb-1">${this.t('Быстрое положение:', 'Quick position:')}</label>
            <select id="wm-insp-pos" class="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs">
              <option value="custom" ${!active.repeat ? 'selected' : ''}>${this.t('Свободное (перетаскивайте по фото)', 'Custom (drag freely on photo)')}</option>
              <option value="bottom-right">${this.t('Внизу справа', 'Bottom right')}</option>
              <option value="bottom-left">${this.t('Внизу слева', 'Bottom left')}</option>
              <option value="top-right">${this.t('Вверху справа', 'Top right')}</option>
              <option value="top-left">${this.t('Вверху слева', 'Top left')}</option>
              <option value="center">${this.t('По центру', 'Center')}</option>
              <option value="repeat" ${active.repeat ? 'selected' : ''}>${this.t('Замостить диагональю (Tile)', 'Diagonal Tile (Repeat)')}</option>
            </select>
          </div>
        </div>

        <!-- Row 2: Typography & Popover Color Menu -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label class="block text-neutral-500 mb-1">${this.t('Шрифт:', 'Font:')}</label>
            <select id="wm-insp-font" class="w-full p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-medium">
              <option value="sans-serif" ${active.fontFamily === 'sans-serif' ? 'selected' : ''}>Sans-Serif (Modern)</option>
              <option value="serif" ${active.fontFamily === 'serif' ? 'selected' : ''}>Serif (Classic)</option>
              <option value="monospace" ${active.fontFamily === 'monospace' ? 'selected' : ''}>Monospace (Code)</option>
              <option value="Impact, sans-serif" ${active.fontFamily.includes('Impact') ? 'selected' : ''}>Impact (Bold Display)</option>
              <option value="cursive" ${active.fontFamily === 'cursive' ? 'selected' : ''}>Cursive (${this.t('Подпись', 'Handwriting')})</option>
            </select>
          </div>
          <div>
            <label class="block text-neutral-500 mb-1">${this.t('Начертание:', 'Style:')}</label>
            <div class="flex items-center gap-1">
              <button type="button" id="wm-insp-bold" class="flex-1 py-1.5 px-2 rounded-lg border text-xs font-bold transition ${active.isBold ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700'}">B</button>
              <button type="button" id="wm-insp-italic" class="flex-1 py-1.5 px-2 rounded-lg border text-xs italic font-serif transition ${active.isItalic ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700'}">I</button>
              <button type="button" id="wm-insp-caps" class="flex-1 py-1.5 px-2 rounded-lg border text-xs uppercase font-mono transition ${active.isAllCaps ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700'}">TT</button>
            </div>
          </div>
          <div>
            <label class="block text-neutral-500 mb-1">${this.t('Цвет знака:', 'Watermark color:')}</label>
            <div class="relative">
              <button type="button" id="wm-color-picker-trigger" class="w-full p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex items-center justify-between gap-2 hover:border-indigo-400 transition text-xs">
                <div class="flex items-center gap-2">
                  <div id="wm-color-trigger-box" class="w-4 h-4 rounded-md border border-neutral-300 dark:border-neutral-600 shadow-sm" style="background-color: ${active.color}"></div>
                  <span id="wm-color-trigger-hex" class="font-mono text-[11px] font-medium text-neutral-800 dark:text-neutral-200 uppercase">${active.color}</span>
                </div>
                <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-neutral-400"></i>
              </button>

              <!-- Separate Popover Menu for Dual-Slider Color Picker -->
              <div id="wm-color-popover" class="hidden absolute right-0 w-72 mt-1.5 p-3.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl z-30 space-y-3 text-xs">
                <div class="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
                  <span class="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    ${this.t('Палитра цвета', 'Color Palette')}
                  </span>
                  <button type="button" id="wm-color-popover-close" class="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-xs font-bold leading-none">✕</button>
                </div>

                <!-- Slider 1: HUE Rainbow -->
                <div>
                  <div class="flex items-center justify-between text-[11px] text-neutral-500 mb-1">
                    <span>${this.t('1. Оттенок (Спектр):', '1. Hue (Spectrum):')}</span>
                    <span id="wm-hue-val" class="font-mono">${currentHue}°</span>
                  </div>
                  <input type="range" id="wm-slider-hue" min="0" max="360" value="${currentHue}" class="w-full h-3 rounded-lg appearance-none cursor-pointer" style="background: linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);">
                </div>

                <!-- Slider 2: LIGHTNESS Tone -->
                <div>
                  <div class="flex items-center justify-between text-[11px] text-neutral-500 mb-1">
                    <span>${this.t('2. Яркость (Тон):', '2. Tone (Brightness):')}</span>
                    <span id="wm-light-val" class="font-mono">${currentLight}%</span>
                  </div>
                  <input type="range" id="wm-slider-lightness" min="0" max="100" value="${currentLight}" class="w-full h-3 rounded-lg appearance-none cursor-pointer" style="background: linear-gradient(to right, #000000 0%, hsl(${currentHue}, 100%, 50%) 50%, #ffffff 100%);">
                </div>

                <!-- Quick Swatches -->
                <div class="flex items-center gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                  <span class="text-[11px] text-neutral-500">${this.t('Пресеты:', 'Presets:')}</span>
                  <div class="flex items-center gap-1.5">
                    <button type="button" class="wm-color-swatch w-5 h-5 rounded-md border border-neutral-300 shadow-sm bg-white" data-color="#ffffff" title="White"></button>
                    <button type="button" class="wm-color-swatch w-5 h-5 rounded-md border border-neutral-300 shadow-sm bg-black" data-color="#000000" title="Black"></button>
                    <button type="button" class="wm-color-swatch w-5 h-5 rounded-md border border-neutral-300 shadow-sm bg-indigo-600" data-color="#6366f1" title="Indigo"></button>
                    <button type="button" class="wm-color-swatch w-5 h-5 rounded-md border border-neutral-300 shadow-sm bg-amber-400" data-color="#facc15" title="Gold"></button>
                    <button type="button" class="wm-color-swatch w-5 h-5 rounded-md border border-neutral-300 shadow-sm bg-red-600" data-color="#dc2626" title="Red"></button>
                    <button type="button" class="wm-color-swatch w-5 h-5 rounded-md border border-neutral-300 shadow-sm bg-emerald-500" data-color="#10b981" title="Green"></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Row 3: Dimensions, Rotation & Opacity -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-neutral-500">${this.t('Размер:', 'Size:')}</span>
              <span id="wm-insp-size-val" class="font-mono text-neutral-800 dark:text-neutral-200">${active.fontSize}px</span>
            </div>
            <input type="range" id="wm-insp-size" min="14" max="140" value="${active.fontSize}" class="w-full accent-indigo-600 cursor-pointer">
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-neutral-500">${this.t('Поворот:', 'Rotation:')}</span>
              <span id="wm-insp-rot-val" class="font-mono text-neutral-800 dark:text-neutral-200">${Math.round((active.rotation * 180) / Math.PI)}°</span>
            </div>
            <input type="range" id="wm-insp-rot" min="-180" max="180" value="${Math.round((active.rotation * 180) / Math.PI)}" class="w-full accent-indigo-600 cursor-pointer">
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-neutral-500">${this.t('Прозрачность знака:', 'Watermark opacity:')}</span>
              <span id="wm-insp-opacity-val" class="font-mono text-neutral-800 dark:text-neutral-200">${Math.round(active.opacity * 100)}%</span>
            </div>
            <input type="range" id="wm-insp-opacity" min="5" max="100" value="${Math.round(active.opacity * 100)}" class="w-full accent-indigo-600 cursor-pointer">
          </div>
        </div>

        <!-- Row 4: Readability Effects & Delete -->
        <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <input type="checkbox" id="wm-insp-outline" ${active.hasOutline ? 'checked' : ''} class="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer">
              <label for="wm-insp-outline" class="font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer">${this.t('Контрастная обводка', 'Contrast outline')}</label>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" id="wm-insp-box" ${active.hasBox ? 'checked' : ''} class="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer">
              <label for="wm-insp-box" class="font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer">${this.t('Фоновая подложка', 'Background box')}</label>
            </div>
          </div>
          <button type="button" id="wm-insp-del" class="text-rose-500 hover:text-rose-700 text-xs font-semibold inline-flex items-center gap-1.5 transition">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> <span>${this.t('Удалить этот знак', 'Delete this watermark')}</span>
          </button>
        </div>
      `;
    } else {
      // Image / Logo Inspector
      inspectorEl.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-neutral-200 dark:border-neutral-800">
          <div class="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
            <i data-lucide="image" class="w-4 h-4 text-indigo-500"></i>
            <span>${this.t('Логотип:', 'Logo:')} ${active.name || (this.t('Изображение', 'Image'))}</span>
          </div>
          <button type="button" id="wm-insp-del" class="text-rose-500 hover:text-rose-700 text-xs font-semibold inline-flex items-center gap-1.5 transition">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> <span>${this.t('Удалить логотип', 'Delete logo')}</span>
          </button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-neutral-500">${this.t('Масштаб (Размер):', 'Scale (Size):')}</span>
              <span id="wm-insp-scale-val" class="font-mono text-neutral-800 dark:text-neutral-200">${Math.round(active.scale * 100)}%</span>
            </div>
            <input type="range" id="wm-insp-scale" min="15" max="250" value="${Math.round(active.scale * 100)}" class="w-full accent-indigo-600 cursor-pointer">
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-neutral-500">${this.t('Прозрачность:', 'Opacity:')}</span>
              <span id="wm-insp-opacity-val" class="font-mono text-neutral-800 dark:text-neutral-200">${Math.round(active.opacity * 100)}%</span>
            </div>
            <input type="range" id="wm-insp-opacity" min="10" max="100" value="${Math.round(active.opacity * 100)}" class="w-full accent-indigo-600 cursor-pointer">
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-neutral-500">${this.t('Поворот:', 'Rotation:')}</span>
              <span id="wm-insp-rot-val" class="font-mono text-neutral-800 dark:text-neutral-200">${Math.round((active.rotation * 180) / Math.PI)}°</span>
            </div>
            <input type="range" id="wm-insp-rot" min="-180" max="180" value="${Math.round((active.rotation * 180) / Math.PI)}" class="w-full accent-indigo-600 cursor-pointer">
          </div>
        </div>
      `;
    }

    if (window.lucide) lucide.createIcons();
    this.bindInspectorEvents(active);
  },

  bindInspectorEvents(layer) {
    const textInput = document.getElementById('wm-insp-text');
    const posSelect = document.getElementById('wm-insp-pos');
    const fontSelect = document.getElementById('wm-insp-font');
    const boldBtn = document.getElementById('wm-insp-bold');
    const italicBtn = document.getElementById('wm-insp-italic');
    const capsBtn = document.getElementById('wm-insp-caps');

    const sizeSlider = document.getElementById('wm-insp-size');
    const sizeVal = document.getElementById('wm-insp-size-val');
    const rotSlider = document.getElementById('wm-insp-rot');
    const rotVal = document.getElementById('wm-insp-rot-val');
    const opacitySlider = document.getElementById('wm-insp-opacity');
    const opacityVal = document.getElementById('wm-insp-opacity-val');

    const sliderHue = document.getElementById('wm-slider-hue');
    const hueVal = document.getElementById('wm-hue-val');
    const sliderLightness = document.getElementById('wm-slider-lightness');
    const lightVal = document.getElementById('wm-light-val');
    const colorPreviewBox = document.getElementById('wm-color-preview-box');
    const colorHexVal = document.getElementById('wm-color-hex-val');

    const triggerBtn = document.getElementById('wm-color-picker-trigger');
    const popover = document.getElementById('wm-color-popover');
    const closeBtn = document.getElementById('wm-color-popover-close');
    const triggerBox = document.getElementById('wm-color-trigger-box');
    const triggerHex = document.getElementById('wm-color-trigger-hex');

    triggerBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      popover?.classList.toggle('hidden');
    });

    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      popover?.classList.add('hidden');
    });

    document.addEventListener('click', (e) => {
      if (popover && !popover.contains(e.target) && !triggerBtn?.contains(e.target)) {
        popover.classList.add('hidden');
      }
    });

    const outlineCheck = document.getElementById('wm-insp-outline');
    const boxCheck = document.getElementById('wm-insp-box');

    const scaleSlider = document.getElementById('wm-insp-scale');
    const scaleVal = document.getElementById('wm-insp-scale-val');
    const delBtn = document.getElementById('wm-insp-del');

    textInput?.addEventListener('input', (e) => {
      layer.text = e.target.value;
      const chip = document.querySelector(`.wm-layer-chip[data-layer-id="${layer.id}"] span`);
      if (chip) chip.textContent = `"${layer.text}"`;
      this.renderWatermark();
    });

    fontSelect?.addEventListener('change', (e) => {
      layer.fontFamily = e.target.value;
      this.renderWatermark();
    });

    const updateToggleBtn = (btn, isActive) => {
      if (!btn) return;
      if (isActive) {
        btn.classList.remove('bg-white', 'dark:bg-neutral-900', 'text-neutral-700', 'dark:text-neutral-300', 'border-neutral-300', 'dark:border-neutral-700');
        btn.classList.add('bg-indigo-600', 'text-white', 'border-indigo-600');
      } else {
        btn.classList.remove('bg-indigo-600', 'text-white', 'border-indigo-600');
        btn.classList.add('bg-white', 'dark:bg-neutral-900', 'text-neutral-700', 'dark:text-neutral-300', 'border-neutral-300', 'dark:border-neutral-700');
      }
    };

    boldBtn?.addEventListener('click', () => {
      layer.isBold = !layer.isBold;
      updateToggleBtn(boldBtn, layer.isBold);
      this.renderWatermark();
    });

    italicBtn?.addEventListener('click', () => {
      layer.isItalic = !layer.isItalic;
      updateToggleBtn(italicBtn, layer.isItalic);
      this.renderWatermark();
    });

    capsBtn?.addEventListener('click', () => {
      layer.isAllCaps = !layer.isAllCaps;
      updateToggleBtn(capsBtn, layer.isAllCaps);
      this.renderWatermark();
    });

    sizeSlider?.addEventListener('input', (e) => {
      layer.fontSize = parseInt(e.target.value, 10);
      if (sizeVal) sizeVal.textContent = `${layer.fontSize}px`;
      this.renderWatermark();
    });

    rotSlider?.addEventListener('input', (e) => {
      layer.rotation = (parseInt(e.target.value, 10) * Math.PI) / 180;
      if (rotVal) rotVal.textContent = `${e.target.value}°`;
      this.renderWatermark();
    });

    opacitySlider?.addEventListener('input', (e) => {
      layer.opacity = parseInt(e.target.value, 10) / 100;
      if (opacityVal) opacityVal.textContent = `${e.target.value}%`;
      this.renderWatermark();
    });

    scaleSlider?.addEventListener('input', (e) => {
      layer.scale = parseInt(e.target.value, 10) / 100;
      if (scaleVal) scaleVal.textContent = `${e.target.value}%`;
      this.renderWatermark();
    });

    // Two-Slider HSL Color Picker Event Handlers
    const updateHslColor = () => {
      const h = parseInt(sliderHue?.value || '0', 10);
      const l = parseInt(sliderLightness?.value || '100', 10);
      layer.hue = h;
      layer.lightness = l;
      layer.color = this.hslToHex(h, 100, l);

      if (hueVal) hueVal.textContent = `${h}°`;
      if (lightVal) lightVal.textContent = `${l}%`;
      if (colorPreviewBox) colorPreviewBox.style.backgroundColor = layer.color;
      if (colorHexVal) colorHexVal.textContent = layer.color;
      if (triggerBox) triggerBox.style.backgroundColor = layer.color;
      if (triggerHex) triggerHex.textContent = layer.color;

      if (sliderLightness) {
        sliderLightness.style.background = `linear-gradient(to right, #000000 0%, hsl(${h}, 100%, 50%) 50%, #ffffff 100%)`;
      }

      this.renderWatermark();
    };

    sliderHue?.addEventListener('input', updateHslColor);
    sliderLightness?.addEventListener('input', updateHslColor);

    // Quick Swatches
    document.querySelectorAll('.wm-color-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        const c = sw.getAttribute('data-color');
        if (!c) return;
        layer.color = c;
        if (c === '#ffffff') { layer.hue = 0; layer.lightness = 100; }
        else if (c === '#000000') { layer.hue = 0; layer.lightness = 0; }
        else if (c === '#6366f1') { layer.hue = 239; layer.lightness = 66; }
        else if (c === '#facc15') { layer.hue = 48; layer.lightness = 53; }
        else if (c === '#dc2626') { layer.hue = 0; layer.lightness = 50; }
        else if (c === '#10b981') { layer.hue = 160; layer.lightness = 48; }

        if (sliderHue) sliderHue.value = layer.hue;
        if (sliderLightness) sliderLightness.value = layer.lightness;
        if (hueVal) hueVal.textContent = `${layer.hue}°`;
        if (lightVal) lightVal.textContent = `${layer.lightness}%`;
        if (colorPreviewBox) colorPreviewBox.style.backgroundColor = layer.color;
        if (colorHexVal) colorHexVal.textContent = layer.color;
        if (triggerBox) triggerBox.style.backgroundColor = layer.color;
        if (triggerHex) triggerHex.textContent = layer.color;
        if (sliderLightness) {
          sliderLightness.style.background = `linear-gradient(to right, #000000 0%, hsl(${layer.hue}, 100%, 50%) 50%, #ffffff 100%)`;
        }

        this.renderWatermark();
      });
    });

    outlineCheck?.addEventListener('change', (e) => {
      layer.hasOutline = e.target.checked;
      this.renderWatermark();
    });

    boxCheck?.addEventListener('change', (e) => {
      layer.hasBox = e.target.checked;
      this.renderWatermark();
    });

    posSelect?.addEventListener('change', (e) => {
      const canvas = document.getElementById('wm-canvas');
      const w = canvas?.width || 1000;
      const h = canvas?.height || 800;
      const val = e.target.value;

      layer.repeat = val === 'repeat';
      if (!layer.repeat) {
        if (val === 'center') {
          layer.x = Math.round((w - layer.w) / 2);
          layer.y = Math.round(h / 2);
        } else if (val === 'top-left') {
          layer.x = 40;
          layer.y = layer.h + 40;
        } else if (val === 'top-right') {
          layer.x = Math.round(w - layer.w - 40);
          layer.y = layer.h + 40;
        } else if (val === 'bottom-left') {
          layer.x = 40;
          layer.y = Math.round(h - 40);
        } else if (val === 'bottom-right') {
          layer.x = Math.round(w - layer.w - 40);
          layer.y = Math.round(h - 40);
        }
      }
      this.renderWatermark();
    });

    delBtn?.addEventListener('click', () => {
      this.removeLayer(layer.id);
    });
  },

  removeLayer(id) {
    this.watermarkLayers = this.watermarkLayers.filter(l => l.id !== id);
    if (this.activeLayerId === id) {
      this.activeLayerId = this.watermarkLayers.length ? this.watermarkLayers[this.watermarkLayers.length - 1].id : null;
    }
    this.updateLayersUI();
    this.renderWatermark();
  },

  // ========================================================
  // --- 2. SVG Optimizer & SVG to PNG Converter ---
  // ========================================================
  svgContent: '',

  bindSvgTool() {
    const fileInput = document.getElementById('svg-input');
    const dropzone = document.getElementById('svg-dropzone');
    const controls = document.getElementById('svg-controls');
    const previewContainer = document.getElementById('svg-preview') || document.getElementById('svg-preview-container');
    const rawSize = document.getElementById('svg-orig-size') || document.getElementById('svg-raw-size');
    const optSize = document.getElementById('svg-opt-size');
    const optBtn = document.getElementById('svg-btn-opt') || document.getElementById('svg-download-svg');
    const btn1x = document.getElementById('svg-btn-1x');
    const btn2x = document.getElementById('svg-btn-2x');
    const btn4x = document.getElementById('svg-btn-4x');
    const btnIco = document.getElementById('svg-btn-ico');
    const resetBtn = document.getElementById('svg-btn-reset') || document.getElementById('svg-reset');

    if (!fileInput || !dropzone) return;

    const renderPng = (scale) => {
      if (!this.svgContent) return;
      const optimized = this.optimizeSvg(this.svgContent);
      const blob = new Blob([optimized], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = (img.naturalWidth || 800) * scale;
        canvas.height = (img.naturalHeight || 800) * scale;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((pngBlob) => {
          if (!pngBlob) return;
          const pngUrl = URL.createObjectURL(pngBlob);
          const a = document.createElement('a');
          a.href = pngUrl;
          a.download = `rendered-${scale}x.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(pngUrl);
          URL.revokeObjectURL(url);
        }, 'image/png');
      };
      img.src = url;
    };

    const renderIco = async () => {
      if (!this.svgContent) return;
      const optimized = this.optimizeSvg(this.svgContent);
      const blob = new Blob([optimized], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = async () => {
        const sizes = [16, 32, 48, 64, 128, 256];
        const canvases = [];
        for (const s of sizes) {
          const c = document.createElement('canvas');
          c.width = s;
          c.height = s;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, s, s);
          canvases.push({ size: s, canvas: c });
        }

        let icoBlob = null;
        if (window.FaviconStudio && typeof window.FaviconStudio.buildMultiResIco === 'function') {
          icoBlob = await window.FaviconStudio.buildMultiResIco(canvases);
        }
        if (icoBlob) {
          const icoUrl = URL.createObjectURL(icoBlob);
          const a = document.createElement('a');
          a.href = icoUrl;
          a.download = 'favicon.ico';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(icoUrl);
        }
        URL.revokeObjectURL(url);
      };
      img.src = url;
    };

    const handleSvgFile = (file) => {
      if (!file || (!file.name.endsWith('.svg') && file.type !== 'image/svg+xml')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.svgContent = e.target.result;
        if (rawSize) rawSize.textContent = `${(file.size / 1024).toFixed(1)} KB`;

        const optimized = this.optimizeSvg(this.svgContent);
        if (optSize) optSize.textContent = `${(new Blob([optimized]).size / 1024).toFixed(1)} KB`;

        controls?.classList.remove('hidden');
        dropzone?.classList.add('hidden');
        
        // Safe DOM insertion preventing XSS
        if (previewContainer) {
          previewContainer.innerHTML = '';
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(optimized, 'image/svg+xml');
            const cleanSvg = doc.querySelector('svg');
            if (cleanSvg) {
              cleanSvg.style.maxWidth = '100%';
              cleanSvg.style.maxHeight = '140px';
              previewContainer.appendChild(cleanSvg);
            } else {
              previewContainer.textContent = 'Invalid SVG';
            }
          } catch (e) {
            previewContainer.textContent = 'Error displaying SVG preview';
          }
        }
      };
      reader.readAsText(file);
    };

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => e.preventDefault());
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer?.files?.length) handleSvgFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files?.length) handleSvgFile(e.target.files[0]);
    });

    resetBtn?.addEventListener('click', () => {
      this.svgContent = '';
      controls?.classList.add('hidden');
      dropzone?.classList.remove('hidden');
    });

    optBtn?.addEventListener('click', () => {
      if (!this.svgContent) return;
      const optimized = this.optimizeSvg(this.svgContent);
      const blob = new Blob([optimized], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'optimized.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    btn1x?.addEventListener('click', () => renderPng(1));
    btn2x?.addEventListener('click', () => renderPng(2));
    btn4x?.addEventListener('click', () => renderPng(4));
    btnIco?.addEventListener('click', () => renderIco());
  },

  sanitizeSvg(svgStr) {
    if (!svgStr || typeof svgStr !== 'string') return '';
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgStr, 'image/svg+xml');
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        const htmlDoc = parser.parseFromString(svgStr, 'text/html');
        const svgEl = htmlDoc.querySelector('svg');
        if (!svgEl) return '';
        return this._cleanSvgElement(svgEl);
      }
      const svgEl = doc.querySelector('svg');
      if (!svgEl) return '';
      return this._cleanSvgElement(svgEl);
    } catch {
      return '';
    }
  },

  _cleanSvgElement(svgEl) {
    const dangerousTags = ['script', 'foreignobject', 'object', 'embed', 'iframe', 'meta', 'link', 'style'];
    dangerousTags.forEach(tag => {
      svgEl.querySelectorAll(tag).forEach(el => el.remove());
    });

    const isSafeUrl = (url) => {
      const trimmed = String(url).replace(/[\x00-\x20\s]/g, '').toLowerCase();
      // Strictly disallow external http/https requests to prevent IP tracking and canvas tainting
      if (trimmed.startsWith('#') || trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) return true;
      return false;
    };

    svgEl.querySelectorAll('*').forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on')) {
          el.removeAttribute(attr.name);
        } else if (['href', 'xlink:href', 'src'].includes(name) || name.endsWith(':href')) {
          if (!isSafeUrl(attr.value)) {
            el.removeAttribute(attr.name);
          }
        }
      });
    });

    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgEl);
  },

  optimizeSvg(svgStr) {
    const clean = this.sanitizeSvg(svgStr);
    if (!clean) return '';
    return clean.replace(/\s+/g, ' ').trim();
  }
};

if (typeof window !== 'undefined') window.MediaCreative = MediaCreative;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MediaCreative;
}
