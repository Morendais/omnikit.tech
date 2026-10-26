/**
 * Advanced QR Code Studio
 * Генератор с выбором цветов + Встроенный QR-сканер изображений через BarcodeDetector / Canvas.
 */

const QrTool = {
  qrInstance: null,

  init() {
    this.bindEvents();
    this.bindScanner();
    this.generate();
  },

  bindEvents() {
    const typeSelect = document.getElementById('qr-type');
    const contentInputs = document.querySelectorAll('.qr-type-input');
    const downloadPng = document.getElementById('qr-download-png');
    const shareBtn = document.getElementById('qr-share-btn');

    // Switch input fields based on type
    typeSelect?.addEventListener('change', (e) => {
      contentInputs.forEach(el => el.classList.add('hidden'));
      const activeGroup = document.getElementById(`qr-group-${e.target.value}`);
      if (activeGroup) activeGroup.classList.remove('hidden');
      this.generate();
    });

    // Real-time input changes
    document.querySelectorAll('#qr-tab input, #qr-tab select').forEach(el => {
      el.addEventListener('input', () => this.generate());
      el.addEventListener('change', () => this.generate());
    });

    downloadPng?.addEventListener('click', () => this.download());
    shareBtn?.addEventListener('click', () => this.share());

    // Tabs: Generator vs Scanner
    const tabGen = document.getElementById('tab-btn-qr-gen');
    const tabScan = document.getElementById('tab-btn-qr-scan');
    const paneGen = document.getElementById('pane-qr-gen');
    const paneScan = document.getElementById('pane-qr-scan');

    tabGen?.addEventListener('click', () => {
      tabGen.className = 'px-3 py-1.5 rounded text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 transition';
      tabScan.className = 'px-3 py-1.5 rounded text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition';
      paneGen.classList.remove('hidden');
      paneScan.classList.add('hidden');
    });

    tabScan?.addEventListener('click', () => {
      tabScan.className = 'px-3 py-1.5 rounded text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 transition';
      tabGen.className = 'px-3 py-1.5 rounded text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition';
      paneScan.classList.remove('hidden');
      paneGen.classList.add('hidden');
    });
  },

  getPayload() {
    const type = document.getElementById('qr-type')?.value || 'url';
    if (type === 'url') {
      let val = document.getElementById('qr-input-url')?.value.trim() || 'https://omnikit.tech';
      if (!val.startsWith('http://') && !val.startsWith('https://')) {
        val = 'https://' + val;
      }
      return val;
    }
    if (type === 'text') {
      return document.getElementById('qr-input-text')?.value.trim() || 'OmniKit Tools';
    }
    if (type === 'wifi') {
      const ssid = document.getElementById('qr-wifi-ssid')?.value.trim() || 'MyWiFi';
      const pass = document.getElementById('qr-wifi-pass')?.value.trim() || '';
      const enc = document.getElementById('qr-wifi-enc')?.value || 'WPA';
      return `WIFI:T:${enc};S:${ssid};P:${pass};;`;
    }
    if (type === 'telegram') {
      let user = document.getElementById('qr-tg-user')?.value.trim() || 'durov';
      user = user.replace('@', '');
      return `https://t.me/${user}`;
    }
    if (type === 'crypto') {
      const coin = document.getElementById('qr-crypto-coin')?.value || 'ton';
      const address = document.getElementById('qr-crypto-addr')?.value.trim() || 'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      if (coin === 'ton') return `ton://transfer/${address}`;
      if (coin === 'btc') return `bitcoin:${address}`;
      if (coin === 'eth') return `ethereum:${address}`;
      return address;
    }
    return 'https://omnikit.tech';
  },

  generate() {
    const container = document.getElementById('qr-preview-container');
    if (!container) return;

    const payload = this.getPayload();
    const fgColor = document.getElementById('qr-color-fg')?.value || '#090a0c';
    const bgColor = document.getElementById('qr-color-bg')?.value || '#ffffff';

    container.innerHTML = '';

    if (window.QRCode) {
      try {
        this.qrInstance = new QRCode(container, {
          text: payload,
          width: 220,
          height: 220,
          colorDark: fgColor,
          colorLight: bgColor,
          correctLevel: QRCode.CorrectLevel.H
        });
      } catch (e) {
        console.error('QR Gen error:', e);
      }
    }
  },

  download() {
    const container = document.getElementById('qr-preview-container');
    if (!container) return;

    const canvas = container.querySelector('canvas');
    const img = container.querySelector('img');
    const a = document.createElement('a');
    a.download = `qrcode_${Date.now()}.png`;

    if (canvas) {
      a.href = canvas.toDataURL('image/png');
      a.click();
    } else if (img && img.src) {
      a.href = img.src;
      a.click();
    }
  },

  async share() {
    const container = document.getElementById('qr-preview-container');
    const canvas = container?.querySelector('canvas');
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'qrcode.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'QR Code',
            text: (window.I18N?.currentLang === 'ru' ? 'Создано в OmniKit' : 'Created with OmniKit')
          });
        } catch (e) {
          if (e.name !== 'AbortError') this.download();
        }
      } else {
        this.download();
      }
    });
  },

  // --- QR Scanner Module ---
  bindScanner() {
    const fileInput = document.getElementById('qr-scan-input');
    const dropzone = document.getElementById('qr-scan-dropzone');
    const resultBox = document.getElementById('qr-scan-result');
    const outputText = document.getElementById('qr-scan-output');

    if (!fileInput || !dropzone) return;

    // Lazy-load the self-hosted jsQR decoder once; BarcodeDetector is no
    // longer shipped by desktop Chrome, so jsQR is the primary reliable path.
    let jsqrPromise = null;
    const loadJsQr = () => {
      if (typeof jsQR !== 'undefined') return Promise.resolve(jsQR);
      if (!jsqrPromise) {
        jsqrPromise = new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = '/assets/js/vendor/jsqr.min.js';
          s.onload = () => resolve(window.jsQR);
          s.onerror = () => reject(new Error('jsQR load failed'));
          document.head.appendChild(s);
        });
      }
      return jsqrPromise;
    };

    const scanImage = async (file) => {
      if (!file || !file.type.startsWith('image/')) return;

      const img = new Image();
      const objUrl = URL.createObjectURL(file);
      img.onload = async () => {
        URL.revokeObjectURL(objUrl);
        const isRu = (window.I18N?.currentLang || 'en') === 'ru';

        // 1) Native BarcodeDetector where the browser still ships it
        if ('BarcodeDetector' in window) {
          try {
            const detector = new BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(img);
            if (barcodes.length > 0) {
              outputText.value = barcodes[0].rawValue;
              resultBox.classList.remove('hidden');
              return;
            }
          } catch (err) {
            console.warn('BarcodeDetector error, fallback:', err);
          }
        }

        // 2) jsQR fallback (self-hosted, works in every modern browser)
        try {
          const jsQRLib = await loadJsQr();
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQRLib(data.data, data.width, data.height, { inversionAttempts: 'attemptBoth' });
          if (code && code.data) {
            outputText.value = code.data;
            resultBox.classList.remove('hidden');
            return;
          }
        } catch (err) {
          console.warn('jsQR fallback error:', err);
        }

        alert(isRu ? 'QR-код не найден на изображении. Попробуйте более крупный и контрастный код.' : 'No QR code found in the image. Try a larger, higher-contrast code.');
      };
      img.onerror = () => {
        URL.revokeObjectURL(objUrl);
      };
      img.src = objUrl;
    };

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => e.preventDefault());
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) scanImage(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) scanImage(e.target.files[0]);
    });

    document.getElementById('btn-qr-scan-copy')?.addEventListener('click', () => {
      if (outputText.value) {
        navigator.clipboard.writeText(outputText.value).then(() => {
          if (window.TextTools) TextTools.showToast('Ссылка скопирована!');
        });
      }
    });
  }
};

if (typeof window !== 'undefined') window.QrTool = QrTool;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QrTool;
}
