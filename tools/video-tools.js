/**
 * OmniKit Video Tools Suite (100% In-Browser Client-Side Execution)
 * - Video to Animated GIF Converter with Frame Rate & Dimension tuning + Cancel support
 * - GIF to Video (MP4 / WebM) Converter with loop duration presets + Cancel support
 * - In-Browser Video Converter (MP4, WebM, MOV) with resolution tuning + Cancel support
 * - Video to Audio (WAV/MP3) Extractor using Web Audio API
 */

(function (global) {
  'use strict';

  // Lightweight Client-Side LZW GIF Encoder
  // GIF encoding via gif.js (web workers). The previous hand-rolled LZW
  // encoder produced corrupted streams after a few frames on real videos.
  async function encodeGif(frames, width, height, fps, onProgress, checkCancelled) {
    if (typeof window.GIF === 'undefined') {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = '/assets/js/vendor/gif.js';
        s.onload = resolve;
        s.onerror = () => reject(new Error('gif.js failed to load'));
        document.head.appendChild(s);
      });
    }
    const delay = Math.round(1000 / fps);
    const gif = new window.GIF({
      workers: 2,
      quality: 5,
      width,
      height,
      workerScript: '/assets/js/vendor/gif.worker.js'
    });
    for (const d of frames) {
      // gif.js 0.2.0 handles canvas frames reliably (ImageData path mangles output)
      const fc = document.createElement('canvas');
      fc.width = width;
      fc.height = height;
      fc.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(d), width, height), 0, 0);
      gif.addFrame(fc, { delay, copy: true });
    }
    return new Promise((resolve, reject) => {
      const cancelTimer = setInterval(() => {
        if (checkCancelled && checkCancelled()) {
          clearInterval(cancelTimer);
          try { gif.abort(); } catch (_) {}
          reject(new Error('Cancelled'));
        }
      }, 250);
      gif.on('progress', (p) => { if (onProgress) onProgress(p); });
      gif.on('finished', (blob) => { clearInterval(cancelTimer); resolve(blob); });
      gif.render();
    });
  }

  // Audio WAV Encoder
  function encodeWav(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = audioBuffer.length * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    function writeString(offset, str) {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    }

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    const channels = [];
    for (let ch = 0; ch < numChannels; ch++) {
      channels.push(audioBuffer.getChannelData(ch));
    }
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        let sample = Math.max(-1, Math.min(1, channels[ch][i]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, sample, true);
        offset += 2;
      }
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  const VideoTools = {
    init() {
      this.bindTabs();
      this.initVideoToGif();
      this.initGifToVideo();
      this.initVideoConverter();
      this.initVideoToAudio();
    },

    bindTabs() {
      const tabs = ['gif', 'gif2video', 'convert', 'audio'];
      tabs.forEach(t => {
        const btn = document.getElementById(`video-tab-btn-${t}`);
        if (btn) btn.addEventListener('click', () => this.switchTab(t));
      });
    },

    switchTab(tab) {
      const tabs = ['gif', 'gif2video', 'convert', 'audio'];
      const activeClasses = ['bg-neutral-900', 'text-white', 'dark:bg-white', 'dark:text-neutral-900'];
      const inactiveClasses = ['bg-neutral-100', 'dark:bg-neutral-800', 'text-neutral-600', 'dark:text-neutral-400'];

      tabs.forEach(t => {
        const btn = document.getElementById(`video-tab-btn-${t}`);
        const pane = document.getElementById(`video-pane-${t}`);
        if (!btn || !pane) return;

        if (t === tab) {
          pane.classList.remove('hidden');
          btn.classList.remove(...inactiveClasses);
          btn.classList.add(...activeClasses);
        } else {
          pane.classList.add('hidden');
          btn.classList.remove(...activeClasses);
          btn.classList.add(...inactiveClasses);
        }
      });
    },

    sanitizeBlob(url) {
      if (!url || typeof url !== 'string') return '';
      try {
        const parsed = new URL(url, window.location.origin || 'http://localhost');
        return parsed.protocol === 'blob:' ? parsed.href : '';
      } catch (_) {
        return '';
      }
    },

    // 1. Video to Animated GIF
    initVideoToGif() {
      const dropzone = document.getElementById('video2gif-dropzone');
      const input = document.getElementById('video2gif-input');
      const controls = document.getElementById('video2gif-controls');
      const videoEl = document.getElementById('video2gif-player');
      const convertBtn = document.getElementById('video2gif-convert-btn');
      const cancelBtn = document.getElementById('video2gif-cancel-btn');
      const progressBox = document.getElementById('video2gif-progress');
      const progressBar = document.getElementById('video2gif-progress-bar');
      const progressText = document.getElementById('video2gif-progress-text');
      const resultCard = document.getElementById('video2gif-result');
      const resultImg = document.getElementById('video2gif-preview-img');
      const downloadBtn = document.getElementById('video2gif-download-btn');
      const sizeTag = document.getElementById('video2gif-size-tag');

      if (!dropzone || !input) return;

      let currentFile = null;
      let activeBlobUrl = null;
      let activeGifBlob = null;
      let isCancelled = false;

      const handleFile = (file) => {
        if (!file || !file.type.startsWith('video/')) {
          const isRu = (window.I18N?.currentLang || 'en') === 'ru';
          if (window.App) window.App.showToast(isRu ? 'Выберите видеофайл (MP4, WebM, MOV)' : 'Please select a valid video file (MP4, WebM, MOV)', 'error');
          return;
        }
        currentFile = file;
        if (activeBlobUrl) URL.revokeObjectURL(activeBlobUrl);
        activeBlobUrl = URL.createObjectURL(file);
        const safeUrl = VideoTools.sanitizeBlob(activeBlobUrl);
        if (safeUrl) {
          videoEl.src = safeUrl;
          videoEl.load();
        }

        videoEl.onloadedmetadata = () => {
          controls.classList.remove('hidden');
          resultCard.classList.add('hidden');
          progressBox.classList.add('hidden');
          const maxSec = Math.min(60, Math.floor(videoEl.duration));
          const endInput = document.getElementById('video2gif-end');
          if (endInput) {
            endInput.value = Math.min(10, maxSec);
            endInput.max = maxSec;
          }
        };
      };

      dropzone.addEventListener('click', (e) => {
        if (e.target !== input) input.click();
      });
      dropzone.addEventListener('dragover', (e) => e.preventDefault());
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer?.files;
        if (files && files.length) handleFile(files[0]);
      });
      input.addEventListener('change', () => {
        if (input.files && input.files.length) handleFile(input.files[0]);
      });

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          isCancelled = true;
          progressBox.classList.add('hidden');
          convertBtn.disabled = false;
          const isRu = (window.I18N?.currentLang || 'en') === 'ru';
          if (window.App) window.App.showToast(isRu ? 'Генерация GIF отменена' : 'GIF encoding cancelled', 'info');
        });
      }

      if (convertBtn) {
        convertBtn.addEventListener('click', async () => {
          if (!currentFile || !videoEl) return;
          isCancelled = false;

          const fps = parseInt(document.getElementById('video2gif-fps')?.value || '10', 10);
          const targetWidth = parseInt(document.getElementById('video2gif-width')?.value || '480', 10);
          const startSec = Math.max(0, parseFloat(document.getElementById('video2gif-start')?.value || '0'));
          const endSec = Math.min(videoEl.duration, Math.max(startSec + 0.5, parseFloat(document.getElementById('video2gif-end')?.value || '5')));

          convertBtn.disabled = true;
          progressBox.classList.remove('hidden');
          resultCard.classList.add('hidden');
          if (progressBar) progressBar.style.width = '0%';
          if (progressText) progressText.textContent = '0%';

          const isRu = (window.I18N?.currentLang || 'en') === 'ru';
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          const aspect = videoEl.videoHeight / videoEl.videoWidth || 0.5625;
          const targetHeight = Math.max(2, Math.round(targetWidth * aspect) & ~1);
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const totalFrames = Math.max(1, Math.floor((endSec - startSec) * fps));
          const interval = (endSec - startSec) / totalFrames;
          const extractedFrames = [];
          let currentFrame = 0;

          // Real-time playback capture: per-frame seeking proved unreliable
          // across browsers (seeked events stall, readyState races, white
          // frames on mobile). Playing the clip once and sampling the canvas
          // at the target fps is deterministic everywhere and cancellable.
          const captureByPlayback = async () => {
            videoEl.muted = true;
            try { videoEl.currentTime = startSec; } catch (_) {}
            await new Promise((res) => {
              const done = () => res();
              videoEl.addEventListener('seeked', done, { once: true });
              setTimeout(done, 600);
            });
            try { await videoEl.play(); } catch (_) { /* autoplay guard */ }

            const intervalMs = 1000 / fps;
            while (!isCancelled && extractedFrames.length < totalFrames) {
              if (videoEl.currentTime >= endSec - 0.02 || videoEl.ended) break;
              if (videoEl.readyState >= 2) {
                ctx.drawImage(videoEl, 0, 0, targetWidth, targetHeight);
                extractedFrames.push(ctx.getImageData(0, 0, targetWidth, targetHeight).data);
                const capturePercent = Math.round((extractedFrames.length / totalFrames) * 50);
                if (progressBar) progressBar.style.width = `${capturePercent}%`;
                if (progressText) progressText.textContent = `${capturePercent}% (${isRu ? 'захват кадров' : 'capturing'})`;
              }
              const wakeAt = performance.now() + intervalMs;
              await new Promise((r) => setTimeout(r, Math.max(16, wakeAt - performance.now())));
            }
            videoEl.pause();
          };

          try {
            await captureByPlayback();

            if (isCancelled) return;

            if (!extractedFrames.length) throw new Error('No frames captured');

            if (progressText) progressText.textContent = `50% (${isRu ? 'генерация GIF' : 'encoding GIF'})`;

            activeGifBlob = await encodeGif(extractedFrames, targetWidth, targetHeight, fps, (p) => {
              const totalP = 50 + Math.round(p * 0.5);
              if (progressBar) progressBar.style.width = `${totalP}%`;
              if (progressText) progressText.textContent = `${totalP}%`;
            }, () => isCancelled);

            if (isCancelled) return;

            const gifUrl = URL.createObjectURL(activeGifBlob);
            const safeGif = VideoTools.sanitizeBlob(gifUrl);
            if (resultImg && safeGif) resultImg.src = safeGif;
            if (sizeTag) sizeTag.textContent = `${(activeGifBlob.size / 1024).toFixed(1)} KB`;
            controls.classList.add('hidden');
            resultCard.classList.remove('hidden');
            progressBox.classList.add('hidden');
          } catch (err) {
            if (err.message !== 'Cancelled') {
              console.error('GIF encoding error:', err);
              if (window.App) window.App.showToast(isRu ? 'Ошибка генерации GIF' : 'Error generating GIF', 'error');
            }
          } finally {
            convertBtn.disabled = false;
          }
        });
      }

      const v2gNewBtn = document.getElementById('video2gif-new-btn');
      if (v2gNewBtn) {
        v2gNewBtn.addEventListener('click', () => {
          resultCard.classList.add('hidden');
          controls.classList.remove('hidden');
        });
      }

      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
          if (!activeGifBlob) return;
          const blobUrl = URL.createObjectURL(activeGifBlob);
          try {
            const u = new URL(blobUrl);
            if (u.protocol === 'blob:') {
              const base = (currentFile?.name || 'video').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-]/g, '_');
              const a = document.createElement('a');
              a.style.display = 'none';
              a.setAttribute('download', `${base}-animated.gif`);
              a.setAttribute('rel', 'noopener noreferrer');
              a.setAttribute('href', u.href);
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
          } finally {
            setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
          }
        });
      }
    },

    // 2. GIF to Video (MP4 / WebM)
    initGifToVideo() {
      const dropzone = document.getElementById('gif2video-dropzone');
      const input = document.getElementById('gif2video-input');
      const controls = document.getElementById('gif2video-controls');
      const previewImg = document.getElementById('gif2video-preview-img');
      const convertBtn = document.getElementById('gif2video-convert-btn');
      const cancelBtn = document.getElementById('gif2video-cancel-btn');
      const progressBox = document.getElementById('gif2video-progress');
      const progressBar = document.getElementById('gif2video-progress-bar');
      const progressText = document.getElementById('gif2video-progress-text');
      const resultCard = document.getElementById('gif2video-result');
      const resultPlayer = document.getElementById('gif2video-preview-player');
      const downloadBtn = document.getElementById('gif2video-download-btn');
      const sizeTag = document.getElementById('gif2video-size-tag');

      if (!dropzone || !input) return;

      let currentFile = null;
      let activeBlobUrl = null;
      let activeVideoBlob = null;
      let isCancelled = false;

      const handleFile = (file) => {
        if (!file || (!file.type.includes('gif') && !file.name.toLowerCase().endsWith('.gif'))) {
          const isRu = (window.I18N?.currentLang || 'en') === 'ru';
          if (window.App) window.App.showToast(isRu ? 'Пожалуйста, выберите GIF файл' : 'Please select a GIF file', 'error');
          return;
        }
        currentFile = file;
        if (activeBlobUrl) URL.revokeObjectURL(activeBlobUrl);
        activeBlobUrl = URL.createObjectURL(file);
        if (previewImg) previewImg.src = activeBlobUrl;
        controls?.classList.remove('hidden');
        resultCard?.classList.add('hidden');
        progressBox?.classList.add('hidden');
      };

      dropzone.addEventListener('click', (e) => {
        if (e.target !== input) input.click();
      });
      dropzone.addEventListener('dragover', (e) => e.preventDefault());
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer?.files;
        if (files && files.length) handleFile(files[0]);
      });
      input.addEventListener('change', () => {
        if (input.files && input.files.length) handleFile(input.files[0]);
      });

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          isCancelled = true;
          progressBox?.classList.add('hidden');
          if (convertBtn) convertBtn.disabled = false;
          const isRu = (window.I18N?.currentLang || 'en') === 'ru';
          if (window.App) window.App.showToast(isRu ? 'Конвертация GIF в видео отменена' : 'GIF to Video conversion cancelled', 'info');
        });
      }

      const g2vNewBtn = document.getElementById('gif2video-new-btn');
      if (g2vNewBtn) {
        g2vNewBtn.addEventListener('click', () => {
          resultCard?.classList.add('hidden');
          controls?.classList.remove('hidden');
        });
      }

      if (convertBtn) {
        convertBtn.addEventListener('click', async () => {
          if (!currentFile || !previewImg) return;
          isCancelled = false;

          const targetFmt = document.getElementById('gif2video-format')?.value || 'mp4';
          const loopDuration = parseFloat(document.getElementById('gif2video-duration')?.value || '5');

          convertBtn.disabled = true;
          progressBox?.classList.remove('hidden');
          resultCard?.classList.add('hidden');
          if (progressBar) progressBar.style.width = '0%';
          if (progressText) progressText.textContent = '0%';

          try {
            const width = previewImg.naturalWidth || 480;
            const height = previewImg.naturalHeight || 360;
            const canvasW = width % 2 === 0 ? width : width + 1;
            const canvasH = height % 2 === 0 ? height : height + 1;

            const canvas = document.createElement('canvas');
            canvas.width = canvasW;
            canvas.height = canvasH;
            const ctx = canvas.getContext('2d');

            // Firefox's isTypeSupported('video/webm;codecs=vp9') can report true
            // while the recorder silently produces no frames; plain video/webm
            // (VP8) is the only combination reliable across Firefox versions.
            const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
            const mime = !isFirefox && targetFmt === 'mp4' && MediaRecorder.isTypeSupported('video/mp4')
              ? 'video/mp4'
              : (!isFirefox && MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm');

            const fps = 25;
            const stream = canvas.captureStream(fps);
            const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2500000 });
            const chunks = [];
            recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
            recorder.start(100);

            // Decode every GIF frame precisely; drawing an animated <img> only
            // ever yields whatever frame is on screen (often just the first),
            // producing a frozen video.
            let gifFrames = null;
            try {
              if ('ImageDecoder' in window) {
                const dec = new ImageDecoder({ data: await currentFile.arrayBuffer(), type: 'image/gif' });
                await dec.tracks.ready;
                const cnt = dec.tracks.selectedTrack.frameCount;
                const arr = [];
                for (let fi = 0; fi < cnt && fi < 600; fi++) {
                  const { image } = await dec.decode({ frameIndex: fi });
                  arr.push({ bmp: await createImageBitmap(image), ms: (image.duration || 100000) / 1000 });
                }
                dec.close();
                if (arr.length) gifFrames = arr;
              }
            } catch (_) { gifFrames = null; }

            const totalFrames = Math.round(loopDuration * fps);
            const intervalMs = 1000 / fps;
            let gifIdx = 0;
            let gifCarry = 0;

            for (let f = 0; f < totalFrames; f++) {
              if (isCancelled) {
                recorder.stop();
                stream.getTracks().forEach(t => t.stop());
                return;
              }
              ctx.clearRect(0, 0, canvasW, canvasH);
              if (typeof gifFrames !== 'undefined' && gifFrames) {
                // advance by wall-clock time so GIF timing is preserved
                gifCarry += intervalMs;
                let frameDur = gifFrames[gifIdx].ms;
                while (gifCarry >= frameDur && gifFrames.length > 1) {
                  gifCarry -= frameDur;
                  gifIdx = (gifIdx + 1) % gifFrames.length;
                  frameDur = gifFrames[gifIdx].ms;
                }
                ctx.drawImage(gifFrames[gifIdx].bmp, 0, 0, canvasW, canvasH);
              } else {
                ctx.drawImage(previewImg, 0, 0, canvasW, canvasH);
              }

              const percent = Math.round((f / totalFrames) * 100);
              if (progressBar) progressBar.style.width = `${percent}%`;
              if (progressText) progressText.textContent = `${percent}%`;
              await new Promise(r => setTimeout(r, intervalMs));
            }

            const donePromise = new Promise(resolve => recorder.onstop = resolve);
            recorder.stop();
            stream.getTracks().forEach(t => t.stop());
            await donePromise;

            if (!chunks.length || chunks.reduce((s, c) => s + (c.size || 0), 0) === 0) throw new Error('Recorder produced no data');
            activeVideoBlob = new Blob(chunks, { type: mime });
            if (targetFmt === 'mp4' && !mime.includes('mp4') && window.App) {
              const isRu2 = (window.I18N?.currentLang || 'en') === 'ru';
              window.App.showToast(isRu2 ? 'Браузер не поддерживает запись MP4 — сохранено в WebM' : 'This browser cannot record MP4 — saved as WebM', 'info');
            }
            const videoUrl = URL.createObjectURL(activeVideoBlob);
            const safeVideo = VideoTools.sanitizeBlob(videoUrl);
            if (resultPlayer && safeVideo) {
              resultPlayer.src = safeVideo;
              resultPlayer.load();
            }
            if (sizeTag) {
              sizeTag.textContent = `${(activeVideoBlob.size / (1024 * 1024)).toFixed(2)} MB`;
            }

            controls?.classList.add('hidden');
            resultCard?.classList.remove('hidden');
            progressBox?.classList.add('hidden');
          } catch (err) {
            console.error('GIF to Video error:', err);
            const isRu = (window.I18N?.currentLang || 'en') === 'ru';
            if (window.App) window.App.showToast(isRu ? 'Ошибка конвертации GIF' : 'GIF conversion error', 'error');
          } finally {
            convertBtn.disabled = false;
          }
        });
      }

      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
          if (!activeVideoBlob) return;
          const isMp4 = activeVideoBlob.type.includes('mp4');
          const ext = isMp4 ? 'mp4' : 'webm';
          const blobUrl = URL.createObjectURL(activeVideoBlob);
          try {
            const u = new URL(blobUrl);
            if (u.protocol === 'blob:') {
              const base = (currentFile?.name || 'animation').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-]/g, '_');
              const a = document.createElement('a');
              a.style.display = 'none';
              a.setAttribute('download', `${base}.${ext}`);
              a.setAttribute('rel', 'noopener noreferrer');
              a.setAttribute('href', u.href);
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
          } finally {
            setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
          }
        });
      }
    },

    // 3. Video Converter (MP4 / WebM / MOV format conversion & resize)
    initVideoConverter() {
      const dropzone = document.getElementById('vconvert-dropzone');
      const input = document.getElementById('vconvert-input');
      const controls = document.getElementById('vconvert-controls');
      const videoEl = document.getElementById('vconvert-player');
      const convertBtn = document.getElementById('vconvert-convert-btn');
      const cancelBtn = document.getElementById('vconvert-cancel-btn');
      const progressBox = document.getElementById('vconvert-progress');
      const progressBar = document.getElementById('vconvert-progress-bar');
      const progressText = document.getElementById('vconvert-progress-text');
      const resultCard = document.getElementById('vconvert-result');
      const resultPlayer = document.getElementById('vconvert-result-player');
      const downloadBtn = document.getElementById('vconvert-download-btn');
      const sizeTag = document.getElementById('vconvert-size-tag');

      if (!dropzone || !input) return;

      let currentFile = null;
      let activeBlobUrl = null;
      let activeConvertedBlob = null;
      let isCancelled = false;

      const handleFile = (file) => {
        if (!file || !file.type.startsWith('video/')) {
          const isRu = (window.I18N?.currentLang || 'en') === 'ru';
          if (window.App) window.App.showToast(isRu ? 'Выберите видеофайл (MP4, WebM, MOV)' : 'Please select a valid video file', 'error');
          return;
        }
        currentFile = file;
        if (activeBlobUrl) URL.revokeObjectURL(activeBlobUrl);
        activeBlobUrl = URL.createObjectURL(file);
        const safeUrl = VideoTools.sanitizeBlob(activeBlobUrl);
        if (safeUrl && videoEl) {
          videoEl.src = safeUrl;
          videoEl.load();
        }
        controls?.classList.remove('hidden');
        resultCard?.classList.add('hidden');
        progressBox?.classList.add('hidden');
      };

      dropzone.addEventListener('click', (e) => {
        if (e.target !== input) input.click();
      });
      dropzone.addEventListener('dragover', (e) => e.preventDefault());
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer?.files;
        if (files && files.length) handleFile(files[0]);
      });
      input.addEventListener('change', () => {
        if (input.files && input.files.length) handleFile(input.files[0]);
      });

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          isCancelled = true;
          videoEl?.pause();
          progressBox?.classList.add('hidden');
          if (convertBtn) convertBtn.disabled = false;
          const isRu = (window.I18N?.currentLang || 'en') === 'ru';
          if (window.App) window.App.showToast(isRu ? 'Конвертация видео отменена' : 'Video conversion cancelled', 'info');
        });
      }

      if (convertBtn) {
        convertBtn.addEventListener('click', async () => {
          if (!currentFile || !videoEl) return;
          isCancelled = false;

          const targetFmt = document.getElementById('vconvert-format')?.value || 'mp4';
          const maxW = parseInt(document.getElementById('vconvert-res')?.value || '0', 10);

          convertBtn.disabled = true;
          progressBox?.classList.remove('hidden');
          resultCard?.classList.add('hidden');
          if (progressBar) progressBar.style.width = '0%';
          if (progressText) progressText.textContent = '0%';

          try {
            const origW = videoEl.videoWidth || 640;
            const origH = videoEl.videoHeight || 480;
            const aspect = origH / origW;

            let outW = maxW > 0 ? Math.min(origW, maxW) : origW;
            let outH = Math.round(outW * aspect);
            if (outW % 2 !== 0) outW++;
            if (outH % 2 !== 0) outH++;

            const canvas = document.createElement('canvas');
            canvas.width = outW;
            canvas.height = outH;
            const ctx = canvas.getContext('2d');

            // Firefox's isTypeSupported('video/webm;codecs=vp9') can report true
            // while the recorder silently produces no frames; plain video/webm
            // (VP8) is the only combination reliable across Firefox versions.
            const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
            const mime = !isFirefox && targetFmt === 'mp4' && MediaRecorder.isTypeSupported('video/mp4')
              ? 'video/mp4'
              : (!isFirefox && MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm');

            const fps = 30;
            const stream = canvas.captureStream(fps);
            const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 3000000 });
            const chunks = [];
            recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
            recorder.start(100);

            videoEl.currentTime = 0;
            videoEl.muted = true;
            await videoEl.play();

            const duration = videoEl.duration || 5;
            const intervalMs = 1000 / fps;

            while (!videoEl.paused && !videoEl.ended) {
              if (isCancelled) {
                videoEl.pause();
                recorder.stop();
                stream.getTracks().forEach(t => t.stop());
                return;
              }
              ctx.drawImage(videoEl, 0, 0, outW, outH);
              const percent = Math.min(100, Math.round((videoEl.currentTime / duration) * 100));
              if (progressBar) progressBar.style.width = `${percent}%`;
              if (progressText) progressText.textContent = `${percent}%`;
              await new Promise(r => setTimeout(r, intervalMs));
            }

            const donePromise = new Promise(resolve => recorder.onstop = resolve);
            recorder.stop();
            stream.getTracks().forEach(t => t.stop());
            await donePromise;

            if (!chunks.length || chunks.reduce((s, c) => s + (c.size || 0), 0) === 0) throw new Error('Recorder produced no data');
            activeConvertedBlob = new Blob(chunks, { type: mime });
            const resUrl = URL.createObjectURL(activeConvertedBlob);
            const safeRes = VideoTools.sanitizeBlob(resUrl);
            if (resultPlayer && safeRes) {
              resultPlayer.src = safeRes;
              resultPlayer.load();
            }
            if (sizeTag) {
              sizeTag.textContent = `${(activeConvertedBlob.size / (1024 * 1024)).toFixed(2)} MB`;
            }

            controls?.classList.add('hidden');
            resultCard?.classList.remove('hidden');
            progressBox?.classList.add('hidden');
          } catch (err) {
            console.error('Video conversion error:', err);
            const isRu = (window.I18N?.currentLang || 'en') === 'ru';
            if (window.App) window.App.showToast(isRu ? 'Ошибка конвертации видео' : 'Video conversion error', 'error');
          } finally {
            convertBtn.disabled = false;
          }
        });
      }

      const vcNewBtn = document.getElementById('vconvert-new-btn');
      if (vcNewBtn) {
        vcNewBtn.addEventListener('click', () => {
          resultCard?.classList.add('hidden');
          controls?.classList.remove('hidden');
        });
      }

      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
          if (!activeConvertedBlob) return;
          const isMp4 = activeConvertedBlob.type.includes('mp4');
          const ext = isMp4 ? 'mp4' : 'webm';
          const blobUrl = URL.createObjectURL(activeConvertedBlob);
          try {
            const u = new URL(blobUrl);
            if (u.protocol === 'blob:') {
              const base = (currentFile?.name || 'video').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-]/g, '_');
              const a = document.createElement('a');
              a.style.display = 'none';
              a.setAttribute('download', `${base}-converted.${ext}`);
              a.setAttribute('rel', 'noopener noreferrer');
              a.setAttribute('href', u.href);
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
          } finally {
            setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
          }
        });
      }
    },

    // 4. Video to Audio Extractor
    initVideoToAudio() {
      const dropzone = document.getElementById('video2audio-dropzone');
      const input = document.getElementById('video2audio-input');
      const controls = document.getElementById('video2audio-controls');
      const extractBtn = document.getElementById('video2audio-extract-btn');
      const cancelBtn = document.getElementById('video2audio-cancel-btn');
      const progressBox = document.getElementById('video2audio-progress');
      const resultCard = document.getElementById('video2audio-result');
      const audioPlayer = document.getElementById('video2audio-player');
      const downloadBtn = document.getElementById('video2audio-download-btn');
      const sizeTag = document.getElementById('video2audio-size-tag');
      const fileLabel = document.getElementById('video2audio-file-label');

      if (!dropzone || !input) return;

      let currentFile = null;
      let activeAudioBlob = null;
      let isCancelled = false;

      const handleFile = (file) => {
        if (!file || !file.type.startsWith('video/')) {
          const isRu = (window.I18N?.currentLang || 'en') === 'ru';
          if (window.App) window.App.showToast(isRu ? 'Выберите видеофайл' : 'Please select a video file', 'error');
          return;
        }
        currentFile = file;
        if (fileLabel) fileLabel.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
        controls.classList.remove('hidden');
        resultCard.classList.add('hidden');
        progressBox.classList.add('hidden');
      };

      dropzone.addEventListener('click', (e) => {
        if (e.target !== input) input.click();
      });
      dropzone.addEventListener('dragover', (e) => e.preventDefault());
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
          handleFile(e.dataTransfer.files[0]);
        }
      });
      input.addEventListener('change', () => {
        if (input.files && input.files.length) {
          handleFile(input.files[0]);
        }
      });

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          isCancelled = true;
          progressBox.classList.add('hidden');
          if (extractBtn) extractBtn.disabled = false;
        });
      }

      if (extractBtn) {
        extractBtn.addEventListener('click', async () => {
          if (!currentFile) return;
          isCancelled = false;

          extractBtn.disabled = true;
          progressBox.classList.remove('hidden');
          resultCard.classList.add('hidden');

          try {
            const arrayBuffer = await currentFile.arrayBuffer();
            if (isCancelled) return;

            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioCtx();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            if (isCancelled) return;

            activeAudioBlob = encodeWav(audioBuffer);
            const audioUrl = URL.createObjectURL(activeAudioBlob);

            const safeAudio = VideoTools.sanitizeBlob(audioUrl);
            if (audioPlayer && safeAudio) audioPlayer.src = safeAudio;
            if (sizeTag) sizeTag.textContent = `${(activeAudioBlob.size / (1024 * 1024)).toFixed(2)} MB`;

            controls.classList.add('hidden');
            resultCard.classList.remove('hidden');
            progressBox.classList.add('hidden');
          } catch (err) {
            console.error('Audio extraction error:', err);
            const isRu = (window.I18N?.currentLang || 'en') === 'ru';
            if (window.App) window.App.showToast(isRu ? 'Не удалось извлечь аудиодорожку (файл поврежден или без звука)' : 'Could not extract audio (file may be corrupted or silent)', 'error');
          } finally {
            extractBtn.disabled = false;
          }
        });
      }

      const v2aNewBtn = document.getElementById('video2audio-new-btn');
      if (v2aNewBtn) {
        v2aNewBtn.addEventListener('click', () => {
          resultCard.classList.add('hidden');
          controls.classList.remove('hidden');
        });
      }

      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
          if (!activeAudioBlob) return;
          const blobUrl = URL.createObjectURL(activeAudioBlob);
          try {
            const u = new URL(blobUrl);
            if (u.protocol === 'blob:') {
              const base = (currentFile?.name || 'audio').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-]/g, '_');
              const a = document.createElement('a');
              a.style.display = 'none';
              a.setAttribute('download', `${base}-extracted.wav`);
              a.setAttribute('rel', 'noopener noreferrer');
              a.setAttribute('href', u.href);
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
          } finally {
            setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
          }
        });
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.VideoTools = VideoTools;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoTools;
  }
})(typeof window !== 'undefined' ? window : global);
