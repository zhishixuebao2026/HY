/* ============================================================
   对战界面
   ============================================================ */

const Battle = {
  eng: null,
  mode: 'ai',            // 'ai' | 'hotseat' | 'tower' | 'academy'
  myIdx: 0,
  sel: null,             // {kind:'hand'|'unit'|'ascend', handIdx?, uid?}
  targeting: null,       // {handIdx, filter, valid}
  pendingAnims: {},      // uid -> class
  prevBoard: {},         // uid -> {clone, rect}
  onEnd: null,
  aiThinking: false,

  /* ---------------- 启动 ---------------- */
  start(opts) {
    this.eng = new GardenEngine({ onUpdate: () => this.render() });
    // 仅当显式传入 mode 时才覆盖，保留调用方预先设好的值。
    // （爬塔 / 教学会先设 Battle.mode='tower'/'academy'，此前会被这里无条件冲成 'ai'，
    //  导致 showEnd 里 mode==='tower' 的专属按钮分支永远不生效）
    if (opts.mode) this.mode = opts.mode;
    else if (!this.mode) this.mode = 'ai';
    this.myIdx = 0;
    this.sel = null; this.targeting = null;
    this.pendingAnims = {}; this.prevBoard = {};
    this.onEnd = opts.onEnd || null;
    // 透传自定义牌组。此前这里漏拷 customDeck，而 engine._makePlayer 是支持的，
    // 导致爬塔累攒的牌组、组牌器保存的牌组、教学牌组全被 silver 预组顶替。
    this.eng.setup({
      p0: {
        deckId: opts.deck0, customDeck: opts.customDeck0 || null,
        name: opts.name0, existence: opts.existence0 || 30
      },
      p1: {
        deckId: opts.deck1, customDeck: opts.customDeck1 || null,
        name: opts.name1, existence: opts.existence1 || 30
      }
    });
    this.eng.startTurn();
    this.render();
    toast('对局开始 —— 层级压制与后继差，是通往胜利的两条路', 'good');
    // 除热座（双人同机）外，对手都由 AI 接管：爬塔 / 教学同样是 vs AI。
    // 此前这里只判 'ai'，导致 tower / academy 模式下对手一动不动 —— 玩家一结束回合就死锁。
    if (this.mode !== 'hotseat' && this.eng.state.current !== this.myIdx) this.runAI();
  },

  /* ---------------- 渲染 ---------------- */
  render() {
    const e = this.eng, s = e.state;
    if (!s) return;
    this.captureBoard();
    this.renderPStat(1, document.getElementById('pstatFoe'));
    this.renderPStat(0, document.getElementById('pstatMine'));
    this.renderBoard(1, document.getElementById('boardFoe'));
    this.renderBoard(0, document.getElementById('boardMine'));
    this.renderHand();
    this.renderBeam();
    this.renderActions();
    this.renderLog();
    this.applyRemovals();
    this.applyAnims();
    this.drainFx();
    if (s.winner !== null) this.showEnd();
  },

  /* ---------- 玩家状态条 ---------- */
  renderPStat(idx, host) {
    const e = this.eng, p = e.player(idx);
    const isMe = idx === this.myIdx;
    const deckDef = DECKS[p.deckId] || DECKS.silver;
    const heroTargetable = this.sel && this.sel.kind === 'unit' && !isMe;
    host.innerHTML = '';
    host.classList.toggle('hero-targetable', !!heroTargetable);
    host.dataset.hero = String(idx);
    if (heroTargetable) { host.style.cursor = 'crosshair'; host.style.boxShadow = 'inset 0 0 0 2px rgba(251,113,133,.7), 0 0 26px rgba(251,113,133,.3)'; }
    else { host.style.cursor = ''; host.style.boxShadow = ''; }

    // 头像
    const av = el('div', 'avatar', deckDef.name[0]);
    av.style.borderColor = deckDef.color;
    av.style.color = deckDef.color;
    av.style.background = `linear-gradient(150deg, ${deckDef.color}22, rgba(0,0,0,.5))`;
    host.appendChild(av);

    const info = el('div');
    info.appendChild(el('div', 'pname', p.name));
    const meta = `牌库 ${p.deck.length} · 手牌 ${p.hand.length} · 弃牌 ${p.graveyard.length}`;
    info.appendChild(el('div', 'pmeta', meta));
    host.appendChild(info);

    // 存在度
    const ex = el('div', 'exist');
    ex.appendChild(el('div', 'exist-val', String(Math.max(0, p.existence))));
    const bar = el('div', 'exist-bar' + (p.existence <= 10 ? ' low' : ''));
    const fill = el('div', 'exist-fill');
    fill.style.width = Math.max(0, (p.existence / p.maxExistence) * 100) + '%';
    bar.appendChild(fill);
    ex.appendChild(bar);
    host.appendChild(ex);

    // 算力
    if (isMe || this.mode === 'hotseat') {
      const mn = el('div', 'mana');
      mn.appendChild(el('div', 'mana-label', 'Ψ'));
      const cr = el('div', 'crystals');
      for (let i = 0; i < p.maxMana; i++) {
        cr.appendChild(el('div', 'crystal ' + (i < p.mana ? 'on' : 'spent')));
      }
      if (p.maxMana === 0) cr.appendChild(el('div', 'mana-label', '0'));
      mn.appendChild(cr);
      mn.appendChild(el('div', 'mana-label', `${p.mana}/${p.maxMana}`));
      host.appendChild(mn);
    }

    // 后继
    const sc = el('div', 'succ-box');
    sc.appendChild(el('div', 'succ-num', String(p.successorDelta)));
    const tr = el('div', 'succ-track');
    const fl = el('div', 'succ-fill');
    fl.style.width = Math.min(100, (p.successorDelta / SUCCESSOR_WIN) * 100) + '%';
    tr.appendChild(fl);
    sc.appendChild(tr);
    sc.appendChild(el('div', 'succ-lbl', '后继'));
    sc.title = `累积后继差 / ${SUCCESSOR_WIN}。达到 ${SUCCESSOR_WIN} 立即触发后继碾压获胜。`;
    host.appendChild(sc);
  },

  /* ---------- 战场 ---------- */
  renderBoard(idx, host) {
    const e = this.eng, p = e.player(idx);
    host.innerHTML = '';
    host.classList.toggle('full', p.board.length >= BOARD_LIMIT);
    for (const u of p.board) {
      const node = renderUnit(u);
      const isMine = idx === this.myIdx;

      if (isMine && e.canAttack(u.uid)) node.classList.add('can-attack');
      if (this.sel && this.sel.uid === u.uid) node.classList.add('selected');

      // 目标高亮
      if (this.sel && this.sel.kind === 'unit' && idx !== this.myIdx && u.type === 'ENTITY') {
        const taunts = p.board.filter(x => x.hp > 0 && (x.keywords || []).includes('嘲讽'));
        if (taunts.length === 0 || taunts.some(t => t.uid === u.uid)) {
          node.classList.add('targetable');
        }
      }
      if (this.sel && this.sel.kind === 'ascend' && idx === this.myIdx && e.canAscend(u.uid)) {
        node.classList.add('targetable');
      }
      if (this.targeting && this.targeting.valid.includes(u.uid)) {
        node.classList.add('targetable');
      }

      node.onclick = (ev) => { ev.stopPropagation(); this.onUnitClick(u); };
      host.appendChild(node);
    }
    // 空槽
    const emptyN = Math.max(0, Math.min(BOARD_LIMIT, 5) - p.board.length);
    if (this.sel && this.sel.kind === 'hand' && idx === this.myIdx) {
      const slot = el('div', 'slot-empty', '↓ 召唤');
      slot.onclick = () => this.confirmPlay();
      host.appendChild(slot);
    }
  },

  /* ---------- 手牌 ---------- */
  renderHand() {
    const e = this.eng, s = e.state, p = e.player(this.myIdx);
    const host = document.getElementById('hand');
    host.innerHTML = '';
    const isMyTurn = s.current === this.myIdx && s.winner === null;

    if (this.mode === 'hotseat' || isMyTurn) {
      // 延展：手牌中的卡同样享受层级抬升，卡面徽章直接显示加成后的层级
      const hb = e.handTierBonus ? e.handTierBonus(this.myIdx) : 0;
      p.hand.forEach((cid, i) => {
        const def = CARD_MAP[cid];
        const node = renderCard(def, hb ? { tier: def.tier + hb } : {});
        const playable = isMyTurn && e.canPlay(i);
        if (!playable) node.classList.add('unplayable');
        else node.classList.add('playable-glow');
        if (this.sel && this.sel.kind === 'hand' && this.sel.handIdx === i) node.classList.add('selected');
        node.dataset.handIdx = String(i);
        node.onclick = (ev) => { ev.stopPropagation(); this.onHandClick(i, node); };
        // 悬停详情
        node.oncontextmenu = (ev) => { ev.preventDefault(); showCardDetail(def); };
        host.appendChild(node);
      });
    } else {
      // 对手回合：显示卡背
      for (let i = 0; i < p.hand.length; i++) host.appendChild(renderCardBack());
    }
  },

  /* ---------- 后继天平 ---------- */
  renderBeam() {
    const e = this.eng;
    const a = e.player(0).successorDelta, b = e.player(1).successorDelta;
    const tot = Math.max(SUCCESSOR_WIN, a + b);
    document.getElementById('beamL').style.width = (a / tot * 50) + '%';
    document.getElementById('beamR').style.width = (b / tot * 50) + '%';
    document.getElementById('beamCapL').textContent = a;
    document.getElementById('beamCapR').textContent = b;
  },

  /* ---------- 操作区 ---------- */
  renderActions() {
    const e = this.eng, s = e.state, p = e.player(this.myIdx);
    const host = document.getElementById('actionDock');
    host.innerHTML = '';
    const isMyTurn = s.current === this.myIdx && s.winner === null;

    const ops = el('div', 'op-counter');
    const limit = p.opLimit === Infinity ? '' : ` / ${p.opLimit}`;
    ops.innerHTML = `本回合操作 <b>${p.opsThisTurn}</b>${limit}`;
    host.appendChild(ops);

    if (this.targeting) {
      const b = el('button', 'btn sm danger', '取消选择 (Esc)');
      b.onclick = () => this.cancelAll();
      host.appendChild(b);
    } else if (this.sel && this.sel.kind === 'unit') {
      const b = el('button', 'btn sm danger', '取消攻击 (Esc)');
      b.onclick = () => this.cancelAll();
      host.appendChild(b);
    } else if (this.sel && this.sel.kind === 'hand') {
      const b1 = el('button', 'btn sm primary', '确认打出');
      b1.onclick = () => this.confirmPlay();
      const b2 = el('button', 'btn sm', '取消');
      b2.onclick = () => this.cancelAll();
      host.appendChild(b1); host.appendChild(b2);
    } else if (this.sel && this.sel.kind === 'ascend') {
      const b = el('button', 'btn sm danger', '退出跃迁模式');
      b.onclick = () => this.cancelAll();
      host.appendChild(b);
    } else if (isMyTurn) {
      const canAsc = p.board.some(u => e.canAscend(u.uid));
      const ba = el('button', 'btn sm ' + (canAsc ? 'gold' : ''), `⚡ 幂集跃迁 (${ASCEND_COST}Ψ)`);
      ba.disabled = !canAsc;
      ba.title = '消耗 2 算力使一个单位层级 +1（每张卡最多 3 次）';
      ba.onclick = () => { this.sel = { kind: 'ascend' }; this.render(); };
      host.appendChild(ba);

      const be = el('button', 'btn primary', '结束回合 →');
      be.onclick = () => this.endTurn();
      host.appendChild(be);
    }
  },

  /* ---------- 日志 ---------- */
  renderLog() {
    const host = document.getElementById('logList');
    const logs = this.eng.log;
    if (host.childElementCount === logs.length) return;
    host.innerHTML = '';
    logs.slice(-90).forEach(l => {
      host.appendChild(el('div', 'log-item ' + l.kind, l.text));
    });
    host.scrollTop = host.scrollHeight;
  },

  /* ---------- 消失动画 ---------- */
  captureBoard() {
    const map = {};
    document.querySelectorAll('.board .card[data-uid]').forEach(n => {
      const r = n.getBoundingClientRect();
      map[n.dataset.uid] = { clone: n.cloneNode(true), rect: r };
    });
    this.prevBoard = map;
  },
  applyRemovals() {
    const now = new Set();
    document.querySelectorAll('.board .card[data-uid]').forEach(n => now.add(n.dataset.uid));
    for (const uid in this.prevBoard) {
      if (now.has(uid)) continue;
      const { clone, rect } = this.prevBoard[uid];
      clone.style.position = 'fixed';
      clone.style.left = rect.left + 'px';
      clone.style.top = rect.top + 'px';
      clone.style.width = rect.width + 'px';
      clone.style.height = rect.height + 'px';
      clone.style.zIndex = '120';
      clone.style.margin = '0';
      const wasAnn = this.pendingAnims[uid] === 'annihilating';
      clone.classList.add(wasAnn ? 'annihilating' : 'dying');
      document.body.appendChild(clone);
      const c = centerOf({ getBoundingClientRect: () => rect });
      const col = wasAnn ? '#fbbf24' : '#94a3b8';
      spawnParticles(c.x, c.y, col, wasAnn ? 22 : 12, wasAnn ? 130 : 80);
      if (wasAnn) { spawnShockwave(c.x, c.y, '#fbbf24'); }
      setTimeout(() => clone.remove(), wasAnn ? 640 : 520);
    }
    this.prevBoard = {};
  },
  applyAnims() {
    for (const uid in this.pendingAnims) {
      const cls = this.pendingAnims[uid];
      const n = document.querySelector('.board .card[data-uid="' + uid + '"]');
      if (n) { n.classList.add(cls); setTimeout(() => n.classList.remove(cls), 700); }
    }
    this.pendingAnims = {};
  },

  /* ---------- 引擎特效队列 ---------- */
  drainFx() {
    const q = this.eng.animQueue;
    if (!q.length) return;
    q.forEach(f => {
      switch (f.type) {
        case 'annihilate': this.pendingAnims[f.uid] = 'annihilating'; break;
        case 'ascend': this.pendingAnims[f.uid] = 'ascend-fx'; break;
        case 'attack': {
          if (f.target === 'hero') this.pendingAnims[f.uid] = f.owner === 0 ? 'attacking' : 'attacking-up';
          else {
            const a = document.querySelector('.board .card[data-uid="' + f.uid + '"]');
            const d = document.querySelector('.board .card[data-uid="' + f.target + '"]');
            if (a && d) {
              const ra = a.getBoundingClientRect(), rd = d.getBoundingClientRect();
              const dir = rd.top > ra.top ? 16 : -16;
              a.style.transition = 'transform .2s';
              a.style.transform = `translateY(${dir}px) scale(1.06)`;
              setTimeout(() => { a.style.transform = ''; }, 220);
              setTimeout(() => { if (d) { d.classList.add('hit'); setTimeout(() => d.classList.remove('hit'), 420); } }, 190);
            }
          }
          break;
        }
        case 'paradox': paradoxFlash(); break;
        case 'heroDamage': {
          const host = f.idx === 0 ? document.getElementById('pstatMine') : document.getElementById('pstatFoe');
          if (host) { host.animate([{ filter: 'brightness(2.4)' }, { filter: 'none' }], { duration: 420 }); }
          break;
        }
        case 'win': flashWhite(); break;
      }
    });
    q.length = 0;
  },

  /* ============================================================
     交互
     ============================================================ */
  onHandClick(i, node) {
    const e = this.eng, s = e.state;
    if (s.winner !== null || s.current !== this.myIdx) { toast('现在不是你的回合', 'warn'); return; }
    if (!e.canPlay(i)) {
      const def = CARD_MAP[e.player(this.myIdx).hand[i]];
      let why = '无法打出';
      if (def.type === 'PARADOX' && !e.canPlayParadox(this.myIdx)) why = '悖论区未解锁 —— 需要「丰饶」关键词的卡在场';
      else if (e.player(this.myIdx).mana < e.effectiveCost(def, e.player(this.myIdx))) why = `算力不足（需要 ${e.effectiveCost(def, e.player(this.myIdx))} Ψ）`;
      else if (e.player(this.myIdx).board.length >= BOARD_LIMIT) why = '战场已满（上限 7）';
      else if (e.player(this.myIdx).opsThisTurn >= e.player(this.myIdx).opLimit) why = '本回合操作次数已被锁定';
      toast(why, 'warn');
      return;
    }
    if (this.sel && this.sel.kind === 'hand' && this.sel.handIdx === i) { this.confirmPlay(); return; }
    this.sel = { kind: 'hand', handIdx: i };
    this.targeting = null;
    this.render();
  },

  confirmPlay() {
    if (!this.sel || this.sel.kind !== 'hand') return;
    const i = this.sel.handIdx;
    const def = CARD_MAP[this.eng.player(this.myIdx).hand[i]];
    this.sel = null;

    // 多选一效果
    let ctx = {};
    if ((def.effects || []).some(x => x.op === 'narrativeChoice')) {
      this.askNarrative(i); return;
    }
    if ((def.effects || []).some(x => x.op === 'transcendentalChoice')) {
      this.askTranscendental(i); return;
    }

    const r = this.eng.playCard(i, null, ctx);
    if (r.needTarget) {
      this.targeting = { handIdx: i, filter: r.filter, valid: r.valid };
      this.render();
      this.showTargetBanner();
      return;
    }
    if (!r.ok) toast('无法打出该卡', 'warn');
    this.render();
  },

  askNarrative(i) {
    const g = el('div', 'choice-grid');
    const opts = [
      { t: '「抽 2 张牌」', d: '叙事者写下：命运的篇章向前翻动两页。', v: 0 },
      { t: '「削弱最强之敌」', d: '叙事者写下：敌方最强者的层级下降 3。', v: 1 },
      { t: '「己方全体 +3 攻击」', d: '叙事者写下：本回合己方实体的利刃更锋。', v: 2 }
    ];
    opts.forEach(o => {
      const c = el('div', 'choice-card');
      c.appendChild(el('div', 'cc-t', o.t));
      c.appendChild(el('div', 'cc-d', o.d));
      c.onclick = () => { closeModal(); this.eng.playCard(i, null, { narrativeChoice: o.v }); this.render(); };
      g.appendChild(c);
    });
    const wrap = el('div');
    wrap.appendChild(el('p', 'page-desc', '沙盘·叙事者写下了一条叙事，请选择：'));
    wrap.appendChild(g);
    openModal('『叙事』—— 写下设定', wrap);
  },

  askTranscendental(i) {
    const g = el('div', 'choice-grid');
    const opts = [
      { t: '抹除战场上所有实体', d: '超验的绝对存在抹去一切造物，只留下它自身。', v: 0 },
      { t: '己方实体层级 +2', d: '它抬升了自己的仆从，使它们更接近花园。', v: 1 }
    ];
    opts.forEach(o => {
      const c = el('div', 'choice-card');
      c.appendChild(el('div', 'cc-t', o.t));
      c.appendChild(el('div', 'cc-d', o.d));
      c.onclick = () => { closeModal(); this.eng.playCard(i, null, { transcendentalChoice: o.v }); this.render(); };
      g.appendChild(c);
    });
    const wrap = el('div');
    wrap.appendChild(el('p', 'page-desc', 'Transcendental 降临时作出了选择：'));
    wrap.appendChild(g);
    openModal('『超验』—— Transcendental', wrap);
  },

  showTargetBanner() {
    const old = document.querySelector('.target-banner');
    if (old) old.remove();
    const b = el('div', 'target-banner');
    const label = { allyEntity: '选择一个友方实体', enemyEntity: '选择一个敌方实体', enemyStructure: '选择一个敌方结构', enemyUnit: '选择一个敌方单位', allyUnit: '选择一个友方单位', anyUnit: '选择一个单位' }[this.targeting.filter] || '选择一个目标';
    b.innerHTML = `${label} <span class="esc">Esc 取消</span>`;
    document.querySelector('.arena-main').appendChild(b);
  },
  clearBanner() {
    const b = document.querySelector('.target-banner');
    if (b) b.remove();
  },

  onUnitClick(u) {
    const e = this.eng, s = e.state;
    if (s.winner !== null) return;

    // 目标选择模式
    if (this.targeting) {
      if (this.targeting.valid.includes(u.uid)) {
        const hi = this.targeting.handIdx;
        this.targeting = null;
        this.clearBanner();
        const def = CARD_MAP[e.player(this.myIdx).hand[hi]];
        let ctx = {};
        if ((def.effects || []).some(x => x.op === 'narrativeChoice')) { this.askNarrativeWithTarget(hi, u.uid); return; }
        if ((def.effects || []).some(x => x.op === 'transcendentalChoice')) { this.askTranscendentalWithTarget(hi, u.uid); return; }
        e.playCard(hi, u.uid, ctx);
        this.render();
      } else toast('该单位不是合法目标', 'warn');
      return;
    }

    // 跃迁模式
    if (this.sel && this.sel.kind === 'ascend') {
      if (u.owner !== this.myIdx) { toast('只能跃迁自己的单位', 'warn'); return; }
      const r = e.ascend(u.uid);
      if (!r.ok) toast(r.msg || '无法跃迁', 'warn');
      this.sel = null;
      this.render();
      return;
    }

    // 攻击模式
    if (this.sel && this.sel.kind === 'unit') {
      if (u.owner === this.myIdx) {
        if (u.uid === this.sel.uid) { this.cancelAll(); return; }
        this.sel = { kind: 'unit', uid: u.uid };
        this.render();
        return;
      }
      const r = e.attack(this.sel.uid, u.uid);
      if (!r.ok) toast(r.msg || '无法攻击', 'warn');
      this.sel = null;
      this.render();
      return;
    }

    // 未选中：若为己方可攻击单位则进入攻击模式
    if (u.owner === this.myIdx && s.current === this.myIdx) {
      if (e.canAttack(u.uid)) { this.sel = { kind: 'unit', uid: u.uid }; this.render(); }
      else if (u.justPlayed) toast('该单位本回合刚入场，无法攻击', 'warn');
      else if (u.type === 'STRUCTURE') toast('结构卡无法主动攻击', 'warn');
      else toast('该单位本回合已攻击过', 'warn');
    }
  },

  askNarrativeWithTarget(hi, uid) {
    const g = el('div', 'choice-grid');
    const opts = [
      { t: '「抽 2 张牌」', d: '命运的篇章向前翻动两页。', v: 0 },
      { t: '「削弱最强之敌」', d: '敌方最强者的层级下降 3。', v: 1 },
      { t: '「己方全体 +3 攻击」', d: '本回合己方实体的利刃更锋。', v: 2 }
    ];
    opts.forEach(o => {
      const c = el('div', 'choice-card');
      c.appendChild(el('div', 'cc-t', o.t)); c.appendChild(el('div', 'cc-d', o.d));
      c.onclick = () => { closeModal(); this.eng.playCard(hi, uid, { narrativeChoice: o.v }); this.render(); };
      g.appendChild(c);
    });
    const wrap = el('div'); wrap.appendChild(g);
    openModal('『叙事』—— 写下设定', wrap);
  },
  askTranscendentalWithTarget(hi, uid) {
    const g = el('div', 'choice-grid');
    const opts = [
      { t: '抹除战场上所有实体', d: '超验的绝对存在抹去一切造物。', v: 0 },
      { t: '己方实体层级 +2', d: '抬升仆从，使其更接近花园。', v: 1 }
    ];
    opts.forEach(o => {
      const c = el('div', 'choice-card');
      c.appendChild(el('div', 'cc-t', o.t)); c.appendChild(el('div', 'cc-d', o.d));
      c.onclick = () => { closeModal(); this.eng.playCard(hi, uid, { transcendentalChoice: o.v }); this.render(); };
      g.appendChild(c);
    });
    const wrap = el('div'); wrap.appendChild(g);
    openModal('『超验』—— Transcendental', wrap);
  },

  onHeroClick(idx) {
    const e = this.eng;
    if (!this.sel || this.sel.kind !== 'unit') return;
    if (idx === this.myIdx) { toast('不能攻击自己', 'warn'); return; }
    // 嘲讽校验统一交给引擎判断（attack 内部会拒绝），UI 不再重复实现一份
    const r = e.attack(this.sel.uid, 'hero');
    if (!r.ok) toast(r.msg || '无法攻击', 'warn');
    this.sel = null;
    this.render();
  },

  cancelAll() {
    this.sel = null; this.targeting = null;
    this.clearBanner();
    this.render();
  },

  endTurn() {
    if (this.eng.state.winner !== null) return;
    this.sel = null; this.targeting = null; this.clearBanner();
    const cur = this.eng.state.current;
    this.eng.endTurn();
    this.render();
    if (this.eng.state.winner === null && this.mode !== 'hotseat' && this.eng.state.current !== this.myIdx) {
      this.runAI();
    } else if (this.mode === 'hotseat') {
      toast('轮到 ' + this.eng.me.name, 'good');
    }
  },

  runAI() {
    if (this.aiThinking) return;
    this.aiThinking = true;
    const banner = el('div', 'target-banner');
    banner.style.background = 'rgba(124,58,237,.94)';
    banner.style.borderColor = '#a78bfa';
    banner.innerHTML = '对手正在推演……';
    document.querySelector('.arena-main').appendChild(banner);
    setTimeout(() => {
      try { runAITurn(this.eng, 1 - this.myIdx); }
      catch (e) { console.error('[battle] AI 推演异常:', e); }
      finally {
        // 必须无条件复位：一旦异常把 aiThinking 卡在 true，
        // runAI 开头的守卫会永久拦截，对局再也不会推进。
        banner.remove();
        this.aiThinking = false;
        this.render();
      }
      if (this.eng.state.winner === null && this.eng.state.current !== this.myIdx) this.runAI();
    }, 620);
  },

  /* ---------- 结束 ---------- */
  showEnd() {
    const s = this.eng.state;
    const box = document.getElementById('endBox');
    const ov = document.getElementById('endOverlay');
    const won = s.winner === this.myIdx;
    const p = this.eng.player(this.myIdx);
    box.innerHTML = '';
    box.appendChild(el('div', 'end-glyph', won ? '✿' : '◈'));
    document.querySelector('.end-glyph').style.color = won ? '#fbbf24' : '#64748b';
    box.appendChild(el('div', 'end-title' + (won ? '' : ' lose'), won ? '最终丰饶' : '归于虚无'));
    box.appendChild(el('div', 'end-reason', s.winReason));
    const st = el('div', 'end-stats');
    [['回合数', s.turn], ['剩余存在度', Math.max(0, p.existence)], ['后继差', p.successorDelta], ['已归虚', p.graveyard.length]].forEach(([l, v]) => {
      const d = el('div', 'end-stat');
      d.appendChild(el('div', 'v', String(v)));
      d.appendChild(el('div', 'l', l));
      st.appendChild(d);
    });
    box.appendChild(st);
    const btns = el('div');
    btns.style.cssText = 'display:flex;gap:10px;justify-content:center;flex-wrap:wrap';
    const isCourse = this.mode === 'tower' || this.mode === 'academy';
    const mainLabel = this.mode === 'academy'
      ? (won ? '完成本课 →' : '再试一次')
      : this.mode === 'tower'
        ? (won ? '继续攀升 →' : '重新开始')
        : '再来一局';
    const b1 = el('button', 'btn primary', mainLabel);
    b1.onclick = () => {
      ov.classList.remove('on');
      if (!this.onEnd) return;
      // 教学的「再试一次」要原地重开本课，而不是退回课程列表
      if (this.mode === 'academy') this.onEnd(won ? 'win' : 'retry');
      else this.onEnd(won ? 'win' : 'lose');
    };
    btns.appendChild(b1);
    // 爬塔 / 教学：回到各自的课程列表（onEnd('home') 由 Tower/Academy 解释为「返回本模式」）
    if (isCourse) {
      const b3 = el('button', 'btn', this.mode === 'academy' ? '返回课程列表' : '返回阶梯');
      b3.onclick = () => { ov.classList.remove('on'); if (this.onEnd) this.onEnd('home'); };
      btns.appendChild(b3);
    } else {
      const b2 = el('button', 'btn', '返回主页');
      b2.onclick = () => { ov.classList.remove('on'); if (this.onEnd) this.onEnd('home'); };
      btns.appendChild(b2);
    }
    box.appendChild(btns);
    ov.classList.add('on');
    if (won) { flashWhite(); }
  }
};

/* ---------- 卡牌详情弹窗 ---------- */
function showCardDetail(def) {
  const tier = TIERS[def.tier];
  const wrap = el('div', 'card-detail-row');
  const c = renderCard(def, { size: 'large' });
  const holder = el('div');
  holder.appendChild(c);
  wrap.appendChild(holder);
  const info = el('div', 'detail-info');
  info.appendChild(el('h3', null, def.name));
  info.appendChild(el('div', 'en-name', def.en));
  const meta = el('div', 'detail-meta');
  const tc = el('span', 'chip tier', `层级 ${def.tier} · ${tier.name} ${tier.symbol}`);
  tc.style.setProperty('--tier-color', tier.color);
  tc.style.borderColor = tier.color; tc.style.color = tier.color;
  meta.appendChild(tc);
  meta.appendChild(el('span', 'chip', TYPE_INFO[def.type].name));
  meta.appendChild(el('span', 'chip', `费用 ${def.cost} Ψ`));
  if (def.type === 'ENTITY') meta.appendChild(el('span', 'chip', `${def.atk} / ${def.hp}`));
  info.appendChild(meta);
  const eff = el('div', 'detail-effect');
  eff.innerHTML = highlightText(def.text || '—');
  info.appendChild(eff);
  if (def.keywords && def.keywords.length) {
    const kw = el('div', 'detail-meta');
    def.keywords.forEach(k => {
      const c2 = el('span', 'chip', k);
      c2.title = KEYWORDS[k] || '';
      kw.appendChild(c2);
    });
    info.appendChild(kw);
  }
  // 统一引号：原文未自带「」时自动包裹，避免与装饰引号重复
  const loreTxt = (def.lore || '').trim();
  if (loreTxt) {
    const loreBox = el('div', 'detail-lore');
    const quoted = loreTxt.startsWith('「') || loreTxt.startsWith('“');
    if (!quoted) loreBox.appendChild(el('span', 'q', '「'));
    loreBox.appendChild(document.createTextNode(loreTxt));
    if (!quoted) loreBox.appendChild(el('span', 'q', '」'));
    if (def.source) loreBox.appendChild(el('div', 'detail-src', '—— ' + def.source));
    info.appendChild(loreBox);
  }
  wrap.appendChild(info);
  openModal('卡牌详情', wrap);
}

if (typeof window !== 'undefined') { window.Battle = Battle; window.showCardDetail = showCardDetail; }
