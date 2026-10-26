/**
 * TXT & Markdown File Creator / In-Browser Notepad
 * Автосохранение в localStorage, очистка текста, удаление дубликатов, сортировка строк, экспорт в TXT/MD/CSV/JSON.
 */

const TxtEditor = {
  STORAGE_KEY: 'omnikit_notepad_draft',

  init() {
    this.bindEditor();
    this.bindActions();
    this.bindDownload();
    this.bindFileOpen();
    this.bindDragAndDrop();
    this.loadDraft();
    this.updateStats();
    window.addEventListener('languageChanged', () => this.updateStats());
  },

  bindFileOpen() {
    const input = document.getElementById('notepad-file-input');
    const openBtn = document.getElementById('btn-note-open');
    if (!input) return;

    openBtn?.addEventListener('click', () => input.click());
    input.addEventListener('change', (e) => {
      if (e.target.files?.length) {
        this.loadFile(e.target.files[0]);
      }
    });
  },

  bindDragAndDrop() {
    const textarea = document.getElementById('notepad-textarea');
    const view = document.getElementById('tool-view-txt-editor');
    if (!textarea) return;

    const highlight = () => {
      textarea.classList.add('border-indigo-500', 'ring-2', 'ring-indigo-500/20');
    };
    const unhighlight = () => {
      textarea.classList.remove('border-indigo-500', 'ring-2', 'ring-indigo-500/20');
    };

    ['dragenter', 'dragover'].forEach(name => {
      textarea.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        highlight();
      });
      if (view) {
        view.addEventListener(name, (e) => e.preventDefault());
      }
    });

    ['dragleave', 'drop'].forEach(name => {
      textarea.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        unhighlight();
      });
    });

    textarea.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      unhighlight();
      if (e.dataTransfer?.files?.length) {
        this.loadFile(e.dataTransfer.files[0]);
      }
    });
  },

  loadFile(file) {
    if (!file) return;
    const name = (file.name || '').toLowerCase();
    if (name.endsWith('.pdf') || file.type === 'application/pdf') {
      if (window.App) window.App.openTool('pdf-tools');
      if (window.PdfSuite) {
        PdfSuite.switchTab('pdf2img');
        PdfSuite.loadPdfForImages(file);
      }
      return;
    }
    if (file.type.startsWith('image/')) {
      if (window.App) window.App.openTool('converter');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const textarea = document.getElementById('notepad-textarea');
      const filenameInput = document.getElementById('notepad-filename');
      const formatSelect = document.getElementById('notepad-format');

      if (textarea) {
        textarea.value = text;
        this.triggerUpdate(textarea);
      }

      if (file.name) {
        const lastDot = file.name.lastIndexOf('.');
        const baseName = lastDot > 0 ? file.name.substring(0, lastDot) : file.name;
        const ext = lastDot > 0 ? file.name.substring(lastDot + 1).toLowerCase() : 'txt';

        if (filenameInput) filenameInput.value = baseName;
        if (formatSelect && ['txt', 'md', 'csv', 'json'].includes(ext)) {
          formatSelect.value = ext;
        }
      }

      if (window.TextTools && typeof window.TextTools.showToast === 'function') {
        const isRu = (window.I18N?.currentLang || 'en') === 'ru';
        TextTools.showToast(isRu ? `Файл "${file.name}" открыт в блокноте` : `File "${file.name}" loaded into notepad`);
      }
    };
    reader.readAsText(file, 'utf-8');
  },

  bindEditor() {
    const textarea = document.getElementById('notepad-textarea');
    if (!textarea) return;

    textarea.addEventListener('input', () => {
      localStorage.setItem(this.STORAGE_KEY, textarea.value);
      this.updateStats(textarea.value);
    });
  },

  loadDraft() {
    const textarea = document.getElementById('notepad-textarea');
    if (!textarea) return;

    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      textarea.value = saved;
      this.updateStats(saved);
    }
  },

  updateStats(text) {
    const val = typeof text === 'string' ? text : (document.getElementById('notepad-textarea')?.value || '');
    const lines = val ? val.split('\n').length : 0;
    const words = val.trim() ? val.trim().split(/\s+/).length : 0;
    const chars = val.length;

    const statsEl = document.getElementById('notepad-stats');
    if (statsEl) {
      const isRu = (window.I18N?.currentLang || 'en') === 'ru';
      statsEl.textContent = isRu 
        ? `${lines} строк • ${words} слов • ${chars} символов`
        : `${lines} lines • ${words} words • ${chars} characters`;
    }
  },

  bindActions() {
    const textarea = document.getElementById('notepad-textarea');
    if (!textarea) return;

    const isRu = () => (window.I18N?.currentLang || 'en') === 'ru';

    // 1. Remove duplicate lines
    document.getElementById('btn-note-dedupe')?.addEventListener('click', () => {
      const lines = textarea.value.split('\n');
      const unique = [...new Set(lines)];
      textarea.value = unique.join('\n');
      this.triggerUpdate(textarea);
      if (window.TextTools) TextTools.showToast(isRu() ? 'Дубликаты строк удалены' : 'Duplicate lines removed');
    });

    // 2. Remove empty lines
    document.getElementById('btn-note-clean-empty')?.addEventListener('click', () => {
      textarea.value = textarea.value.replace(/^\s*[\r\n]/gm, '');
      this.triggerUpdate(textarea);
      if (window.TextTools) TextTools.showToast(isRu() ? 'Пустые строки удалены' : 'Empty lines removed');
    });

    // 3. Remove extra spaces
    document.getElementById('btn-note-clean-spaces')?.addEventListener('click', () => {
      textarea.value = textarea.value.split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim()).join('\n');
      this.triggerUpdate(textarea);
      if (window.TextTools) TextTools.showToast(isRu() ? 'Лишние пробелы удалены' : 'Extra spaces removed');
    });

    // 4. Sort lines A-Z
    document.getElementById('btn-note-sort-az')?.addEventListener('click', () => {
      const lines = textarea.value.split('\n');
      lines.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      textarea.value = lines.join('\n');
      this.triggerUpdate(textarea);
      if (window.TextTools) TextTools.showToast(isRu() ? 'Строки отсортированы (А-Я)' : 'Lines sorted (A-Z)');
    });

    // 5. Clear all
    document.getElementById('btn-note-clear')?.addEventListener('click', () => {
      if (confirm(isRu() ? 'Очистить блокнот?' : 'Clear notepad?')) {
        textarea.value = '';
        localStorage.removeItem(this.STORAGE_KEY);
        this.updateStats('');
      }
    });
  },

  triggerUpdate(textarea) {
    localStorage.setItem(this.STORAGE_KEY, textarea.value);
    this.updateStats(textarea.value);
  },

  bindDownload() {
    document.getElementById('btn-note-download')?.addEventListener('click', () => {
      const textarea = document.getElementById('notepad-textarea');
      const filenameInput = document.getElementById('notepad-filename');
      const formatSelect = document.getElementById('notepad-format');

      if (!textarea || !textarea.value) {
        const isRu = (window.I18N?.currentLang || 'en') === 'ru';
        alert(isRu ? 'Блокнот пуст. Введите текст для сохранения.' : 'Notepad is empty. Enter text to save.');
        return;
      }

      const baseName = filenameInput?.value.trim() || 'document';
      const ext = formatSelect?.value || 'txt';
      const filename = `${baseName}.${ext}`;
      const content = textarea.value;

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
};

if (typeof window !== 'undefined') window.TxtEditor = TxtEditor;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TxtEditor;
}
