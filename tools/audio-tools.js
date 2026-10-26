/**
 * OmniKit Audio Studio: Speed, Pitch & Reverb Engine
 * 100% Client-Side Web Audio API (OfflineAudioContext, BiquadFilter, Convolver, BufferSource)
 * Features:
 * - Speed (0.25x - 2.5x)
 * - Pitch Shifter (-12 to +12 semitones)
 * - Procedural algorithmic Reverb (Slowed + Reverb)
 * - Nightcore mode
 * - 1-Click Export to WAV (PCM 16-bit Stereo)
 */

const AudioTools = {
  audioCtx: null,
  sourceBuffer: null,
  activeSourceNode: null,
  gainNode: null,
  convolverNode: null,
  reverbGainNode: null,
  dryGainNode: null,
  
  isPlaying: false,
  startTime: 0,
  pausedAt: 0,
  duration: 0,
  
  speed: 1.0,
  pitchSemitones: 0,
  reverbWet: 0.0,
  
  animationFrameId: null,

  init() {
    this.bindEvents();
  },

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  },

  bindEvents() {
    const dropzone = document.getElementById('audio-dropzone');
    const input = document.getElementById('audio-file-input');
    const playBtn = document.getElementById('audio-play-btn');
    const speedSlider = document.getElementById('audio-speed-slider');
    const pitchSlider = document.getElementById('audio-pitch-slider');
    const reverbSlider = document.getElementById('audio-reverb-slider');
    const exportBtn = document.getElementById('audio-export-btn');
    const scrubBar = document.getElementById('audio-scrub-bar');

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

    if (playBtn) {
      playBtn.addEventListener('click', () => this.togglePlay());
    }

    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        this.speed = parseFloat(e.target.value);
        const valEl = document.getElementById('audio-speed-val');
        if (valEl) valEl.textContent = `${this.speed.toFixed(2)}x`;
        if (this.activeSourceNode) {
          this.applyPlaybackRate();
        }
      });
    }

    if (pitchSlider) {
      pitchSlider.addEventListener('input', (e) => {
        this.pitchSemitones = parseInt(e.target.value, 10);
        const valEl = document.getElementById('audio-pitch-val');
        if (valEl) {
          const sign = this.pitchSemitones > 0 ? '+' : '';
          valEl.textContent = `${sign}${this.pitchSemitones} st`;
        }
        if (this.activeSourceNode) {
          this.applyPlaybackRate();
        }
      });
    }

    if (reverbSlider) {
      reverbSlider.addEventListener('input', (e) => {
        this.reverbWet = parseFloat(e.target.value) / 100;
        const valEl = document.getElementById('audio-reverb-val');
        if (valEl) valEl.textContent = `${Math.round(this.reverbWet * 100)}%`;
        this.updateReverbGain();
      });
    }

    if (scrubBar) {
      scrubBar.addEventListener('input', (e) => {
        if (!this.sourceBuffer) return;
        const targetSec = (parseFloat(e.target.value) / 100) * this.duration;
        this.seekTo(targetSec);
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportProcessedAudio());
    }

    // Quick Presets
    document.querySelectorAll('.audio-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = e.currentTarget.getAttribute('data-preset');
        this.applyPreset(preset);
      });
    });
  },

  applyPreset(preset) {
    const speedSlider = document.getElementById('audio-speed-slider');
    const pitchSlider = document.getElementById('audio-pitch-slider');
    const reverbSlider = document.getElementById('audio-reverb-slider');

    if (preset === 'slowed-reverb') {
      this.speed = 0.85;
      this.pitchSemitones = -2;
      this.reverbWet = 0.45;
    } else if (preset === 'nightcore') {
      this.speed = 1.25;
      this.pitchSemitones = 3;
      this.reverbWet = 0.10;
    } else if (preset === 'podcast') {
      this.speed = 1.50;
      this.pitchSemitones = 0;
      this.reverbWet = 0.0;
    } else if (preset === 'slowmo') {
      this.speed = 0.75;
      this.pitchSemitones = 0;
      this.reverbWet = 0.05;
    } else if (preset === 'reset') {
      this.speed = 1.00;
      this.pitchSemitones = 0;
      this.reverbWet = 0.0;
    }

    if (speedSlider) {
      speedSlider.value = this.speed;
      const valEl = document.getElementById('audio-speed-val');
      if (valEl) valEl.textContent = `${this.speed.toFixed(2)}x`;
    }
    if (pitchSlider) {
      pitchSlider.value = this.pitchSemitones;
      const valEl = document.getElementById('audio-pitch-val');
      if (valEl) {
        const sign = this.pitchSemitones > 0 ? '+' : '';
        valEl.textContent = `${sign}${this.pitchSemitones} st`;
      }
    }
    if (reverbSlider) {
      reverbSlider.value = Math.round(this.reverbWet * 100);
      const valEl = document.getElementById('audio-reverb-val');
      if (valEl) valEl.textContent = `${Math.round(this.reverbWet * 100)}%`;
    }

    this.applyPlaybackRate();
    this.updateReverbGain();
  },

  async loadFile(file) {
    if (!file) return;
    const statusEl = document.getElementById('audio-file-name');
    const detailsEl = document.getElementById('audio-file-details');
    const playerBox = document.getElementById('audio-player-box');
    const dropzone = document.getElementById('audio-dropzone');

    if (statusEl) statusEl.textContent = file.name;
    if (detailsEl) detailsEl.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB • ${file.type || 'audio'}`;

    try {
      this.stopPlayback();
      const ctx = this.getAudioContext();
      const arrayBuffer = await file.arrayBuffer();
      this.sourceBuffer = await ctx.decodeAudioData(arrayBuffer);
      this.duration = this.sourceBuffer.duration;
      this.pausedAt = 0;

      if (playerBox) playerBox.classList.remove('hidden');
      if (dropzone) dropzone.classList.add('hidden');

      this.updateTimeDisplay(0);
      this.drawWaveform(this.sourceBuffer);
    } catch (err) {
      console.error('Audio decode failed:', err);
      const isRu = (window.I18N?.currentLang || 'en') === 'ru';
      alert(isRu ? 'Не удалось декодировать аудиофайл. Убедитесь, что формат поддерживается (MP3, WAV, OGG, M4A).' : 'Failed to decode audio file. Make sure the format is supported (MP3, WAV, OGG, M4A).');
    }
  },

  togglePlay() {
    if (this.isPlaying) {
      this.pausePlayback();
    } else {
      this.startPlayback(this.pausedAt);
    }
  },

  startPlayback(offsetSec = 0) {
    if (!this.sourceBuffer) return;
    const ctx = this.getAudioContext();

    this.stopSource();

    this.activeSourceNode = ctx.createBufferSource();
    this.activeSourceNode.buffer = this.sourceBuffer;

    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 1.0;

    // Build Reverb Graph
    this.dryGainNode = ctx.createGain();
    this.reverbGainNode = ctx.createGain();

    if (!this.convolverNode) {
      this.convolverNode = ctx.createConvolver();
      this.convolverNode.buffer = this.createImpulseResponse(ctx, 2.5, 2.0);
    }

    this.updateReverbGain();

    // Source -> Dry Gain -> Destination
    this.activeSourceNode.connect(this.dryGainNode);
    this.dryGainNode.connect(ctx.destination);

    // Source -> Convolver -> Reverb Gain -> Destination
    this.activeSourceNode.connect(this.convolverNode);
    this.convolverNode.connect(this.reverbGainNode);
    this.reverbGainNode.connect(ctx.destination);

    this.applyPlaybackRate();

    this.startTime = ctx.currentTime - (offsetSec / this.getEffectiveRate());
    this.activeSourceNode.start(0, offsetSec);
    this.isPlaying = true;

    this.updatePlayBtn(true);
    this.trackProgress();

    this.activeSourceNode.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.pausedAt = 0;
        this.updatePlayBtn(false);
        this.updateTimeDisplay(0);
        cancelAnimationFrame(this.animationFrameId);
      }
    };
  },

  pausePlayback() {
    if (!this.isPlaying) return;
    const ctx = this.getAudioContext();
    this.pausedAt = (ctx.currentTime - this.startTime) * this.getEffectiveRate();
    if (this.pausedAt >= this.duration) this.pausedAt = 0;
    this.stopSource();
    this.isPlaying = false;
    this.updatePlayBtn(false);
    cancelAnimationFrame(this.animationFrameId);
  },

  stopPlayback() {
    this.stopSource();
    this.isPlaying = false;
    this.pausedAt = 0;
    this.updatePlayBtn(false);
    cancelAnimationFrame(this.animationFrameId);
  },

  seekTo(targetSec) {
    const wasPlaying = this.isPlaying;
    this.stopSource();
    this.pausedAt = Math.max(0, Math.min(targetSec, this.duration));
    this.updateTimeDisplay(this.pausedAt);
    if (wasPlaying) {
      this.startPlayback(this.pausedAt);
    }
  },

  stopSource() {
    if (this.activeSourceNode) {
      try {
        this.activeSourceNode.stop();
        this.activeSourceNode.disconnect();
      } catch (e) {}
      this.activeSourceNode = null;
    }
  },

  getEffectiveRate() {
    const pitchMultiplier = Math.pow(2, this.pitchSemitones / 12);
    return Math.max(0.1, this.speed * pitchMultiplier);
  },

  applyPlaybackRate() {
    if (this.activeSourceNode && this.activeSourceNode.playbackRate) {
      const rate = this.getEffectiveRate();
      this.activeSourceNode.playbackRate.setValueAtTime(rate, this.getAudioContext().currentTime);
    }
  },

  updateReverbGain() {
    if (this.dryGainNode && this.reverbGainNode) {
      const wet = Math.max(0, Math.min(1, this.reverbWet));
      this.reverbGainNode.gain.setValueAtTime(wet, this.getAudioContext().currentTime);
      this.dryGainNode.gain.setValueAtTime(1.0 - (wet * 0.4), this.getAudioContext().currentTime);
    }
  },

  createImpulseResponse(ctx, duration = 2.0, decay = 2.0) {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = length - i;
      const env = Math.pow(n / length, decay);
      left[i] = ((Math.random() * 2) - 1) * env;
      right[i] = ((Math.random() * 2) - 1) * env;
    }
    return impulse;
  },

  trackProgress() {
    const loop = () => {
      if (!this.isPlaying || !this.sourceBuffer) return;
      const ctx = this.getAudioContext();
      const current = (ctx.currentTime - this.startTime) * this.getEffectiveRate();
      if (current <= this.duration) {
        this.updateTimeDisplay(current);
        this.animationFrameId = requestAnimationFrame(loop);
      }
    };
    this.animationFrameId = requestAnimationFrame(loop);
  },

  updateTimeDisplay(currentSec) {
    const curEl = document.getElementById('audio-current-time');
    const totEl = document.getElementById('audio-total-time');
    const scrub = document.getElementById('audio-scrub-bar');

    const fmt = (s) => {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    if (curEl) curEl.textContent = fmt(currentSec);
    if (totEl) totEl.textContent = fmt(this.duration);
    if (scrub && this.duration > 0) {
      scrub.value = (currentSec / this.duration) * 100;
    }
  },

  updatePlayBtn(playing) {
    const playBtn = document.getElementById('audio-play-btn');
    if (!playBtn) return;
    playBtn.innerHTML = playing 
      ? '<i data-lucide="pause" class="w-5 h-5 fill-current"></i>' 
      : '<i data-lucide="play" class="w-5 h-5 fill-current"></i>';
    if (window.lucide) lucide.createIcons();
  },

  drawWaveform(buffer) {
    const canvas = document.getElementById('audio-waveform-canvas');
    if (!canvas || !buffer) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = canvas.offsetHeight * 2;

    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Dark / Light gradient
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, '#6366f1');
    grad.addColorStop(1, '#a855f7');
    ctx.fillStyle = grad;

    for (let i = 0; i < width; i += 3) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      const barHeight = Math.max(4, (max - min) * amp * 0.9);
      ctx.fillRect(i, (height - barHeight) / 2, 2, barHeight);
    }
  },

  async exportProcessedAudio() {
    if (!this.sourceBuffer) return;
    const exportBtn = document.getElementById('audio-export-btn');
    const originalText = exportBtn.innerHTML;

    try {
      const isRu = (window.I18N?.currentLang || 'en') === 'ru';
      exportBtn.disabled = true;
      exportBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>${isRu ? 'Экспорт...' : 'Exporting...'}</span>`;
      if (window.lucide) lucide.createIcons();

      const rate = this.getEffectiveRate();
      const outputDuration = this.duration / rate;
      if (outputDuration > 900) {
        throw new Error(isRu ? 'Длительность аудио превышает 15 минут (защита от нехватки памяти браузера).' : 'Audio duration exceeds 15 minutes (browser memory protection limit).');
      }
      const sampleRate = 44100;
      const length = Math.ceil(outputDuration * sampleRate);

      const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, length, sampleRate);

      const offlineSource = offlineCtx.createBufferSource();
      offlineSource.buffer = this.sourceBuffer;
      offlineSource.playbackRate.value = rate;

      // Reverb in offline
      const dryGain = offlineCtx.createGain();
      const reverbGain = offlineCtx.createGain();
      const wet = Math.max(0, Math.min(1, this.reverbWet));

      dryGain.gain.value = 1.0 - (wet * 0.4);
      reverbGain.gain.value = wet;

      const convolver = offlineCtx.createConvolver();
      convolver.buffer = this.createImpulseResponse(offlineCtx, 2.5, 2.0);

      offlineSource.connect(dryGain);
      dryGain.connect(offlineCtx.destination);

      offlineSource.connect(convolver);
      convolver.connect(reverbGain);
      reverbGain.connect(offlineCtx.destination);

      offlineSource.start(0);

      const renderedBuffer = await offlineCtx.startRendering();
      const wavBlob = this.audioBufferToWav(renderedBuffer);

      // Trigger download
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omnikit-audio-${Math.round(this.speed * 100)}speed.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error('Audio export failed:', err);
      const isRu = (window.I18N?.currentLang || 'en') === 'ru';
      alert((isRu ? 'Ошибка при экспорте аудио: ' : 'Audio export error: ') + err.message);
    } finally {
      exportBtn.disabled = false;
      exportBtn.innerHTML = originalText;
      if (window.lucide) lucide.createIcons();
    }
  },

  // High-performance PCM 16-bit Stereo WAV Encoder
  audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = buffer.length * blockAlign;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const arrayBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(arrayBuffer);

    // RIFF chunk
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    // data sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write samples
    const left = buffer.getChannelData(0);
    const right = numChannels > 1 ? buffer.getChannelData(1) : left;
    let offset = 44;

    for (let i = 0; i < buffer.length; i++) {
      let sampleL = Math.max(-1, Math.min(1, left[i]));
      let sampleR = Math.max(-1, Math.min(1, right[i]));

      view.setInt16(offset, sampleL < 0 ? sampleL * 0x8000 : sampleL * 0x7FFF, true);
      offset += 2;
      view.setInt16(offset, sampleR < 0 ? sampleR * 0x8000 : sampleR * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
  },

  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
};

if (typeof window !== 'undefined') window.AudioTools = AudioTools;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioTools;
}
