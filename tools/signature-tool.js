/**
 * OmniKit Online Signature & Draw Studio (100% In-Browser Execution)
 * - Smooth quadratic Bezier curve ink drawing
 * - Precision pointer event handling (mouse, touch, pen, stylus)
 * - Tap-to-dot support (for i-dots and periods)
 * - Smart auto-trim whitespace on export & clipboard copy
 * - Cursive handwriting typography mode
 * - Transparent PNG & SVG vector download
 */

(function (global) {
  'use strict';

  const SignatureTool = {
    canvas: null,
    ctx: null,
    isDrawing: false,
    hasMoved: false,
    history: [],
    currentMode: 'draw', // 'draw' or 'type'
    savedDrawData: null,
    savedDrawHistory: [],
    currentColor: '#0f172a',
    currentWidth: 3,
    isTransparent: true,
    lastX: 0,
    lastY: 0,
    _resizeTimer: null,

    init() {
      this.canvas = document.getElementById('signature-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

      // Handwriting font families are only shipped on /online-signature pages;
      // when the tool opens via SPA navigation elsewhere, load them on demand.
      if (!document.querySelector('link[data-signature-fonts]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Dancing+Script:wght@700&family=Great+Vibes&family=Pacifico&display=swap';
        link.setAttribute('data-signature-fonts', '');
        document.head.appendChild(link);
      }

      this.resizeCanvas();
      this.bindEvents();
      this.saveState();

      window.addEventListener('resize', () => {
        clearTimeout(this._resizeTimer);
        this._resizeTimer = setTimeout(() => this.resizeCanvas(), 100);
      });
    },

    resizeCanvas() {
      if (!this.canvas) return;
      const container = this.canvas.parentElement;
      const rect = container ? container.getBoundingClientRect() : null;
      const dpr = window.devicePixelRatio || 1;
      const containerW = (rect && rect.width > 0) ? (rect.width - 24) : (typeof window !== 'undefined' && window.innerWidth ? Math.min(800, window.innerWidth - 48) : 700);
      const width = Math.max(280, Math.min(800, Math.floor(containerW)));
      const height = 260;

      const targetPixelW = width * dpr;
      const targetPixelH = height * dpr;

      if (this.canvas.width === targetPixelW && this.canvas.style.width === `${width}px`) {
        return;
      }

      let prevImg = null;
      if (this.ctx && this.canvas.width > 0 && this.canvas.height > 0) {
        try {
          prevImg = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        } catch (_) {}
      }

      this.canvas.width = targetPixelW;
      this.canvas.height = targetPixelH;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      if (this.ctx) {
        this.ctx.scale(dpr, dpr);
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
      }

      if (prevImg) {
        try {
          this.ctx.putImageData(prevImg, 0, 0);
        } catch (_) {}
      } else if (this.currentMode === 'type') {
        const typeInput = document.getElementById('sig-type-input');
        this.renderTypedSignature(typeInput?.value || 'John Doe');
      }
    },

    bindEvents() {
      const canvas = this.canvas;
      const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        let clientX = e.clientX;
        let clientY = e.clientY;
        if (e.touches && e.touches.length > 0) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
          clientX = e.changedTouches[0].clientX;
          clientY = e.changedTouches[0].clientY;
        }
        const dpr = window.devicePixelRatio || 1;
        const scaleX = (canvas.width / dpr) / (rect.width || 1);
        const scaleY = (canvas.height / dpr) / (rect.height || 1);
        return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY
        };
      };

      const start = (e) => {
        if (this.currentMode !== 'draw') return;
        if (e.cancelable) e.preventDefault();
        this.isDrawing = true;
        this.hasMoved = false;

        if (e.pointerId && canvas.setPointerCapture) {
          try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
        }
        const pos = getPos(e);
        this.lastX = pos.x;
        this.lastY = pos.y;

        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
      };

      const move = (e) => {
        if (!this.isDrawing || this.currentMode !== 'draw') return;
        if (e.cancelable) e.preventDefault();
        this.hasMoved = true;
        const pos = getPos(e);

        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.currentWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // Quadratic curve interpolation for silky smooth ink
        const midX = (this.lastX + pos.x) / 2;
        const midY = (this.lastY + pos.y) / 2;

        this.ctx.quadraticCurveTo(this.lastX, this.lastY, midX, midY);
        this.ctx.stroke();

        this.lastX = pos.x;
        this.lastY = pos.y;
      };

      const stop = (e) => {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        if (e && e.pointerId && canvas.releasePointerCapture) {
          try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
        }

        // Tap-to-dot support: single click or tap renders a clean circle
        if (!this.hasMoved) {
          this.ctx.beginPath();
          this.ctx.arc(this.lastX, this.lastY, Math.max(1.5, this.currentWidth / 2), 0, Math.PI * 2);
          this.ctx.fillStyle = this.currentColor;
          this.ctx.fill();
        }

        this.saveState();
      };

      if (window.PointerEvent) {
        canvas.addEventListener('pointerdown', start);
        canvas.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
      } else {
        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mousemove', move);
        window.addEventListener('mouseup', stop);

        canvas.addEventListener('touchstart', start, { passive: false });
        canvas.addEventListener('touchmove', move, { passive: false });
        window.addEventListener('touchend', stop);
      }

      // Mode toggles
      document.getElementById('sig-mode-draw')?.addEventListener('click', () => this.setMode('draw'));
      document.getElementById('sig-mode-type')?.addEventListener('click', () => this.setMode('type'));

      // Text input
      const typeInput = document.getElementById('sig-type-input');
      if (typeInput) {
        typeInput.addEventListener('input', () => {
          if (this.currentMode === 'type') this.renderTypedSignature(typeInput.value);
        });
      }

      // Font select
      document.getElementById('sig-font-select')?.addEventListener('change', () => {
        if (this.currentMode === 'type') this.renderTypedSignature(typeInput?.value || '');
      });

      // Colors & Palette Swatches
      document.querySelectorAll('.sig-color-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const color = e.currentTarget.getAttribute('data-color');
          if (color) this.setColor(color);
        });
      });

      // Custom Color Picker
      const customPicker = document.getElementById('sig-color-picker');
      if (customPicker) {
        customPicker.addEventListener('input', (e) => this.setColor(e.target.value));
        customPicker.addEventListener('change', (e) => this.setColor(e.target.value));
      }

      // Thickness slider
      const widthSlider = document.getElementById('sig-width-slider');
      if (widthSlider) {
        widthSlider.addEventListener('input', (e) => {
          this.currentWidth = parseInt(e.target.value, 10);
        });
      }

      // Clear & Undo
      document.getElementById('sig-clear-btn')?.addEventListener('click', () => this.clear());
      document.getElementById('sig-undo-btn')?.addEventListener('click', () => this.undo());

      // Transparent toggle
      const transToggle = document.getElementById('sig-trans-toggle');
      if (transToggle) {
        transToggle.addEventListener('change', (e) => {
          this.isTransparent = e.target.checked;
          this.redraw();
        });
      }

      // Export Buttons
      document.getElementById('sig-download-png')?.addEventListener('click', () => this.downloadPng());
      document.getElementById('sig-download-svg')?.addEventListener('click', () => this.downloadSvg());
      document.getElementById('sig-copy-btn')?.addEventListener('click', () => this.copyToClipboard());
    },

    setColor(color) {
      if (!color) return;
      this.currentColor = color;

      let isPreset = false;
      document.querySelectorAll('.sig-color-btn').forEach((b) => {
        if (b.getAttribute('data-color') === color) {
          b.classList.add('ring-2', 'ring-indigo-500');
          isPreset = true;
        } else {
          b.classList.remove('ring-2', 'ring-indigo-500');
        }
      });

      const pickerLabel = document.getElementById('sig-color-picker-label');
      const pickerPreview = document.getElementById('sig-color-picker-preview');
      const picker = document.getElementById('sig-color-picker');

      if (pickerPreview) {
        pickerPreview.style.backgroundColor = color;
      }
      if (pickerLabel) {
        if (!isPreset) {
          pickerLabel.classList.add('ring-2', 'ring-indigo-500');
        } else {
          pickerLabel.classList.remove('ring-2', 'ring-indigo-500');
        }
      }

      if (picker && /^#[0-9a-fA-F]{6}$/.test(color)) {
        picker.value = color;
      }

      if (this.currentMode === 'type') {
        const typeInput = document.getElementById('sig-type-input');
        this.renderTypedSignature(typeInput?.value || '');
      }
    },

    setMode(mode) {
      if (this.currentMode === mode && this._modeInit) return;
      this._modeInit = true;

      const dpr = window.devicePixelRatio || 1;
      const w = this.canvas ? this.canvas.width / dpr : 600;
      const h = this.canvas ? this.canvas.height / dpr : 260;

      if (this.currentMode === 'draw' && mode === 'type') {
        try {
          if (this.canvas && this.ctx) {
            this.savedDrawData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            this.savedDrawHistory = [...this.history];
          }
        } catch (_) {}
      }

      this.currentMode = mode;
      const drawPanel = document.getElementById('sig-draw-controls');
      const typePanel = document.getElementById('sig-type-controls');
      const btnDraw = document.getElementById('sig-mode-draw');
      const btnType = document.getElementById('sig-mode-type');

      const activeClasses = ['bg-neutral-900', 'text-white', 'dark:bg-white', 'dark:text-neutral-900'];
      const inactiveClasses = ['bg-neutral-100', 'dark:bg-neutral-800', 'text-neutral-600', 'dark:text-neutral-400'];

      if (mode === 'draw') {
        drawPanel?.classList.remove('hidden');
        typePanel?.classList.add('hidden');
        btnDraw?.classList.remove(...inactiveClasses);
        btnDraw?.classList.add(...activeClasses);
        btnType?.classList.remove(...activeClasses);
        btnType?.classList.add(...inactiveClasses);

        // Clean canvas completely of any typed text
        if (this.ctx && this.canvas) {
          this.ctx.clearRect(0, 0, w, h);
          if (this.savedDrawData) {
            try {
              this.ctx.putImageData(this.savedDrawData, 0, 0);
              this.history = [...(this.savedDrawHistory || [])];
            } catch (_) {
              this.history = [];
            }
          } else {
            this.history = [];
          }
        }
      } else {
        drawPanel?.classList.add('hidden');
        typePanel?.classList.remove('hidden');
        btnType?.classList.remove(...inactiveClasses);
        btnType?.classList.add(...activeClasses);
        btnDraw?.classList.remove(...activeClasses);
        btnDraw?.classList.add(...inactiveClasses);
        const input = document.getElementById('sig-type-input');
        this.renderTypedSignature(input?.value || 'John Doe');
      }
    },

    renderTypedSignature(text) {
      const dpr = window.devicePixelRatio || 1;
      const w = this.canvas.width / dpr;
      const h = this.canvas.height / dpr;

      this.ctx.clearRect(0, 0, w, h);

      if (!text) return;
      const font = document.getElementById('sig-font-select')?.value || "'Caveat', cursive";
      this.ctx.font = `600 54px ${font}`;
      this.ctx.fillStyle = this.currentColor;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(text, w / 2, h / 2);
      this.saveState();
    },

    saveState() {
      if (!this.canvas || !this.ctx || this.canvas.width <= 0 || this.canvas.height <= 0) return;
      if (this.history.length > 25) this.history.shift();
      try {
        this.history.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
      } catch (e) {
        console.warn('Signature saveState skipped:', e);
      }
    },

    undo() {
      if (this.history.length > 1) {
        this.history.pop();
        const prev = this.history[this.history.length - 1];
        this.ctx.putImageData(prev, 0, 0);
      } else {
        this.clear();
      }
    },

    clear() {
      const dpr = window.devicePixelRatio || 1;
      const w = this.canvas ? this.canvas.width / dpr : 600;
      const h = this.canvas ? this.canvas.height / dpr : 260;
      if (this.ctx) this.ctx.clearRect(0, 0, w, h);
      this.history = [];
      if (this.currentMode === 'draw') {
        this.savedDrawData = null;
        this.savedDrawHistory = [];
      } else if (this.currentMode === 'type') {
        const input = document.getElementById('sig-type-input');
        if (input) input.value = '';
      }
      this.saveState();
    },

    redraw() {
      const cvs = document.getElementById('signature-canvas');
      if (cvs) {
        cvs.style.backgroundColor = this.isTransparent ? 'transparent' : '#ffffff';
      }
    },

    getTrimmedCanvas() {
      const dpr = window.devicePixelRatio || 1;
      const w = this.canvas.width;
      const h = this.canvas.height;
      if (w <= 0 || h <= 0) return this.canvas;

      let imgData;
      try {
        imgData = this.ctx.getImageData(0, 0, w, h);
      } catch (_) {
        return this.canvas;
      }

      const data = imgData.data;
      let minX = w, minY = h, maxX = 0, maxY = 0;
      let hasPixels = false;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const alpha = data[idx + 3];
          const isDrawn = this.isTransparent 
            ? alpha > 15 
            : (alpha > 15 && (data[idx] < 245 || data[idx + 1] < 245 || data[idx + 2] < 245));

          if (isDrawn) {
            hasPixels = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (!hasPixels) return this.canvas;

      const pad = Math.round(20 * dpr);
      minX = Math.max(0, minX - pad);
      minY = Math.max(0, minY - pad);
      maxX = Math.min(w, maxX + pad);
      maxY = Math.min(h, maxY + pad);

      const trimW = maxX - minX;
      const trimH = maxY - minY;

      const trimmedCanvas = document.createElement('canvas');
      trimmedCanvas.width = trimW;
      trimmedCanvas.height = trimH;
      const trimCtx = trimmedCanvas.getContext('2d');
      if (!this.isTransparent) {
        trimCtx.fillStyle = '#ffffff';
        trimCtx.fillRect(0, 0, trimW, trimH);
      }
      trimCtx.drawImage(this.canvas, minX, minY, trimW, trimH, 0, 0, trimW, trimH);
      return trimmedCanvas;
    },

    downloadPng() {
      const exportCanvas = this.getTrimmedCanvas();
      exportCanvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.setAttribute('download', 'signature.png');
        a.setAttribute('rel', 'noopener noreferrer');
        a.setAttribute('href', url);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      }, 'image/png');
    },

    downloadSvg() {
      const exportCanvas = this.getTrimmedCanvas();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(exportCanvas.width / dpr);
      const h = Math.round(exportCanvas.height / dpr);
      const dataUrl = exportCanvas.toDataURL('image/png');
      const svg = `<?xml version="1.0" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <image width="${w}" height="${h}" href="${dataUrl}"/>
</svg>`;
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.setAttribute('download', 'signature.svg');
      a.setAttribute('rel', 'noopener noreferrer');
      a.setAttribute('href', url);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    },

    async copyToClipboard() {
      const isRu = (window.I18N?.currentLang || 'en') === 'ru';
      const exportCanvas = this.getTrimmedCanvas();
      try {
        exportCanvas.toBlob(async (blob) => {
          if (!blob) return;
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            if (window.App) window.App.showToast(isRu ? 'Подпись скопирована в буфер обмена!' : 'Signature copied to clipboard!', 'success');
          } else {
            if (window.App) window.App.showToast(isRu ? 'Буфер обмена не поддерживается этим браузером' : 'Clipboard not supported in this browser', 'error');
          }
        }, 'image/png');
      } catch (err) {
        console.error('Clipboard copy error:', err);
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.SignatureTool = SignatureTool;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SignatureTool;
  }
})(typeof window !== 'undefined' ? window : global);
