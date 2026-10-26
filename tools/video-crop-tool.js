/**
 * OmniKit Video Crop & Reframe (100% in-browser)
 * Crop any video to 9:16 / 1:1 / 4:5 / 16:16 / free aspect with a draggable
 * focus area, then re-encode the cropped view via canvas.captureStream +
 * MediaRecorder (audio track passed through when the source has one).
 */
(function (global) {
  'use strict';

  const VideoCropTool = {
    init() {
      const input = document.getElementById('vcrop-input');
      const dropzone = document.getElementById('vcrop-dropzone');
      const controls = document.getElementById('vcrop-controls');
      const resultCard = document.getElementById('vcrop-result');
      const canvas = document.getElementById('vcrop-canvas');
      const runBtn = document.getElementById('vcrop-run-btn');
      const resetBtn = document.getElementById('vcrop-reset-btn');
      const newBtn = document.getElementById('vcrop-new-btn');
      const previewOut = document.getElementById('vcrop-out-video');
      const dlBtn = document.getElementById('vcrop-download-btn');
      const sizeSlider = document.getElementById('vcrop-size');
      const progBar = document.getElementById('vcrop-progress-bar');
      const progText = document.getElementById('vcrop-progress-text');
      if (!input || !dropzone || !canvas) return;

      const isRu = () => (window.I18N?.currentLang || 'en') === 'ru';
      const ctx = canvas.getContext('2d');
      let videoEl = null;
      let fileUrl = null;
      let currentFile = null;
      let lastBlob = null;
      // crop rect in source pixels
      let crop = { x: 0, y: 0, w: 0, h: 0 };
      let aspect = 9 / 16;
      let drag = null;

      const presets = () => [
        ['vcrop-p-916', 9 / 16], ['vcrop-p-11', 1], ['vcrop-p-45', 4 / 5], ['vcrop-p-169', 16 / 9]
      ];

      const recomputeCrop = (cx, cy) => {
        const vw = videoEl.videoWidth, vh = videoEl.videoHeight;
        const scale = (parseInt(sizeSlider?.value || '80', 10)) / 100;
        let w, h;
        if (vw / vh > aspect) { h = vh * scale; w = h * aspect; } else { w = vw * scale; h = w / aspect; }
        w = Math.min(w, vw); h = Math.min(h, vh);
        let x = (cx == null ? crop.x : cx) - w / 2;
        let y = (cy == null ? crop.y : cy) - h / 2;
        crop = { x: Math.max(0, Math.min(vw - w, x)), y: Math.max(0, Math.min(vh - h, y)), w, h };
      };

      const drawFrame = () => {
        if (!videoEl) return;
        const vw = videoEl.videoWidth, vh = videoEl.videoHeight;
        canvas.width = Math.min(640, vw);
        canvas.height = Math.round(canvas.width * vh / vw);
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const k = canvas.width / vw;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(videoEl, crop.x, crop.y, crop.w, crop.h, crop.x * k, crop.y * k, crop.w * k, crop.h * k);
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.strokeRect(crop.x * k, crop.y * k, crop.w * k, crop.h * k);
        ctx.restore();
      };

      const handleFile = (file) => {
        if (!file || (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|mkv)$/i.test(file.name))) {
          if (window.App) window.App.showToast(isRu() ? 'Выберите видеофайл' : 'Please select a video file', 'error');
          return;
        }
        currentFile = file;
        if (fileUrl) URL.revokeObjectURL(fileUrl);
        fileUrl = URL.createObjectURL(file);
        if (!videoEl) { videoEl = document.createElement('video'); videoEl.muted = true; videoEl.playsInline = true; }
        videoEl.src = fileUrl;
        videoEl.addEventListener('loadeddata', () => {
          recomputeCrop(videoEl.videoWidth / 2, videoEl.videoHeight / 2);
          drawFrame();
          resultCard?.classList.add('hidden');
          controls?.classList.remove('hidden');
        }, { once: true });
        videoEl.load();
      };

      dropzone.addEventListener('click', () => input.click());
      dropzone.addEventListener('dragover', (e) => e.preventDefault());
      dropzone.addEventListener('drop', (e) => { e.preventDefault(); if (e.dataTransfer?.files?.length) handleFile(e.dataTransfer.files[0]); });
      input.addEventListener('change', () => { if (input.files?.length) handleFile(input.files[0]); });
      resetBtn?.addEventListener('click', () => input.click());
      newBtn?.addEventListener('click', () => { resultCard?.classList.add('hidden'); controls?.classList.remove('hidden'); input.click(); });

      presets().forEach(([id, asp]) => {
        const b = document.getElementById(id);
        b?.addEventListener('click', () => {
          aspect = asp;
          if (videoEl) { recomputeCrop(crop.x + crop.w / 2, crop.y + crop.h / 2); drawFrame(); }
        });
      });
      sizeSlider?.addEventListener('input', () => {
        if (videoEl) { recomputeCrop(crop.x + crop.w / 2, crop.y + crop.h / 2); drawFrame(); }
      });

      // drag the crop focus point
      const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        const p = e.touches ? e.touches[0] : e;
        return { x: (p.clientX - r.left) / r.width * videoEl.videoWidth, y: (p.clientY - r.top) / r.height * videoEl.videoHeight };
      };
      canvas.addEventListener('pointerdown', (e) => {
        if (!videoEl) return;
        drag = pos(e);
        canvas.setPointerCapture(e.pointerId);
      });
      canvas.addEventListener('pointermove', (e) => {
        if (!drag || !videoEl) return;
        const p = pos(e);
        recomputeCrop(p.x, p.y);
        drawFrame();
      });
      canvas.addEventListener('pointerup', () => { drag = null; });

      dlBtn?.addEventListener('click', () => {
        if (!lastBlob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(lastBlob);
        a.download = `omnikit-crop.${lastBlob.type.includes('mp4') ? 'mp4' : 'webm'}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      });

      runBtn?.addEventListener('click', async () => {
        if (!videoEl || !currentFile) return;
        runBtn.disabled = true;
        document.getElementById('vcrop-progress')?.classList.remove('hidden');
        resultCard?.classList.add('hidden');
        try {
          const isFirefox = /firefox/i.test(navigator.userAgent);
          const mime = !isFirefox && MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4'
            : (!isFirefox && MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm');
          const outH = 1280;
          const outW = Math.round(outH * (crop.w / crop.h) / 2) * 2;
          const out = document.createElement('canvas');
          out.width = outW; out.height = outH;
          const octx = out.getContext('2d');
          const stream = out.captureStream(30);
          try {
            videoEl.muted = false; videoEl.volume = 1;
            const withAudio = videoEl.captureStream ? videoEl.captureStream() : null;
            (withAudio ? withAudio.getAudioTracks() : []).forEach((t) => stream.addTrack(t));
          } catch (_) {}
          videoEl.muted = true;
          const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4000000 });
          const chunks = [];
          rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
          rec.start(150);
          const speed = parseFloat(document.getElementById('vcrop-speed')?.value || '1');
          videoEl.playbackRate = speed;
          videoEl.currentTime = 0;
          await new Promise((r) => setTimeout(r, 120));
          await videoEl.play();
          const total = videoEl.duration || 3;
          const render = () => {
            if (videoEl.ended || videoEl.currentTime >= total - 0.03) return;
            octx.drawImage(videoEl, crop.x, crop.y, crop.w, crop.h, 0, 0, outW, outH);
            const pct = Math.min(99, Math.round(videoEl.currentTime / total * 100));
            if (progBar) progBar.style.width = pct + '%';
            if (progText) progText.textContent = pct + '%';
            requestAnimationFrame(render);
          };
          render();
          await new Promise((res) => { videoEl.addEventListener('ended', res, { once: true }); setTimeout(res, (total / Math.max(0.25, speed) + 3) * 1000); });
          videoEl.pause();
          const done = new Promise((res) => { rec.onstop = res; });
          rec.stop();
          stream.getTracks().forEach((t) => t.stop());
          await done;
          if (!chunks.length || !chunks.reduce((s, c) => s + c.size, 0)) throw new Error('Recorder produced no data');
          lastBlob = new Blob(chunks, { type: mime });
          if (progBar) progBar.style.width = '100%';
          document.getElementById('vcrop-progress')?.classList.add('hidden');
          controls?.classList.add('hidden');
          resultCard?.classList.remove('hidden');
          if (previewOut) previewOut.src = URL.createObjectURL(lastBlob);
          const tagEl = document.getElementById('vcrop-size-tag');
          if (tagEl) tagEl.textContent = `${outW}×${outH} · ${(lastBlob.size / 1024 / 1024).toFixed(1)} MB${speed && speed !== 1 ? ' · ' + speed + '×' : ''}`;
        } catch (err) {
          console.error('Video crop error:', err);
          if (window.App) window.App.showToast(isRu() ? 'Ошибка: ' + err.message : 'Failed: ' + err.message, 'error');
          document.getElementById('vcrop-progress')?.classList.add('hidden');
        } finally {
          runBtn.disabled = false;
        }
      });
    }
  };

  global.VideoCropTool = VideoCropTool;
  if (typeof module !== 'undefined' && module.exports) module.exports = VideoCropTool;
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => VideoCropTool.init());
  }
})(typeof window !== 'undefined' ? window : this);
