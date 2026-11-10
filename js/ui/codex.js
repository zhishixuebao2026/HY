/* ============================================================
   图鉴 / 规则书 / 组牌
   ============================================================ */

const Codex = {
  filter: { type: 'ALL', tier: 'ALL', q: '' },

  /* ---------------- 图鉴 ---------------- */
  init() {
    const bar = document.getElementById('codexBar');
    const grid = document.getElementById('codexGrid');
    // 卷首横幅只在首次进入时插入一次（init 每次切视图都会被调用）
    if (!document.getElementById('codexBanner')) {
      const b = pageBanner('codex', '七十二张牌，七十二道无限。',
        'CODEX · SEVENTY-TWO CARDS', '13 个超限层级 · 4 种卡型 · 每张卡都附设定原文出处');
      b.id = 'codexBanner';
      bar.parentNode.insertBefore(b, bar);
    }
    bar.innerHTML = '';

    const search = el('input', 'codex-search');
    search.placeholder = '搜索卡名 / 效果 / 设定原文…';
    search.oninput = () => { this.filter.q = search.value.trim().toLowerCase(); this.render(); };
    bar.appendChild(search);

    const types = [['ALL', '全部'], ['ENTITY', '实体'], ['STRUCTURE', '结构'], ['CONCEPT', '概念'], ['PARADOX', '悖论']];
    types.forEach(([k, label]) => {
      const c = el('div', 'filter-chip' + (this.filter.type === k ? ' on' : ''), label);
      c.onclick = () => {
        this.filter.type = k;
        bar.querySelectorAll('.filter-chip[data-grp="type"]').forEach(x => x.classList.remove('on'));
        c.classList.add('on');
        this.render();
      };
      c.dataset.grp = 'type';
      bar.appendChild(c);
    });

    const all = el('div', 'filter-chip', '全部层级');
    all.dataset.grp = 'tier';
    all.onclick = () => { this.filter.tier = 'ALL'; bar.querySelectorAll('.filter-chip[data-grp="tier"]').forEach(x => x.classList.remove('on')); all.classList.add('on'); this.render(); };
    bar.appendChild(all);
    [1, 4, 6, 7, 8, 9, 10, 11, 12].forEach(t => {
      const c = el('div', 'filter-chip', 'T' + t + ' ' + TIERS[t].symbol);
      c.dataset.grp = 'tier';
      c.style.borderColor = TIERS[t].color + '66';
      c.onclick = () => {
        this.filter.tier = t;
        bar.querySelectorAll('.filter-chip[data-grp="tier"]').forEach(x => x.classList.remove('on'));
        c.classList.add('on');
        this.render();
      };
      bar.appendChild(c);
    });

    const cnt = el('div', 'filter-chip');
    cnt.style.cssText = 'margin-left:auto;background:none;border:none;color:var(--txt-mut);cursor:default';
    cnt.id = 'codexCount';
    bar.appendChild(cnt);

    this.render();
  },

  render() {
    const host = document.getElementById('codexGrid');
    host.innerHTML = '';
    const f = this.filter;
    let list = CARDS.filter(c => {
      if (f.type !== 'ALL' && c.type !== f.type) return false;
      if (f.tier !== 'ALL' && c.tier !== f.tier) return false;
      if (f.q) {
        const hay = (c.name + ' ' + (c.en || '') + ' ' + (c.text || '') + ' ' + (c.lore || '') + ' ' + (c.source || '')).toLowerCase();
        if (!hay.includes(f.q)) return false;
      }
      return true;
    });

    document.getElementById('codexCount').textContent = `共 ${list.length} / ${CARDS.length} 张`;

    if (!list.length) {
      host.appendChild(el('div', 'page-desc', '没有匹配的卡牌。试试其他筛选条件。'));
      return;
    }

    // 按层级分组，每组独立容器，卡牌整体居中
    const groups = {};
    list.forEach(c => { (groups[c.tier] = groups[c.tier] || []).push(c); });
    Object.keys(groups).map(Number).sort((a, b) => a - b).forEach(tier => {
      const t = TIERS[tier];
      const sec = el('div', 'codex-section');
      sec.style.setProperty('--lc', t.color);

      const head = el('div', 'codex-group');
      const sym = el('div', 'cg-sym', t.symbol);
      sym.style.color = t.color;
      head.appendChild(sym);
      const box = el('div');
      box.appendChild(el('div', 'cg-n', `T${tier} · ${t.name} <span style="color:var(--txt-mut);font-weight:400;font-size:11px">（${groups[tier].length}）</span>`));
      box.appendChild(el('div', 'cg-d', t.desc));
      head.appendChild(box);
      sec.appendChild(head);

      const cards = el('div', 'codex-cards');
      groups[tier].forEach(c => {
        const holder = el('div');
        const node = renderCard(c);
        node.onclick = () => showCardDetail(c);
        holder.appendChild(node);
        cards.appendChild(holder);
      });
      sec.appendChild(cards);
      host.appendChild(sec);
    });
    // 层级符号（2^ℵ₀ / ℵ(1,0) 等宽记号）自动降号，绝不越框
    fitGlyphs(host, '.cg-sym');
  }
};

/* ============================================================
   规则书
   ============================================================ */
const Rulebook = {
  init() {
    const host = document.getElementById('rulebookBody');
    if (!host) return;
    host.innerHTML = '';

    host.appendChild(pageBanner('rules', '规则不是束缚，而是胜负的形状。',
      'RULES OF THE GARDEN', '两条胜利线：抹除存在度，或碾压对手的操作后继'));

    // 关键数值速览：规则太抽象，先给四个数字，玩家一眼能记住
    const quick = el('div', 'rule-quick');
    [
      ['Ψ 12', '算力上限', '每回合 +1，用不完不结转'],
      ['+2 层', '归虚压制', '高 2 层直接抹除（锐化只需 1 层）'],
      ['2 Ψ', '幂集跃迁', '单卡层级 +1，每张最多 3 次'],
      ['12', '后继碾压', '累积后继差到 12 即胜']
    ].forEach(([v, t, d]) => {
      const c = el('div', 'rq-cell');
      c.appendChild(el('div', 'rq-v', v));
      c.appendChild(el('div', 'rq-t', t));
      c.appendChild(el('div', 'rq-d', d));
      quick.appendChild(c);
    });
    host.appendChild(quick);

    const sec1 = el('div');
    sec1.style.marginTop = '22px';
    sec1.appendChild(el('h3', 'page-title', '核心规则'));
    sec1.appendChild(el('p', 'page-desc', '本作将「花园」系列中的超限层级体系与算力战争，转化为一套可玩的卡牌规则。两条胜利线并存——抹除存在度，或碾压对手的操作后继。'));
    host.appendChild(sec1);

    RULES.forEach((r, i) => {
      const b = el('div', 'rule-block');
      const h = el('h4', null, `<span class="rb-n">${String(i + 1).padStart(2, '0')}</span>${r.title}`);
      b.appendChild(h);
      const p = el('p');
      p.innerHTML = r.body.replace(/【(.+?)】/g, '<b>$1</b>');
      b.appendChild(p);
      host.appendChild(b);
    });

    const sec2 = el('div', 'rule-block');
    sec2.appendChild(el('h4', null, '关键词'));
    const kw = el('div', 'kw-list');
    Object.keys(KEYWORDS).forEach(k => {
      const i = el('div', 'kw-item');
      i.appendChild(el('div', 'k', k));
      i.appendChild(el('div', 'd', KEYWORDS[k]));
      kw.appendChild(i);
    });
    sec2.appendChild(kw);
    host.appendChild(sec2);

    const sec3 = el('div', 'rule-block');
    sec3.appendChild(el('h4', null, '操作说明'));
    const p3 = el('p');
    p3.innerHTML = `· <b>出牌</b>：点击手牌选中，再次点击该卡（或点击「确认打出」）即打出。<br>
      · <b>攻击</b>：点击己方带绿色光晕的单位，再点击敌方单位或对手状态条。<br>
      · <b>幂集跃迁</b>：点击「⚡ 幂集跃迁」，再点击己方单位，消耗 2 Ψ 使其层级 +1。<br>
      · <b>查看详情</b>：在图鉴中点击卡牌；对战中右键点击手牌。<br>
      · <b>取消</b>：按 Esc 或点击「取消」按钮。`;
    sec3.appendChild(p3);
    host.appendChild(sec3);
  }
};

/* ============================================================
   组牌器
   ============================================================ */
const Builder = {
  deck: [],
  savedKey: 'garden_deck_custom',
  filter: { type: 'ALL', tier: 'ALL', q: '' },

  init() {
    const bb = document.getElementById('builderBanner');
    if (bb && !bb.dataset.built) {
      bb.dataset.built = '1';
      bb.appendChild(pageBanner('codex', '把自己的无限，装进三十张牌里。',
        'DECK CONSTRUCTION · 30 CARDS', '同卡最多 3 张 · 牌组恰好 30 张即可投入对战'));
    }
    this.deck = this.load() || DECKS.silver.cardIds.slice(0, 30);
    this.buildBar();
    this.renderPool();
    this.renderDeck();
  },

  load() {
    try {
      const s = localStorage.getItem(this.savedKey);
      if (!s) return null;
      const a = JSON.parse(s);
      return Array.isArray(a) && a.length ? a : null;
    } catch (e) { return null; }
  },
  save() {
    try { localStorage.setItem(this.savedKey, JSON.stringify(this.deck)); } catch (e) {}
  },

  /* ---------- 筛选栏 ---------- */
  buildBar() {
    const bar = document.getElementById('builderBar');
    if (!bar) return;
    bar.innerHTML = '';

    // 搜索独占一行，卡型 / 层级各占一行 —— 一堆筛选按钮挤成一团很难扫读
    const srow = el('div', 'pb-row pb-row-search');
    const search = el('input', 'codex-search');
    search.placeholder = '搜索卡名 / 效果 / 设定原文…';
    search.value = this.filter.q;
    search.oninput = () => { this.filter.q = search.value.trim().toLowerCase(); this.renderPool(); };
    srow.appendChild(search);
    const cnt = el('div', 'pb-count');
    cnt.id = 'poolCount';
    srow.appendChild(cnt);
    bar.appendChild(srow);

    const mk = (grp, val, label, color) => {
      const c = el('div', 'filter-chip' + (this.filter[grp] === val ? ' on' : ''), label);
      if (color) c.style.borderColor = color + '66';
      c.dataset.grp = grp;
      c.onclick = () => {
        this.filter[grp] = val;
        bar.querySelectorAll('.filter-chip[data-grp="' + grp + '"]').forEach(x => x.classList.remove('on'));
        c.classList.add('on');
        this.renderPool();
      };
      return c;
    };

    const trow = el('div', 'pb-row');
    trow.appendChild(el('span', 'pb-lbl', '卡型'));
    [['ALL', '全部'], ['ENTITY', '实体'], ['STRUCTURE', '结构'], ['CONCEPT', '概念'], ['PARADOX', '悖论']]
      .forEach(([k, l]) => trow.appendChild(mk('type', k, l)));
    bar.appendChild(trow);

    const irow = el('div', 'pb-row');
    irow.appendChild(el('span', 'pb-lbl', '层级'));
    irow.appendChild(mk('tier', 'ALL', '全部'));
    [1, 4, 6, 7, 8, 9, 10, 11, 12].forEach(t => irow.appendChild(mk('tier', t, 'T' + t, TIERS[t].color)));
    bar.appendChild(irow);
  },

  /* ---------- 卡池 ---------- */
  renderPool() {
    const host = document.getElementById('builderPool');
    if (!host) return;
    host.innerHTML = '';

    const f = this.filter;
    const list = CARDS.filter(c => {
      if (f.type !== 'ALL' && c.type !== f.type) return false;
      if (f.tier !== 'ALL' && c.tier !== f.tier) return false;
      if (f.q) {
        const hay = (c.name + ' ' + (c.en || '') + ' ' + (c.text || '')).toLowerCase();
        if (!hay.includes(f.q)) return false;
      }
      return true;
    }).sort((a, b) => a.tier - b.tier || a.cost - b.cost);

    const pc = document.getElementById('poolCount');
    if (pc) pc.textContent = list.length + ' / ' + CARDS.length + ' 张';

    if (!list.length) {
      const empty = el('div', 'pool-empty');
      empty.appendChild(el('div', 'pe-glyph', '∅'));
      empty.appendChild(el('div', 'pe-t', '没有匹配的卡牌'));
      empty.appendChild(el('div', 'pe-s', '换个卡型 / 层级，或直接清空搜索词。'));
      const reset = el('button', 'btn btn-sm', '重置筛选');
      reset.onclick = () => {
        this.filter = { q: '', type: 'ALL', tier: 'ALL' };
        this.buildBar(); this.renderPool();
      };
      empty.appendChild(reset);
      host.appendChild(empty);
      return;
    }

    // 卡池按层级分组：72 张平铺很难找到「我想加的那张」
    let lastTier = -1;
    list.forEach(c => {
      if (c.tier !== lastTier) {
        lastTier = c.tier;
        const t = TIERS[c.tier];
        const head = el('div', 'pool-group');
        head.style.setProperty('--tier-color', t.color);
        head.appendChild(el('span', 'pg-sym', t.symbol));
        head.appendChild(el('span', 'pg-name', 'T' + c.tier + ' · ' + t.name));
        head.appendChild(el('span', 'pg-count', String(list.filter(x => x.tier === c.tier).length)));
        host.appendChild(head);
      }
      const holder = el('div', 'pool-card');
      holder.dataset.cardId = c.id;
      const node = renderCard(c, { size: 'mini' });
      node.onclick = () => this.add(c.id);
      node.oncontextmenu = (ev) => { ev.preventDefault(); showCardDetail(c); };
      holder.appendChild(node);
      holder.appendChild(el('div', 'pc-count'));
      host.appendChild(holder);
    });
    this.refreshCounts();
  },

  /* 只刷新数量角标，避免每次点击都重建 72 张卡 DOM */
  refreshCounts() {
    const counts = {};
    this.deck.forEach(id => counts[id] = (counts[id] || 0) + 1);
    document.querySelectorAll('#builderPool .pool-card').forEach(h => {
      const n = counts[h.dataset.cardId] || 0;
      h.classList.toggle('owned', n > 0);
      h.classList.toggle('maxed', n >= 3);
      const b = h.querySelector('.pc-count');
      if (b) b.textContent = n ? '×' + n : '';
    });
  },

  /* ---------- 我的牌组 ---------- */
  renderDeck() {
    const host = document.getElementById('builderDeck');
    const cnt = document.getElementById('builderCount');
    if (!host) return;
    host.innerHTML = '';
    const ok = this.deck.length === 30;
    cnt.textContent = this.deck.length + ' / 30';
    cnt.className = 'deck-count ' + (this.deck.length > 30 ? 'bad' : ok ? 'ok' : '');

    if (!this.deck.length) {
      host.appendChild(el('div', 'pool-empty', '牌组为空 —— 从左侧卡池点击添加，或选一套预设'));
    }

    this.deck.map((id, i) => ({ id, i }))
      .sort((a, b) => CARD_MAP[a.id].cost - CARD_MAP[b.id].cost || CARD_MAP[a.id].tier - CARD_MAP[b.id].tier)
      .forEach(({ id, i }) => {
        const c = CARD_MAP[id];
        const tier = TIERS[c.tier];
        const row = el('div', 'deck-row');
        row.style.setProperty('--tier-color', tier.color);
        row.appendChild(el('div', 'dr-cost', String(c.cost)));
        row.appendChild(el('div', 'dr-n', c.name));
        row.appendChild(el('div', 'dr-x', 'T' + c.tier));
        row.appendChild(el('div', 'dr-del', '×'));
        row.title = '点击移除：' + c.name;
        row.onclick = () => this.removeAt(i);
        host.appendChild(row);
      });

    this.renderStats();
  },

  /* ---------- 牌组统计 ---------- */
  renderStats() {
    const host = document.getElementById('builderStats');
    if (!host) return;
    host.innerHTML = '';

    const n = this.deck.length;
    const buckets = [0, 0, 0, 0, 0, 0, 0];   // 1- / 2 / 3 / 4 / 5 / 6 / 7+
    let sum = 0, tSum = 0;
    this.deck.forEach(id => {
      const c = CARD_MAP[id];
      sum += c.cost; tSum += c.tier;
      buckets[c.cost <= 1 ? 0 : c.cost >= 7 ? 6 : c.cost - 1]++;
    });
    const max = Math.max(1, ...buckets);
    const labels = ['1-', '2', '3', '4', '5', '6', '7+'];

    host.appendChild(el('div', 'ds-title', '费 用 曲 线'));
    const cw = el('div', 'curve-wrap');
    buckets.forEach((v, i) => {
      const col = el('div', 'curve-col');
      const bar = el('div', 'curve-bar');
      bar.style.height = Math.round(v / max * 30) + 'px';
      bar.title = labels[i] + ' 费 · ' + v + ' 张';
      col.appendChild(bar);
      col.appendChild(el('div', 'curve-lb', labels[i]));
      cw.appendChild(col);
    });
    host.appendChild(cw);

    const avg = n ? (sum / n).toFixed(1) : '0.0';
    const avgT = n ? (tSum / n).toFixed(1) : '0.0';
    const l1 = el('div', 'ds-line');
    l1.innerHTML = '<span>平均费用</span><b>' + avg + ' Ψ</b>';
    const l2 = el('div', 'ds-line');
    l2.innerHTML = '<span>平均层级</span><b>T' + avgT + '</b>';
    host.appendChild(l1); host.appendChild(l2);

    const l3 = el('div', 'ds-line');
    let state, color;
    if (n === 30) { state = '✓ 可用于对战'; color = 'var(--green)'; }
    else if (n > 30) { state = '超出 ' + (n - 30) + ' 张'; color = 'var(--rose)'; }
    else { state = '还需 ' + (30 - n) + ' 张'; color = 'var(--gold)'; }
    l3.innerHTML = '<span>牌组状态</span><b style="color:' + color + '">' + state + '</b>';
    host.appendChild(l3);
  },

  /* ---------- 操作 ---------- */
  add(id) {
    if (this.deck.length >= 40) { toast('牌组上限 40 张', 'warn'); return; }
    const n = this.deck.filter(x => x === id).length;
    if (n >= 3) { toast('同一张卡最多 3 张', 'warn'); return; }
    this.deck.push(id);
    this.save();
    this.refreshCounts();
    this.renderDeck();
  },
  removeAt(i) {
    if (i < 0 || i >= this.deck.length) return;
    this.deck.splice(i, 1);
    this.save();
    this.refreshCounts();
    this.renderDeck();
  },
  clear() {
    this.deck = []; this.save();
    this.refreshCounts(); this.renderDeck();
  },
  preset(k) {
    const d = DECKS[k];
    if (!d) return;
    this.deck = d.cardIds.slice();
    this.save();
    this.refreshCounts(); this.renderDeck();
    toast('已载入「' + d.name + '」预设', 'good');
  },
  /* 供对战模式读取 */
  deckIds() { return this.deck.slice(); }
};

if (typeof window !== 'undefined') { window.Codex = Codex; window.Rulebook = Rulebook; window.Builder = Builder; }
