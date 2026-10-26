/**
 * OmniKit Monitor Test — dead pixel & ghosting diagnostics (100% local)
 * Mode 1: fullscreen solid-color cycles (black/white/RGB/CMY/gray) for
 *         spotting stuck/dead pixels; auto-cycle, arrows/click to switch.
 * Mode 2: ghosting/motion-clarity test — moving blocks at multiple speeds.
 */
(function (global) {
  'use strict';

  const MonitorTest = {
    overlay: null, raf: null, autoTimer: null, colors: null, colorIdx: 0,

    destroy() {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
      clearInterval(this.autoTimer);
      this.autoTimer = null;
      if (this.overlay) { this.overlay.remove(); this.overlay = null; }
      if (this._closeBtn) { this._closeBtn.remove(); this._closeBtn = null; }
      if (this.hudEl) { this.hudEl.remove(); this.hudEl = null; }
      if (this._onResize) { window.removeEventListener('resize', this._onResize); this._onResize = null; }
      document.body.style.overflow = '';
    },

    ensureOverlay() {
      this.destroy();
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#000;cursor:pointer;';
      el.id = 'monitor-test-overlay';
      document.body.appendChild(el);
      this.overlay = el;
      document.body.style.overflow = 'hidden';
      return el;
    },

    addCloseBtn() {
      const x = document.createElement('button');
      x.type = 'button';
      x.setAttribute('aria-label','Close test');
      x.innerHTML = '&#10005;';
      x.style.cssText = 'position:fixed;top:14px;right:16px;z-index:100001;width:44px;height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.35);background:rgba(0,0,0,.45);color:#fff;font:400 20px/42px system-ui;cursor:pointer;display:block;text-align:center;padding:0;';
      x.addEventListener('click', () => { this.destroy(); this._unbind && this._unbind(); });
      document.body.appendChild(x);
      this._closeBtn = x;
      return x;
    },

    hudEl: null,
    hud(text, atTop) {
      if (!this.hudEl || !this.hudEl.isConnected) {
        const h = document.createElement('div');
        h.style.cssText = 'position:fixed;left:50%;' + (atTop ? 'top:20px;' : 'bottom:28px;') + 'transform:translateX(-50%);z-index:100000;color:#fff;background:rgba(0,0,0,.6);padding:8px 16px;border-radius:10px;font:600 12px/1.4 system-ui;pointer-events:none;text-align:center;max-width:90vw;';
        document.body.appendChild(h);
        this.hudEl = h;
      }
      this.hudEl.textContent = text;
      this.hudEl.style.opacity = '1';
      return this.hudEl;
    },

    hudLegacy(text) {
      const h = document.createElement('div');
      h.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:100000;color:#fff;background:rgba(0,0,0,.55);padding:8px 14px;border-radius:10px;font:600 12px/1.4 system-ui;pointer-events:none;transition:opacity .6s;text-align:center;max-width:90vw;';
      h.textContent = text;
      document.body.appendChild(h);
      setTimeout(() => { h.style.opacity = '0'; }, 2600);
      setTimeout(() => h.remove(), 3600);
      return h;
    },

    deadPixels() {
      const el = this.ensureOverlay();
      this.colors = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#00ffff', '#ff00ff', '#ffff00', '#808080'];
      this.colorIdx = 0;
      const isRu = (global.I18N?.currentLang || 'en') === 'ru';
      const names = isRu ? ['Чёрный', 'Белый', 'Красный', 'Зелёный', 'Синий', 'Циан', 'Магента', 'Жёлтый', 'Серый 50%'] : ['Black', 'White', 'Red', 'Green', 'Blue', 'Cyan', 'Magenta', 'Yellow', 'Gray 50%'];
      const show = () => { el.style.background = this.colors[this.colorIdx]; };
      const next = () => { this.colorIdx = (this.colorIdx + 1) % this.colors.length; show(); this.hud(`${names[this.colorIdx]} — ${this.colorIdx + 1}/${this.colors.length}`); };
      const prev = () => { this.colorIdx = (this.colorIdx - 1 + this.colors.length) % this.colors.length; show(); this.hud(`${names[this.colorIdx]} — ${this.colorIdx + 1}/${this.colors.length}`); };
      show();
      this.addCloseBtn();
      this.hud(isRu ? 'Клик / → следующий · ← предыдущий · ищите точки, которые не меняются' : 'Click / → next · ← previous · look for dots that never change');
      el.addEventListener('click', next);
      this.autoTimer = setInterval(next, 2500);
      this._key = (e) => {
        if (e.key === 'Escape') { this.destroy(); this._unbind(); }
        else if (e.key === 'ArrowRight' || e.key === ' ') { clearInterval(this.autoTimer); this.autoTimer = null; next(); }
        else if (e.key === 'ArrowLeft') { prev(); }
      };
      this._unbind = () => document.removeEventListener('keydown', this._key);
      document.addEventListener('keydown', this._key);
    },

    ghosting() {
      const el = this.ensureOverlay();
      el.style.background = '#101014';
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
      el.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      const isRu = (global.I18N?.currentLang || 'en') === 'ru';
      const speeds = [0.6, 1, 1.6, 2.4, 3.6]; // screen-widths per second
      const colors = ['#ffffff', '#ff5555', '#55ff88', '#55aaff'];
      const resize = () => { canvas.width = el.clientWidth; canvas.height = el.clientHeight; };
      resize();
      window.addEventListener('resize', resize);
      this._onResize = resize;
      let t0 = performance.now();
      let last = t0;
      const draw = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const W = canvas.width, H = canvas.height;
        ctx.fillStyle = '#101014';
        ctx.fillRect(0, 0, W, H);
        const rowH = H / (speeds.length + 1);
        const boxW = Math.max(28, Math.min(120, W * 0.06));
        ctx.font = '600 11px system-ui';
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        ctx.fillText(isRu ? 'Гостинг: следы за движущимися блоками = смаз/шлейф' : 'Ghosting: trails behind blocks = smear/persistence', 12, 16);
        speeds.forEach((sp, i) => {
          const y = rowH * (i + 1);
          const period = W / sp; // px per second -> full pass duration
          const x = ((now - t0) / 1000 * sp * W) % (W + boxW) - boxW;
          ctx.fillStyle = 'rgba(255,255,255,.08)';
          ctx.fillRect(0, y + rowH / 2 - 1, W, 2);
          ctx.fillStyle = colors[i % colors.length];
          ctx.fillRect(x, y + rowH / 2 - boxW / 4, boxW, boxW / 2);
          ctx.fillStyle = 'rgba(255,255,255,.4)';
          ctx.fillText(`${sp}x`, 12, y + rowH / 2 + 4);
        });
        this.raf = requestAnimationFrame(draw);
      };
      this.raf = requestAnimationFrame(draw);
      this.addCloseBtn();
      this.hud(isRu ? 'Смотрите за блоками: шлейф/двоение = гостинг матрицы' : 'Watch the blocks: trails/doubling = panel ghosting', true);
      this._key = (e) => { if (e.key === 'Escape') { this.destroy(); this._unbind(); } };
      this._unbind = () => document.removeEventListener('keydown', this._key);
      document.addEventListener('keydown', this._key);
    },

    init() {
      const btnDead = document.getElementById('monitor-dead-btn');
      const btnGhost = document.getElementById('monitor-ghost-btn');
      if (!btnDead && !btnGhost) return;
      btnDead?.addEventListener('click', () => this.deadPixels());
      btnGhost?.addEventListener('click', () => this.ghosting());
    }
  };

  global.MonitorTest = MonitorTest;
  if (typeof module !== 'undefined' && module.exports) module.exports = MonitorTest;
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => MonitorTest.init());
  }
})(typeof window !== 'undefined' ? window : this);
