/**
 * Image Processing Tools (100% In-Browser / Client-Side)
 * Ни один файл не отправляется на сервер. Все обрабатывается Canvas API.
 */

const ImageTools = {
  currentFile: null,
  currentImage: null,
  currentCompUrl: null,

  init() {
    this.bindCompressor();
    this.bindConverter();
    this.bindExifCleaner();
  },

  // --- 1. Image Compressor ---
  bindCompressor() {
    const dropzone = document.getElementById('compressor-dropzone');
    const input = document.getElementById('compressor-input');
    const controls = document.getElementById('compressor-controls');
    const qualitySlider = document.getElementById('compress-quality');
    const qualityVal = document.getElementById('quality-val');
    const downloadBtn = document.getElementById('compress-download');
    const previewOrig = document.getElementById('compress-preview-orig');
    const previewComp = document.getElementById('compress-preview-comp');
    const origSizeEl = document.getElementById('compress-orig-size');
    const compSizeEl = document.getElementById('compress-comp-size');
    const savingsEl = document.getElementById('compress-savings');

    if (!dropzone || !input) return;

    const handleFile = (file) => {
      const isRu = (window.I18N?.currentLang || 'en') === 'ru';
      if (!file || !file.type.startsWith('image/')) {
        alert(isRu ? 'Пожалуйста, выберите файл изображения (JPG, PNG, WebP).' : 'Please select a valid image file (JPG, PNG, WebP).');
        return;
      }
      this.currentFile = file;
      origSizeEl.textContent = this.formatBytes(file.size);

      const objUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        this.currentImage = img;
        previewOrig.src = objUrl;
        controls.classList.remove('hidden');
        dropzone.classList.add('hidden');
        this.processCompression();
      };
      img.onerror = () => {
        URL.revokeObjectURL(objUrl);
      };
      img.src = objUrl;
    };

    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('border-neutral-500'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('border-neutral-500'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-neutral-500');
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', (e) => {
      if (e.target.files.length) handleFile(e.target.files[0]);
    });

    let compressRaf = null;
    qualitySlider.addEventListener('input', (e) => {
      qualityVal.textContent = e.target.value + '%';
      if (compressRaf) cancelAnimationFrame(compressRaf);
      compressRaf = requestAnimationFrame(() => {
        this.processCompression();
      });
    });

    const resetBtn = document.getElementById('compress-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (this.currentCompUrl) {
          URL.revokeObjectURL(this.currentCompUrl);
          this.currentCompUrl = null;
        }
        controls.classList.add('hidden');
        dropzone.classList.remove('hidden');
        input.value = '';
        this.currentFile = null;
        this.currentImage = null;
      });
    }
  },

  processCompression() {
    if (!this.currentImage || !this.currentFile) return;

    const quality = document.getElementById('compress-quality').value / 100;
    const canvas = document.createElement('canvas');
    canvas.width = this.currentImage.naturalWidth;
    canvas.height = this.currentImage.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.currentImage, 0, 0);

    // Prefer WebP or JPEG for compression
    let mimeType = this.currentFile.type;
    if (mimeType === 'image/png') {
      mimeType = 'image/webp'; // PNG compression is best as WebP
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const compSizeEl = document.getElementById('compress-comp-size');
      const savingsEl = document.getElementById('compress-savings');
      const previewComp = document.getElementById('compress-preview-comp');
      const previewOrig = document.getElementById('compress-preview-orig');
      const downloadBtn = document.getElementById('compress-download');
      const isRu = (window.I18N?.currentLang || 'en') === 'ru';

      // Smart compression guard: if compressed >= original, keep original without quality loss
      const isOptimallyCompressed = blob.size >= this.currentFile.size;
      const finalBlob = isOptimallyCompressed ? this.currentFile : blob;
      const finalSize = isOptimallyCompressed ? this.currentFile.size : blob.size;

      compSizeEl.textContent = this.formatBytes(finalSize);
      
      const diff = this.currentFile.size - finalSize;
      const percent = Math.round((diff / this.currentFile.size) * 100);

      if (isOptimallyCompressed) {
        savingsEl.textContent = isRu ? 'Уже сжато оптимально' : 'Already optimally compressed';
        savingsEl.className = 'text-xs font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
        downloadBtn.title = isRu ? 'Файл уже оптимален — скачается оригинал' : 'File is already optimal — original will be downloaded';
      } else if (percent > 0) {
        savingsEl.textContent = `-${percent}%`;
        savingsEl.className = 'text-xs font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
        downloadBtn.title = '';
      } else {
        savingsEl.textContent = `0%`;
        savingsEl.className = 'text-xs font-mono font-medium px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-500 border border-neutral-300 dark:border-neutral-700';
        downloadBtn.title = '';
      }

      if (this.currentCompUrl) {
        URL.revokeObjectURL(this.currentCompUrl);
      }
      this.currentCompUrl = URL.createObjectURL(finalBlob);
      const url = this.currentCompUrl;
      previewComp.src = isOptimallyCompressed && previewOrig ? previewOrig.src : url;

      downloadBtn.onclick = () => {
        const a = document.createElement('a');
        if (isOptimallyCompressed) {
          a.download = this.currentFile.name;
        } else {
          const ext = mimeType === 'image/webp' ? 'webp' : 'jpg';
          const baseName = this.currentFile.name.substring(0, this.currentFile.name.lastIndexOf('.')) || 'image';
          a.download = `compressed_${baseName}.${ext}`;
        }
        a.href = url;
        a.click();
      };

      const shareBtn = document.getElementById('compress-share');
      if (shareBtn) {
        shareBtn.onclick = async () => {
          const ext = mimeType === 'image/webp' ? 'webp' : 'jpg';
          const baseName = this.currentFile.name.substring(0, this.currentFile.name.lastIndexOf('.')) || 'image';
          const file = new File([blob], `compressed_${baseName}.${ext}`, { type: mimeType });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({ files: [file], title: file.name });
            } catch (err) {
              if (err.name !== 'AbortError') downloadBtn.click();
            }
          } else {
            downloadBtn.click();
          }
        };
      }
    }, mimeType, quality);
  },

  // --- 2. Format Converter (Universal: WebP, PNG, JPG, HEIC, BMP, ICO) ---
  bindConverter() {
    const dropzone = document.getElementById('converter-dropzone');
    const input = document.getElementById('converter-input');
    const controls = document.getElementById('converter-controls');
    const formatSelect = document.getElementById('convert-format');
    const convertBtn = document.getElementById('convert-execute');
    let sourceImage = null;
    let fileName = 'image';

    if (!dropzone || !input) return;

    if (input) {
      input.setAttribute('accept', '.heic,.heif,.jpg,.jpeg,.png,.webp,.bmp,.ico,image/*');
    }

    const handleFile = async (file) => {
      if (!file) return;
      if (!file.type.startsWith('image/') && !/.(heic|heif|jpe?g|png|webp|bmp|ico)$/i.test(file.name)) {
        if (window.App) window.App.showToast((window.I18N?.currentLang || 'en') === 'ru' ? 'Выберите файл изображения' : 'Please select an image file', 'error');
        return;
      }
      fileName = file.name.substring(0, file.name.lastIndexOf('.')) || 'image';

      const isHeic = /\.(heic|heif)$/i.test(file.name) || (file.type && file.type.includes('heic'));
      if (isHeic && typeof heic2any === 'function') {
        try {
          const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.95 });
          const singleBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
          const heicUrl = URL.createObjectURL(singleBlob);
          const img = new Image();
          img.onload = () => {
            sourceImage = img;
            controls.classList.remove('hidden');
            dropzone.classList.add('hidden');
            document.getElementById('converter-preview').src = heicUrl;
            document.getElementById('converter-info').textContent = `${file.name} (${this.formatBytes(file.size)})`;
          };
          img.src = heicUrl;
          return;
        } catch (err) {
          console.warn('heic2any decoding issue, attempting standard read:', err);
        }
      }

      const objUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        sourceImage = img;
        controls.classList.remove('hidden');
        dropzone.classList.add('hidden');
        document.getElementById('converter-preview').src = objUrl;
        document.getElementById('converter-info').textContent = `${file.name} (${this.formatBytes(file.size)})`;
      };
      img.src = objUrl;
    };

    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('border-indigo-500'); });
    ['dragleave', 'drop'].forEach(ev => dropzone.addEventListener(ev, () => dropzone.classList.remove('border-indigo-500')));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', (e) => {
      if (e.target.files.length) handleFile(e.target.files[0]);
    });

    convertBtn.addEventListener('click', () => {
      if (!sourceImage) return;
      const targetFormat = formatSelect.value;
      const canvas = document.createElement('canvas');
      canvas.width = sourceImage.naturalWidth;
      canvas.height = sourceImage.naturalHeight;
      const ctx = canvas.getContext('2d');

      if (targetFormat === 'image/jpeg' || targetFormat === 'image/bmp') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(sourceImage, 0, 0);

      if (targetFormat === 'image/heic') {
        const isRu = (window.I18N?.currentLang || 'en') === 'ru';
        const msg = isRu 
          ? 'Браузерный экспорт в HEIC не поддерживается стандартами HTML5. Изображение сохранено в максимальном качестве (JPG 95%).'
          : 'In-browser encoding to HEIC is not supported by HTML5 standards. Image saved in maximum quality (JPG 95%).';
        if (window.App?.showToast) {
          window.App.showToast(msg, 'info');
        } else {
          alert(msg);
        }
        canvas.toBlob((blob) => {
          const fileNameWithExt = `${fileName}_converted.jpg`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.download = fileNameWithExt;
          a.href = url;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        }, 'image/jpeg', 0.95);
        return;
      }

      if (targetFormat === 'image/x-icon') {
        // True Windows ICO format (ICONDIR + ICONDIRENTRY + PNG payload)
        canvas.toBlob(async (pngBlob) => {
          try {
            const pngBuf = await pngBlob.arrayBuffer();
            const count = 1;
            const headerSize = 6;
            const dirSize = 16;
            const dataOffset = headerSize + dirSize;
            const totalSize = dataOffset + pngBuf.byteLength;
            const icoBuf = new ArrayBuffer(totalSize);
            const view = new DataView(icoBuf);
            view.setUint16(0, 0, true);
            view.setUint16(2, 1, true); // Type 1 = ICO
            view.setUint16(4, count, true);
            const w = canvas.width >= 256 ? 0 : canvas.width;
            const h = canvas.height >= 256 ? 0 : canvas.height;
            view.setUint8(6, w);
            view.setUint8(7, h);
            view.setUint8(8, 0); // Palette
            view.setUint8(9, 0); // Reserved
            view.setUint16(10, 1, true); // Color planes
            view.setUint16(12, 32, true); // 32 bpp
            view.setUint32(14, pngBuf.byteLength, true);
            view.setUint32(18, dataOffset, true);
            new Uint8Array(icoBuf, dataOffset).set(new Uint8Array(pngBuf));
            const icoBlob = new Blob([icoBuf], { type: 'image/x-icon' });
            const url = URL.createObjectURL(icoBlob);
            const a = document.createElement('a');
            a.download = `${fileName}_favicon.ico`;
            a.href = url;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
          } catch (e) {
            console.error('ICO export error:', e);
          }
        }, 'image/png');
        return;
      }

      const mimeType = targetFormat === 'image/bmp' ? 'image/bmp' : targetFormat;
      const ext = targetFormat === 'image/bmp' ? 'bmp' : targetFormat.split('/')[1];

      canvas.toBlob((blob) => {
        const fileNameWithExt = `${fileName}_converted.${ext}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = fileNameWithExt;
        a.href = url;
        a.click();
      }, mimeType, 0.92);
    });

    document.getElementById('convert-reset')?.addEventListener('click', () => {
      controls.classList.add('hidden');
      dropzone.classList.remove('hidden');
      input.value = '';
      sourceImage = null;
    });
  },

  // --- 3. EXIF & Metadata Privacy Stripper ---
  bindExifCleaner() {
    const dropzone = document.getElementById('exif-dropzone');
    const input = document.getElementById('exif-input');
    const statusBox = document.getElementById('exif-status');

    if (!dropzone || !input) return;

    const cleanExif = (file) => {
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Drawing into a freshly created canvas automatically strips all EXIF/GPS/Device metadata
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          const outMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const outExt = outMime === 'image/png' ? 'png' : 'jpg';
          const rawBase = file.name.substring(0, file.name.lastIndexOf('.')) || 'image';

          canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const safeBase = rawBase.replace(/[^\wа-яА-ЯёЁ.-]/g, '_');
            const safeDownloadName = `clean_${safeBase}.${outExt}`;
            const isRu = (window.I18N?.currentLang || 'en') === 'ru';
            statusBox.innerHTML = `
              <div class="p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-center">
                <div class="w-10 h-10 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center mx-auto mb-3">
                  <i data-lucide="shield-check" class="w-5 h-5 text-emerald-500"></i>
                </div>
                <h4 class="font-semibold text-sm text-neutral-900 dark:text-neutral-100">${isRu ? 'Метаданные удалены' : 'Metadata Removed'}</h4>
                <p class="text-xs text-neutral-500 mt-1">${isRu ? 'GPS-координаты, модель устройства и временные метки очищены.' : 'GPS coordinates, device model, and capture timestamps stripped.'}</p>
                <div class="mt-4 flex gap-2 justify-center">
                  <a href="${url}" download="${safeDownloadName}" class="btn-primary inline-flex items-center gap-1.5 text-xs">
                    <i data-lucide="download" class="w-3.5 h-3.5"></i> ${isRu ? 'Скачать файл' : 'Download File'}
                  </a>
                  <button id="exif-again" class="btn-secondary text-xs">
                    ${isRu ? 'Очистить еще' : 'Clean Another'}
                  </button>
                </div>
              </div>
            `;
            if (window.lucide) lucide.createIcons();
            document.getElementById('exif-again').onclick = () => {
              statusBox.innerHTML = '';
              input.value = '';
            };
          }, outMime, 0.95);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    };

    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', (e) => e.preventDefault());
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) cleanExif(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', (e) => {
      if (e.target.files.length) cleanExif(e.target.files[0]);
    });
  },

  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
};

if (typeof window !== 'undefined') window.ImageTools = ImageTools;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImageTools;
}
