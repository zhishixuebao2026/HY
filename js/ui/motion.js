/* ============================================================
   动效层 motion.js
   —— 通过包装（patch）现有方法注入特效，不改动原逻辑
   ============================================================ */

const Motion = {
  _inited: false,
  _tiltCard: null, _tiltRaf: null,
  _parRaf: null, _moRaf: null,
  _ioN: 0,
  lastHandIds: null,
  lastEx: { 0: null, 1: null },
  _moveNav: null,

  init() {
    if (this._inited) return;
    this._inited = true;
    const safe = (fn, name) => { try { fn.call(this); } catch (e) { console.warn('[motion] ' + name + ' 跳过:', e.message); } };
    safe(this.enhanceAll, 'enhanceAll');
    safe(this.initTilt, 'initTilt');
    safe(this.initRipple, 'initRipple');
    safe(this.initNav, 'initNav');
    safe(this.initMeteors, 'initMeteors');
    safe(this.initParallax, 'initParallax');
    safe(this.patchBattle, 'patchBattle');
    safe(this.patchTower, 'patchTower');
    safe(this.patchView, 'patchView');
  },

  /* ============================================================
     1. 元素增强：注入光泽层 / 光环 / 揭示动画
     ============================================================ */
  enhanceAll() {
    this.enhance(document);
    if (!window.MutationObserver) return;
    const app = document.getElementById('app');
    if (!app) return;
    this._mo = new MutationObserver(() => {
      if (this._moRaf) return;
      this._moRaf = requestAnimationFrame(() => { this._moRaf = null; this.enhance(document); });
    });
    this._mo.observe(app, { childList: true, subtree: true });
  },

  enhance(root) {
    // 卡面光泽 + 悬浮光环
    root.querySelectorAll('.card-frame:not([data-mo])').forEach(f => {
      f.dataset.mo = '1';
      if (!f.querySelector('.card-glare')) {
        const g = document.createElement('div'); g.className = 'card-glare';
        f.appendChild(g);
      }
      const inner = f.parentElement;
      if (inner && inner.classList.contains('card-inner') && !inner.querySelector(':scope > .card-glowring')) {
        const r = document.createElement('div'); r.className = 'card-glowring';
        inner.appendChild(r);
      }
    });

    // 揭示动画目标
    const targets = root.querySelectorAll(
      '#codexGrid .codex-cards > div, #builderPool .pool-card, .tower-node, .rule-block, .mode-card, .ladder-step'
    );
    let added = 0;
    targets.forEach((t, ti) => {
      if (t.dataset.mo) return;
      t.dataset.mo = '1';
      if (t.classList.contains('tower-node') || t.classList.contains('rule-block') ||
          t.classList.contains('mode-card') || t.classList.contains('ladder-step') ||
          t.querySelector('.card')) {
        t.classList.add('reveal');
        // 差异化入场：整屏所有区块共用同一种 fade-up 会显得很廉价。
        // 按元素语义分配不同入场方式 —— 阶梯左右交替，看起来像盘旋而上。
        if (t.classList.contains('ladder-step')) t.classList.add(ti % 2 ? 'rv-right' : 'rv-left');
        else if (t.classList.contains('rule-block')) t.classList.add('rv-left');
        else if (t.classList.contains('tower-node')) t.classList.add('rv-up');
        else t.classList.add('rv-pop');          // 卡牌类：缩放弹入
        added++;
      }
    });
    if (added) this.staggerIn(root);
  },

  staggerIn(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const items = scope.querySelectorAll('.reveal:not(.in)');
    if (!items.length) return;
    let k = 0;
    items.forEach(el => {
      el.style.setProperty('--rd', ((k++) % 16) * 26 + 'ms');
    });
    requestAnimationFrame(() => {
      items.forEach(el => el.classList.add('in'));
    });
  },

  /* ============================================================
     2. 卡牌 3D 悬浮
     ============================================================ */
  initTilt() {
    const self = this;
    document.addEventListener('mousemove', (ev) => {
      if (self._tiltRaf) return;
      self._tiltRaf = requestAnimationFrame(() => {
        self._tiltRaf = null;
        self._tilt(ev.clientX, ev.clientY, ev.target);
      });
    }, { passive: true });
    document.addEventListener('mouseleave', () => self._resetTilt());
  },

  _tilt(x, y, target) {
    const card = (target && target.closest) ? target.closest('.card') : null;
    if (card === this._tiltCard) {
      if (card) this._applyTilt(card, x, y);
      return;
    }
    this._resetTilt();
    this._tiltCard = card;
    if (card) { card.classList.add('tilting'); this._applyTilt(card, x, y); }
  },

  _applyTilt(card, x, y) {
    const r = card.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const px = Math.min(1.6, Math.max(-.6, (x - r.left) / r.width));
    const py = Math.min(1.6, Math.max(-.6, (y - r.top) / r.height));
    const k = card.classList.contains('mini') ? .42 : 1;
    const ry = (px - .5) * 17 * k;
    const rx = -(py - .5) * 15 * k;
    const inner = card.querySelector('.card-inner');
    if (inner) {
      inner.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      inner.style.setProperty('--ry', ry.toFixed(2) + 'deg');
    }
    const g = card.querySelector('.card-glare');
    if (g) {
      g.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      g.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    }
  },

  _resetTilt() {
    const c = this._tiltCard;
    if (c) {
      c.classList.remove('tilting');
      const inner = c.querySelector('.card-inner');
      if (inner) { inner.style.setProperty('--rx', '0deg'); inner.style.setProperty('--ry', '0deg'); }
    }
    this._tiltCard = null;
  },

  /* ============================================================
     3. 手牌扇形排列
     ============================================================ */
  fanHand(host) {
    if (!host) return;
    const cards = [...host.children].filter(c => c.classList && c.classList.contains('card'));
    const n = cards.length;
    if (!n) { this.lastHandIds = []; return; }

    const step = Math.min(4.4, 30 / n);
    cards.forEach((c, i) => {
      const off = i - (n - 1) / 2;
      c.style.setProperty('--fan-r', (off * step).toFixed(2) + 'deg');
      c.style.setProperty('--fan-y', (Math.pow(Math.abs(off), 1.72) * 2.3).toFixed(1) + 'px');
    });

    // 新抽入的牌标记动画
    const ids = cards.map((c, i) => c.dataset.cardId || ('?' + i));
    const prev = this.lastHandIds;
    if (prev && ids.length > prev.length) {
      const remain = prev.slice();
      cards.forEach((c, i) => {
        const k = remain.indexOf(ids[i]);
        if (k >= 0) remain.splice(k, 1);
        else c.classList.add('just-drawn');
      });
    }
    this.lastHandIds = ids;
  },

  /* ============================================================
     4. 战斗特效：飘字 / 光束 / 爆点
     ============================================================ */
  float(x, y, text, kind) {
    const d = document.createElement('div');
    d.className = 'float-num ' + (kind || 'dmg');
    d.textContent = text;
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1150);
  },

  beam(x1, y1, x2, y2, color) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (!len) return;
    const b = document.createElement('div');
    b.className = 'atk-beam';
    b.style.left = x1 + 'px';
    b.style.top = y1 + 'px';
    b.style.width = len + 'px';
    b.style.setProperty('--ba', (Math.atan2(dy, dx) * 180 / Math.PI).toFixed(2) + 'deg');
    b.style.setProperty('--bc', color || '#fbbf24');
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 420);
  },

  burst(x, y, color) {
    const b = document.createElement('div');
    b.className = 'hit-burst';
    b.style.left = x + 'px';
    b.style.top = y + 'px';
    b.style.setProperty('--bc', color || '#fbbf24');
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 460);
  },

  unitNode(uid) {
    return document.querySelector('.board .card[data-uid="' + uid + '"]');
  },
  heroNode(idx) {
    return document.getElementById(idx === 0 ? 'pstatMine' : 'pstatFoe');
  },

  onFx(f) {
    switch (f.type) {
      case 'attack': {
        const a = this.unitNode(f.uid);
        if (!a) break;
        const ra = a.getBoundingClientRect();
        const ax = ra.left + ra.width / 2, ay = ra.top + ra.height / 2;
        if (f.target === 'hero') {
          const h = this.heroNode(f.owner === 0 ? 1 : 0);
          if (!h) break;
          const rh = h.getBoundingClientRect();
          this.beam(ax, ay, rh.left + rh.width / 2, rh.top + rh.height / 2, '#fb7185');
          this.burst(rh.left + rh.width / 2, rh.top + rh.height / 2, '#fb7185');
        } else {
          const d = this.unitNode(f.target);
          if (!d) break;
          const rd = d.getBoundingClientRect();
          this.beam(ax, ay, rd.left + rd.width / 2, rd.top + rd.height / 2, '#fbbf24');
          setTimeout(() => this.burst(rd.left + rd.width / 2, rd.top + rd.height / 2, '#fbbf24'), 150);
        }
        break;
      }
      case 'damage': {
        const n = this.unitNode(f.uid);
        if (n && f.amount > 0) {
          const r = n.getBoundingClientRect();
          this.float(r.left + r.width / 2, r.top + r.height * .38, '-' + f.amount, 'dmg');
        }
        break;
      }
      case 'heroDamage': {
        const h = this.heroNode(f.idx);
        if (h && f.amount > 0) {
          const r = h.getBoundingClientRect();
          this.float(r.left + r.width / 2, r.top + r.height / 2 - 6, '-' + f.amount, 'dmg');
        }
        break;
      }
      case 'annihilate': {
        const n = this.unitNode(f.uid);
        if (n) {
          const r = n.getBoundingClientRect();
          this.float(r.left + r.width / 2, r.top + r.height / 2, '归 虚', 'annih');
        }
        break;
      }
      case 'ascend': {
        const n = this.unitNode(f.uid);
        if (n) {
          const r = n.getBoundingClientRect();
          this.float(r.left + r.width / 2, r.top + r.height * .3, '层级 +1', 'tier');
        }
        break;
      }
    }
  },

  bumpStats(battle) {
    if (!battle || !battle.eng || !battle.eng.state) return;
    [0, 1].forEach(idx => {
      const p = battle.eng.player(idx);
      if (!p) return;
      const before = this.lastEx[idx];
      if (before != null && before !== p.existence) {
        const host = this.heroNode(idx);
        const v = host && host.querySelector('.exist-val');
        if (v) { v.classList.remove('val-bump'); void v.offsetWidth; v.classList.add('val-bump'); }
      }
      this.lastEx[idx] = p.existence;
    });
  },

  /* ============================================================
     5. 包装现有方法
     ============================================================ */
  patchBattle() {
    if (typeof Battle === 'undefined' || !Battle.render) return;
    const self = this;

    const origRender = Battle.render.bind(Battle);
    Battle.render = function () {
      origRender();
      try { self.fanHand(document.getElementById('hand')); } catch (e) {}
      try { self.bumpStats(this); } catch (e) {}
    };

    const origDrain = Battle.drainFx.bind(Battle);
    Battle.drainFx = function () {
      const q = (this.eng && this.eng.animQueue) ? this.eng.animQueue.slice() : [];
      origDrain();
      q.forEach(f => { try { self.onFx(f); } catch (e) {} });
    };
  },

  /* ---------------- 爬塔专属动效 ---------------- */
  patchTower() {
    if (typeof Tower === 'undefined' || !Tower.render) return;
    const self = this;

    // 渲染后：校正层级符号字号 + 进度条充能动画
    const origRender = Tower.render.bind(Tower);
    Tower.render = function () {
      origRender();
      try {
        if (typeof fitGlyphs === 'function') fitGlyphs(document.getElementById('towerPath'), '.tn-glyph');
        self.railFx();
      } catch (e) {}
    };

    // 战斗结束后：通关金光 / 失败滑落
    const origEnd = Tower.onBattleEnd.bind(Tower);
    Tower.onBattleEnd = function (result, floorIdx) {
      origEnd(result, floorIdx);
      try {
        if (result === 'win') setTimeout(() => self.towerClearFx(floorIdx), 320);
        else if (result === 'lose') setTimeout(() => self.towerLoseFx(floorIdx), 240);
      } catch (e) {}
    };
  },

  railFx() {
    const fill = document.querySelector('.cr-fill');
    if (!fill) return;
    const target = fill.style.width || '0%';
    fill.style.transition = 'none';
    fill.style.width = '0%';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fill.style.transition = '';
      fill.style.width = target;
    }));
  },

  towerClearFx(i) {
    const node = document.querySelector('.tower-node[data-floor="' + i + '"]');
    if (!node) return;
    node.classList.remove('just-cleared');
    void node.offsetWidth;
    node.classList.add('just-cleared');
    const g = node.querySelector('.tn-glyph');
    if (g) {
      const r = g.getBoundingClientRect();
      this.float(r.left + r.width / 2, r.top - 4, '通 关', 'clear');
      this.burst(r.left + r.width / 2, r.top + r.height / 2, '#fbbf24');
    }
  },

  towerLoseFx(i) {
    const node = document.querySelector('.tower-node[data-floor="' + (i + 1) + '"]')
      || document.querySelector('.tower-node[data-floor="' + i + '"]');
    if (!node) return;
    const r = node.getBoundingClientRect();
    this.float(r.left + r.width / 2, r.top + 8, '滑落一层', 'dmg');
  },

  patchView() {
    if (typeof window.showView !== 'function') return;
    const self = this;
    const orig = window.showView;
    window.showView = function (name) {
      orig.apply(this, arguments);
      try {
        const v = document.querySelector('.view.on');
        if (v) { self.enhance(v); self.staggerIn(v); }
        if (self._moveNav) setTimeout(self._moveNav, 20);
      } catch (e) {}
    };
  },

  /* ============================================================
     6. 涟漪 / 导航指示器 / 流星 / 视差
     ============================================================ */
  initRipple() {
    document.addEventListener('pointerdown', (ev) => {
      const btn = ev.target.closest ? ev.target.closest('.btn, .navtab, .filter-chip, .choice-card') : null;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const s = document.createElement('span');
      s.className = 'ripple';
      const size = Math.max(r.width, r.height) * 2.1;
      s.style.width = size + 'px';
      s.style.height = size + 'px';
      s.style.left = (ev.clientX - r.left) + 'px';
      s.style.top = (ev.clientY - r.top) + 'px';
      btn.appendChild(s);
      setTimeout(() => s.remove(), 640);
    });
  },

  initNav() {
    const nav = document.querySelector('.navtabs');
    if (!nav) return;
    let ind = document.getElementById('navIndicator');
    if (!ind) {
      ind = document.createElement('div');
      ind.id = 'navIndicator';
      nav.insertBefore(ind, nav.firstChild);
    }
    const move = () => {
      const on = nav.querySelector('.navtab.on');
      if (!on) { ind.style.width = '0px'; return; }
      ind.style.width = on.offsetWidth + 'px';
      ind.style.transform = 'translateX(' + on.offsetLeft + 'px)';
    };
    this._moveNav = move;
    nav.addEventListener('click', () => setTimeout(move, 24));
    window.addEventListener('resize', move);
    setTimeout(move, 60);
  },

  initMeteors() {
    const spawn = () => {
      if (document.hidden) return;
      const m = document.createElement('div');
      m.className = 'meteor';
      m.style.left = (Math.random() * window.innerWidth * .82) + 'px';
      m.style.top = (Math.random() * window.innerHeight * .42) + 'px';
      m.style.setProperty('--mfx', (170 + Math.random() * 280) + 'px');
      m.style.setProperty('--mfy', (110 + Math.random() * 210) + 'px');
      m.style.setProperty('--mdur', (1.1 + Math.random() * .95) + 's');
      m.style.setProperty('--mtail', (55 + Math.random() * 75) + 'px');
      document.body.appendChild(m);
      setTimeout(() => m.remove(), 2300);
    };
    const loop = () => { spawn(); setTimeout(loop, 2800 + Math.random() * 5200); };
    setTimeout(loop, 1800);
  },

  initParallax() {
    const cv = document.getElementById('stardust');
    if (!cv) return;
    const self = this;
    document.addEventListener('mousemove', (e) => {
      if (self._parRaf) return;
      self._parRaf = requestAnimationFrame(() => {
        self._parRaf = null;
        const dx = (e.clientX / window.innerWidth - .5) * -16;
        const dy = (e.clientY / window.innerHeight - .5) * -12;
        cv.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(1.035)';
      });
    }, { passive: true });
  }
};

if (typeof window !== 'undefined') window.Motion = Motion;
