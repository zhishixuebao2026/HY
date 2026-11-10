/* ============================================================
   序章 · 战斗内引导层 coach.js
   —— 与 motion.js 同构：只包装（patch）现有方法，不改动原逻辑。
   第 1 课：手把手脚本（选中手牌 → 召唤 → 选随从 → 打脸 → 结束回合）
   第 2~7 课：顶部常驻「本关目标」+ 关键牌描边 + 达成飘字

   注册时机必须在 Motion.init() 之后：
   Motion 先包装 Battle.render，Coach 再包装一次，
   于是调用链为 Coach{ Motion{ 原 render } }，
   Coach 的后置代码最后执行 —— 能看到 fanHand 之后的最终布局。
   ============================================================ */

const Coach = {
  on: false,
  muted: false,          // 本关已跳过操作提示（下一课自动恢复）
  lessonIdx: -1,
  lesson: null,
  handHeld: false,

  step: null,            // 'hand' | 'summon' | 'unit' | 'hero' | 'end'
  curStep: null,         // 上一次的 step，用于飘字确认

  logLen: 0,
  lastFoeEx: 0,
  lastBoardN: 0,
  lastSucc: 0,
  achieved: false,

  ui: null,              // { bar, ring, bubble }
  _raf: null,

  /* ============================================================
     生命周期
     ============================================================ */
  init() {
    if (typeof Battle === 'undefined' || !Battle.render) return;
    const self = this;

    // 包装 render：每次渲染后重新定位高亮（render 会 innerHTML='' 重建 DOM）
    const origRender = Battle.render.bind(Battle);
    Battle.render = function () {
      origRender();
      try { self.sync(); } catch (e) {}
    };

    // 目标位置会随悬停抬升 / 窗口变化 / 滚动而变 —— rAF 节流跟随，
    // 保证高亮环始终贴在真实位置上（否则玩家照着环点会点空）
    const track = () => {
      if (self._raf) return;
      self._raf = requestAnimationFrame(() => { self._raf = null; if (self.on) self.place(); });
    };
    window.addEventListener('resize', track);
    window.addEventListener('scroll', track, true);
    window.addEventListener('mousemove', track, { passive: true });

    // 载入顺序：Coach.init 在 Motion.init 之后调用，因此 Coach 是最外层包装。
  },

  begin(lessonIdx) {
    if (typeof ACADEMY_LESSONS === 'undefined') return;
    this.stop();
    this.lessonIdx = lessonIdx;
    this.lesson = ACADEMY_LESSONS[lessonIdx];
    if (!this.lesson) return;
    this.handHeld = !!(this.lesson.steps && this.lesson.steps.length);
    this.on = true;
    this.muted = false;
    this.step = null;
    this.curStep = null;
    this.achieved = false;
    this.logLen = 0;
    this.lastFoeEx = 0;
    this.lastBoardN = 0;
    this.lastSucc = 0;
    this.mount();
    document.body.classList.add('coach-on');
    if (!this.handHeld) toast('本课目标已显示在顶部 —— 自由操作即可', 'good');
  },

  stop() {
    this.on = false;
    this.step = null;
    this.lesson = null;
    this.lessonIdx = -1;
    this.unmount();
    document.body.classList.remove('coach-on');
    this.clearDim();
  },

  /* ============================================================
     DOM
     ============================================================ */
  mount() {
    this.unmount();
    const bar = el('div', 'coach-bar');
    bar.id = 'coachBar';

    const lsn = el('span', 'cb-lesson',
      `第 ${this.lessonIdx + 1} 课 · ${this.lesson.title}`);
    lsn.style.setProperty('--lc', this.lesson.colors || '#38bdf8');
    bar.appendChild(lsn);

    const goal = el('span', 'cb-goal');
    goal.innerHTML = '<i>目标</i>' + this.lesson.goal;
    bar.appendChild(goal);

    // 窄屏：目标文案默认收起，只留一枚可点开的按钮，把高度让给战场
    const gToggle = el('button', 'cb-btn cb-goal-toggle', '本关目标');
    gToggle.title = '展开 / 收起本关目标';
    gToggle.onclick = () => bar.classList.toggle('show-goal');
    bar.appendChild(gToggle);

    if (this.handHeld) {
      const st = el('span', 'cb-step');
      st.id = 'coachStepTag';
      bar.appendChild(st);
    }

    // 只有手把手课程才需要「跳过」——目标模式本来就没有操作提示可跳
    if (this.handHeld) {
      const skip = el('button', 'cb-btn', '跳过操作提示');
      skip.id = 'coachSkip';
      skip.onclick = () => this.toggleMute();
      bar.appendChild(skip);
    }

    const ring = el('div', 'coach-ring');
    ring.id = 'coachRing';

    const bub = el('div', 'coach-bubble');
    bub.id = 'coachBubble';
    bub.appendChild(el('div', 'cb-t', ''));
    bub.appendChild(el('div', 'cb-h', ''));

    document.body.appendChild(bar);
    document.body.appendChild(ring);
    document.body.appendChild(bub);
    this.ui = { bar, ring, bubble: bub, goal, step: bar.querySelector('.cb-step') };
  },

  unmount() {
    ['#coachBar', '#coachRing', '#coachBubble'].forEach(s => {
      const n = document.querySelector(s);
      if (n) n.remove();
    });
    this.ui = null;
  },

  toggleMute() {
    this.muted = !this.muted;
    const b = document.getElementById('coachSkip');
    if (b) b.textContent = this.muted ? '恢复操作提示' : '跳过操作提示';
    if (this.muted) {
      const r = this.ui && this.ui.ring, bb = this.ui && this.ui.bubble;
      if (r) r.classList.remove('on');
      if (bb) bb.classList.remove('on');
      this.clearDim();
      toast('已关闭本关操作提示 —— 课程要点可在课程列表重看', 'warn');
    } else {
      this.step = null;         // 强制重算，立刻把气泡贴回来
      this.sync();
    }
  },

  /* ============================================================
     每次渲染后的同步：判定步骤 → 定位高亮 → 目标检测
     ============================================================ */
  sync() {
    if (!this.on || !this.ui) return;
    if (typeof Battle === 'undefined' || !Battle.eng || !Battle.eng.state) return;
    if (Battle.mode !== 'academy') { this.stop(); return; }

    const s = Battle.eng.state;
    if (s.winner !== null) { this.hide(); this.clearDim(); return; }

    this.watchGoal();

    // 对手回合 / AI 推演中 / 弹窗打开时：不打扰
    const modalOn = document.getElementById('modalMask').classList.contains('on');
    if (s.current !== 0 || Battle.aiThinking || modalOn) {
      this.hide(); this.clearDim(); return;
    }

    if (this.muted || !this.handHeld) {
      this.hide();
      this.clearDim();
      this.markKeyCards();
      return;
    }

    this.step = this.pickStep();
    this.renderStep();
  },

  /* ---------- 由引擎状态推导当前该做什么 ---------- */
  pickStep() {
    const B = Battle, e = B.eng, s = e.state, me = e.player(0);
    const sel = B.sel;
    if (B.targeting) return null;                       // 正在选目标：让玩家自己看横幅
    if (sel && sel.kind === 'hand') return 'summon';
    if (sel && sel.kind === 'unit') return 'hero';
    if (sel && sel.kind === 'ascend') return null;

    const canPlay = me.hand.some((c, i) => e.canPlay(i));
    const canAtk = me.board.some(u => e.canAttack(u.uid));
    if (canPlay) return 'hand';
    if (canAtk) return 'unit';
    return 'end';
  },

  /* ---------- 步骤文案 / 高亮目标 ---------- */
  STEP_META: {
    hand: {
      n: '①', t: '点一张手牌，选中它',
      h: '只有费用 ≤ 当前算力 Ψ 的牌能打。发暗的牌是这回合还打不出的。',
      find: () => {
        const host = document.getElementById('hand');
        if (!host) return null;
        return host.querySelector('.card:not(.unplayable)') || host.querySelector('.card');
      },
      dim: () => {
        const host = document.getElementById('hand');
        return host ? Array.prototype.slice.call(host.querySelectorAll('.card')) : [];
      }
    },
    summon: {
      n: '②', t: '点战场上的空槽，把它召唤上场',
      h: '也可以直接再点一次那张手牌。刚上场的随从本回合不能攻击。',
      find: () => document.querySelector('#boardMine .slot-empty'),
      dim: () => {
        const host = document.getElementById('hand');
        if (!host) return [];
        const picked = host.querySelector('.card.selected');
        return picked ? [picked] : [];
      }
    },
    unit: {
      n: '③', t: '点你场上带绿框的随从，进入攻击姿态',
      h: '绿框 = 本回合还能攻击。刚上场的随从要等下回合。',
      find: () => document.querySelector('#boardMine .card.can-attack'),
      dim: () => Array.prototype.slice.call(document.querySelectorAll('#boardMine .card:not(.can-attack)'))
    },
    hero: {
      n: '④', t: '点对手的存在度条（右上角），把伤害打过去',
      h: '也可以点敌方随从先换掉它。打光对手存在度就赢了。',
      find: () => document.getElementById('pstatFoe'),
      dim: () => {
        const picked = document.querySelector('#boardMine .card.selected');
        const foes = Array.prototype.slice.call(document.querySelectorAll('#boardFoe .card:not(.targetable)'));
        return picked ? foes.concat([picked]) : foes;
      }
    },
    end: {
      n: '⑤', t: '这回合能做的做完了 —— 点「结束回合」',
      h: '用不掉的算力不会留到下回合，所以尽量先花光。',
      find: () => {
        const btns = document.querySelectorAll('#actionDock .btn');
        for (const b of btns) if ((b.textContent || '').indexOf('结束回合') >= 0) return b;
        return null;
      },
      dim: () => []
    }
  },

  renderStep() {
    const meta = this.STEP_META[this.step];
    const ring = this.ui.ring, bub = this.ui.bubble;

    if (!meta) { this.hide(); this.clearDim(); return; }

    // 步骤切换 → 小反馈
    if (this.curStep && this.curStep !== this.step) {
      if (this.curStep === 'summon') this.note('召唤成功', '#34d399');
      if (this.curStep === 'hero') this.note('打中了', '#fb7185');
    }
    this.curStep = this.step;

    if (this.ui.step) this.ui.step.textContent = meta.n + ' ' + meta.t;
    bub.querySelector('.cb-t').textContent = meta.t;
    bub.querySelector('.cb-h').textContent = meta.h;

    // 量一次气泡尺寸缓存起来：place() 每帧都会跑（跟随鼠标），
    // 不能在里面读 offsetWidth，否则每次都触发一次强制同步布局
    bub.classList.add('on');
    bub.style.visibility = 'hidden';
    this.bubW = bub.offsetWidth || 240;
    this.bubH = bub.offsetHeight || 56;
    bub.style.visibility = '';

    const target = meta.find();
    // 换了目标就瞬间跳过去：若沿用 0.2s 过渡，玩家在过渡途中照着环点会点到旧目标上
    const jumped = target !== this.targetEl;
    this.targetEl = target;
    if (!target) { ring.classList.remove('on'); bub.classList.remove('on'); this.clearDim(); return; }

    // 变暗干扰项
    this.clearDim();
    (meta.dim() || []).forEach(n => { if (n !== target) n.classList.add('coach-dim'); });

    ring.classList.add('on');
    bub.classList.add('on');
    this.place(jumped);
  },

  hide() {
    if (!this.ui) return;
    this.ui.ring.classList.remove('on');
    this.ui.bubble.classList.remove('on');
  },

  clearDim() {
    document.querySelectorAll('.coach-dim').forEach(n => n.classList.remove('coach-dim'));
  },

  /* ---------- 定位高亮环 + 气泡 ---------- */

  // 从元素最终的 transform 矩阵反解绕 Z 轴的旋转角（弧度）。
  // 手牌是扇形排列的（motion.css: rotate(var(--fan-r))），而 getBoundingClientRect
  // 返回的是轴对齐包围盒 —— 对倾斜元素会「变大一圈且不跟着转」。
  // 直接用它画环就会出现「牌是歪的、框是正的」，所以必须自己解出角度。
  // 注：即便卡上还叠加了 3D 倾斜（rotateX/rotateY），matrix(3d) 的 m11/m12
  // 仍只反映绕 Z 的旋转，不受 X/Y 倾斜影响，因此这个解算是准确的。
  angleOf(node) {
    const tr = getComputedStyle(node).transform;
    if (!tr || tr === 'none') return 0;
    const m = tr.match(/matrix(?:3d)?\(([^)]+)\)/);
    if (!m) return 0;
    const p = m[1].split(',').map(parseFloat);
    return Math.atan2(p[1], p[0]);
  },

  place(instant) {
    if (!this.ui || !this.targetEl) return;
    if (!this.ui.ring.classList.contains('on')) return;
    const t = this.targetEl;
    if (!t.isConnected) { this.hide(); return; }
    const r = t.getBoundingClientRect();
    if (!r.width || !r.height) { this.hide(); return; }

    const pad = 5;
    const ring = this.ui.ring, bub = this.ui.bubble;

    // 有向包围盒：尺寸取未变换的自身宽高，位置取变换后的中心，再叠加旋转角
    const w = t.offsetWidth || r.width;
    const h = t.offsetHeight || r.height;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const rw = w + pad * 2, rh = h + pad * 2;

    // 瞬移模式：连 transform 的补间也去掉，否则换目标时角度还在慢慢转过去，
    // 玩家照着环点会点到旧目标上
    if (instant) {
      ring.style.transition = 'opacity .2s';
      bub.style.transition = 'opacity .2s';
    }

    ring.style.width = rw + 'px';
    ring.style.height = rh + 'px';
    ring.style.left = (cx - rw / 2) + 'px';
    ring.style.top = (cy - rh / 2) + 'px';
    ring.style.setProperty('--ang',
      (this.angleOf(t) * 180 / Math.PI).toFixed(2) + 'deg');

    // 气泡：优先放在目标上方，空间不够则放下方。
    // 竖直锚点仍用轴对齐包围盒的上下沿 —— 这样气泡不会压到倾斜的卡牌。
    const bw = this.bubW || 240, bh = this.bubH || 56;
    const vw = window.innerWidth, vh = window.innerHeight;

    let bx = cx - bw / 2;
    bx = Math.max(10, Math.min(vw - bw - 10, bx));
    let by = r.top - bh - 12;
    let below = false;
    if (by < 62) { by = r.bottom + 12; below = true; }
    if (by + bh > vh - 8) { by = Math.max(62, r.top - bh - 12); below = false; }
    bub.classList.toggle('below', below);
    bub.style.left = bx + 'px';
    bub.style.top = by + 'px';

    if (instant) {
      void ring.offsetWidth;                 // 强制回流，让上面这次定位不被补间
      ring.style.transition = '';
      bub.style.transition = '';
    }
  },

  /* ============================================================
     目标模式（第 2~7 课）
     ============================================================ */
  markKeyCards() {
    // 关键牌描边：本课示例卡在手里时描金边（每帧重建，先清再加）
    const host = document.getElementById('hand');
    if (!host || !this.lesson || !this.lesson.sampleCards) return;
    const ids = this.lesson.sampleCards;
    host.querySelectorAll('.card').forEach(n => {
      const idx = n.dataset.handIdx;
      if (idx === undefined) return;
      const cid = Battle.eng.player(0).hand[+idx];
      if (cid && ids.indexOf(cid) >= 0) n.classList.add('coach-key');
    });
  },

  watchGoal() {
    const e = Battle.eng, me = e.player(0), foe = e.player(1);
    const logs = e.log;

    // 归虚检测（第 4 课）
    if (logs.length > this.logLen) {
      for (let i = this.logLen; i < logs.length; i++) {
        if (logs[i].kind === 'annihilate' && this.lesson.watch === 'annihilate') {
          this.achieve('归虚达成！', '#fbbf24');
        }
      }
      this.logLen = logs.length;
    }
    if (this.logLen === 0) this.logLen = logs.length;

    // 后继差检测（第 6 课）
    const sd = me.successorDelta;
    if (sd > this.lastSucc) {
      const gain = sd - this.lastSucc;
      if (this.lesson.watch === 'successor') {
        this.note('后继差 +' + gain, '#fb923c');
        if (sd >= 3) this.achieve('后继优势累积中！', '#fb923c');
      }
    }
    this.lastSucc = sd;

    // 存在度下降（通用正反馈）
    const fx = Math.max(0, foe.existence);
    if (this.lastFoeEx && fx < this.lastFoeEx && !this.handHeld) {
      this.note('对手存在度 −' + (this.lastFoeEx - fx), '#fb7185');
    }
    this.lastFoeEx = fx;

    // 通用目标（无 watch）：把对手打到一半就算达成
    if (!this.lesson.watch && this.lastFoeEx > 0 && !this.achieved) {
      if (fx <= Math.ceil(foe.maxExistence / 2)) this.achieve('优势确立！', '#34d399');
    }
  },

  achieve(text, color) {
    if (this.achieved) return;
    this.achieved = true;
    this.note(text, color || '#fbbf24');
    if (this.ui && this.ui.goal) {
      this.ui.goal.classList.add('done');
      const tag = el('span', 'cb-ok', '✓ 已达成');
      this.ui.goal.appendChild(tag);
    }
  },

  note(text, color) {
    if (typeof Motion !== 'undefined' && Motion.float) {
      const x = window.innerWidth / 2;
      const y = window.innerHeight * 0.34;
      const d = document.createElement('div');
      d.className = 'float-num clear';
      d.textContent = text;
      d.style.left = x + 'px';
      d.style.top = y + 'px';
      d.style.transform = 'translateX(-50%)';
      if (color) d.style.color = color;
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 1150);
    } else if (typeof toast === 'function') {
      toast(text, 'good');
    }
  }
};

if (typeof window !== 'undefined') window.Coach = Coach;
