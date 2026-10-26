/**
 * OmniKit SVG to ICO & Favicon Studio
 * 100% Client-Side Multi-Resolution Windows ICO Binary Packer & PWA Asset Generator
 * Embeds 16x16, 32x32, 48x48, 64x64, 128x128, 256x256 inside a single .ico file
 * Generates apple-touch-icon.png, android-chrome-192/512, site.webmanifest, and HTML snippets.
 */

const FaviconStudio = {
  sourceImage: null,
  sizes: [16, 32, 48, 64, 128, 256],
  generatedBlobs: {},

  init() {
    this.bindEvents();
  },

  bindEvents() {
    const dropzone = document.getElementById('svg-ico-dropzone') || document.getElementById('favicon-dropzone');
    const input = document.getElementById('svg-ico-input') || document.getElementById('favicon-input');
    const downloadIcoBtn = document.getElementById('favicon-download-ico-btn');
    const downloadZipBtn = document.getElementById('favicon-download-zip-btn');

    if (dropzone && input) {
      dropzone.addEventListener('click', () => input.click());
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('border-indigo-500', 'bg-indigo-50/20');
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('border-indigo-500', 'bg-indigo-50/20');
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-indigo-500', 'bg-indigo-50/20');
        if (e.dataTransfer.files?.length) {
          this.loadFile(e.dataTransfer.files[0]);
        }
      });
      input.addEventListener('change', (e) => {
        if (e.target.files?.length) {
          this.loadFile(e.target.files[0]);
        }
      });
    }

    if (downloadIcoBtn) {
      downloadIcoBtn.addEventListener('click', () => this.downloadIco());
    }

    if (downloadZipBtn) {
      downloadZipBtn.addEventListener('click', () => this.downloadZip());
    }
  },

  async loadFile(file) {
    if (!file) return;
    const isSvg = file.type === 'image/svg+xml' || file.name.endsWith('.svg');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.sourceImage = img;
        this.generateAllAssets();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  async generateAllAssets() {
    if (!this.sourceImage) return;

    const previewContainer = document.getElementById('favicon-preview-grid');
    const controlsBox = document.getElementById('favicon-controls-box');
    const dropzone = document.getElementById('svg-ico-dropzone') || document.getElementById('favicon-dropzone');

    if (controlsBox) controlsBox.classList.remove('hidden');
    if (dropzone) dropzone.classList.add('hidden');

    this.generatedBlobs = {};

    // 1. Render all ICO resolution canvases
    const icoCanvases = [];
    for (const size of this.sizes) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.sourceImage, 0, 0, size, size);
      icoCanvases.push({ size, canvas });

      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      this.generatedBlobs[`icon-${size}.png`] = blob;
    }

    // 2. Generate Apple Touch Icon (180x180)
    const appleCanvas = document.createElement('canvas');
    appleCanvas.width = 180;
    appleCanvas.height = 180;
    const appleCtx = appleCanvas.getContext('2d');
    appleCtx.imageSmoothingEnabled = true;
    appleCtx.imageSmoothingQuality = 'high';
    appleCtx.drawImage(this.sourceImage, 0, 0, 180, 180);
    this.generatedBlobs['apple-touch-icon.png'] = await new Promise(r => appleCanvas.toBlob(r, 'image/png'));

    // 3. Android Chrome 192 & 512
    for (const s of [192, 512]) {
      const c = document.createElement('canvas');
      c.width = s;
      c.height = s;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.sourceImage, 0, 0, s, s);
      this.generatedBlobs[`android-chrome-${s}x${s}.png`] = await new Promise(r => c.toBlob(r, 'image/png'));
    }

    // 4. Pack true multi-res Windows ICO
    const icoBlob = await this.buildMultiResIco(icoCanvases);
    this.generatedBlobs['favicon.ico'] = icoBlob;

    // 5. Update UI Previews
    this.renderPreviews();
  },

  async buildMultiResIco(canvases) {
    // Collect PNG buffers for each size
    const pngBuffers = [];
    for (const item of canvases) {
      const blob = await new Promise(r => item.canvas.toBlob(r, 'image/png'));
      const arrayBuffer = await blob.arrayBuffer();
      pngBuffers.push({
        size: item.size,
        buffer: arrayBuffer
      });
    }

    const count = pngBuffers.length;
    const headerSize = 6;
    const dirEntrySize = 16;
    const dirTotalSize = dirEntrySize * count;
    let dataOffset = headerSize + dirTotalSize;

    // Calculate total ICO file size
    let totalSize = dataOffset;
    for (const p of pngBuffers) {
      totalSize += p.buffer.byteLength;
    }

    const icoBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(icoBuffer);

    // 1. ICONDIR Header (6 bytes)
    view.setUint16(0, 0, true); // reserved (must be 0)
    view.setUint16(2, 1, true); // image type (1 = icon .ico)
    view.setUint16(4, count, true); // number of images

    // 2. ICONDIRENTRY Directory (16 bytes each)
    let currentDataOffset = dataOffset;
    for (let i = 0; i < count; i++) {
      const p = pngBuffers[i];
      const entryOffset = headerSize + (i * dirEntrySize);
      const w = p.size === 256 ? 0 : p.size;
      const h = p.size === 256 ? 0 : p.size;

      view.setUint8(entryOffset + 0, w); // Width
      view.setUint8(entryOffset + 1, h); // Height
      view.setUint8(entryOffset + 2, 0); // Color count (0 = no palette)
      view.setUint8(entryOffset + 3, 0); // Reserved
      view.setUint16(entryOffset + 4, 1, true); // Color planes
      view.setUint16(entryOffset + 6, 32, true); // Bits per pixel (32 = RGBA)
      view.setUint32(entryOffset + 8, p.buffer.byteLength, true); // Size of image data
      view.setUint32(entryOffset + 12, currentDataOffset, true); // Offset of image data

      // Copy PNG data into buffer
      const pngU8 = new Uint8Array(p.buffer);
      new Uint8Array(icoBuffer, currentDataOffset, p.buffer.byteLength).set(pngU8);
      currentDataOffset += p.buffer.byteLength;
    }

    return new Blob([icoBuffer], { type: 'image/x-icon' });
  },

  renderPreviews() {
    const tabFav = document.getElementById('favicon-preview-tab-img');
    const bigFav = document.getElementById('favicon-preview-big-img');
    const appleFav = document.getElementById('favicon-preview-apple-img');

    if (this.generatedBlobs['icon-32.png'] && tabFav) {
      tabFav.src = URL.createObjectURL(this.generatedBlobs['icon-32.png']);
    }
    if (this.generatedBlobs['icon-256.png'] && bigFav) {
      bigFav.src = URL.createObjectURL(this.generatedBlobs['icon-256.png']);
    }
    if (this.generatedBlobs['apple-touch-icon.png'] && appleFav) {
      appleFav.src = URL.createObjectURL(this.generatedBlobs['apple-touch-icon.png']);
    }
  },

  downloadIco() {
    if (!this.generatedBlobs['favicon.ico']) return;
    const url = URL.createObjectURL(this.generatedBlobs['favicon.ico']);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'favicon.ico';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async downloadZip() {
    if (!window.JSZip || Object.keys(this.generatedBlobs).length === 0) return;
    const btn = document.getElementById('favicon-download-zip-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    const isRu = (window.I18N?.currentLang || 'en') === 'ru';
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>${isRu ? 'Сборка архива...' : 'Building ZIP...'}</span>`;
    if (window.lucide) lucide.createIcons();

    try {
      const zip = new JSZip();

      // Add all images to zip
      for (const [name, blob] of Object.entries(this.generatedBlobs)) {
        zip.file(name, blob);
      }

      // Add webmanifest
      const manifestObj = {
        name: "My Web App",
        short_name: "App",
        icons: [
          { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" }
        ],
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone"
      };
      zip.file('site.webmanifest', JSON.stringify(manifestObj, null, 2));

      // Add instructions readme
      const htmlSnippet = `<!-- Add to <head> -->\n<link rel="icon" href="/favicon.ico" sizes="any">\n<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n<link rel="manifest" href="/site.webmanifest">`;
      zip.file('README-install.html', htmlSnippet);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'favicon-package.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP generation failed:', err);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
      if (window.lucide) lucide.createIcons();
    }
  }
};

if (typeof window !== 'undefined') window.FaviconStudio = FaviconStudio;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FaviconStudio;
}
