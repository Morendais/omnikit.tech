/**
 * OmniKit Speech-to-Text & Subtitles (Whisper tiny, 100% in-browser)
 * - Loads @xenova/transformers + whisper-tiny from CDN on first use (~40MB, cached)
 * - Accepts audio/* and video/* (audio track extracted via Web Audio API)
 * - Output: plain text + WebVTT/SRT subtitles with timestamps
 */
(function (global) {
  'use strict';

  const TranscribeTool = {
    pipeline: null,
    loading: false,

    async ensurePipeline(onProgress) {
      if (this.pipeline) return this.pipeline;
      if (this.loading) {
        while (!this.pipeline && this.loading) await new Promise((r) => setTimeout(r, 150));
        if (this.pipeline) return this.pipeline;
      }
      this.loading = true;
      try {
        const mod = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js');
        mod.env.allowLocalModels = false;
        this.pipeline = await mod.pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
          quantized: true,
          progress_callback: (p) => {
            if (p && p.status === 'progress' && onProgress) onProgress(p.progress || 0, p.file || '');
          }
        });
        return this.pipeline;
      } catch (err) {
        // A partially cached model (interrupted first download) permanently
        // breaks loads with 'Unsupported model type' — purge and retry once.
        this.pipeline = null;
        try {
          const keys = await caches.keys();
          await Promise.all(keys.filter((k) => /transformers|onnx|whisper|xenova|model/i.test(k)).map((k) => caches.delete(k)));
        } catch (_) {}
        try {
          const mod = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js');
          mod.env.allowLocalModels = false;
          this.pipeline = await mod.pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
            quantized: true,
            progress_callback: (p) => {
              if (p && p.status === 'progress' && onProgress) onProgress(p.progress || 0, p.file || '');
            }
          });
          return this.pipeline;
        } catch (err2) {
          this.pipeline = null;
          throw err2;
        }
      } finally {
        this.loading = false;
      }
    },

    async decodeTo16kMono(file) {
      const buf = await file.arrayBuffer();
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC({ sampleRate: 16000 });
      try {
        const decoded = await ctx.decodeAudioData(buf);
        const mono = new Float32Array(decoded.length);
        const chs = [];
        for (let c = 0; c < decoded.numberOfChannels; c++) chs.push(decoded.getChannelData(c));
        for (let i = 0; i < decoded.length; i++) {
          let s = 0;
          for (let c = 0; c < chs.length; c++) s += chs[c][i];
          mono[i] = s / chs.length;
        }
        if (Math.abs(decoded.sampleRate - 16000) > 1) {
          // linear resample to 16 kHz (whisper requirement)
          const ratio = decoded.sampleRate / 16000;
          const out = new Float32Array(Math.floor(mono.length / ratio));
          for (let i = 0; i < out.length; i++) out[i] = mono[Math.floor(i * ratio)];
          return out;
        }
        return mono;
      } finally {
        ctx.close();
      }
    },

    fmtTime(sec, comma) {
      const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60), ms = Math.floor((sec % 1) * 1000);
      const p = (n, l = 2) => String(n).padStart(l, '0');
      return `${p(h)}:${p(m)}:${p(s)}${comma ? ',' : '.'}${p(ms, 3)}`;
    },

    buildSubs(chunks) {
      const srt = chunks.map((c, i) =>
        `${i + 1}\n${this.fmtTime(c.start, true)} --> ${this.fmtTime(Math.max(c.end, c.start + 0.4), true)}\n${c.text.trim()}`).join('\n\n');
      const vtt = 'WEBVTT\n\n' + chunks.map((c) =>
        `${this.fmtTime(c.start)} --> ${this.fmtTime(Math.max(c.end, c.start + 0.4))}\n${c.text.trim()}`).join('\n\n');
      return { srt, vtt };
    },

    init() {
      const input = document.getElementById('transcribe-input');
      const dropzone = document.getElementById('transcribe-dropzone');
      const controls = document.getElementById('transcribe-controls');
      const resultCard = document.getElementById('transcribe-result');
      const progressBox = document.getElementById('transcribe-progress');
      const progressBar = document.getElementById('transcribe-progress-bar');
      const progressText = document.getElementById('transcribe-progress-text');
      const runBtn = document.getElementById('transcribe-run-btn');
      const resetBtn = document.getElementById('transcribe-reset-btn');
      const newBtn = document.getElementById('transcribe-new-btn');
      const textOut = document.getElementById('transcribe-text');
      const copyBtn = document.getElementById('transcribe-copy-btn');
      const dlSrt = document.getElementById('transcribe-dl-srt');
      const dlVtt = document.getElementById('transcribe-dl-vtt');
      const langSel = document.getElementById('transcribe-lang');
      const fileLabel = document.getElementById('transcribe-file-label');
      if (!input || !dropzone) return;

      const isRu = () => (window.I18N?.currentLang || 'en') === 'ru';
      let currentFile = null;
      let audioData = null;
      let lastChunks = null;

      const handleFile = async (file) => {
        if (!file) return;
        const okType = file.type.startsWith('audio/') || file.type.startsWith('video/') ||
          /\.(mp3|wav|ogg|m4a|flac|aac|opus|mp4|webm|mov|mkv)$/i.test(file.name);
        if (!okType) {
          if (window.App) window.App.showToast(isRu() ? 'Выберите аудио или видео файл' : 'Please select an audio or video file', 'error');
          return;
        }
        currentFile = file;
        if (fileLabel) fileLabel.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
        resultCard?.classList.add('hidden');
        controls?.classList.remove('hidden');
      };

      dropzone.addEventListener('click', () => input.click());
      dropzone.addEventListener('dragover', (e) => e.preventDefault());
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer?.files?.length) handleFile(e.dataTransfer.files[0]);
      });
      input.addEventListener('change', () => {
        if (input.files?.length) handleFile(input.files[0]);
      });

      resetBtn?.addEventListener('click', () => input.click());
      newBtn?.addEventListener('click', () => {
        resultCard?.classList.add('hidden');
        controls?.classList.remove('hidden');
        input.click();
      });

      copyBtn?.addEventListener('click', () => {
        if (textOut?.value) {
          navigator.clipboard.writeText(textOut.value).then(() => {
            if (window.App) window.App.showToast(isRu() ? 'Текст скопирован' : 'Text copied', 'success');
          });
        }
      });

      const download = (content, name, mime) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([content], { type: mime }));
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      };
      dlSrt?.addEventListener('click', () => {
        if (lastChunks) download(this.buildSubs(lastChunks).srt, 'omnikit-transcript.srt', 'text/plain');
      });
      dlVtt?.addEventListener('click', () => {
        if (lastChunks) download(this.buildSubs(lastChunks).vtt, 'omnikit-transcript.vtt', 'text/vtt');
      });

      runBtn?.addEventListener('click', async () => {
        if (!currentFile) return;
        runBtn.disabled = true;
        progressBox?.classList.remove('hidden');
        resultCard?.classList.add('hidden');
        try {
          if (progressText) progressText.textContent = isRu() ? 'Подготовка аудио…' : 'Preparing audio…';
          audioData = await this.decodeTo16kMono(currentFile);

          if (progressText) progressText.textContent = isRu() ? 'Загрузка модели (~40 МБ, только первый раз)…' : 'Loading model (~40MB, first time only)…';
          const asr = await this.ensurePipeline((pct, file) => {
            // several model files download in turn — each goes 0->100, so the
            // bar must never regress; text always names the current file.
            this._maxPct = Math.max(this._maxPct || 0, Math.round(pct));
            if (progressBar) progressBar.style.width = `${this._maxPct}%`;
            if (progressText) progressText.textContent = `${isRu() ? 'Модель' : 'Model'}: ${this._maxPct}% (${String(file).slice(0, 40)})`;
          });
          this._maxPct = 100;
          if (progressText) progressText.textContent = isRu() ? 'Инициализация модели…' : 'Initializing model…';

          if (progressText) progressText.textContent = isRu() ? 'Распознавание речи…' : 'Transcribing…';
          if (progressBar) progressBar.style.width = '90%';
          await new Promise((r) => setTimeout(r, 30)); // let the UI paint

          const lang = langSel?.value && langSel.value !== 'auto' ? langSel.value : undefined;
          const out = await asr(audioData, {
            return_timestamps: true,
            chunk_length_s: 30,
            stride_length_s: 5,
            task: 'transcribe',
            ...(lang ? { language: lang } : {})
          });

          const chunks = (out.chunks || []).filter((c) => c.text && c.text.trim());
          lastChunks = chunks;
          if (textOut) textOut.value = (out.text || '').trim();
          const statsEl = document.getElementById('transcribe-stats');
          if (statsEl) statsEl.textContent = `${chunks.length} ${isRu() ? 'сегментов' : 'segments'} · ${audioData ? (audioData.length / 16000).toFixed(1) : '?'}s`;

          if (progressBar) progressBar.style.width = '100%';
          progressBox?.classList.add('hidden');
          controls?.classList.add('hidden');
          resultCard?.classList.remove('hidden');
        } catch (err) {
          console.error('Transcription error:', err);
          if (window.App) window.App.showToast(isRu() ? 'Ошибка распознавания: ' + err.message : 'Transcription failed: ' + err.message, 'error');
          progressBox?.classList.add('hidden');
        } finally {
          runBtn.disabled = false;
        }
      });
    }
  };

  global.TranscribeTool = TranscribeTool;
  if (typeof module !== 'undefined' && module.exports) module.exports = TranscribeTool;
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => TranscribeTool.init());
  }
})(typeof window !== 'undefined' ? window : this);
