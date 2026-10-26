/**
 * OmniKit Tool 25: Optical Character Recognition (OCR: Image to Text)
 * 100% In-Browser WebAssembly / WebWorker Client-Side Neural OCR via Tesseract.js.
 * Zero data sent to servers.
 */

const OcrTool = {
  currentFile: null,
  currentImage: null,
  isProcessing: false,
  isCancelled: false,
  currentWorker: null,
  tesseractLoaded: false,

  init() {
    this.bindDropzone();
    this.bindActions();
    this.bindPaste();
  },

  t(ru, en) {
    const lang = (window.I18N && window.I18N.currentLang) || 'en';
    return lang === 'en' ? en : ru;
  },

  bindDropzone() {
    const dropzone = document.getElementById('ocr-dropzone');
    const input = document.getElementById('ocr-file-input');
    if (!dropzone || !input) return;

    dropzone.addEventListener('click', () => input.click());

    ['dragover', 'dragenter'].forEach(ev => {
      dropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        dropzone.classList.add('border-indigo-500', 'bg-indigo-50/20');
      });
    });

    ['dragleave', 'drop'].forEach(ev => {
      dropzone.addEventListener(ev, () => {
        dropzone.classList.remove('border-indigo-500', 'bg-indigo-50/20');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer?.files?.length) {
        this.handleFile(e.dataTransfer.files[0]);
      }
    });

    input.addEventListener('change', (e) => {
      if (e.target.files?.length) {
        this.handleFile(e.target.files[0]);
      }
    });
  },

  bindPaste() {
    window.addEventListener('paste', (e) => {
      if (window.App?.activeTool !== 'ocr') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            this.handleFile(file);
            break;
          }
        }
      }
    });
  },

  handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      if (file && window.App) window.App.showToast((window.I18N?.currentLang || 'en') === 'ru' ? 'Выберите файл изображения' : 'Please select an image file', 'error');
      return;
    }
    this.currentFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.currentImage = img;
        this.showWorkspace(img, file);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  showWorkspace(img, file) {
    const dropzone = document.getElementById('ocr-dropzone');
    const workspace = document.getElementById('ocr-workspace');
    const preview = document.getElementById('ocr-image-preview');
    const metaEl = document.getElementById('ocr-image-meta');
    const resultText = document.getElementById('ocr-result-text');

    if (dropzone) dropzone.classList.add('hidden');
    if (workspace) workspace.classList.remove('hidden');

    if (preview) {
      preview.src = img.src;
    }

    if (metaEl) {
      const kb = (file.size / 1024).toFixed(1);
      metaEl.textContent = `${file.name} • ${img.naturalWidth}×${img.naturalHeight}px • ${kb} KB`;
    }

    if (resultText) {
      resultText.value = '';
      this.updateStats('');
    }

    this.setProgress(0, '');
  },

  reset() {
    this.currentFile = null;
    this.currentImage = null;
    this.isProcessing = false;

    const dropzone = document.getElementById('ocr-dropzone');
    const workspace = document.getElementById('ocr-workspace');
    const input = document.getElementById('ocr-file-input');
    const resultText = document.getElementById('ocr-result-text');

    if (dropzone) dropzone.classList.remove('hidden');
    if (workspace) workspace.classList.add('hidden');
    if (input) input.value = '';
    if (resultText) resultText.value = '';
    this.setProgress(0, '');
  },

  cancelRecognition() {
    this.isCancelled = true;
    this.isProcessing = false;
    if (this.currentWorker) {
      try {
        this.currentWorker.terminate();
      } catch (e) {
        console.warn('Worker terminate error:', e);
      }
      this.currentWorker = null;
    }
    const startBtn = document.getElementById('ocr-start-btn');
    if (startBtn) startBtn.disabled = false;
    this.setProgress(0, '');
    const progContainer = document.getElementById('ocr-progress-container');
    if (progContainer) progContainer.classList.add('hidden');
    if (window.TextTools) {
      TextTools.showToast(this.t('Распознавание отменено', 'Recognition cancelled'));
    }
  },

  bindActions() {
    document.getElementById('ocr-reset-btn')?.addEventListener('click', () => {
      this.reset();
      document.getElementById('ocr-file-input')?.click();
    });
    document.getElementById('ocr-start-btn')?.addEventListener('click', () => this.startRecognition());
    document.getElementById('ocr-cancel-btn')?.addEventListener('click', () => this.cancelRecognition());

    // Copy result
    document.getElementById('ocr-copy-btn')?.addEventListener('click', () => {
      const text = document.getElementById('ocr-result-text')?.value;
      if (text) {
        navigator.clipboard.writeText(text).then(() => {
          if (window.TextTools) {
            TextTools.showToast(this.t('Текст скопирован в буфер!', 'Text copied to clipboard!'));
          }
        });
      }
    });

    // Download .TXT
    document.getElementById('ocr-download-btn')?.addEventListener('click', () => {
      const text = document.getElementById('ocr-result-text')?.value;
      if (!text) return;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (this.currentFile?.name?.replace(/\.[^.]+$/, '') || 'ocr-text') + '.txt';
      a.click();
      URL.revokeObjectURL(url);
    });

    // Open in TXT Notepad
    document.getElementById('ocr-open-notepad-btn')?.addEventListener('click', () => {
      const text = document.getElementById('ocr-result-text')?.value;
      if (!text) return;
      if (window.App) {
        window.App.openTool('txt-editor');
        const ta = document.getElementById('notepad-textarea');
        if (ta) {
          ta.value = text;
          if (window.TxtEditor && typeof window.TxtEditor.updateStats === 'function') {
            window.TxtEditor.updateStats(text);
          }
          if (window.TextTools) {
            TextTools.showToast(this.t('Текст открыт в Блокноте!', 'Text opened in Notepad!'));
          }
        }
      }
    });

    // Listen to manual typing in result textarea to update stats
    document.getElementById('ocr-result-text')?.addEventListener('input', (e) => {
      this.updateStats(e.target.value);
    });
  },

  async ensureTesseractLoaded() {
    if (window.Tesseract && typeof window.Tesseract.recognize === 'function') {
      return true;
    }

    this.setProgress(5, this.t('Загрузка нейросети OCR (WASM)...', 'Loading OCR Neural Network (WASM)...'));

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.async = true;
      script.onload = () => {
        this.tesseractLoaded = true;
        resolve(true);
      };
      script.onerror = () => {
        reject(new Error('Failed to load Tesseract.js from CDN'));
      };
      document.head.appendChild(script);
    });
  },

  getPreprocessedCanvas() {
    if (!this.currentImage) return null;
    const img = this.currentImage;

    // Tesseract LSTM neural model performs best when character x-height is ~30px (approx 300 DPI).
    // Automatically upscale small or low-resolution crops with high-quality smoothing.
    const maxDim = Math.max(img.naturalWidth, img.naturalHeight);
    let scale = 1;
    if (maxDim > 0 && maxDim < 1400) {
      scale = Math.min(2.5, Math.max(1.4, 1800 / maxDim));
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');

    if (scale !== 1) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const binarize = document.getElementById('ocr-opt-contrast')?.checked;
    const invert = document.getElementById('ocr-opt-invert')?.checked;

    if (!binarize && !invert && scale === 1) {
      return canvas;
    }

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    const totalPixels = canvas.width * canvas.height;

    // Convert to grayscale and collect luminance histogram for adaptive contrast
    const grayArr = new Uint8ClampedArray(totalPixels);
    const hist = new Uint32Array(256);

    for (let i = 0, j = 0; i < d.length; i += 4, j++) {
      const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      grayArr[j] = g;
      hist[g]++;
    }

    if (binarize) {
      // Robust adaptive contrast normalization (percentile clipping 1%..99% to eliminate outliers)
      const lowCut = Math.round(totalPixels * 0.015);
      const highCut = Math.round(totalPixels * 0.985);

      let count = 0;
      let minLum = 0;
      for (let g = 0; g < 256; g++) {
        count += hist[g];
        if (count >= lowCut) { minLum = g; break; }
      }

      count = 0;
      let maxLum = 255;
      for (let g = 255; g >= 0; g--) {
        count += hist[g];
        if (count >= totalPixels - highCut) { maxLum = g; break; }
      }

      const lumRange = Math.max(1, maxLum - minLum);

      for (let i = 0, j = 0; i < d.length; i += 4, j++) {
        let g = grayArr[j];
        // Dynamic contrast stretch
        let stretched = Math.round(((Math.min(maxLum, Math.max(minLum, g)) - minLum) / lumRange) * 255);

        // Gentle edge contrast enhancement while preserving anti-aliasing
        let val;
        if (stretched < 128) {
          val = Math.max(0, Math.round(stretched * 0.82));
        } else {
          val = Math.min(255, Math.round(stretched * 1.12));
        }

        if (invert) val = 255 - val;

        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
      }
    } else {
      for (let i = 0, j = 0; i < d.length; i += 4, j++) {
        let val = grayArr[j];
        if (invert) val = 255 - val;
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  },

  async startRecognition() {
    if (!this.currentImage || this.isProcessing) return;

    this.isCancelled = false;
    this.isProcessing = true;
    const startBtn = document.getElementById('ocr-start-btn');
    const resultText = document.getElementById('ocr-result-text');
    if (startBtn) startBtn.disabled = true;

    const lang = document.getElementById('ocr-lang')?.value || 'rus+eng';

    try {
      await this.ensureTesseractLoaded();
      if (this.isCancelled) return;

      this.setProgress(15, this.t('Подготовка изображения и модели...', 'Preparing image and language model...'));
      const sourceCanvas = this.getPreprocessedCanvas();
      if (this.isCancelled) return;

      if (window.Tesseract && typeof window.Tesseract.createWorker === 'function') {
        const worker = await window.Tesseract.createWorker(lang, 1, {
          logger: (m) => {
            if (this.isCancelled) return;
            if (m.status === 'recognizing text') {
              const pct = Math.round((m.progress || 0) * 100);
              this.setProgress(20 + Math.round(pct * 0.78), `${this.t('Распознавание текста', 'Recognizing text')}: ${pct}%`);
            } else if (m.status === 'loading tesseract core') {
              this.setProgress(10, this.t('Загрузка ядра WASM...', 'Loading WebAssembly Core...'));
            } else if (m.status && m.status.includes('loading language')) {
              this.setProgress(18, this.t('Загрузка языкового словаря...', 'Downloading language dictionary...'));
            } else if (m.status && m.status.includes('initializing api')) {
              this.setProgress(22, this.t('Инициализация нейросети...', 'Initializing neural pipeline...'));
            }
          }
        });
        this.currentWorker = worker;
        if (this.isCancelled) {
          await worker.terminate();
          this.currentWorker = null;
          return;
        }
        const { data } = await worker.recognize(sourceCanvas);
        await worker.terminate();
        this.currentWorker = null;
        if (this.isCancelled) return;

        this.setProgress(100, this.t('Готово!', 'Done!'));
        const cleanText = (data.text || '').trim();

        if (resultText) {
          resultText.value = cleanText || this.t('(Текст на изображении не обнаружен)', '(No text detected in image)');
          this.updateStats(cleanText);
        }

        if (window.TextTools) {
          TextTools.showToast(this.t('Распознавание успешно завершено!', 'OCR completed successfully!'));
        }
      } else {
        const { data } = await window.Tesseract.recognize(sourceCanvas, lang, {
          logger: (m) => {
            if (this.isCancelled) return;
            if (m.status === 'recognizing text') {
              const pct = Math.round((m.progress || 0) * 100);
              this.setProgress(20 + Math.round(pct * 0.78), `${this.t('Распознавание текста', 'Recognizing text')}: ${pct}%`);
            } else if (m.status === 'loading tesseract core') {
              this.setProgress(10, this.t('Загрузка ядра WASM...', 'Loading WebAssembly Core...'));
            } else if (m.status && m.status.includes('loading language')) {
              this.setProgress(18, this.t('Загрузка языкового словаря...', 'Downloading language dictionary...'));
            } else if (m.status && m.status.includes('initializing api')) {
              this.setProgress(22, this.t('Инициализация нейросети...', 'Initializing neural pipeline...'));
            }
          },
          preserve_interword_spaces: '1'
        });
        if (this.isCancelled) return;

        this.setProgress(100, this.t('Готово!', 'Done!'));
        const cleanText = (data.text || '').trim();

        if (resultText) {
          resultText.value = cleanText || this.t('(Текст на изображении не обнаружен)', '(No text detected in image)');
          this.updateStats(cleanText);
        }

        if (window.TextTools) {
          TextTools.showToast(this.t('Распознавание успешно завершено!', 'OCR completed successfully!'));
        }
      }
    } catch (err) {
      if (this.isCancelled) return;
      console.error('OCR Error:', err);
      this.setProgress(0, `${this.t('Ошибка распознавания: ', 'Recognition error: ')}${err.message}`);
      if (resultText) {
        resultText.value = `${this.t('Ошибка: ', 'Error: ')}${err.message}`;
      }
    } finally {
      if (!this.isCancelled) {
        this.isProcessing = false;
        if (startBtn) startBtn.disabled = false;
        setTimeout(() => {
          const progContainer = document.getElementById('ocr-progress-container');
          if (progContainer && !this.isProcessing) progContainer.classList.add('hidden');
        }, 2500);
      }
    }
  },

  setProgress(pct, text) {
    const container = document.getElementById('ocr-progress-container');
    const bar = document.getElementById('ocr-progress-bar');
    const statusText = document.getElementById('ocr-status-text');

    if (container) {
      if (pct > 0 || text) container.classList.remove('hidden');
    }
    if (bar) {
      bar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    }
    if (statusText && text) {
      statusText.textContent = text;
    }
  },

  updateStats(text) {
    const chars = text ? text.length : 0;
    const words = text && text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text && text.trim() ? text.split('\n').length : 0;

    const statsEl = document.getElementById('ocr-stats');
    if (statsEl) {
      statsEl.textContent = this.t(
        `${chars} симв. • ${words} слов • ${lines} строк`,
        `${chars} chars • ${words} words • ${lines} lines`
      );
    }
  }
};

if (typeof window !== 'undefined') window.OcrTool = OcrTool;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OcrTool;
}
