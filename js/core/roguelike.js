/* ============================================================
   Roguelike 爬塔 —— 超限阶梯 12 层
   ============================================================ */

const TOWER_FLOORS = [
  { tier: 1,  name: '委员会文明',        deck: 'silver',  existence: 18,
    desc: '个体在 16 岁生日时领到一个无穷大的专属宇宙，算力多为菲弗曼-舒特序数级。' },
  { tier: 2,  name: '副本人类',          deck: 'silver',  existence: 20,
    desc: '「对于我们这样的低算力副本虫虫而言，我们就是不可思议的神。」' },
  { tier: 3,  name: '递归图灵机群',      deck: 'silver',  existence: 22,
    desc: '无论用递归方式去构建的算力终究只能停留在小于递归上界的序数层面。' },
  { tier: 4,  name: '清账者',            deck: 'silver',  existence: 24,
    desc: '清扫弹毁灭超过 ℵ(1,0) 的宇宙集群，单一个体超越不可达序数级算力。' },
  { tier: 5,  name: '超阈人类',          deck: 'grammar', existence: 26,
    desc: '战胜清账者，将星丝铺至大基数领域，战争抵达 power-admissible 基数。' },
  { tier: 6,  name: '大基数观测者',      deck: 'grammar', existence: 28,
    desc: '不可达、可测、Woodin、Mahlo……超出 ZFC 证明范畴的绝对无限。' },
  { tier: 7,  name: '冯·诺依曼宇宙 V',   deck: 'grammar', existence: 30,
    desc: 'V₀=Ø，V_α = ∪ξ<α ρ(Vξ)。一切集合的集合，Ord 与 V 为真类。' },
  { tier: 8,  name: '脱殊复宇宙',        deck: 'grammar', existence: 32,
    desc: '哈姆金斯实在论、逻辑多元。单一生命所有可能的现实即形成一个集合论宇宙。' },
  { tier: 9,  name: '万有公理宇宙',      deck: 'garden',  existence: 32,
    desc: '可构造任何公理，包含无穷悖论与矛盾界说。0=1 在其中也是一个成立的公理。' },
  { tier: 10, name: '超视界拓扑网',      deck: 'garden',  existence: 34,
    desc: '微不足道的分流上都存在无数个不同的数学体系集群。' },
  { tier: 11, name: '万界归一者',        deck: 'garden',  existence: 38,
    desc: '无穷触须，每根触须都卷曲着不断扩张的脱殊复宇宙。', boss: true },
  { tier: 12, name: '『花园』· 莫哲',     deck: 'garden',  existence: 46,
    desc: '「我是园丁，也是花园，所以我想它是什么它就是什么。」', boss: true }
];

const TOWER_START_DECK = [
  '001','001','002','002','003','004','005','005','007','007',
  '008','010','010','012','013','014','016','018','020','023',
  '025','027','029','030'
];

const Tower = {
  state: null,
  SAVE_KEY: 'garden_tower_save',
  saveOK: true,

  start(fresh) {
    const saved = fresh ? null : this.load();
    this.state = saved || {
      floor: 0,
      deck: TOWER_START_DECK.slice(),
      existence: 30,
      maxExistence: 30,
      cleared: [],
      rewardPending: null,
      savedAt: 0,
      v: 1
    };
    // 兼容旧档
    if (this.state.savedAt == null) this.state.savedAt = 0;
    if (saved) this.save(); else this.save();   // 建档 / 刷新时间戳
    this.render();
  },

  load() {
    try {
      const s = localStorage.getItem(this.SAVE_KEY);
      if (!s) return null;
      const o = JSON.parse(s);
      if (!o || !Array.isArray(o.deck) || !Array.isArray(o.cleared)) return null;
      return o;
    } catch (e) { return null; }
  },
  save() {
    if (!this.state) return false;
    this.state.savedAt = Date.now();
    try {
      localStorage.setItem(this.SAVE_KEY, JSON.stringify(this.state));
      this.saveOK = true;
    } catch (e) {
      this.saveOK = false;      // 隐私模式 / 禁用存储时降级为内存进度
    }
    this.updateSaveChip();
    return this.saveOK;
  },

  /* 顶部「进度已保存」状态指示 */
  updateSaveChip() {
    const chip = document.getElementById('towerSaveChip');
    if (!chip) return;
    chip.className = 'save-chip' + (this.saveOK ? '' : ' bad');
    if (!this.saveOK) {
      chip.innerHTML = '<i></i>本次进度无法写入本地存储';
      chip.title = '浏览器禁止了本地存储（隐私模式或 file:// 限制），关闭页面后进度会丢失。';
      return;
    }
    const t = this.state && this.state.savedAt ? new Date(this.state.savedAt) : null;
    const hhmm = t ? String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0') : null;
    chip.innerHTML = '<i></i>进度已自动保存' + (hhmm ? ` · ${hhmm}` : '');
    chip.title = '每次通关 / 失败 / 领取奖励都会立即写入本地存储，关闭浏览器或刷新页面都不会丢失。';
  },

  render() {
    const host = document.getElementById('towerPath');
    const head = document.getElementById('towerHead');
    if (!host || !head) return;
    host.innerHTML = '';
    head.innerHTML = '';
    const st = this.state;
    const total = TOWER_FLOORS.length;
    const done = st.cleared.length;

    /* ---------- 头部 ---------- */
    const hrow = el('div', 'th-row');
    hrow.appendChild(el('h3', 'page-title', `超限阶梯 · ${total} 层`));
    hrow.appendChild(el('div', 'save-chip', ''));
    head.appendChild(hrow);
    head.querySelector('.save-chip').id = 'towerSaveChip';
    this.updateSaveChip();

    const info = el('div', 'page-desc');
    info.innerHTML = `从第 <b style="color:var(--cyan)">1</b> 层的委员会文明一路攀升至第 <b style="color:var(--gold)">${total}</b> 层的『花园』。每次通关可选取一张新卡加入牌组，存在度会在层间部分恢复。<b style="color:var(--green)">进度会自动写入本地存储，刷新或关闭页面都不会丢失。</b>`;
    head.appendChild(info);

    /* ---------- 攀升进度条 ---------- */
    const rail = el('div', 'climb-rail');
    const rtop = el('div', 'cr-top');
    rtop.appendChild(el('span', 'cr-lb', '攀 升 进 度'));
    rtop.appendChild(el('span', 'cr-v', `${done} / ${total}`));
    rail.appendChild(rtop);
    const track = el('div', 'cr-track');
    const fill = el('div', 'cr-fill');
    fill.style.width = (done / total * 100) + '%';
    track.appendChild(fill);
    rail.appendChild(track);
    const ticks = el('div', 'cr-ticks');
    TOWER_FLOORS.forEach((f, i) => {
      const tk = el('span', 'cr-tick' + (st.cleared.includes(i) ? ' on' : '') + (i === st.floor ? ' cur' : ''));
      tk.style.setProperty('--lc', TIERS[f.tier].color);
      tk.title = `第 ${i + 1} 层 · ${f.name}`;
      ticks.appendChild(tk);
    });
    rail.appendChild(ticks);
    head.appendChild(rail);

    /* ---------- 状态 ---------- */
    const stat = el('div', 'detail-meta');
    stat.style.marginTop = '12px';
    stat.appendChild(el('span', 'chip', `牌组 ${st.deck.length} 张`));
    const ex = el('span', 'chip', `存在度 ${st.existence} / ${st.maxExistence}`);
    ex.style.borderColor = st.existence > 12 ? 'rgba(52,211,153,.5)' : 'rgba(251,113,133,.6)';
    stat.appendChild(ex);
    stat.appendChild(el('span', 'chip', `已通关 ${done} / ${total}`));
    head.appendChild(stat);

    /* ---------- 层级节点 ---------- */
    TOWER_FLOORS.forEach((f, i) => {
      const t = TIERS[f.tier];
      const cleared = st.cleared.includes(i);
      const locked = i > st.floor;
      const current = i === st.floor;

      const node = el('div', 'tower-node'
        + (cleared ? ' cleared' : '')
        + (locked ? ' locked' : '')
        + (current ? ' current' : '')
        + (f.boss ? ' boss' : ''));
      node.style.setProperty('--lc', t.color);
      node.dataset.floor = i;

      const g = el('div', 'tn-glyph', t.symbol);
      g.style.color = t.color;
      g.style.borderColor = t.color + '55';
      node.appendChild(g);

      const body = el('div', 'tn-body');
      const ti = el('div', 'tn-title', `第 ${i + 1} 层 · ${f.name}`);
      ti.title = `第 ${i + 1} 层 · ${f.name}`;
      body.appendChild(ti);
      const sub = el('div', 'tn-sub', f.desc);
      body.appendChild(sub);
      node.appendChild(body);

      const tags = el('div', 'tn-tags');
      tags.appendChild(el('span', 'tn-tag' + (f.boss ? ' boss' : ''), f.boss ? 'BOSS' : `T${f.tier}`));
      tags.appendChild(el('span', 'tn-tag', `${f.existence} 存在度`));
      if (cleared) tags.appendChild(el('span', 'tn-tag ok', '✓ 已通关'));
      else if (locked) tags.appendChild(el('span', 'tn-tag', '未解锁'));
      else tags.appendChild(el('span', 'tn-tag cur', '当前目标'));
      node.appendChild(tags);

      if (!locked) node.onclick = () => this.enterFloor(i);
      host.appendChild(node);
    });

    // 符号框自适应（2^ℵ₀ / ℵ(1,0) 这类宽记号）
    fitGlyphs(host, '.tn-glyph');

    /* ---------- 底部操作 ---------- */
    const foot = el('div', 'tower-foot');
    const b1 = el('button', 'btn primary', st.floor >= total ? '已登顶 —— 重新开始' : `挑战第 ${st.floor + 1} 层 →`);
    b1.onclick = () => {
      if (st.floor >= total) { this.start(true); toast('新的攀登开始了', 'good'); }
      else this.enterFloor(st.floor);
    };
    const b2 = el('button', 'btn', '查看牌组');
    b2.onclick = () => this.showDeck();
    const b3 = el('button', 'btn danger', '放弃并重来');
    b3.onclick = () => this.confirmReset();
    foot.appendChild(b1); foot.appendChild(b2); foot.appendChild(b3);
    host.appendChild(foot);
  },

  confirmReset() {
    const wrap = el('div');
    wrap.appendChild(el('p', 'page-desc',
      `这会清空当前攀登进度（已通关 <b style="color:var(--gold)">${this.state.cleared.length}</b> 层、牌组 <b style="color:var(--cyan)">${this.state.deck.length}</b> 张），从第 1 层重新开始。<br>此操作不可撤销。`));
    const yes = el('button', 'btn danger', '确认重置');
    yes.onclick = () => {
      try { localStorage.removeItem(this.SAVE_KEY); } catch (e) {}
      closeModal();
      this.start(true);
      toast('已重置爬塔进度', 'warn');
    };
    openModal('放弃并重来？', wrap, [yes]);
  },

  enterFloor(i) {
    const f = TOWER_FLOORS[i];
    const st = this.state;
    st.rewardPending = null;
    showView('battle');
    Battle.mode = 'tower';
    // 刻意不传 mode：让 start 保留上面设的 'tower'，
    // 结算层才会显示「继续攀升 →」而不是「再来一局」
    Battle.start({
      deck0: 'silver',
      customDeck0: st.deck,
      name0: '攀登者',
      existence0: st.existence,
      deck1: f.deck,
      name1: f.name,
      existence1: f.existence,
      onEnd: (res) => this.onBattleEnd(res, i)
    });
  },

  onBattleEnd(result, floorIdx) {
    if (result === 'home') { showView('tower'); this.render(); return; }
    if (result === 'win') {
      const st = this.state;
      const firstClear = !st.cleared.includes(floorIdx);
      if (firstClear) st.cleared.push(floorIdx);
      // 恢复存在度
      const heal = floorIdx >= 8 ? 5 : 7;
      const before = st.existence;
      st.maxExistence = 30 + st.cleared.length;
      try {
        st.existence = Math.min(st.maxExistence, Battle.eng.player(0).existence + heal);
      } catch (e) {
        st.existence = Math.min(st.maxExistence, before + heal);
      }
      if (floorIdx >= st.floor) st.floor = floorIdx + 1;
      this.save();
      if (st.floor >= TOWER_FLOORS.length) {
        // 登顶
        showView('tower');
        this.render();
        this.showVictory();
      } else {
        // 先回到阶梯界面再弹出战利品，避免领奖后停在结算画面
        showView('tower');
        this.render();
        this.offerReward(floorIdx, heal, firstClear);
      }
    } else {
      // 失败
      const st = this.state;
      st.existence = Math.max(1, Math.floor(st.existence * 0.6));
      st.floor = Math.max(0, st.floor - 1);
      this.save();
      showView('tower');
      this.render();
      toast('你在阶梯上滑落了一层，存在度折损', 'warn');
    }
  },

  offerReward(floorIdx, heal, firstClear) {
    const f = TOWER_FLOORS[floorIdx];
    const tier = f.tier;
    // 候选：层级在 [tier-3, tier+1] 之间的卡
    const pool = CARDS.filter(c => c.tier >= Math.max(0, tier - 3) && c.tier <= Math.min(12, tier + 1));
    const picks = [];
    const used = new Set();
    let guard = 0;
    while (picks.length < 3 && guard++ < 400 && pool.length) {
      const c = pool[Math.floor(Math.random() * pool.length)];
      if (!c || used.has(c.id)) continue;
      used.add(c.id); picks.push(c);
    }

    const g = el('div', 'reward-grid');
    picks.forEach((c, idx) => {
      const holder = el('div', 'reward-card');
      holder.style.setProperty('--rd', (idx * 90) + 'ms');
      const node = renderCard(c, { size: 'mini' });
      holder.appendChild(node);
      holder.appendChild(el('div', 'rc-name', c.name));
      holder.title = '点击加入牌组';
      holder.onclick = () => {
        this.state.deck.push(c.id);
        this.save();
        closeModal();
        this.render();
        toast(`【${c.name}】已加入牌组`, 'good');
      };
      g.appendChild(holder);          // ← 修正：此前误写为 g.appendChild(g) 导致抛异常
    });

    const wrap = el('div');
    const head = el('p', 'page-desc');
    head.innerHTML = `第 <b style="color:var(--cyan)">${floorIdx + 1}</b> 层 · ${f.name} 已通过。`
      + `存在度恢复 <b style="color:var(--green)">${heal || 0}</b> 点（当前 ${this.state.existence} / ${this.state.maxExistence}）。`
      + (firstClear ? '' : '<br><span style="color:var(--txt-mut);font-size:11px">该层此前已通关，不再重复计入最高纪录。</span>')
      + '<br>选择一张卡加入你的牌组：';
    wrap.appendChild(head);
    wrap.appendChild(g);
    const skip = el('button', 'btn', '跳过奖励');
    skip.onclick = () => { closeModal(); this.render(); };
    openModal('战利品 —— 选取一张卡', wrap, [skip]);
  },

  showDeck() {
    const wrap = el('div');
    const grid = el('div', 'codex-grid');
    this.state.deck.slice().sort((a, b) => CARD_MAP[a].tier - CARD_MAP[b].tier).forEach(id => {
      const c = CARD_MAP[id];
      const holder = el('div');
      const node = renderCard(c, { size: 'mini' });
      node.onclick = () => showCardDetail(c);
      holder.appendChild(node);
      grid.appendChild(holder);
    });
    wrap.appendChild(el('p', 'page-desc', `当前牌组共 ${this.state.deck.length} 张：`));
    wrap.appendChild(grid);
    openModal('攀登者的牌组', wrap);
  },

  showVictory() {
    const wrap = el('div');
    wrap.style.textAlign = 'center';
    const glyph = el('div', 'end-glyph', '✿');
    glyph.style.color = '#fbbf24';
    glyph.style.textShadow = '0 0 30px rgba(251,191,36,.75), 0 0 70px rgba(251,191,36,.4)';
    wrap.appendChild(glyph);
    wrap.appendChild(el('h3', 'page-title', '你抵达了『花园』'));
    const p = el('p', 'page-desc');
    p.innerHTML = `「即便没有这场关于无限的游戏，对花园本身也是毫无影响的。花园依然是花园。<br>但花园的园丁可不能接受那样一个死气沉沉的地方。」<br><br>
      你走完了全部 12 层超限阶梯，从委员会文明一路攀升至最终丰饶。<br>
      <b style="color:var(--gold)">后继差累计 ${this.state.cleared.length} 层，牌组 ${this.state.deck.length} 张。</b>`;
    wrap.appendChild(p);
    const b = el('button', 'btn primary', '再攀一次');
    b.onclick = () => { closeModal(); this.start(true); };
    openModal('最终丰饶', wrap, [b]);
  }
};

if (typeof window !== 'undefined') window.Tower = Tower;
