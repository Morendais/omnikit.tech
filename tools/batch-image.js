/**
 * OmniKit Batch Image Studio (100% In-Browser / Client-Side)
 * Batch folder & multi-file processor: target file size (e.g. 200 KB for Gosuslugi),
 * compression, format conversion, and instant ZIP generation with zero server uploads.
 */

const BatchImageStudio = {
  items: [],
  isProcessing: false,
  shouldCancel: false,
  activeMode: 'target', // 'target' | 'quality' | 'convert' | 'resize'
  targetKb: 200,
  quality: 0.8,
  targetFormat: 'original',
  resizePreset: 'none',
  concurrency: 3,

  init() {
    this.bindEvents();
    this.handleSharedFiles();
  },

  bindEvents() {
    const dropzone = document.getElementById('batch-dropzone');
    const fileInput = document.getElementById('batch-file-input');
    const folderInput = document.getElementById('batch-folder-input');
    const startBtn = document.getElementById('batch-start-btn');
    const clearBtn = document.getElementById('batch-clear-btn');
    const zipBtn = document.getElementById('batch-download-zip');
    const targetKbInput = document.getElementById('batch-target-kb');
    const qualitySlider = document.getElementById('batch-quality-slider');
    const qualityVal = document.getElementById('batch-quality-val');

    if (!dropzone) return;

    // Dropzone Drag & Drop
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('border-indigo-500', 'bg-indigo-500/10');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('border-indigo-500', 'bg-indigo-500/10');
      });
    });

    dropzone.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.items && e.dataTransfer.items.length) {
        const files = await this.scanDataTransferItems(e.dataTransfer.items);
        if (files.length) this.addFiles(files);
      } else if (e.dataTransfer.files && e.dataTransfer.files.length) {
        this.addFiles(Array.from(e.dataTransfer.files));
      }
    });

    // File & Folder input triggers
    fileInput?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length) {
        this.addFiles(Array.from(e.target.files));
        fileInput.value = '';
      }
    });

    folderInput?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length) {
        this.addFiles(Array.from(e.target.files));
        folderInput.value = '';
      }
    });

    // Mode Selector Tabs
    document.querySelectorAll('.batch-mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = btn.getAttribute('data-mode');
        this.setMode(mode);
      });
    });

    // Target KB Preset Pills
    document.querySelectorAll('.batch-preset-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const kb = parseInt(pill.getAttribute('data-kb'), 10);
        if (targetKbInput && !isNaN(kb)) {
          targetKbInput.value = kb;
          this.targetKb = kb;
          document.querySelectorAll('.batch-preset-pill').forEach(p => p.classList.remove('active-pill', 'bg-indigo-600', 'text-white'));
          pill.classList.add('active-pill', 'bg-indigo-600', 'text-white');
        }
      });
    });

    targetKbInput?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val > 0) this.targetKb = val;
    });

    qualitySlider?.addEventListener('input', (e) => {
      const q = parseInt(e.target.value, 10);
      this.quality = q / 100;
      if (qualityVal) qualityVal.textContent = `${q}%`;
    });

    // Format & Resize dropdowns
    document.getElementById('batch-format-select')?.addEventListener('change', (e) => {
      this.targetFormat = e.target.value;
    });

    document.getElementById('batch-resize-select')?.addEventListener('change', (e) => {
      this.resizePreset = e.target.value;
    });

    // Action buttons
    const cancelBtn = document.getElementById('batch-cancel-btn');
    startBtn?.addEventListener('click', () => {
      if (this.isProcessing) {
        this.shouldCancel = true;
        startBtn.disabled = true;
      } else {
        this.processBatch();
      }
    });

    cancelBtn?.addEventListener('click', () => {
      if (this.isProcessing) {
        this.shouldCancel = true;
        cancelBtn.classList.add('hidden');
        if (startBtn) {
          startBtn.disabled = true;
          const isRu = (window.I18N?.currentLang || 'en') === 'ru';
          startBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>${isRu ? 'Остановка...' : 'Stopping...'}</span>`;
          if (window.lucide) lucide.createIcons();
        }
      }
    });

    clearBtn?.addEventListener('click', () => {
      this.clearAll();
    });

    zipBtn?.addEventListener('click', () => {
      this.downloadZip();
    });
  },

  async handleSharedFiles() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('shared') || !('caches' in window)) return;
    try {
      const cache = await caches.open('omnikit-shared-files');
      const keys = await cache.keys();
      const files = [];
      for (const req of keys) {
        const res = await cache.match(req);
        if (res) {
          const blob = await res.blob();
          const filename = `shared-image-${Date.now()}-${files.length + 1}.jpg`;
          files.push(new File([blob], filename, { type: blob.type || 'image/jpeg' }));
          await cache.delete(req);
        }
      }
      if (files.length) {
        this.addFiles(files);
        if (window.App && typeof App.showToast === 'function') {
          App.showToast(`Получено ${files.length} фото из меню Android "Поделиться"`);
        }
      }
    } catch (e) {
      console.warn('Share target retrieval failed:', e);
    }
  },

  setMode(mode) {
    this.activeMode = mode;
    document.querySelectorAll('.batch-mode-btn').forEach(b => {
      const isActive = b.getAttribute('data-mode') === mode;
      b.classList.toggle('border-indigo-600', isActive);
      b.classList.toggle('text-indigo-600', isActive);
      b.classList.toggle('dark:text-indigo-400', isActive);
      b.classList.toggle('bg-indigo-50/50', isActive);
      b.classList.toggle('dark:bg-indigo-950/20', isActive);
    });

    document.getElementById('batch-mode-target-panel')?.classList.toggle('hidden', mode !== 'target');
    document.getElementById('batch-mode-quality-panel')?.classList.toggle('hidden', mode !== 'quality');
    document.getElementById('batch-mode-convert-panel')?.classList.toggle('hidden', mode !== 'convert');
    document.getElementById('batch-mode-resize-panel')?.classList.toggle('hidden', mode !== 'resize');
  },

  async scanDataTransferItems(items) {
    const files = [];
    const queue = [];

    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry ? items[i].webkitGetAsEntry() : null;
      if (entry) queue.push(entry);
      else {
        const file = items[i].getAsFile();
        if (file && this.isImage(file)) files.push(file);
      }
    }

    const readDirectory = (dirEntry) => {
      return new Promise((resolve) => {
        const reader = dirEntry.createReader();
        const dirFiles = [];
        const readEntries = () => {
          reader.readEntries((entries) => {
            if (!entries.length) resolve(dirFiles);
            else {
              dirFiles.push(...entries);
              readEntries();
            }
          }, () => resolve(dirFiles));
        };
        readEntries();
      });
    };

    while (queue.length > 0) {
      const entry = queue.shift();
      if (entry.isFile) {
        await new Promise((resolve) => {
          entry.file((file) => {
            if (this.isImage(file)) files.push(file);
            resolve();
          }, () => resolve());
        });
      } else if (entry.isDirectory) {
        const subEntries = await readDirectory(entry);
        queue.push(...subEntries);
      }
    }

    return files;
  },

  isImage(file) {
    return file.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp|gif|avif|heic|heif)$/i.test(file.name);
  },

  addFiles(newFiles) {
    const valid = newFiles.filter(f => this.isImage(f));
    if (!valid.length) return;

    valid.forEach(file => {
      const id = 'item-' + Math.random().toString(36).substr(2, 9);
      this.items.push({
        id,
        file,
        name: file.name,
        size: file.size,
        type: file.type || 'image/jpeg',
        status: 'pending', // 'pending' | 'processing' | 'done' | 'error'
        outputBlob: null,
        outputSize: 0,
        outputUrl: null
      });
    });

    document.getElementById('batch-controls')?.classList.remove('hidden');
    document.getElementById('batch-progress-box')?.classList.remove('hidden');
    document.getElementById('batch-table-container')?.classList.remove('hidden');
    this.renderQueue();
    this.updateStats();
  },

  renderQueue() {
    const tbody = document.getElementById('batch-table-body');
    const badge = document.getElementById('batch-count-badge');
    if (badge) badge.textContent = `${this.items.length} ${this.items.length === 1 ? 'файл' : 'файлов'}`;
    if (!tbody) return;

    tbody.innerHTML = '';
    const isRu = (window.I18N?.currentLang || 'en') === 'ru';

    this.items.forEach(item => {
      const tr = document.createElement('tr');
      tr.id = `row-${item.id}`;
      tr.className = 'border-b border-neutral-100 dark:border-neutral-800 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition';

      let statusHtml = '';
      if (item.status === 'pending') {
        statusHtml = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">${isRu ? 'Ожидание' : 'Pending'}</span>`;
      } else if (item.status === 'processing') {
        statusHtml = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 animate-pulse"><i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i> ${isRu ? 'Сжатие...' : 'Processing...'}</span>`;
      } else if (item.status === 'done') {
        const savings = item.size > item.outputSize ? Math.round(((item.size - item.outputSize) / item.size) * 100) : 0;
        statusHtml = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">${isRu ? 'Готово' : 'Done'} (-${savings}%)</span>`;
      } else {
        statusHtml = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">${isRu ? 'Ошибка' : 'Error'}</span>`;
      }

      const outSizeText = item.outputSize > 0 ? this.formatBytes(item.outputSize) : '—';
      const downloadBtnHtml = item.outputBlob
        ? `<button type="button" class="batch-dl-single p-1 text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition" data-id="${item.id}" title="${isRu ? 'Скачать файл' : 'Download file'}"><i data-lucide="download" class="w-4 h-4"></i></button>`
        : '';

      const safeName = String(item.name || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
      tr.innerHTML = `
        <td class="py-2.5 px-3 font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[180px]" title="${safeName}">${safeName}</td>
        <td class="py-2.5 px-3 text-neutral-500 font-mono">${this.formatBytes(item.size)}</td>
        <td class="py-2.5 px-3 text-neutral-800 dark:text-neutral-200 font-mono font-semibold" id="outsize-${item.id}">${outSizeText}</td>
        <td class="py-2.5 px-3" id="status-${item.id}">${statusHtml}</td>
        <td class="py-2.5 px-3 text-right" id="action-${item.id}">${downloadBtnHtml}</td>
      `;

      tbody.appendChild(tr);
    });

    if (window.lucide) lucide.createIcons();

    // Bind individual download buttons
    tbody.querySelectorAll('.batch-dl-single').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.downloadSingle(id);
      });
    });
  },

  updateStats() {
    const totalFiles = this.items.length;
    const doneFiles = this.items.filter(i => i.status === 'done').length;
    const origBytes = this.items.reduce((acc, i) => acc + i.size, 0);
    const procBytes = this.items.filter(i => i.outputSize > 0).reduce((acc, i) => acc + i.outputSize, 0);

    const percent = totalFiles > 0 ? Math.round((doneFiles / totalFiles) * 100) : 0;
    const progressFill = document.getElementById('batch-progress-fill');
    const progressText = document.getElementById('batch-progress-text');
    const statsText = document.getElementById('batch-stats-summary');
    const isRu = (window.I18N?.currentLang || 'en') === 'ru';

    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressText) {
      progressText.textContent = `${doneFiles} / ${totalFiles} (${percent}%)`;
    }
    if (statsText && origBytes > 0) {
      if (doneFiles > 0) {
        const savedBytes = origBytes - procBytes;
        const savedPercent = origBytes > 0 ? Math.round((savedBytes / origBytes) * 100) : 0;
        statsText.textContent = isRu
          ? `Исходный вес: ${this.formatBytes(origBytes)} → Итоговый: ${this.formatBytes(procBytes)} (Экономия: ${savedPercent}%)`
          : `Original: ${this.formatBytes(origBytes)} → Final: ${this.formatBytes(procBytes)} (Saved: ${savedPercent}%)`;
      } else {
        statsText.textContent = isRu
          ? `Всего в очереди: ${this.formatBytes(origBytes)} (${totalFiles} фото)`
          : `Queued: ${this.formatBytes(origBytes)} (${totalFiles} photos)`;
      }
    }

    const zipBtn = document.getElementById('batch-download-zip');
    if (zipBtn) {
      zipBtn.disabled = doneFiles === 0;
      if (doneFiles > 0) {
        zipBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      } else {
        zipBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }
    }
  },

  async processBatch() {
    if (this.isProcessing || !this.items.length) return;
    this.isProcessing = true;
    this.shouldCancel = false;

    const startBtn = document.getElementById('batch-start-btn');
    const cancelBtn = document.getElementById('batch-cancel-btn');
    const isRu = (window.I18N?.currentLang || 'en') === 'ru';
    if (cancelBtn) cancelBtn.classList.remove('hidden');
    if (startBtn) {
      startBtn.innerHTML = `<i data-lucide="square" class="w-4 h-4"></i> <span>${isRu ? 'Остановить' : 'Stop'}</span>`;
      if (window.lucide) lucide.createIcons();
    }

    const queue = [...this.items.filter(i => i.status === 'pending')];
    const workers = Math.min(this.concurrency, queue.length);
    let activePromises = [];

    const runNext = async () => {
      if (this.shouldCancel || queue.length === 0) return;
      const item = queue.shift();
      item.status = 'processing';
      this.updateItemRow(item);

      try {
        await this.processItem(item);
        item.status = 'done';
      } catch (e) {
        console.error('Batch item error:', e);
        item.status = 'error';
      }

      this.updateItemRow(item);
      this.updateStats();

      if (!this.shouldCancel && queue.length > 0) {
        await runNext();
      }
    };

    for (let w = 0; w < workers; w++) {
      activePromises.push(runNext());
    }

    await Promise.all(activePromises);

    this.isProcessing = false;
    this.shouldCancel = false;
    if (cancelBtn) cancelBtn.classList.add('hidden');
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.innerHTML = `<i data-lucide="play" class="w-4 h-4"></i> <span>${isRu ? 'Обработать всё' : 'Process all'}</span>`;
      if (window.lucide) lucide.createIcons();
    }

    const doneCount = this.items.filter(i => i.status === 'done').length;
    if (doneCount > 0 && window.App && typeof App.showToast === 'function') {
      App.showToast(isRu ? `Обработано ${doneCount} фото. Готово к скачиванию в ZIP!` : `Processed ${doneCount} photos. Ready to download ZIP!`);
    }
  },

  async processItem(item) {
    const img = await this.loadImage(item.file);
    let blob = null;

    if (this.activeMode === 'target') {
      // 🎯 Target File Size (e.g. 200 KB for Gosuslugi)
      const targetBytes = this.targetKb * 1024;
      blob = await this.compressToTarget(img, targetBytes, item.file);
    } else if (this.activeMode === 'quality') {
      // ⚡ Slider Quality Compression
      blob = await this.compressWithQuality(img, this.quality, item.file);
    } else if (this.activeMode === 'convert') {
      // 🔄 Format Conversion
      blob = await this.convertFormat(img, this.targetFormat, item.file);
    } else if (this.activeMode === 'resize') {
      // 📐 Resizing
      blob = await this.resizeImage(img, this.resizePreset, item.file);
    }

    if (blob) {
      item.outputBlob = blob;
      item.outputSize = blob.size;
      item.outputUrl = URL.createObjectURL(blob);
    } else {
      throw new Error('Failed to generate output blob');
    }
  },

  // Decode off the main thread when possible (keeps the UI fluid on large
  // photos); fall back to <img> for exotic codecs. Consumers read dimensions
  // as `img.naturalWidth || img.width`, which both sources satisfy.
  async loadImage(file) {
    if (typeof createImageBitmap === 'function') {
      try {
        return await createImageBitmap(file);
      } catch (_) { /* unsupported codec — fall through to <img> decode */ }
    }
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image decode error'));
      };
      img.src = url;
    });
  },

  // Binary search quality & dimensions downscaling to strictly guarantee <= targetBytes
  async compressToTarget(img, targetBytes, originalFile) {
    // If original already smaller than target, keep original unless user requested format
    if (originalFile.size <= targetBytes) {
      return originalFile;
    }

    const canvas = document.createElement('canvas');
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // Prefer WebP or JPEG for arbitrary target sizes
    const mimeType = 'image/jpeg';

    const getBlob = (cvs, q) => new Promise(res => cvs.toBlob(res, mimeType, q));

    // Binary search quality between 0.05 and 0.95
    let minQ = 0.05;
    let maxQ = 0.95;
    let bestBlob = null;

    for (let iter = 0; iter < 5; iter++) {
      const midQ = (minQ + maxQ) / 2;
      const b = await getBlob(canvas, midQ);
      if (b.size <= targetBytes) {
        bestBlob = b;
        minQ = midQ; // try higher quality
      } else {
        maxQ = midQ; // need more compression
      }
    }

    if (bestBlob) return bestBlob;

    // If even lowest quality (0.05) exceeds targetBytes, downscale dimensions
    const lowestBlob = await getBlob(canvas, 0.05);
    if (lowestBlob.size <= targetBytes) return lowestBlob;

    // Dimension scaling
    const scaleFactor = Math.sqrt(targetBytes / lowestBlob.size) * 0.92;
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = Math.max(120, Math.round(width * scaleFactor));
    scaledCanvas.height = Math.max(120, Math.round(height * scaleFactor));
    const sCtx = scaledCanvas.getContext('2d');
    sCtx.fillStyle = '#ffffff';
    sCtx.fillRect(0, 0, scaledCanvas.width, scaledCanvas.height);
    sCtx.drawImage(img, 0, 0, scaledCanvas.width, scaledCanvas.height);

    return await getBlob(scaledCanvas, 0.75);
  },

  async compressWithQuality(img, quality, originalFile) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const mime = originalFile.type === 'image/png' ? 'image/jpeg' : (originalFile.type || 'image/jpeg');
    const blob = await new Promise(res => canvas.toBlob(res, mime, quality));

    // Optimal check: if compressed >= original, keep original
    if (blob.size >= originalFile.size) return originalFile;
    return blob;
  },

  async convertFormat(img, targetFormat, originalFile) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');

    const mime = targetFormat === 'original' ? (originalFile.type || 'image/jpeg') : targetFormat;
    if (mime === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return await new Promise(res => canvas.toBlob(res, mime, 0.92));
  },

  async resizeImage(img, preset, originalFile) {
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    if (preset === '1920' && width > 1920) {
      height = Math.round((height * 1920) / width);
      width = 1920;
    } else if (preset === '1280' && width > 1280) {
      height = Math.round((height * 1280) / width);
      width = 1280;
    } else if (preset === '800' && width > 800) {
      height = Math.round((height * 800) / width);
      width = 800;
    } else if (preset === '50') {
      width = Math.round(width * 0.5);
      height = Math.round(height * 0.5);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (originalFile.type === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);

    const mime = originalFile.type || 'image/jpeg';
    return await new Promise(res => canvas.toBlob(res, mime, 0.90));
  },

  updateItemRow(item) {
    const statusCell = document.getElementById(`status-${item.id}`);
    const outSizeCell = document.getElementById(`outsize-${item.id}`);
    const actionCell = document.getElementById(`action-${item.id}`);
    const isRu = (window.I18N?.currentLang || 'en') === 'ru';

    if (outSizeCell && item.outputSize > 0) {
      outSizeCell.textContent = this.formatBytes(item.outputSize);
    }

    if (statusCell) {
      if (item.status === 'processing') {
        statusCell.innerHTML = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 animate-pulse"><i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i> ${isRu ? 'Сжатие...' : 'Processing...'}</span>`;
      } else if (item.status === 'done') {
        const savings = item.size > item.outputSize ? Math.round(((item.size - item.outputSize) / item.size) * 100) : 0;
        statusCell.innerHTML = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">${isRu ? 'Готово' : 'Done'} (-${savings}%)</span>`;
      } else if (item.status === 'error') {
        statusCell.innerHTML = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">${isRu ? 'Ошибка' : 'Error'}</span>`;
      }
    }

    if (actionCell && item.outputBlob) {
      actionCell.textContent = '';
      const dlBtn = document.createElement('button');
      dlBtn.type = 'button';
      dlBtn.className = 'batch-dl-single p-1 text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition';
      dlBtn.setAttribute('data-id', item.id);
      dlBtn.title = isRu ? 'Скачать файл' : 'Download file';
      const dlIcon = document.createElement('i');
      dlIcon.setAttribute('data-lucide', 'download');
      dlIcon.className = 'w-4 h-4';
      dlBtn.appendChild(dlIcon);
      dlBtn.addEventListener('click', () => {
        this.downloadSingle(item.id);
      });
      actionCell.appendChild(dlBtn);
    }

    if (window.lucide) lucide.createIcons();
  },

  async downloadZip() {
    const readyItems = this.items.filter(i => i.outputBlob);
    if (!readyItems.length || !window.JSZip) return;

    const zip = new JSZip();
    const folder = zip.folder('omnikit_processed_images');

    readyItems.forEach(item => {
      let ext = 'jpg';
      if (item.outputBlob.type === 'image/webp') ext = 'webp';
      else if (item.outputBlob.type === 'image/png') ext = 'png';
      else if (item.outputBlob.type === 'image/jpeg') ext = 'jpg';

      const baseName = item.name.replace(/\.[^/.]+$/, '');
      const finalName = `${baseName}_omnikit.${ext}`;
      folder.file(finalName, item.outputBlob);
    });

    const isRu = (window.I18N?.currentLang || 'en') === 'ru';
    const zipBtn = document.getElementById('batch-download-zip');
    if (zipBtn) {
      zipBtn.disabled = true;
      zipBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>${isRu ? 'Упаковка ZIP...' : 'Packing ZIP...'}</span>`;
      if (window.lucide) lucide.createIcons();
    }

    try {
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `omnikit-batch-${readyItems.length}-images.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 60000);

      if (window.App && typeof App.showToast === 'function') {
        App.showToast(isRu ? `Архив ZIP (${readyItems.length} фото) успешно скачан!` : `ZIP archive (${readyItems.length} photos) downloaded!`);
      }
    } catch (e) {
      console.error('ZIP generation error:', e);
    } finally {
      if (zipBtn) {
        zipBtn.disabled = false;
        zipBtn.innerHTML = `<i data-lucide="archive" class="w-4 h-4"></i> <span>${isRu ? 'Скачать всё одним ZIP' : 'Download All as ZIP'}</span>`;
        if (window.lucide) lucide.createIcons();
      }
    }
  },

  downloadSingle(id) {
    const item = this.items.find(i => i.id === id);
    if (!item || !item.outputBlob) return;

    let ext = 'jpg';
    if (item.outputBlob.type === 'image/webp') ext = 'webp';
    else if (item.outputBlob.type === 'image/png') ext = 'png';

    const baseName = item.name.replace(/\.[^/.]+$/, '');
    const a = document.createElement('a');
    a.href = item.outputUrl || URL.createObjectURL(item.outputBlob);
    a.download = `${baseName}_omnikit.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  clearAll() {
    this.items.forEach(i => {
      if (i.outputUrl) URL.revokeObjectURL(i.outputUrl);
    });
    this.items = [];
    this.isProcessing = false;
    this.shouldCancel = false;

    document.getElementById('batch-controls')?.classList.add('hidden');
    document.getElementById('batch-progress-box')?.classList.add('hidden');
    document.getElementById('batch-table-container')?.classList.add('hidden');
    const tbody = document.getElementById('batch-table-body');
    if (tbody) tbody.innerHTML = '';
    const badge = document.getElementById('batch-count-badge');
    if (badge) badge.textContent = '0 файлов';

    const progressFill = document.getElementById('batch-progress-fill');
    if (progressFill) progressFill.style.width = '0%';
    const progressText = document.getElementById('batch-progress-text');
    if (progressText) progressText.textContent = '0 / 0 (0%)';
    const statsText = document.getElementById('batch-stats-summary');
    if (statsText) statsText.textContent = '';
  },

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
};

if (typeof window !== 'undefined') window.BatchImageStudio = BatchImageStudio;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BatchImageStudio;
}
