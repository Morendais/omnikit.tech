/**
 * OmniKit Hardware & Device Testing Suite
 * Tools: Microphone Test, Webcam Test, Keyboard Test, Mouse & Double-Click Test
 * 
 * 100% Client-Side Web APIs:
 * - Web Audio API (AudioContext, AnalyserNode, OscillatorNode)
 * - MediaDevices API (getUserMedia, enumerateDevices)
 * - HTML5 Canvas & Pointer/MouseEvent APIs
 * 
 * ZERO server requests, zero telemetry, 100% private.
 */

const HardwareTools = {
  // ==========================================
  // 1. MICROPHONE TESTER
  // ==========================================
  mic: {
    audioContext: null,
    analyser: null,
    sourceNode: null,
    mediaStream: null,
    animationFrameId: null,
    mediaRecorder: null,
    recordedChunks: [],
    isRecordingEcho: false,
    echoCountdownTimer: null,
    peakVolume: 0,
    isActive: false
  },

  // ==========================================
  // 2. WEBCAM TESTER
  // ==========================================
  webcam: {
    stream: null,
    isMirrored: true,
    fpsTimer: null,
    frameCounter: 0,
    lastFpsTimestamp: 0,
    currentFps: 0,
    isActive: false
  },

  // ==========================================
  // 3. KEYBOARD TESTER
  // ==========================================
  keyboard: {
    activeKeys: new Set(),
    testedKeys: new Set(),
    audioContext: null,
    soundEnabled: false,
    totalKeys: 84,
    isActive: false,
    listenerBound: false
  },

  // ==========================================
  // 4. MOUSE & DOUBLE-CLICK TESTER
  // ==========================================
  mouse: {
    pressedButtons: new Set(),
    lastDownTime: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 },
    // Fast double-click window: 200 ms typical (gaming/testing standard) + 5 ms tolerance
    doubleClickWindow: 205,
    clickThreshold: 50,
    normalClicksCount: 0,
    doubleClicksCount: 0,
    chatterCount: 0,
    wheelTotalScrolls: 0,
    wheelAnomaliesCount: 0,
    lastWheelDirection: 0,
    lastWheelTime: 0,
    cpsActive: false,
    cpsCooldown: false,
    cpsDuration: 5,
    cpsClicks: 0,
    cpsTimer: null,
    cpsTimeLeft: 5,
    cpsBest: 0,
    trackCtx: null,
    trackLast: null,
    trackDistance: 0,
    trackSpeed: 0,
    trackRAF: 0,
    globalListenersBound: false
  },

  init() {
    this.bindMicEvents();
    this.bindWebcamEvents();
    this.bindKeyboardEvents();
    this.bindMouseEvents();
    this.bindMouseTracking();
  },

  t(key, fallbackRu, fallbackEn) {
    if (window.I18N && typeof window.I18N.t === 'function') {
      const val = window.I18N.t(key);
      if (val && val !== key) return val;
    }
    const isRu = (window.I18N?.currentLang || 'en') === 'ru';
    return isRu ? fallbackRu : fallbackEn;
  },

  // ==========================================
  // MICROPHONE METHODS
  // ==========================================
  bindMicEvents() {
    const toggleBtn = document.getElementById('mic-toggle-btn');
    const rerecordBtn = document.getElementById('mic-rerecord-btn');
    const deviceSelect = document.getElementById('mic-device-select');

    toggleBtn?.addEventListener('click', () => {
      if (this.mic.isActive) {
        this.stopMicTest();
      } else {
        this.startMicTest();
      }
    });

    rerecordBtn?.addEventListener('click', () => {
      if (this.mic.isActive) {
        this.startEchoRecordTest();
      }
    });

    deviceSelect?.addEventListener('change', () => {
      if (this.mic.isActive) {
        this.stopMicTest();
        this.startMicTest();
      }
    });
  },

  async populateMicDevices() {
    const select = document.getElementById('mic-device-select');
    if (!select || !navigator.mediaDevices?.enumerateDevices) return;

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      
      const currentVal = select.value;
      select.innerHTML = '';

      if (audioInputs.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = this.t('mic_device_default', 'Микрофон по умолчанию', 'Default Microphone');
        select.appendChild(opt);
        return;
      }

      audioInputs.forEach((dev, idx) => {
        const opt = document.createElement('option');
        opt.value = dev.deviceId;
        opt.textContent = dev.label || `${this.t('mic_device_title', 'Микрофон', 'Microphone')} ${idx + 1}`;
        if (dev.deviceId === currentVal) opt.selected = true;
        select.appendChild(opt);
      });
    } catch (e) {
      console.warn('Microphone device enumeration failed:', e);
    }
  },

  async startMicTest() {
    const toggleBtn = document.getElementById('mic-toggle-btn');
    const statusBadge = document.getElementById('mic-status-badge');
    const errorEl = document.getElementById('mic-error-msg');
    const canvas = document.getElementById('mic-waveform-canvas');

    if (errorEl) errorEl.classList.add('hidden');

    if (!navigator.mediaDevices?.getUserMedia) {
      if (errorEl) {
        errorEl.textContent = this.t('mic_err_unsupported', 'Ваш браузер не поддерживает запись аудио через Web API.', 'Web Audio API is not supported in this browser.');
        errorEl.classList.remove('hidden');
      }
      return;
    }

    try {
      const select = document.getElementById('mic-device-select');
      const deviceId = select?.value;

      const constraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.mic.mediaStream = stream;
      this.mic.isActive = true;

      // Re-populate devices with real labels now that permission was granted
      this.populateMicDevices();

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.mic.audioContext = new AudioCtx();
      this.mic.analyser = this.mic.audioContext.createAnalyser();
      this.mic.analyser.fftSize = 512;
      this.mic.analyser.smoothingTimeConstant = 0.8;

      this.mic.sourceNode = this.mic.audioContext.createMediaStreamSource(stream);
      this.mic.sourceNode.connect(this.mic.analyser);
      // NOTE: Analyser is deliberately NOT connected to audioContext.destination
      // to avoid audio feedback howl through speakers!

      // Update UI button and status
      if (toggleBtn) {
        toggleBtn.innerHTML = `<i data-lucide="square" class="w-4 h-4"></i> <span data-i18n="mic_btn_stop">${this.t('mic_btn_stop', 'Остановить проверку', 'Stop Test')}</span>`;
        toggleBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-500');
        toggleBtn.classList.add('bg-rose-600', 'hover:bg-rose-500');
        if (window.lucide) lucide.createIcons();
      }

      if (statusBadge) {
        statusBadge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> <span data-i18n="mic_status_active">${this.t('mic_status_active', 'Микрофон активен — говорите', 'Microphone active — speak now')}</span>`;
        statusBadge.className = 'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
      }

      const sampleRateEl = document.getElementById('mic-samplerate-val');
      if (sampleRateEl) {
        sampleRateEl.textContent = `${this.mic.audioContext.sampleRate} Hz`;
      }

      const channelsEl = document.getElementById('mic-channels-val');
      if (channelsEl) {
        const audioTracks = stream.getAudioTracks();
        channelsEl.textContent = audioTracks[0]?.getSettings?.()?.channelCount || '1 (Mono)';
      }

      const rerecordBtn = document.getElementById('mic-rerecord-btn');
      if (rerecordBtn) rerecordBtn.disabled = false;

      // Start Visualizer Loop
      this.runMicVisualizer(canvas);

      // Automatically launch 5-second voice check recording alongside live test
      this.startEchoRecordTest();

    } catch (err) {
      console.error('Microphone access denied:', err);
      if (errorEl) {
        errorEl.textContent = this.t('mic_err_denied', 'Доступ к микрофону отклонен или микрофон не найден.', 'Microphone access denied or device not found.');
        errorEl.classList.remove('hidden');
      }
      this.stopMicTest();
    }
  },

  runMicVisualizer(canvas) {
    if (!canvas || !this.mic.analyser) return;
    const ctx = canvas.getContext('2d');
    const bufferLength = this.mic.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const volumeBar = document.getElementById('mic-volume-fill');
    const volumeVal = document.getElementById('mic-volume-val');
    const peakVal = document.getElementById('mic-peak-val');

    const draw = () => {
      if (!this.mic.isActive) return;

      this.mic.animationFrameId = requestAnimationFrame(draw);
      this.mic.analyser.getByteTimeDomainData(dataArray);

      // 1. Calculate RMS volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const val = (dataArray[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / bufferLength);
      const volumePct = Math.min(100, Math.round(rms * 280));

      if (volumePct > this.mic.peakVolume) {
        this.mic.peakVolume = volumePct;
      }

      // Update Volume Meter Bar
      if (volumeBar) {
        volumeBar.style.width = `${volumePct}%`;
        if (volumePct > 85) {
          volumeBar.className = 'h-full bg-rose-500 transition-all duration-75';
        } else if (volumePct > 50) {
          volumeBar.className = 'h-full bg-amber-500 transition-all duration-75';
        } else {
          volumeBar.className = 'h-full bg-emerald-500 transition-all duration-75';
        }
      }

      if (volumeVal) volumeVal.textContent = `${volumePct}%`;
      if (peakVal) peakVal.textContent = `${this.mic.peakVolume}%`;

      // 2. Render Smooth Fluid Oscilloscope Waveform on Canvas
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Background subtle grid line
      ctx.strokeStyle = document.documentElement.classList.contains('dark') ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Waveform curve
      ctx.lineWidth = 2.5;
      const gradient = ctx.createLinearGradient(0, 0, w, 0);
      gradient.addColorStop(0, '#6366f1');
      gradient.addColorStop(0.5, '#06b6d4');
      gradient.addColorStop(1, '#10b981');
      ctx.strokeStyle = gradient;

      ctx.beginPath();
      const sliceWidth = w / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * h) / 2;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += sliceWidth;
      }

      ctx.lineTo(w, h / 2);
      ctx.stroke();
    };

    draw();
  },

  stopMicTest() {
    this.mic.isActive = false;

    if (this.mic.echoCountdownTimer) {
      clearInterval(this.mic.echoCountdownTimer);
      this.mic.echoCountdownTimer = null;
    }

    if (this.mic.mediaRecorder) {
      try {
        if (this.mic.mediaRecorder.state !== 'inactive') {
          this.mic.mediaRecorder.stop();
        }
      } catch (e) {}
      this.mic.mediaRecorder = null;
    }
    this.mic.isRecordingEcho = false;

    if (this.mic.animationFrameId) {
      cancelAnimationFrame(this.mic.animationFrameId);
      this.mic.animationFrameId = null;
    }

    if (this.mic.mediaStream) {
      this.mic.mediaStream.getTracks().forEach(t => t.stop());
      this.mic.mediaStream = null;
    }

    if (this.mic.audioContext) {
      this.mic.audioContext.close().catch(() => {});
      this.mic.audioContext = null;
    }

    const toggleBtn = document.getElementById('mic-toggle-btn');
    if (toggleBtn) {
      toggleBtn.innerHTML = `<i data-lucide="mic" class="w-4 h-4"></i> <span data-i18n="mic_btn_start">${this.t('mic_btn_start', 'Начать проверку микрофона', 'Start Microphone Test')}</span>`;
      toggleBtn.classList.remove('bg-rose-600', 'hover:bg-rose-500');
      toggleBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-500');
      if (window.lucide) lucide.createIcons();
    }

    const statusBadge = document.getElementById('mic-status-badge');
    if (statusBadge) {
      statusBadge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-neutral-400"></span> <span data-i18n="mic_status_idle">${this.t('mic_status_idle', 'Микрофон отключен', 'Microphone Idle')}</span>`;
      statusBadge.className = 'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700';
    }

    const volumeBar = document.getElementById('mic-volume-fill');
    if (volumeBar) volumeBar.style.width = '0%';
    const volumeVal = document.getElementById('mic-volume-val');
    if (volumeVal) volumeVal.textContent = '0%';

    const rerecordBtn = document.getElementById('mic-rerecord-btn');
    if (rerecordBtn) {
      rerecordBtn.disabled = true;
      rerecordBtn.innerHTML = `<i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> <span data-i18n="mic_btn_rerecord">${this.t('mic_btn_rerecord', 'Записать ещё раз (5 сек)', 'Record Sample (5s)')}</span>`;
      if (window.lucide) lucide.createIcons();
    }

    // Clear canvas
    const canvas = document.getElementById('mic-waveform-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  },

  async startEchoRecordTest() {
    if (!this.mic.mediaStream || this.mic.isRecordingEcho) return;

    const rerecordBtn = document.getElementById('mic-rerecord-btn');
    const playbackContainer = document.getElementById('mic-playback-container');
    const audioEl = document.getElementById('mic-playback-audio');

    this.mic.isRecordingEcho = true;
    this.mic.recordedChunks = [];

    try {
      this.mic.mediaRecorder = new MediaRecorder(this.mic.mediaStream);
      this.mic.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) this.mic.recordedChunks.push(e.data);
      };

      this.mic.mediaRecorder.onstop = () => {
        if (this.mic.echoCountdownTimer) {
          clearInterval(this.mic.echoCountdownTimer);
          this.mic.echoCountdownTimer = null;
        }

        if (this.mic.recordedChunks.length > 0) {
          const blob = new Blob(this.mic.recordedChunks, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(blob);
          if (audioEl) {
            audioEl.src = audioUrl;
            audioEl.play().catch(() => {});
          }
          if (playbackContainer) playbackContainer.classList.remove('hidden');
        }

        this.mic.isRecordingEcho = false;
        if (rerecordBtn) {
          rerecordBtn.innerHTML = `<i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> <span data-i18n="mic_btn_rerecord">${this.t('mic_btn_rerecord', 'Записать ещё раз (5 сек)', 'Record Sample (5s)')}</span>`;
          rerecordBtn.disabled = !this.mic.isActive;
          if (window.lucide) lucide.createIcons();
        }
      };

      this.mic.mediaRecorder.start();

      let secondsLeft = 5;
      if (rerecordBtn) {
        rerecordBtn.disabled = true;
        rerecordBtn.innerHTML = `<span class="animate-ping w-2 h-2 rounded-full bg-rose-500 inline-block mr-1"></span> ${this.t('mic_recording', 'Запись...', 'Recording...')} (${secondsLeft}s)`;
      }

      this.mic.echoCountdownTimer = setInterval(() => {
        secondsLeft--;
        if (secondsLeft > 0) {
          if (rerecordBtn) rerecordBtn.innerHTML = `<span class="animate-ping w-2 h-2 rounded-full bg-rose-500 inline-block mr-1"></span> ${this.t('mic_recording', 'Запись...', 'Recording...')} (${secondsLeft}s)`;
        } else {
          clearInterval(this.mic.echoCountdownTimer);
          this.mic.echoCountdownTimer = null;
          try {
            if (this.mic.mediaRecorder && this.mic.mediaRecorder.state !== 'inactive') {
              this.mic.mediaRecorder.stop();
            }
          } catch (e) {
            this.mic.isRecordingEcho = false;
          }
        }
      }, 1000);

    } catch (err) {
      console.warn('Echo recording test failed:', err);
      this.mic.isRecordingEcho = false;
      if (rerecordBtn) {
        rerecordBtn.disabled = !this.mic.isActive;
        rerecordBtn.innerHTML = `<i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> <span data-i18n="mic_btn_rerecord">${this.t('mic_btn_rerecord', 'Записать ещё раз (5 сек)', 'Record Sample (5s)')}</span>`;
        if (window.lucide) lucide.createIcons();
      }
    }
  },

  // ==========================================
  // WEBCAM METHODS
  // ==========================================
  bindWebcamEvents() {
    const toggleBtn = document.getElementById('webcam-toggle-btn');
    const mirrorBtn = document.getElementById('webcam-mirror-btn');
    const snapBtn = document.getElementById('webcam-snap-btn');
    const fsBtn = document.getElementById('webcam-fs-btn');
    const deviceSelect = document.getElementById('webcam-device-select');
    const resSelect = document.getElementById('webcam-res-select');

    toggleBtn?.addEventListener('click', () => {
      if (this.webcam.isActive) {
        this.stopWebcamTest();
      } else {
        this.startWebcamTest();
      }
    });

    mirrorBtn?.addEventListener('click', () => {
      this.toggleWebcamMirror();
    });

    snapBtn?.addEventListener('click', () => {
      this.takeWebcamSnapshot();
    });

    fsBtn?.addEventListener('click', () => {
      this.toggleWebcamFullscreen();
    });

    deviceSelect?.addEventListener('change', () => {
      if (this.webcam.isActive) {
        this.stopWebcamTest();
        this.startWebcamTest();
      }
    });

    resSelect?.addEventListener('change', () => {
      if (this.webcam.isActive) {
        this.stopWebcamTest();
        this.startWebcamTest();
      }
    });
  },

  async populateWebcamDevices() {
    const select = document.getElementById('webcam-device-select');
    if (!select || !navigator.mediaDevices?.enumerateDevices) return;

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');

      const currentVal = select.value;
      select.innerHTML = '';

      if (videoInputs.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = this.t('webcam_device_default', 'Веб-камера по умолчанию', 'Default Webcam');
        select.appendChild(opt);
        return;
      }

      videoInputs.forEach((dev, idx) => {
        const opt = document.createElement('option');
        opt.value = dev.deviceId;
        opt.textContent = dev.label || `${this.t('webcam_device_title', 'Камера', 'Camera')} ${idx + 1}`;
        if (dev.deviceId === currentVal) opt.selected = true;
        select.appendChild(opt);
      });
    } catch (e) {
      console.warn('Webcam device enumeration failed:', e);
    }
  },

  async startWebcamTest() {
    const toggleBtn = document.getElementById('webcam-toggle-btn');
    const statusBadge = document.getElementById('webcam-status-badge');
    const errorEl = document.getElementById('webcam-error-msg');
    const videoEl = document.getElementById('webcam-video');
    const placeholderEl = document.getElementById('webcam-placeholder');
    const snapBtn = document.getElementById('webcam-snap-btn');
    const mirrorBtn = document.getElementById('webcam-mirror-btn');
    const fsBtn = document.getElementById('webcam-fs-btn');

    if (errorEl) errorEl.classList.add('hidden');

    if (!navigator.mediaDevices?.getUserMedia) {
      if (errorEl) {
        errorEl.textContent = this.t('webcam_err_unsupported', 'Ваш браузер не поддерживает доступ к веб-камере.', 'Webcam access is not supported in this browser.');
        errorEl.classList.remove('hidden');
      }
      return;
    }

    try {
      const deviceSelect = document.getElementById('webcam-device-select');
      const resSelect = document.getElementById('webcam-res-select');
      const deviceId = deviceSelect?.value;
      const resVal = resSelect?.value || '1080p';

      let videoConstraints = {
        deviceId: deviceId ? { exact: deviceId } : undefined
      };

      if (resVal === '1080p') {
        videoConstraints.width = { ideal: 1920 };
        videoConstraints.height = { ideal: 1080 };
      } else if (resVal === '720p') {
        videoConstraints.width = { ideal: 1280 };
        videoConstraints.height = { ideal: 720 };
      } else if (resVal === '480p') {
        videoConstraints.width = { ideal: 640 };
        videoConstraints.height = { ideal: 480 };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false
      });

      this.webcam.stream = stream;
      this.webcam.isActive = true;

      // Re-populate devices with real labels
      this.populateWebcamDevices();

      if (videoEl) {
        videoEl.srcObject = stream;
        videoEl.classList.remove('hidden');
        if (placeholderEl) placeholderEl.classList.add('hidden');

        videoEl.onloadedmetadata = () => {
          const w = videoEl.videoWidth;
          const h = videoEl.videoHeight;
          const resEl = document.getElementById('webcam-res-val');
          if (resEl) resEl.textContent = `${w} × ${h} px`;

          const aspectEl = document.getElementById('webcam-aspect-val');
          if (aspectEl) {
            const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
            const d = gcd(w, h);
            aspectEl.textContent = `${w / d}:${h / d}`;
          }
        };
      }

      // Update Button
      if (toggleBtn) {
        toggleBtn.innerHTML = `<i data-lucide="square" class="w-4 h-4"></i> <span data-i18n="webcam_btn_stop">${this.t('webcam_btn_stop', 'Отключить камеру', 'Stop Camera')}</span>`;
        toggleBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-500');
        toggleBtn.classList.add('bg-rose-600', 'hover:bg-rose-500');
        if (window.lucide) lucide.createIcons();
      }

      if (statusBadge) {
        statusBadge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> <span data-i18n="webcam_status_active">${this.t('webcam_status_active', 'Камера работает', 'Camera Active')}</span>`;
        statusBadge.className = 'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
      }

      if (snapBtn) snapBtn.disabled = false;
      if (mirrorBtn) mirrorBtn.disabled = false;
      if (fsBtn) fsBtn.disabled = false;

      // Real-time FPS Measurement
      this.startFpsCounter(videoEl);

    } catch (err) {
      console.error('Webcam access error:', err);
      if (errorEl) {
        errorEl.textContent = this.t('webcam_err_denied', 'Доступ к веб-камере отклонен или устройство занято другим приложением.', 'Webcam access denied or camera is in use by another app.');
        errorEl.classList.remove('hidden');
      }
      this.stopWebcamTest();
    }
  },

  startFpsCounter(videoEl) {
    this.webcam.frameCounter = 0;
    this.webcam.lastFpsTimestamp = performance.now();
    const fpsVal = document.getElementById('webcam-fps-val');

    const updateFps = () => {
      if (!this.webcam.isActive) return;

      this.webcam.frameCounter++;
      const now = performance.now();
      const elapsed = now - this.webcam.lastFpsTimestamp;

      if (elapsed >= 1000) {
        const fps = Math.round((this.webcam.frameCounter * 1000) / elapsed);
        if (fpsVal) fpsVal.textContent = `${fps} FPS`;
        this.webcam.frameCounter = 0;
        this.webcam.lastFpsTimestamp = now;
      }

      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype && videoEl) {
        videoEl.requestVideoFrameCallback(updateFps);
      } else {
        requestAnimationFrame(updateFps);
      }
    };

    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype && videoEl) {
      videoEl.requestVideoFrameCallback(updateFps);
    } else {
      requestAnimationFrame(updateFps);
    }
  },

  stopWebcamTest() {
    this.webcam.isActive = false;

    if (this.webcam.stream) {
      this.webcam.stream.getTracks().forEach(t => t.stop());
      this.webcam.stream = null;
    }

    const videoEl = document.getElementById('webcam-video');
    const placeholderEl = document.getElementById('webcam-placeholder');
    if (videoEl) {
      videoEl.srcObject = null;
      videoEl.classList.add('hidden');
    }
    if (placeholderEl) placeholderEl.classList.remove('hidden');

    const toggleBtn = document.getElementById('webcam-toggle-btn');
    if (toggleBtn) {
      toggleBtn.innerHTML = `<i data-lucide="camera" class="w-4 h-4"></i> <span data-i18n="webcam_btn_start">${this.t('webcam_btn_start', 'Включить веб-камеру', 'Start Webcam Test')}</span>`;
      toggleBtn.classList.remove('bg-rose-600', 'hover:bg-rose-500');
      toggleBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-500');
      if (window.lucide) lucide.createIcons();
    }

    const statusBadge = document.getElementById('webcam-status-badge');
    if (statusBadge) {
      statusBadge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-neutral-400"></span> <span data-i18n="webcam_status_idle">${this.t('webcam_status_idle', 'Камера отключена', 'Camera Idle')}</span>`;
      statusBadge.className = 'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700';
    }

    const fpsVal = document.getElementById('webcam-fps-val');
    if (fpsVal) fpsVal.textContent = '0 FPS';
    const resEl = document.getElementById('webcam-res-val');
    if (resEl) resEl.textContent = '—';
    const aspectEl = document.getElementById('webcam-aspect-val');
    if (aspectEl) aspectEl.textContent = '—';

    const snapBtn = document.getElementById('webcam-snap-btn');
    if (snapBtn) snapBtn.disabled = true;
    const mirrorBtn = document.getElementById('webcam-mirror-btn');
    if (mirrorBtn) mirrorBtn.disabled = true;
    const fsBtn = document.getElementById('webcam-fs-btn');
    if (fsBtn) fsBtn.disabled = true;
  },

  toggleWebcamMirror() {
    this.webcam.isMirrored = !this.webcam.isMirrored;
    const videoEl = document.getElementById('webcam-video');
    if (videoEl) {
      videoEl.style.transform = this.webcam.isMirrored ? 'scaleX(-1)' : 'scaleX(1)';
    }
  },

  takeWebcamSnapshot() {
    const videoEl = document.getElementById('webcam-video');
    if (!videoEl || !this.webcam.isActive || videoEl.videoWidth === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const ctx = canvas.getContext('2d');

    if (this.webcam.isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      a.download = `omnikit-webcam-snapshot-${dateStr}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const isRu = (window.I18N?.currentLang || 'en') === 'ru';
      if (window.TextTools && typeof window.TextTools.showToast === 'function') {
        TextTools.showToast(isRu ? 'Снимок сохранен на компьютер!' : 'Snapshot saved to your device!');
      }
    }, 'image/png');
  },

  toggleWebcamFullscreen() {
    const wrapper = document.getElementById('webcam-wrapper');
    if (!wrapper) return;
    if (!document.fullscreenElement) {
      wrapper.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  },

  // ==========================================
  // KEYBOARD METHODS
  // ==========================================
  bindKeyboardEvents() {
    const soundToggle = document.getElementById('kb-sound-toggle');
    const resetBtn = document.getElementById('kb-reset-btn');

    soundToggle?.addEventListener('change', (e) => {
      this.keyboard.soundEnabled = e.target.checked;
    });

    resetBtn?.addEventListener('click', () => {
      this.resetKeyboard();
    });

    if (!this.keyboard.listenerBound) {
      window.addEventListener('keydown', (e) => this.handleKeyDown(e));
      window.addEventListener('keyup', (e) => this.handleKeyUp(e));
      this.keyboard.listenerBound = true;
    }
  },

  handleKeyDown(e) {
    if (window.App?.activeTool !== 'keyboard-test') return;

    // Prevent default browser actions for key combos while testing keyboard
    // (e.g. Tab, F1, F5, F12, Backspace, Alt, Space scroll)
    const dangerousCodes = [
      'Tab', 'Backspace', 'F1', 'F3', 'F5', 'F6', 'F7',
      'AltLeft', 'AltRight', 'ContextMenu'
    ];
    if (dangerousCodes.includes(e.code) || (e.code === 'Space' && e.target.tagName !== 'INPUT')) {
      e.preventDefault();
    }

    this.keyboard.activeKeys.add(e.code);
    this.keyboard.testedKeys.add(e.code);

    // Highlight key on virtual keyboard
    const keyEl = document.querySelector(`[data-key-code="${e.code}"]`);
    if (keyEl) {
      keyEl.classList.add('key-active', 'key-tested');
    }

    // Update NKRO / Ghosting box
    this.updateKeyboardStats(e);
  },

  handleKeyUp(e) {
    if (window.App?.activeTool !== 'keyboard-test') return;

    this.keyboard.activeKeys.delete(e.code);

    const keyEl = document.querySelector(`[data-key-code="${e.code}"]`);
    if (keyEl) {
      keyEl.classList.remove('key-active');
    }

    this.updateKeyboardStats(e);
  },

  playMechanicalSound() {
    try {
      if (!this.keyboard.audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.keyboard.audioContext = new AudioCtx();
      }
      const ctx = this.keyboard.audioContext;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;

      // 1. Crisp mechanical click transient (tactile click leaf snap)
      const bufferSize = Math.floor(ctx.sampleRate * 0.005); // 5ms burst
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
      }
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;

      const clickFilter = ctx.createBiquadFilter();
      clickFilter.type = 'bandpass';
      clickFilter.frequency.setValueAtTime(3400, now);
      clickFilter.Q.setValueAtTime(2.5, now);

      const clickGain = ctx.createGain();
      clickGain.gain.setValueAtTime(0.2, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.005);

      noiseNode.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(ctx.destination);
      noiseNode.start(now);

      // 2. Tactile bottom-out "thock / clack" (damped key switch body)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      const baseFreq = 260 + (Math.random() * 30 - 15);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * 1.6, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.02);

      oscGain.gain.setValueAtTime(0.14, now);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch (e) {}
  },

  updateKeyboardStats(e) {
    // 1. Key Inspector Fields
    const codeEl = document.getElementById('kb-inspect-code');
    const keyEl = document.getElementById('kb-inspect-key');
    const whichEl = document.getElementById('kb-inspect-which');
    const locationEl = document.getElementById('kb-inspect-location');

    if (codeEl && e) codeEl.textContent = e.code || '—';
    if (keyEl && e) keyEl.textContent = e.key === ' ' ? 'Space' : (e.key || '—');
    if (whichEl && e) whichEl.textContent = e.keyCode || e.which || '—';
    if (locationEl && e) {
      const locNames = ['Standard', 'Left', 'Right', 'Numpad'];
      locationEl.textContent = locNames[e.location] || 'Standard';
    }

    // 2. NKRO Multi-Key Rollover
    const nkroCount = document.getElementById('kb-nkro-count');
    const nkroList = document.getElementById('kb-nkro-list');
    const nkroStatus = document.getElementById('kb-nkro-status');

    const heldSize = this.keyboard.activeKeys.size;
    if (nkroCount) nkroCount.textContent = heldSize;

    if (nkroList) {
      nkroList.textContent = heldSize > 0 ? Array.from(this.keyboard.activeKeys).join(', ') : '—';
    }

    if (nkroStatus) {
      if (heldSize >= 3) {
        nkroStatus.textContent = this.t('kb_nkro_good', 'NKRO: Мульти-нажатия работают без блокировок (Ghosting нет)', 'NKRO: Multiple keys detected without ghosting');
        nkroStatus.className = 'text-xs font-semibold text-indigo-600 dark:text-indigo-400';
      } else {
        nkroStatus.textContent = this.t('kb_nkro_hint', 'Зажмите 3+ клавиши одновременно для проверки Ghosting', 'Hold 3+ keys simultaneously to test Ghosting');
        nkroStatus.className = 'text-xs text-neutral-500';
      }
    }

    // 3. Progress counter
    const counterEl = document.getElementById('kb-tested-count');
    if (counterEl) {
      counterEl.textContent = `${this.keyboard.testedKeys.size} / ${this.keyboard.totalKeys}`;
    }
  },

  resetKeyboard() {
    this.keyboard.activeKeys.clear();
    this.keyboard.testedKeys.clear();

    document.querySelectorAll('.keycap').forEach(el => {
      el.classList.remove('key-active', 'key-tested');
    });

    this.updateKeyboardStats(null);
  },

  // ==========================================
  // MOUSE & DOUBLE CLICK METHODS
  // ==========================================
  bindMouseEvents() {
    const clickZone = document.getElementById('mouse-test-zone');
    const scrollZone = document.getElementById('mouse-scroll-zone');
    const cpsBtn = document.getElementById('mouse-cps-btn');
    const resetBtn = document.getElementById('mouse-reset-btn');
    const thresholdSlider = document.getElementById('mouse-threshold-slider');
    const thresholdVal = document.getElementById('mouse-threshold-val');

    thresholdSlider?.addEventListener('input', (e) => {
      this.mouse.clickThreshold = parseInt(e.target.value, 10);
      if (thresholdVal) thresholdVal.textContent = `${this.mouse.clickThreshold} ms`;
    });

    // 1. Mouse Button Down Handler.
    // Bind ONLY ONE event family: pointer events on modern browsers, mouse events
    // as a fallback. Binding both made a single physical click arrive twice
    // (pointerdown + compat mousedown), which produced phantom "double-clicks".
    const hasPointerEvents = typeof window.PointerEvent === 'function';
    const onMouseDown = (e) => {
      e.preventDefault();
      this.handleMouseDown(e);
    };
    const onMouseUp = (e) => {
      this.handleMouseUp(e);
    };

    if (hasPointerEvents) {
      clickZone?.addEventListener('pointerdown', onMouseDown);
      clickZone?.addEventListener('pointerup', onMouseUp);
    } else {
      clickZone?.addEventListener('mousedown', onMouseDown);
      clickZone?.addEventListener('mouseup', onMouseUp);
    }
    clickZone?.addEventListener('contextmenu', (e) => {
      e.preventDefault(); // Prevent native right-click menu, but DO NOT release button 2 here!
    });

    // Global release listeners to prevent stuck/held button visual glitch
    if (!this.mouse.globalListenersBound) {
      window.addEventListener('pointerup', (e) => {
        this.handleMouseUp(e);
      });
      window.addEventListener('mouseup', (e) => {
        this.handleMouseUp(e);
      });
      window.addEventListener('pointercancel', () => this.clearAllPressedButtons());
      window.addEventListener('blur', () => this.clearAllPressedButtons());
      document.addEventListener('mouseleave', () => this.clearAllPressedButtons());

      // If contextmenu triggers anywhere, prevent default and ensure RMB is released
      window.addEventListener('contextmenu', (e) => {
        const mouseView = document.getElementById('tool-view-mouse-test');
        if (window.App?.activeTool === 'mouse-test' || (mouseView && !mouseView.classList.contains('hidden'))) {
          e.preventDefault();
        }
      });

      // Synchronize with OS hardware button bitmask: tracks simultaneous presses & releases
      const syncPhysicalButtons = (e) => {
        if (typeof e.buttons === 'number') {
          const mouseView = document.getElementById('tool-view-mouse-test');
          if (!mouseView || mouseView.classList.contains('hidden')) return;

          if (e.buttons === 0 && this.mouse.pressedButtons.size > 0) {
            this.clearAllPressedButtons();
            return;
          }
          // LMB (bit 1 -> button 0)
          if ((e.buttons & 1) !== 0 && !this.mouse.pressedButtons.has(0)) this.pressMouseButton(0);
          else if ((e.buttons & 1) === 0 && this.mouse.pressedButtons.has(0)) this.releaseMouseButton(0);

          // RMB (bit 2 -> button 2)
          if ((e.buttons & 2) !== 0 && !this.mouse.pressedButtons.has(2)) this.pressMouseButton(2);
          else if ((e.buttons & 2) === 0 && this.mouse.pressedButtons.has(2)) this.releaseMouseButton(2);

          // MMB (bit 4 -> button 1)
          if ((e.buttons & 4) !== 0 && !this.mouse.pressedButtons.has(1)) this.pressMouseButton(1);
          else if ((e.buttons & 4) === 0 && this.mouse.pressedButtons.has(1)) this.releaseMouseButton(1);
        }
      };

      window.addEventListener('pointermove', syncPhysicalButtons);
      window.addEventListener('mousemove', syncPhysicalButtons);
      this.mouse.globalListenersBound = true;
    }

    // 2. Scroll Wheel Handler
    scrollZone?.addEventListener('wheel', (e) => this.handleMouseWheel(e), { passive: false });

    // 3. CPS Rapid Click Button
    cpsBtn?.addEventListener('click', (e) => this.handleCpsClick(e));

    // Duration selector pills (1s, 3s, 5s, 10s)
    document.querySelectorAll('.cps-duration-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        if (this.mouse.cpsActive) return;
        const sec = parseInt(e.currentTarget.getAttribute('data-sec'), 10) || 5;
        this.mouse.cpsDuration = sec;
        this.mouse.cpsTimeLeft = sec;

        document.querySelectorAll('.cps-duration-pill').forEach(p => {
          p.className = 'cps-duration-pill px-2 py-0.5 rounded transition text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100';
        });
        e.currentTarget.className = 'cps-duration-pill px-2 py-0.5 rounded transition bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-sm font-black';

        const timerEl = document.getElementById('mouse-cps-timer');
        if (timerEl) timerEl.textContent = `${sec}.0s`;
      });
    });

    // 4. Reset Button
    resetBtn?.addEventListener('click', () => this.resetMouseStats());

    // Load CPS Best from localStorage
    const savedBest = localStorage.getItem('omnikit_cps_best');
    if (savedBest) {
      this.mouse.cpsBest = parseFloat(savedBest);
      const bestEl = document.getElementById('mouse-cps-best');
      if (bestEl) bestEl.textContent = this.mouse.cpsBest.toFixed(1);
    }
  },

  // ==========================================
  // POINTER TRACKING & JITTER CANVAS (mouse test v2)
  // Draws the pointer trail inside the card canvas; sensor faults (jitter,
  // dropouts, angle snapping zigzag) become visible as a broken trail.
  // ==========================================
  bindMouseTracking() {
    const canvas = document.getElementById('mouse-track-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    this.mouse.trackCtx = ctx;

    const xyEl = document.getElementById('mouse-track-xy');
    const speedEl = document.getElementById('mouse-track-speed');
    const distEl = document.getElementById('mouse-track-dist');

    // Gentle fade loop keeps only the freshest ~1-2s of movement on screen
    const fadeLoop = () => {
      const isDark = document.documentElement.classList.contains('dark');
      ctx.fillStyle = isDark ? 'rgba(20,22,26,0.05)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      this.mouse.trackRAF = requestAnimationFrame(fadeLoop);
    };
    canvas.addEventListener('pointerenter', () => {
      cancelAnimationFrame(this.mouse.trackRAF);
      this.mouse.trackRAF = requestAnimationFrame(fadeLoop);
    });
    canvas.addEventListener('pointerleave', () => {
      cancelAnimationFrame(this.mouse.trackRAF);
      this.mouse.trackLast = null;
      this.mouse.trackSpeed = 0;
      if (speedEl) speedEl.textContent = '0 px/s';
    });

    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const x = Math.round(((e.clientX - r.left) / r.width) * canvas.width);
      const y = Math.round(((e.clientY - r.top) / r.height) * canvas.height);
      const now = performance.now();

      if (this.mouse.trackLast) {
        const dist = Math.hypot(x - this.mouse.trackLast.x, y - this.mouse.trackLast.y);
        const dt = Math.max(now - this.mouse.trackLast.t, 1);
        if (dist > 0.5) {
          this.mouse.trackDistance += dist;
          this.mouse.trackSpeed = (dist / dt) * 1000;
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(this.mouse.trackLast.x, this.mouse.trackLast.y);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      }
      this.mouse.trackLast = { x, y, t: now };

      if (xyEl) xyEl.textContent = `${x} / ${y}`;
      if (distEl) distEl.textContent = `${Math.round(this.mouse.trackDistance)} px`;
      if (speedEl && now - (this._lastSpeedPaint || 0) > 120) {
        speedEl.textContent = `${Math.round(this.mouse.trackSpeed)} px/s`;
        this._lastSpeedPaint = now;
      }
    });

    document.getElementById('mouse-track-clear')?.addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.mouse.trackDistance = 0;
      this.mouse.trackLast = null;
      this.mouse.trackSpeed = 0;
      if (distEl) distEl.textContent = '0 px';
      if (speedEl) speedEl.textContent = '0 px/s';
      if (xyEl) xyEl.textContent = '— / —';
    });
  },

  handleMouseDown(e) {
    e.preventDefault();
    const btn = e.button; // 0=Left, 1=Middle, 2=Right, 3=Back, 4=Forward
    const now = performance.now();
    const lastTime = this.mouse.lastDownTime[btn] || 0;
    const delta = Math.round(now - lastTime);
    this.mouse.lastDownTime[btn] = now;

    // Track active button set & highlight element
    this.mouse.pressedButtons.add(btn);
    this.highlightMouseButton(btn, true);

    // Watchdog timer: safety auto-release if browser drops mouseup/pointerup event
    if (!this.mouse._btnTimeouts) this.mouse._btnTimeouts = {};
    if (this.mouse._btnTimeouts[btn]) clearTimeout(this.mouse._btnTimeouts[btn]);
    this.mouse._btnTimeouts[btn] = setTimeout(() => {
      this.releaseMouseButton(btn);
    }, 500);

    // Double click = two presses within the OS-style window (500 ms + 5 ms).
    // Chatter = suspiciously fast repeat press (microswitch bounce), a subset
    // of double clicks counted separately as a hardware fault.
    const isDoubleClick = lastTime > 0 && delta > 0 && delta <= this.mouse.doubleClickWindow;
    const isChatter = isDoubleClick && delta <= this.mouse.clickThreshold;
    const isRu = (window.I18N?.currentLang || 'en') === 'ru';
    const btnNames = isRu
      ? ['LMB (Левая)', 'MMB (Колесико)', 'RMB (Правая)', 'Mouse 4 (Назад)', 'Mouse 5 (Вперед)']
      : ['LMB (Left)', 'MMB (Wheel)', 'RMB (Right)', 'Mouse 4 (Back)', 'Mouse 5 (Forward)'];
    const btnName = btnNames[btn] || `Button ${btn}`;

    if (isChatter) {
      this.mouse.doubleClicksCount++;
      this.mouse.chatterCount++;
      this.showDoubleClickAlert(delta, btnName, 'chatter');
      this.addClickHistoryItem(delta, btnName, 'chatter');
    } else if (isDoubleClick) {
      this.mouse.doubleClicksCount++;
      this.showDoubleClickAlert(delta, btnName, 'double');
      this.addClickHistoryItem(delta, btnName, 'double');
    } else {
      this.mouse.normalClicksCount++;
      this.addClickHistoryItem(delta, btnName, 'normal');
    }

    this.updateMouseCounts();
    if (this.mouse.cpsTimer) {
      clearInterval(this.mouse.cpsTimer);
      this.mouse.cpsTimer = null;
    }
    this.mouse.cpsActive = false;
    const cpsBtn = document.getElementById('mouse-cps-btn');
    if (cpsBtn) {
      cpsBtn.textContent = this.t('mouse_cps_btn_text', 'Кликайте здесь как можно быстрее!', 'Click here as fast as you can!');
    }
    const timerEl = document.getElementById('mouse-cps-timer');
    if (timerEl) timerEl.textContent = '5.0s';
    const valEl = document.getElementById('mouse-cps-val');
    if (valEl) valEl.textContent = '0.0';
    const countEl = document.getElementById('mouse-cps-clicks');
    if (countEl) countEl.textContent = '0';
  },

  pressMouseButton(btn) {
    if (typeof btn !== 'number') return;
    this.mouse.pressedButtons.add(btn);
    this.highlightMouseButton(btn, true);
    if (!this.mouse._btnTimeouts) this.mouse._btnTimeouts = {};
    if (this.mouse._btnTimeouts[btn]) clearTimeout(this.mouse._btnTimeouts[btn]);
    this.mouse._btnTimeouts[btn] = setTimeout(() => {
      this.releaseMouseButton(btn);
    }, 500);
  },

  releaseMouseButton(btn) {
    if (typeof btn !== 'number') return;
    this.mouse.pressedButtons.delete(btn);
    this.highlightMouseButton(btn, false);
    if (this.mouse._btnTimeouts && this.mouse._btnTimeouts[btn]) {
      clearTimeout(this.mouse._btnTimeouts[btn]);
      delete this.mouse._btnTimeouts[btn];
    }
  },

  handleMouseUp(e) {
    if (e && typeof e.button === 'number') {
      this.releaseMouseButton(e.button);
    }
  },

  clearAllPressedButtons() {
    this.mouse.pressedButtons.clear();
    if (this.mouse._btnTimeouts) {
      Object.values(this.mouse._btnTimeouts).forEach(clearTimeout);
      this.mouse._btnTimeouts = {};
    }
    for (let i = 0; i <= 5; i++) {
      this.highlightMouseButton(i, false);
    }
  },

  highlightMouseButton(btn, isPressed) {
    const el = document.getElementById(`mouse-btn-${btn}`);
    if (el) {
      if (isPressed) {
        el.classList.add('btn-pressed');
      } else {
        el.classList.remove('btn-pressed');
      }
    }
  },

  showDoubleClickAlert(delta, btnName, kind) {
    const alertBox = document.getElementById('mouse-doubleclick-alert');
    if (!alertBox) return;

    const isChatter = kind === 'chatter';
    alertBox.textContent = '';
    alertBox.className = isChatter
      ? 'p-4 rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/50 dark:border-rose-800'
      : 'p-4 rounded-xl border border-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 dark:border-indigo-800';

    const wrapper = document.createElement('div');
    wrapper.className = 'flex items-center gap-3';

    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', isChatter ? 'alert-triangle' : 'mouse-pointer-click');
    icon.className = isChatter ? 'w-6 h-6 text-rose-500 shrink-0' : 'w-6 h-6 text-indigo-500 shrink-0';

    const textDiv = document.createElement('div');
    const titleP = document.createElement('p');
    titleP.className = isChatter
      ? 'font-bold text-rose-600 dark:text-rose-400 text-sm'
      : 'font-bold text-indigo-600 dark:text-indigo-400 text-sm';
    titleP.textContent = isChatter
      ? this.t('mouse_alert_title', 'Обнаружен дребезг микропереключателя!', 'Microswitch chatter detected!')
      : this.t('mouse_alert_double_title', 'Двойной клик зарегистрирован', 'Double-click registered');

    const descP = document.createElement('p');
    descP.className = 'text-xs text-neutral-600 dark:text-neutral-400 mt-0.5';
    descP.textContent = isChatter
      ? `${btnName} — ${this.t('mouse_alert_interval', 'интервал между нажатиями', 'press interval')}: ${delta} ms (${this.t('mouse_alert_reason', 'порог дребезга', 'chatter threshold')} ${this.mouse.clickThreshold} ms).`
      : `${btnName} — ${this.t('mouse_alert_interval', 'интервал между нажатиями', 'press interval')}: ${delta} ms (≤ ${this.mouse.doubleClickWindow} ms).`;

    textDiv.appendChild(titleP);
    textDiv.appendChild(descP);
    wrapper.appendChild(icon);
    wrapper.appendChild(textDiv);
    alertBox.appendChild(wrapper);

    alertBox.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();

    alertBox.classList.remove('animate-pulse');
    void alertBox.offsetWidth;
    if (isChatter) alertBox.classList.add('animate-pulse');
  },

  addClickHistoryItem(delta, btnName, kind) {
    const historyList = document.getElementById('mouse-history-list');
    if (!historyList) return;

    const item = document.createElement('div');
    item.className = `px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center justify-between ${
      kind === 'chatter'
        ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400 font-bold'
        : kind === 'double'
          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300'
          : 'bg-white border-neutral-200 text-neutral-700 dark:bg-[#14161a] dark:border-neutral-800 dark:text-neutral-300'
    }`;

    const nameSpan = document.createElement('span');
    nameSpan.textContent = btnName;

    const rightSpan = document.createElement('span');
    rightSpan.className = 'flex items-center gap-1.5';

    if (kind === 'chatter' || kind === 'double') {
      const tag = document.createElement('span');
      tag.className = kind === 'chatter'
        ? 'text-[10px] px-1 rounded bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 uppercase'
        : 'text-[10px] px-1 rounded bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 uppercase';
      tag.textContent = kind === 'chatter' ? 'Chatter' : 'Double-Click';
      rightSpan.appendChild(tag);
    }

    const deltaSpan = document.createElement('span');
    deltaSpan.textContent = delta > 5000 ? '>5s' : `${delta} ms`;
    rightSpan.appendChild(deltaSpan);

    item.appendChild(nameSpan);
    item.appendChild(rightSpan);

    historyList.prepend(item);

    while (historyList.children.length > 12) {
      historyList.removeChild(historyList.lastChild);
    }
  },

  updateMouseCounts() {
    const normalEl = document.getElementById('mouse-normal-count');
    const doubleEl = document.getElementById('mouse-double-count');
    const chatterEl = document.getElementById('mouse-chatter-count');
    if (normalEl) normalEl.textContent = this.mouse.normalClicksCount;
    if (doubleEl) doubleEl.textContent = this.mouse.doubleClicksCount;
    if (chatterEl) chatterEl.textContent = this.mouse.chatterCount;
  },

  handleMouseWheel(e) {
    e.preventDefault();
    const now = performance.now();
    const isUp = e.deltaY < 0;
    const direction = isUp ? 1 : -1;

    this.mouse.wheelTotalScrolls++;

    if (!this.mouse.wheelHistory) {
      this.mouse.wheelHistory = [];
    }
    this.mouse.wheelHistory.push({ dir: direction, time: now });
    if (this.mouse.wheelHistory.length > 8) {
      this.mouse.wheelHistory.shift();
    }

    // Smart Encoder Anomaly (Contact Bounce/Jitter) Detection:
    // A genuine hardware anomaly occurs when an encoder scrolling in one dominant direction
    // fires an isolated reverse tick (e.g. [1, 1, -1, 1] or [-1, -1, 1, -1]) in rapid succession (< 160ms).
    // An intentional direction change by user (e.g. [1, 1, -1, -1, -1]) is normal and NOT an anomaly.
    const h = this.mouse.wheelHistory;
    if (h.length >= 3) {
      const last = h[h.length - 1];
      const prev = h[h.length - 2];
      const prevPrev = h[h.length - 3];

      if (prev.dir !== prevPrev.dir && prev.dir !== last.dir && (last.time - prevPrev.time < 160)) {
        this.mouse.wheelAnomaliesCount++;
        const anomEl = document.getElementById('mouse-wheel-anomalies');
        if (anomEl) {
          anomEl.textContent = this.mouse.wheelAnomaliesCount;
          anomEl.className = 'font-black text-2xl text-amber-500 dark:text-amber-400';
        }
      }
    }

    this.mouse.lastWheelDirection = direction;
    this.mouse.lastWheelTime = now;

    const dirEl = document.getElementById('mouse-wheel-dir');
    const totalEl = document.getElementById('mouse-wheel-total');

    const isRu = (window.I18N?.currentLang || 'en') === 'ru';
    if (dirEl) dirEl.textContent = isUp ? (isRu ? '↑ Вверх' : '↑ Up') : (isRu ? '↓ Вниз' : '↓ Down');
    if (totalEl) totalEl.textContent = this.mouse.wheelTotalScrolls;

    // Visual Wheel Flash & Direction Chevrons
    const wheelSvg = document.getElementById('mouse-btn-wheel');
    if (wheelSvg) {
      wheelSvg.classList.add('btn-pressed');
      clearTimeout(this.mouse._wheelTimeout);
      this.mouse._wheelTimeout = setTimeout(() => wheelSvg.classList.remove('btn-pressed'), 120);
    }

    const upIndicator = document.getElementById('wheel-up-indicator');
    const downIndicator = document.getElementById('wheel-down-indicator');
    const cylinder = document.getElementById('wheel-visual-cylinder');

    if (cylinder) {
      cylinder.classList.remove('wheel-scrolling-up', 'wheel-scrolling-down');
      void cylinder.offsetWidth; // trigger reflow
      cylinder.classList.add(isUp ? 'wheel-scrolling-up' : 'wheel-scrolling-down');
    }

    if (upIndicator) {
      const span = upIndicator.querySelector('span');
      if (span) span.textContent = isRu ? 'ВВЕРХ' : 'UP';
    }
    if (downIndicator) {
      const span = downIndicator.querySelector('span');
      if (span) span.textContent = isRu ? 'ВНИЗ' : 'DOWN';
    }

    if (isUp && upIndicator) {
      upIndicator.classList.remove('text-neutral-400', 'dark:text-neutral-500', 'bg-neutral-100', 'dark:bg-neutral-800'); upIndicator.classList.add('bg-indigo-600', 'text-white', 'shadow-md', 'scale-105');
      clearTimeout(this.mouse._upTimer);
      this.mouse._upTimer = setTimeout(() => {
        upIndicator.classList.remove('bg-indigo-600', 'text-white', 'shadow-md', 'scale-105'); upIndicator.classList.add('text-neutral-400', 'dark:text-neutral-500', 'bg-neutral-100', 'dark:bg-neutral-800');
      }, 150);
    } else if (!isUp && downIndicator) {
      downIndicator.classList.remove('text-neutral-400', 'dark:text-neutral-500', 'bg-neutral-100', 'dark:bg-neutral-800'); downIndicator.classList.add('bg-indigo-600', 'text-white', 'shadow-md', 'scale-105');
      clearTimeout(this.mouse._downTimer);
      this.mouse._downTimer = setTimeout(() => {
        downIndicator.classList.remove('bg-indigo-600', 'text-white', 'shadow-md', 'scale-105'); downIndicator.classList.add('text-neutral-400', 'dark:text-neutral-500', 'bg-neutral-100', 'dark:bg-neutral-800');
      }, 150);
    }
  },

  handleCpsClick(e) {
    if (this.mouse.cpsCooldown) {
      return; // Ignore spam clicks right after test finishes so result is never accidentally closed
    }

    const cpsBtn = document.getElementById('mouse-cps-btn');
    const timerEl = document.getElementById('mouse-cps-timer');
    const valEl = document.getElementById('mouse-cps-val');
    const countEl = document.getElementById('mouse-cps-clicks');

    // Create click ripple animation
    if (cpsBtn && e) {
      const rect = cpsBtn.getBoundingClientRect();
      const circle = document.createElement('span');
      const d = Math.max(rect.width, rect.height);
      circle.style.width = circle.style.height = `${d}px`;
      circle.style.left = `${(e.clientX || rect.left + rect.width / 2) - rect.left - d / 2}px`;
      circle.style.top = `${(e.clientY || rect.top + rect.height / 2) - rect.top - d / 2}px`;
      circle.classList.add('cps-click-ripple');
      cpsBtn.appendChild(circle);
      setTimeout(() => circle.remove(), 500);
    }

    const duration = this.mouse.cpsDuration || 5;

    if (!this.mouse.cpsActive) {
      // Start CPS Test with user-selected duration
      this.mouse.cpsActive = true;
      this.mouse.cpsClicks = 1;
      this.mouse.cpsTimeLeft = duration;

      if (timerEl) timerEl.textContent = `${duration}.0s`;
      if (countEl) countEl.textContent = '1';
      if (valEl) valEl.textContent = (1 / duration).toFixed(1);

      if (cpsBtn) {
        cpsBtn.innerHTML = `
          <div class="flex flex-col items-center justify-center pointer-events-none select-none text-center w-full h-full py-1 animate-fade-in">
            <div class="text-4xl sm:text-5xl font-mono font-black text-indigo-600 dark:text-indigo-400 tracking-tight my-1 flex items-center justify-center gap-2">
              <span id="mouse-cps-live-time">${duration}.0s</span>
            </div>
            <div class="text-xs sm:text-sm font-bold text-neutral-600 dark:text-neutral-300 tracking-wide flex items-center justify-center gap-1.5 mt-1">
              <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block"></span>
              <span id="mouse-cps-live-clicks" class="text-indigo-600 dark:text-indigo-400 font-black text-base">1</span>
              <span>${this.t('cps_clicks_word', 'кликов', 'clicks')} • ${this.t('cps_clicking', 'КЛИКАЙТЕ БЫСТРЕЕ!', 'CLICK AS FAST AS YOU CAN!')}</span>
            </div>
          </div>
        `;
      }

      const startTime = performance.now();

      this.mouse.cpsTimer = setInterval(() => {
        const elapsed = (performance.now() - startTime) / 1000;
        const remaining = Math.max(0, duration - elapsed);

        if (timerEl) timerEl.textContent = `${remaining.toFixed(1)}s`;
        const liveTime = document.getElementById('mouse-cps-live-time');
        if (liveTime) liveTime.textContent = `${remaining.toFixed(1)}s`;

        const currentCps = this.mouse.cpsClicks / Math.max(0.1, elapsed);
        if (valEl) valEl.textContent = currentCps.toFixed(1);

        if (remaining <= 0) {
          clearInterval(this.mouse.cpsTimer);
          this.mouse.cpsActive = false;
          this.mouse.cpsCooldown = true;

          // Cooldown protects the result screen from spam clicks for 900ms
          setTimeout(() => {
            this.mouse.cpsCooldown = false;
          }, 900);

          const finalCps = this.mouse.cpsClicks / duration;
          if (valEl) valEl.textContent = finalCps.toFixed(1);
          if (timerEl) timerEl.textContent = this.t('cps_finished', 'Тест завершен!', 'Finished!');

          const isNewBest = finalCps > this.mouse.cpsBest && this.mouse.cpsClicks > 3;

          if (finalCps > this.mouse.cpsBest) {
            this.mouse.cpsBest = finalCps;
            localStorage.setItem('omnikit_cps_best', finalCps.toString());
            const bestEl = document.getElementById('mouse-cps-best');
            if (bestEl) bestEl.textContent = finalCps.toFixed(1);
          }

          // Clean, pure result without rank titles
          if (cpsBtn) {
            cpsBtn.innerHTML = `
              <div class="flex flex-col items-center justify-center pointer-events-none select-none text-center w-full h-full py-1 animate-fade-in">
                <div class="flex items-center gap-1.5 mb-0.5">
                  <span class="text-[11px] sm:text-xs uppercase font-extrabold tracking-wider text-indigo-600 dark:text-indigo-400">
                    ${this.t('cps_result_title', 'Результат теста', 'Test Result')}
                  </span>
                  ${isNewBest ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-amber-950 shadow-sm animate-bounce">${this.t('cps_new_record', 'Новый рекорд!', 'New Record!')}</span>` : ''}
                </div>
                
                <div class="text-3xl sm:text-4xl font-black text-indigo-950 dark:text-white tracking-tight my-0.5">
                  ${finalCps.toFixed(1)} <span class="text-lg sm:text-xl font-extrabold text-indigo-600 dark:text-indigo-400">CPS</span>
                </div>

                <div class="text-xs font-mono font-bold text-neutral-600 dark:text-neutral-300 my-1">
                  ${this.mouse.cpsClicks} ${this.t('cps_clicks_word', 'кликов', 'clicks')} / ${duration}с
                </div>

                <div class="text-[11px] text-indigo-600/80 dark:text-indigo-300/80 font-medium mt-1 flex items-center gap-1.5">
                  <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
                  <span>${this.t('cps_try_again', 'Кликните, чтобы попробовать снова', 'Click to try again')}</span>
                </div>
              </div>
            `;
            if (window.lucide) lucide.createIcons();
          }
        }
      }, 50);

    } else {
      this.mouse.cpsClicks++;
      if (countEl) countEl.textContent = this.mouse.cpsClicks;
      const liveClicks = document.getElementById('mouse-cps-live-clicks');
      if (liveClicks) liveClicks.textContent = this.mouse.cpsClicks;
    }
  },

  resetMouseStats() {
    this.clearAllPressedButtons();
    this.mouse.normalClicksCount = 0;
    this.mouse.doubleClicksCount = 0;
    this.mouse.chatterCount = 0;
    this.mouse.wheelTotalScrolls = 0;
    this.mouse.wheelAnomaliesCount = 0;
    this.mouse.wheelHistory = [];
    this.mouse.lastDownTime = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };

    this.updateMouseCounts();

    const alertBox = document.getElementById('mouse-doubleclick-alert');
    if (alertBox) alertBox.classList.add('hidden');

    const historyList = document.getElementById('mouse-history-list');
    if (historyList) historyList.innerHTML = '';

    const wheelTotal = document.getElementById('mouse-wheel-total');
    if (wheelTotal) wheelTotal.textContent = '0';
    const wheelAnomalies = document.getElementById('mouse-wheel-anomalies');
    if (wheelAnomalies) { wheelAnomalies.textContent = '0'; wheelAnomalies.className = 'font-black text-2xl text-neutral-700 dark:text-neutral-300'; }
    const wheelDir = document.getElementById('mouse-wheel-dir');
    if (wheelDir) wheelDir.textContent = '—';

    // Pointer tracking reset
    this.mouse.trackDistance = 0;
    this.mouse.trackLast = null;
    this.mouse.trackSpeed = 0;
    const trackCanvas = document.getElementById('mouse-track-canvas');
    if (trackCanvas) trackCanvas.getContext('2d').clearRect(0, 0, trackCanvas.width, trackCanvas.height);
    const trackDist = document.getElementById('mouse-track-dist');
    if (trackDist) trackDist.textContent = '0 px';
    const trackSpeed = document.getElementById('mouse-track-speed');
    if (trackSpeed) trackSpeed.textContent = '0 px/s';
    const trackXy = document.getElementById('mouse-track-xy');
    if (trackXy) trackXy.textContent = '— / —';
  },

  // ==========================================
  // GLOBAL CLEANUP ON NAVIGATION
  // ==========================================
  onCloseTool() {
    this.stopMicTest();
    this.stopWebcamTest();
    this.resetKeyboard();
    this.clearAllPressedButtons();
  }
};

if (typeof window !== "undefined") window.HardwareTools = HardwareTools;
if (typeof module !== "undefined") module.exports = HardwareTools;
