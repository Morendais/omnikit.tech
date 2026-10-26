/**
 * OmniKit In-Browser Background Remover
 * 100% Client-Side In-Browser Segmentation Engine
 * Model: U²-Net INT8 (42 MB, downloaded once, cached forever),
 * via ONNX Runtime Web (WebGPU first, WASM fallback). Continuous alpha matte.
 * Zero server uploads. Zero external CDNs.
 */

const BgRemover = {
  isProcessing: false,
  isCancelled: false,
  currentFile: null,
  originalImage: null,
  cutoutImage: null,
  activeBgMode: 'transparent', // 'transparent' | 'white' | 'black' | 'custom'
  customBgColor: '#ffffff',
  session: null,
  isModelLoading: false,
  _cachedBuffer: null,
  _cachedBufferId: null,
  _fallbackNote: null,
  _gpuBanned: false,
  _sessionUsedGpu: false,

  // One small local model by design (user decision): a 42 MB download once,
  // cached forever — good enough for simple cutouts (products, portraits on
  // plain backgrounds), and the page never makes people wait for 94–170 MB.
  MODELS: {
    quality: { id: 'u2net_int8', name: 'U²-Net', url: '/assets/models/bg/u2net_int8.onnx', sizeBytes: 44212603, sizeMB: '42', inputSize: 320, mean: [0.485, 0.456, 0.406], std: [0.229, 0.224, 0.225] }
  },

  MODEL_CHAIN: ['quality'],

  _activeKey: null,

  get MODEL() {
    return this.MODELS[this._activeKey || 'quality'];
  },

  CACHE_NAME: 'omnikit_model_cache_v1',
  DB_NAME: 'omnikit_models_cache',
  DB_VERSION: 1,
  STORE_NAME: 'bg_models',

  t(key, fallbackRu, fallbackEn) {
    if (window.I18N && typeof window.I18N.t === 'function') {
      const v = window.I18N.t(key);
      if (v && v !== key) return v;
    }
    return ((window.I18N?.currentLang || 'en') === 'ru') ? fallbackRu : fallbackEn;
  },

  init() {
    this.bindEvents();
    this.purgeRetiredModels();
    this.renderLocalModelNote();
    // Standalone page visit: warm the model quietly in the background so the
    // first cutout starts instantly instead of showing a download bar.
    const onBgPage = (location.pathname || '').includes('background-remover');
    if (onBgPage) this.preloadSession();
  },

  // Called from App.openTool('background-remover') on SPA-style navigation.
  preloadSession() {
    if (this.session || this.isModelLoading || this.isProcessing) return;
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1200));
    idle(() => { if (!this.session && !this.isModelLoading) this.getSession().catch(() => {}); });
  },

  // Honest expectation-setting right under the dropzone: local model, simple
  // cutouts, one-time download that stays cached.
  renderLocalModelNote() {
    const dropzone = document.getElementById('bg-dropzone');
    if (!dropzone) return;
    const note = document.createElement('p');
    note.id = 'bg-local-note';
    note.className = 'text-[11px] leading-snug text-neutral-500 dark:text-neutral-400 mt-2 text-center';
    note.textContent = this.t('bg_local_note',
      'Локальная нейросеть — подходит для несложных удалений фона (товары, портреты на однородном фоне). Скачивается один раз (~42 МБ) и сохраняется в кэше — файлы не покидают ваше устройство.',
      'Local neural network — good for simple background removal (products, portraits on plain backgrounds). Downloaded once (~42 MB) and cached — your files never leave the device.');
    const old = document.getElementById('bg-local-note');
    if (old) old.replaceWith(note);
    else dropzone.insertAdjacentElement('afterend', note);
  },

  // Free disk space from models that are no longer shipped (e.g. broken q8).
  async purgeRetiredModels() {
    const retiredUrls = ['/assets/models/bg/isnet_q8.onnx', '/assets/models/bg/u2netp.onnx', '/assets/models/bg/isnet_fp32.onnx', '/assets/models/bg/birefnet_lite_fp16.onnx'];
    const retiredIds = ['isnet_q8', 'u2netp', 'isnet_fp32', 'birefnet_lite'];
    try {
      if (typeof caches !== 'undefined') {
        const cache = await caches.open(this.CACHE_NAME);
        for (const u of retiredUrls) cache.delete(u).catch(() => {});
      }
      const db = await this.getDB();
      if (db) {
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        for (const id of retiredIds) { try { store.delete(id); } catch (_) {} }
      }
    } catch (_) {}
  },

  bindEvents() {
    const dropzone = document.getElementById('bg-dropzone');
    const fileInput = document.getElementById('bg-file-input');
    const resetBtn = document.getElementById('bg-reset-btn');
    const downloadBtn = document.getElementById('bg-download-btn');
    const colorPicker = document.getElementById('bg-custom-color-picker');

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      if (e.target.files?.length) {
        this.handleFile(e.target.files[0]);
      }
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('border-indigo-500', 'bg-indigo-50/20');
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

    resetBtn?.addEventListener('click', () => this.reset());
    document.getElementById('bg-cancel-btn')?.addEventListener('click', () => this.cancel());
    downloadBtn?.addEventListener('click', () => this.downloadResult());

    // Background color toggles
    document.querySelectorAll('.bg-color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.bg-color-btn').forEach(b => {
          b.classList.remove('ring-2', 'ring-indigo-500', 'border-indigo-500');
        });
        btn.classList.add('ring-2', 'ring-indigo-500', 'border-indigo-500');

        const mode = btn.getAttribute('data-bg-mode');
        this.activeBgMode = mode;
        if (mode === 'custom' && colorPicker) {
          colorPicker.click();
        } else {
          this.renderCanvas();
        }
      });
    });

    colorPicker?.addEventListener('input', (e) => {
      this.customBgColor = e.target.value;
      this.activeBgMode = 'custom';
      this.renderCanvas();
    });
  },

  cancel() {
    this.isCancelled = true;
    this.isProcessing = false;
    this.reset();
  },

  reset() {
    this.currentFile = null;
    this.originalImage = null;
    this.cutoutImage = null;
    this.isProcessing = false;
    this.activeBgMode = 'transparent';

    const dropzone = document.getElementById('bg-dropzone');
    const loadingState = document.getElementById('bg-loading-state');
    const resultState = document.getElementById('bg-result-state');
    const fileInput = document.getElementById('bg-file-input');

    if (fileInput) fileInput.value = '';
    dropzone?.classList.remove('hidden');
    loadingState?.classList.add('hidden');
    resultState?.classList.add('hidden');
  },

  async loadOrt() {
    if (typeof ort !== 'undefined') return true;
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = '/assets/js/vendor/ort/ort.all.min.js';
      script.onload = () => {
        if (typeof ort !== 'undefined') {
          ort.env.wasm.wasmPaths = '/assets/js/vendor/ort/';
          ort.env.wasm.numThreads = Math.min(4, (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 2);
          ort.env.wasm.simd = true;
        }
        resolve(true);
      };
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  },

  async getDB() {
    return new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  },

  async getCachedModel(id) {
    try {
      // 1. Check in-memory buffer (must belong to the requested model AND be complete)
      if (this._cachedBufferId === id && this._cachedBuffer && this._cachedBuffer.byteLength === this.MODEL.sizeBytes) {
        return this._cachedBuffer.slice(0);
      }

      // 2. Check CacheStorage API (PWA persistent cache)
      if (typeof caches !== 'undefined') {
        try {
          const cache = await caches.open(this.CACHE_NAME);
          const match = await cache.match(this.MODEL.url);
          if (match) {
            const buf = await match.arrayBuffer();
            if (buf && buf.byteLength === this.MODEL.sizeBytes) {
              this._cachedBuffer = buf.slice(0);
              this._cachedBufferId = id;
              return buf;
            }
            // Truncated/partial download must never shadow a fresh one
            cache.delete(this.MODEL.url).catch(() => {});
          }
        } catch (_) {}
      }

      // 3. Fallback: Check IndexedDB
      const db = await this.getDB();
      if (!db) return null;
      return new Promise((resolve) => {
        const tx = db.transaction(this.STORE_NAME, 'readonly');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => {
          const res = req.result;
          if (res && res.byteLength === this.MODEL.sizeBytes) {
            this._cachedBuffer = res.slice(0);
            this._cachedBufferId = id;
            resolve(res);
          } else if (res) {
            try {
              const tx2 = db.transaction(this.STORE_NAME, 'readwrite');
              tx2.objectStore(this.STORE_NAME).delete(id);
            } catch (_) {}
            resolve(null);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  async saveModelToCache(id, buffer) {
    try {
      const copy1 = buffer.slice(0);
      const copy2 = buffer.slice(0);
      this._cachedBuffer = copy1;
      this._cachedBufferId = id;

      // 1. Save to CacheStorage API
      if (typeof caches !== 'undefined') {
        try {
          const cache = await caches.open(this.CACHE_NAME);
          await cache.put(this.MODEL.url, new Response(copy2, {
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Length': String(copy2.byteLength)
            }
          }));
        } catch (e) {
          console.warn('CacheStorage write warning:', e);
        }
      }

      // 2. Save to IndexedDB
      const db = await this.getDB();
      if (db) {
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        store.put(buffer.slice(0), id);
      }
    } catch (e) {
      console.warn('Could not cache model:', e);
    }
  },

  async fetchModelBuffer(onProgress) {
    const isRu = (window.I18N?.currentLang || 'en') === 'ru';
    
    // Check persistent caches
    const cached = await this.getCachedModel(this.MODEL.id);
    if (cached) {
      if (onProgress) onProgress(40, isRu ? 'AI нейросеть загружена из локального кэша (офлайн)...' : 'AI model loaded from local browser cache (offline)...');
      return cached;
    }

    if (onProgress) onProgress(10, isRu
      ? `Скачивается нейросеть ${this.MODEL.name} (~${this.MODEL.sizeMB} МБ, только один раз — потом из кэша)...`
      : `Downloading ${this.MODEL.name} neural network (~${this.MODEL.sizeMB} MB, once only — then cached)...`);

    // A partial download must never reach the cache: on any failure or size
    // mismatch, retry (bad connections on 170MB do happen) before giving up.
    const MAX_ATTEMPTS = 3;
    let lastErr = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const buffer = await this.downloadModelOnce(onProgress, isRu);
        if (buffer === null) return null; // cancelled
        if (buffer.byteLength !== this.MODEL.sizeBytes) {
          throw new Error(`Incomplete download: ${buffer.byteLength}/${this.MODEL.sizeBytes} bytes`);
        }
        await this.saveModelToCache(this.MODEL.id, buffer);
        return buffer;
      } catch (e) {
        lastErr = e;
        if (this.isCancelled) return null;
        console.warn(`[bg-remover] model download attempt ${attempt}/${MAX_ATTEMPTS} failed:`, e && e.message);
        if (attempt < MAX_ATTEMPTS && onProgress) {
          onProgress(10, isRu ? 'Сбой загрузки, повтор...' : 'Download failed, retrying...');
        }
        await new Promise((r) => setTimeout(r, 600 * attempt));
      }
    }
    throw lastErr || new Error('Model download failed');
  },

  async downloadModelOnce(onProgress, isRu) {
    const resp = await fetch(this.MODEL.url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} loading model`);

    const contentLength = resp.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : this.MODEL.sizeBytes;
    const reader = resp.body.getReader();
    const chunks = [];
    let received = 0;

    while (true) {
      if (this.isCancelled) {
        try { reader.cancel(); } catch (_) {}
        return null;
      }
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      const pct = Math.min(95, Math.round((received / total) * 100));
      const mbReceived = (received / (1024 * 1024)).toFixed(1);
      const mbTotal = (total / (1024 * 1024)).toFixed(1);
      if (onProgress) {
        onProgress(
          Math.max(10, Math.round(pct * 0.5)),
          isRu
            ? `${this.MODEL.name}: загрузка модели (${mbReceived} / ${mbTotal} МБ, кэшируется навсегда)...`
            : `${this.MODEL.name}: downloading model (${mbReceived} / ${mbTotal} MB, caching permanently)...`
        );
      }
    }

    const fullBuffer = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      fullBuffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return fullBuffer.buffer;
  },

  _failedModelIds() {
    try { return (sessionStorage.getItem('bg_failed_models') || '').split(',').filter(Boolean); }
    catch (_) { return []; }
  },

  // Concurrent-safe session getter: a quiet background preload and a user
  // dropping a file must share one download, with the progress bar switching
  // to whoever is watching right now.
  async getSession(onProgress) {
    if (this.session) return this.session;
    if (typeof onProgress === 'function') this._onProgress = onProgress;
    if (this._loadingPromise) {
      try { return await this._loadingPromise; } catch (e) { return null; }
    }
    this._loadingPromise = this._createSession((pct, msg) => {
      if (typeof this._onProgress === 'function') this._onProgress(pct, msg);
      this.updatePreloadNote(pct);
    });
    try {
      return await this._loadingPromise;
    } finally {
      this._loadingPromise = null;
    }
  },

  updatePreloadNote(pct) {
    if (this.isProcessing) return; // the real progress bar owns the screen
    const note = document.getElementById('bg-local-note');
    if (!note) return;
    if (pct >= 60) {
      if (this._notePct !== 'ready') { this._notePct = 'ready'; note.dataset.base = note.dataset.base || note.textContent; note.textContent = this.t('bg_preload_ready', 'Нейросеть готова — работает из кэша.', 'Neural network ready — runs from cache.'); }
      return;
    }
    this._notePct = pct;
    if (note.dataset.base === undefined) note.dataset.base = note.textContent;
    note.textContent = `${note.dataset.base} · ${Math.max(0, Math.round(pct))}%`;
  },

  async _createSession(onProgress) {
    if (!ok || typeof ort === 'undefined') return null;

    // Models that already failed in this tab (typically OOM on weak devices)
    // are skipped for the session — no wasted 94MB+ downloads and init.
    // A fresh tab/session retries.
    if (!this._activeKey) {
      const failed = this._failedModelIds();
      const nextKey = this.MODEL_CHAIN.find((k) => !failed.includes(this.MODELS[k].id));
      if (nextKey && nextKey !== 'quality') {
        this._activeKey = nextKey;
        this._fallbackNote = 'unavailable this session';
      }
    }

    const chainIndex = this.MODEL_CHAIN.indexOf(this._activeKey || 'quality');

    try {
      const isRu = (window.I18N?.currentLang || 'en') === 'ru';
      const buffer = await this.fetchModelBuffer(onProgress);

      if (onProgress) onProgress(55, isRu ? 'Инициализация нейросети...' : 'Initializing neural engine...');

      // Pass a clone so ORT memory transfers never detach our cached buffer.
      // WebGPU first where available: faster and weights live in VRAM instead
      // of the wasm heap (wasm-only devices with low memory are exactly where
      // big fp32 models die).
      const useGpu = !this._gpuBanned && typeof navigator !== 'undefined' && !!navigator.gpu;
      const create = (eps) => ort.InferenceSession.create(buffer.slice(0), { executionProviders: eps });
      try {
        this.session = useGpu ? await create(['webgpu', 'wasm']) : await create(['wasm']);
      } catch (e) {
        if (!useGpu) throw e;
        console.warn('[bg-remover] WebGPU init failed, retrying wasm-only:', e);
        this.session = await create(['wasm']);
      }
      this._sessionUsedGpu = useGpu;

      // The compiled session no longer needs the raw weights in RAM; the model
      // stays in CacheStorage for next visits. Frees the model size in RAM.
      this._cachedBuffer = null;
      return this.session;
    } catch (e) {
      const nextKey = this.MODEL_CHAIN[chainIndex + 1];
      if (nextKey) {
        // Visible downgrade: the user must know why quality dropped
        const failedName = this.MODEL.name;
        const reason = String((e && e.message) || e).slice(0, 80);
        console.warn(`[bg-remover] ${failedName} failed (${reason}), falling back to ${this.MODELS[nextKey].name}`);
        try {
          const failed = this._failedModelIds();
          failed.push(this.MODELS[this.MODEL_CHAIN[chainIndex]].id);
          sessionStorage.setItem('bg_failed_models', failed.join(','));
        } catch (_) {}
        this._fallbackNote = reason;
        if (onProgress) {
          const ru = (window.I18N?.currentLang || 'en') === 'ru';
          onProgress(15, ru
            ? `${failedName} не запустилась — включаю резервную ${this.MODELS[nextKey].name} (~${this.MODELS[nextKey].sizeMB} МБ)...`
            : `${failedName} failed to start — switching to backup ${this.MODELS[nextKey].name} (~${this.MODELS[nextKey].sizeMB} MB)...`);
        }
        this._activeKey = nextKey;
        this.session = null;
        this._cachedBuffer = null;
        this._cachedBufferId = null;
        return this.getSession(onProgress);
      }
      console.warn('Failed to initialize ONNX session:', e);
      return null;
    }
  },

  // Cheap sanity check on a produced mask: it must have both a value spread
  // and mass on at least one end of the range (background or foreground).
  // A flat/NaN mid-gray mask means the execution backend miscomputed.
  _maskLooksValid(maskData, minVal, maxVal) {
    const range = maxVal - minVal;
    if (!isFinite(range) || range < 1e-3) return false;
    let nan = 0, lo = 0, hi = 0, cnt = 0;
    const step = Math.max(1, Math.floor(maskData.length / 5000));
    for (let i = 0; i < maskData.length; i += step) {
      const v = maskData[i];
      cnt++;
      if (Number.isNaN(v)) { nan++; continue; }
      const norm = (v - minVal) / range;
      if (norm < 0.15) lo++;
      else if (norm > 0.85) hi++;
    }
    if (!cnt || nan / cnt > 0.01) return false;
    return (lo / cnt > 0.01) || (hi / cnt > 0.01);
  },

  async neuralRemove(file, onProgress) {
    let session = await this.getSession(onProgress);
    if (!session) throw new Error('Neural model unavailable');

    const isRu = (window.I18N?.currentLang || 'en') === 'ru';
    if (onProgress) onProgress(65, isRu ? 'Подготовка изображения...' : 'Preprocessing image...');

    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      const url = URL.createObjectURL(file);
      i.onload = () => { URL.revokeObjectURL(url); resolve(i); };
      i.onerror = reject;
      i.src = url;
    });

    const origW = img.naturalWidth || 800;
    const origH = img.naturalHeight || 600;

    const inSize = this.MODEL.inputSize || 320;
    const inCanvas = document.createElement('canvas');
    inCanvas.width = inSize;
    inCanvas.height = inSize;
    const inCtx = inCanvas.getContext('2d');
    inCtx.drawImage(img, 0, 0, inSize, inSize);

    const imgData = inCtx.getImageData(0, 0, inSize, inSize);
    const data = imgData.data;

    const mean = this.MODEL.mean;
    const std = this.MODEL.std;
    const planeSize = inSize * inSize;
    const floatArr = new Float32Array(3 * planeSize);

    for (let i = 0; i < planeSize; i++) {
      const r = data[i * 4] / 255.0;
      const g = data[i * 4 + 1] / 255.0;
      const b = data[i * 4 + 2] / 255.0;
      floatArr[i] = (r - mean[0]) / std[0];
      floatArr[planeSize + i] = (g - mean[1]) / std[1];
      floatArr[2 * planeSize + i] = (b - mean[2]) / std[2];
    }

    const tensor = new ort.Tensor('float32', floatArr, [1, 3, inSize, inSize]);
    const feeds = {};
    feeds[session.inputNames[0]] = tensor;

    if (onProgress) onProgress(80, isRu ? 'Нейросетевая сегментация контуров...' : 'Neural segmentation in progress...');
    let results = await session.run(feeds);
    let outputTensor = results[session.outputNames[0]];
    let maskData = outputTensor.data;

    // BiRefNet exports raw logits (±20): sigmoid them into a [0,1] matte BEFORE
    // any normalization, otherwise min-max stretching turns the whole image
    // into a ~50% translucent ghost (no opaque foreground left at all).
    if (this.MODEL.sigmoidOutput) {
      const sigmoided = new Float32Array(maskData.length);
      for (let i = 0; i < maskData.length; i++) {
        sigmoided[i] = 1 / (1 + Math.exp(-maskData[i]));
      }
      maskData = sigmoided;
    }

    let minVal = Infinity, maxVal = -Infinity;
    for (let i = 0; i < maskData.length; i++) {
      const v = maskData[i];
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }

    // A WebGPU EP can half-initialize (nodes silently left on another EP) and
    // then emit a flat/NaN mask instead of throwing. Detect garbage output and
    // recompute once on a pure-CPU session; ban WebGPU for this tab.
    if (!this._maskLooksValid(maskData, minVal, maxVal) && this._sessionUsedGpu && !this._gpuBanned) {
      console.warn('[bg-remover] WebGPU produced an invalid mask — switching to CPU-only and retrying');
      this._gpuBanned = true;
      this.session = null;
      this._sessionUsedGpu = false;
      session = await this.getSession(onProgress);
      if (!session) throw new Error('Neural model unavailable');
      results = await session.run(feeds);
      outputTensor = results[session.outputNames[0]];
      maskData = outputTensor.data;
      minVal = Infinity; maxVal = -Infinity;
      for (let i = 0; i < maskData.length; i++) {
        const v = maskData[i];
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      }
    }

    const valRange = (maxVal - minVal) || 1e-6;

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = inSize;
    maskCanvas.height = inSize;
    const maskCtx = maskCanvas.getContext('2d');
    const maskImgData = maskCtx.createImageData(inSize, inSize);
    const mData = maskImgData.data;

    // Continuous alpha matte (rembg-style): the sigmoid output maps straight
    // to opacity, so hair/fur semi-transparent zones survive. A hard threshold
    // here is what used to eat hair strands and left crunchy edges.
    for (let i = 0; i < planeSize; i++) {
      const norm = (maskData[i] - minVal) / valRange;
      const alpha = Math.max(0, Math.min(255, Math.round(norm * 255)));
      const idx = i * 4;
      mData[idx] = 255;
      mData[idx + 1] = 255;
      mData[idx + 2] = 255;
      mData[idx + 3] = alpha;
    }
    maskCtx.putImageData(maskImgData, 0, 0);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = origW;
    outCanvas.height = origH;
    const outCtx = outCanvas.getContext('2d');
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';

    outCtx.drawImage(img, 0, 0);
    outCtx.globalCompositeOperation = 'destination-in';
    outCtx.drawImage(maskCanvas, 0, 0, origW, origH);
    outCtx.globalCompositeOperation = 'source-over';

    if (onProgress) onProgress(95, isRu ? 'Финальная отрисовка...' : 'Final rendering...');
    return new Promise((resolve) => {
      outCanvas.toBlob((blob) => resolve(blob || file), 'image/png');
    });
  },

  async canvasRemove(file) {
    return new Promise((resolve) => {
      const img = new Image();
      const objUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objUrl);
        const canvas = document.createElement('canvas');
        const w = img.naturalWidth || 800;
        const h = img.naturalHeight || 600;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        let bgR = 0, bgG = 0, bgB = 0;
        const samples = [
          0,
          (w - 1) * 4,
          (h - 1) * w * 4,
          ((h - 1) * w + (w - 1)) * 4
        ];
        samples.forEach(idx => {
          bgR += data[idx];
          bgG += data[idx + 1];
          bgB += data[idx + 2];
        });
        bgR /= 4; bgG /= 4; bgB /= 4;

        const threshold = 35;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
          if (dist < threshold) {
            data[i + 3] = 0;
          } else if (dist < threshold + 25) {
            const factor = (dist - threshold) / 25;
            data[i + 3] = Math.round(data[i + 3] * factor);
          }
        }

        ctx.putImageData(imgData, 0, 0);
        canvas.toBlob((blob) => resolve(blob || file), 'image/png');
      };
      img.onerror = () => resolve(file);
      img.src = objUrl;
    });
  },

  async removeBackground(file, onProgress) {
    try {
      return await this.neuralRemove(file, onProgress);
    } catch (e) {
      console.warn('Neural segmentation fallback to color distance:', e);
      return await this.canvasRemove(file);
    }
  },

  async handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert(window.I18N?.currentLang === 'ru' ? 'Пожалуйста, выберите изображение (JPG, PNG, WebP)' : 'Please select an image file (JPG, PNG, WebP)');
      return;
    }

    this.currentFile = file;
    this.isProcessing = true;
    this.isCancelled = false;

    const dropzone = document.getElementById('bg-dropzone');
    const loadingState = document.getElementById('bg-loading-state');
    const resultState = document.getElementById('bg-result-state');
    const progressFill = document.getElementById('bg-progress-fill');
    const progressLabel = document.getElementById('bg-progress-label');
    const progressPercent = document.getElementById('bg-progress-percent');

    dropzone?.classList.add('hidden');
    resultState?.classList.add('hidden');
    loadingState?.classList.remove('hidden');

    const updateProgress = (pct, label) => {
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (progressPercent) progressPercent.textContent = `${pct}%`;
      if (progressLabel && label) progressLabel.textContent = label;
    };

    const isRu = (window.I18N?.currentLang || 'en') === 'ru';
    updateProgress(5, isRu ? 'Чтение файла...' : 'Reading image file...');

    try {
      const originalDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(file);
      });

      const origImg = new Image();
      await new Promise((resolve, reject) => {
        origImg.onload = resolve;
        origImg.onerror = () => reject(new Error('Failed to decode image data'));
        origImg.src = originalDataUrl;
      });
      this.originalImage = origImg;

      const resultBlob = await this.removeBackground(file, updateProgress);
      if (this.isCancelled) return;

      updateProgress(100, isRu ? 'Готово!' : 'Complete!');
      await new Promise(r => setTimeout(r, 60));

      const resultDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read result blob'));
        reader.readAsDataURL(resultBlob);
      });

      const cutImg = new Image();
      await new Promise((resolve, reject) => {
        cutImg.onload = resolve;
        cutImg.onerror = () => reject(new Error('Failed to decode result image'));
        cutImg.src = resultDataUrl;
      });
      this.cutoutImage = cutImg;

      loadingState?.classList.add('hidden');
      resultState?.classList.remove('hidden');

      this.showModelNote();

      const origPreview = document.getElementById('bg-orig-preview');
      if (origPreview) origPreview.src = originalDataUrl;

      this.renderCanvas();

    } catch (err) {
      console.error('Background removal error:', err);
      this.reset();
    } finally {
      this.isProcessing = false;
    }
  },

  // Always name the model that actually produced the cutout — the user must
  // be able to tell what is running (and that it stays on the device).
  showModelNote() {
    const state = document.getElementById('bg-result-state');
    if (!state) return;
    let note = document.getElementById('bg-model-note');
    if (!note) {
      note = document.createElement('div');
      note.id = 'bg-model-note';
      state.insertBefore(note, state.firstChild);
    }
    const m = this.MODEL;
    note.className = 'text-[11px] leading-snug text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2';
    note.textContent = this.t('bg_model_note',
      `Локальная модель: ${m.name} (${m.sizeMB} МБ) — файлы не покидают устройство`,
      `Local model: ${m.name} (${m.sizeMB} MB) — files never leave the device`)
      .replace('{name}', m.name).replace('{mb}', m.sizeMB);
  },

  renderCanvas() {
    const canvas = document.getElementById('bg-result-canvas');
    if (!canvas || !this.cutoutImage) return;

    const ctx = canvas.getContext('2d');
    const img = this.cutoutImage;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (this.activeBgMode === 'white') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (this.activeBgMode === 'black') {
      ctx.fillStyle = '#0b0c0e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (this.activeBgMode === 'custom') {
      ctx.fillStyle = this.customBgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0);

    const container = document.getElementById('bg-result-canvas-container');
    if (container) {
      if (this.activeBgMode === 'transparent') {
        container.style.backgroundImage = 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)';
        container.style.backgroundSize = '16px 16px';
        container.style.backgroundPosition = '0 0, 0 8px, 8px -8px, -8px 0px';
      } else {
        container.style.backgroundImage = 'none';
      }
    }
  },

  downloadResult() {
    const canvas = document.getElementById('bg-result-canvas');
    if (!canvas) return;

    const baseName = (this.currentFile?.name || 'cutout').replace(/\.[^/.]+$/, '');
    const ext = this.activeBgMode === 'transparent' ? 'png' : 'png';
    const mime = 'image/png';

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}_cutout.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, mime);
  }
};

if (typeof window !== 'undefined') {
  window.BgRemover = BgRemover;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BgRemover;
}
