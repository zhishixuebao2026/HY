/* ============================================================
   序章 · 超限学院 —— 新手教学战役
   7 关渐进：逐步引入机制与卡牌，牌组逐关累积。
   结构照抄 Tower（roguelike.js），战斗内引导由 coach.js 负责。
   ============================================================ */

/* ---------- 工具：重复 n 张 ---------- */
function rep(id, n) { const a = []; for (let i = 0; i < n; i++) a.push(id); return a; }

/* ---------- 课程表 ---------- */
const ACADEMY_LESSONS = [
  {
    key: 'existence',
    title: '存在度',
    sub: '第一课 · 怎么算赢',
    glyph: 'ℵ₀',
    colors: '#38bdf8',
    brief: `把对手的<b style="color:var(--rose)">存在度</b>打到 0，你就赢了。<br>
      左下角是你自己的存在度，右上角是对手的。<br>
      做法很简单：把手牌里的<b>随从</b>召唤上场，然后用它去攻击对手。`,
    points: [
      ['召唤', '点手牌选中它 → 再点战场空槽，随从就上场了。'],
      ['攻击', '点自己的随从 → 再点对手的存在度条，伤害直接打在对手身上。'],
      ['结束回合', '一回合能做的事做完了，就点右下角「结束回合」交给对手。']
    ],
    sampleCards: ['002', '001'],
    goal: '把对手的存在度打到 0',
    addCards: rep('002', 4).concat(rep('001', 4), rep('021', 2)),
    foeDeck: rep('002', 3).concat(rep('001', 3)),
    foeName: '陪练傀儡',
    foeExistence: 12,
    myExistence: 30,
    // 第 1 关：手把手
    steps: [
      { id: 'hand', text: '先点一张手牌，选中它。', hint: '费用不超过当前算力（左下角 Ψ）的牌才能打。' },
      { id: 'summon', text: '再点战场上的空槽，把它召唤上场。' },
      { id: 'unit', text: '点一下你刚召唤的随从，让它进入攻击姿态。' },
      { id: 'hero', text: '点对手的存在度条（右上角），把伤害打过去。' },
      { id: 'end', text: '这一回合能做的做完了，点「结束回合」。' },
      { id: 'loop', text: '就是这样！继续召唤随从并攻击，直到对手存在度归零。' }
    ]
  },
  {
    key: 'mana',
    title: '算力 Ψ',
    sub: '第二课 · 每回合能花多少',
    glyph: '2^ℵ₀',
    colors: '#22d3ee',
    brief: `打出牌要花<b style="color:var(--cyan)">算力 Ψ</b>，就是卡牌左上角的数字。<br>
      每个回合开始，你的算力上限 <b>+1</b>，然后<b>补满到上限</b>。<br>
      <b style="color:var(--rose)">用不完的算力不会留到下回合</b> —— 所以每回合尽量把它花光。`,
    points: [
      ['曲线', '第 1 回合 1 点，第 2 回合 2 点……上限 12 点。'],
      ['不结转', '这回合剩 3 点没用，下回合也不会多给你 3 点。'],
      ['减费', '有的牌能让你下一张牌变便宜，正好用来把算力吃干净。']
    ],
    sampleCards: ['004', '001'],
    goal: '赢下对局 —— 留意每回合把算力尽量花光',
    addCards: rep('004', 2),
    foeDeck: rep('002', 3).concat(rep('001', 3), rep('007', 2)),
    foeName: '演算学徒',
    foeExistence: 16,
    myExistence: 30
  },
  {
    key: 'triggers',
    title: '战吼 / 亡语',
    sub: '第三课 · 两个触发时机',
    glyph: 'ℵ(1,0)',
    colors: '#a3e635',
    brief: `很多随从带着<b style="color:var(--cyan)">触发型</b>效果，卡面上会写明时机：<br>
      <b style="color:var(--cyan)">战吼</b> = 从手牌打出的<b>那一刻</b>触发一次。<br>
      <b style="color:var(--gold)">亡语</b> = 这个随从<b>死亡时</b>触发一次。`,
    points: [
      ['战吼', '打出即生效，不用额外操作。'],
      ['亡语', '死了才生效 —— 所以「送掉」小随从有时反而是赚的。'],
      ['时机', '效果只在写明的时机触发，其余时间它就是个普通随从。']
    ],
    sampleCards: ['001', '002'],
    goal: '赢下对局，留意战吼与亡语的触发时机',
    addCards: rep('001', 2).concat(rep('002', 2)),
    foeDeck: rep('002', 3).concat(rep('001', 3), rep('007', 2), rep('008', 2)),
    foeName: '回声讲师',
    foeExistence: 18,
    myExistence: 30
  },
  {
    key: 'tier',
    title: '层级压制',
    sub: '第四课 · 归虚',
    glyph: 'Γ₀',
    colors: '#34d399',
    brief: `每张卡都有<b style="color:var(--gold)">层级 T</b>，写在卡面左上角。<br>
      攻击时，若<b>攻击方层级 − 防守方层级 ≥ 2</b>，低层级的一方会被<b style="color:var(--rose)">归虚</b>——
      <b>直接消灭</b>，而且攻击方<b style="color:var(--green)">完全不受反击</b>。`,
    points: [
      ['归虚', '差 2 层：直接消灭，自己一点伤害都不吃。'],
      ['差 1 层', '只算普通战斗，双方互相扣血。'],
      ['抬层级', '有的牌能把友方层级 +1，正好用来跨过归虚线。']
    ],
    sampleCards: ['014', '005'],
    goal: '用层级压制完成至少一次归虚',
    // 给的牌要够多才稳定抽得到：不然「层级压制」这一课变成看运气
    addCards: rep('014', 3).concat(rep('005', 3)),
    foeDeck: rep('001', 4).concat(rep('002', 4), rep('003', 1), rep('004', 1)),
    foeName: '低维陪练',
    foeExistence: 14,
    myExistence: 32,
    watch: 'annihilate'
  },
  {
    key: 'sharp',
    title: '锐化 / 结构',
    sub: '第五课 · 阈值与持续收益',
    glyph: 'S₀',
    colors: '#fbbf24',
    brief: `<b style="color:var(--cyan)">锐化</b>的随从，压制阈值从 2 降到 <b style="color:var(--gold)">1</b> —— 只高 1 层也能归虚。<br>
      <b style="color:var(--cyan)">结构卡</b>不能攻击，但只要它还在场上，每个回合都会给你持续收益。`,
    points: [
      ['锐化', '高 1 层就够 —— 用 T2 的锐化随从打 T1，一样是归虚。'],
      ['结构', '攻 0，但每回合稳定触发效果，是对手必须处理的目标。'],
      ['取舍', '结构占一个场上位置（上限 7 个），别把场铺满。']
    ],
    sampleCards: ['009', '020'],
    goal: '赢下对局，试试锐化的压制与结构的收益',
    addCards: rep('009', 2).concat(rep('020', 2)),
    foeDeck: rep('001', 3).concat(rep('002', 3), rep('007', 2), rep('008', 2), rep('009', 2)),
    foeName: '结构教官',
    foeExistence: 18,
    myExistence: 34
  },
  {
    key: 'successor',
    title: '后继差',
    sub: '第六课 · 第二条胜利线',
    glyph: 'κ',
    colors: '#fb923c',
    brief: `除了打光存在度，还有<b style="color:var(--gold)">第二条赢法</b>：
      <b>后继差先到 12 就碾压获胜</b>，跟场面无关。<br>
      每个回合结束时比较双方<b>操作次数</b>（出牌 / 攻击 / 跃迁各算 1 次）：
      你比对手<b>多 2 次</b>就开始累积后继差，每回合最多 +3。<br>
      这一课的对手是<b style="color:var(--cyan)">迟滞演算体</b> —— 手牌又贵又重，
      一回合只做得出一两次操作。你用便宜牌铺开，就能靠操作数把它压死。`,
    points: [
      ['操作数', '出一张牌 +1，发起一次攻击 +1，执行一次跃迁 +1。'],
      ['起步线', '领先 ≥2 次才开始累积；领先越多，累积越快。'],
      ['碾压', '后继差到 12 直接获胜 —— 场面劣势也能翻盘。']
    ],
    sampleCards: ['016', '013'],
    goal: '赢下对局 —— 最好是把后继差堆到 12',
    addCards: rep('016', 2).concat(rep('013', 2)),
    // 刻意用昂贵厚重的牌组：对手每回合操作数很少，玩家才体验得到「后继碾压」
    foeDeck: rep('020', 2).concat(rep('022', 2), rep('007', 2), rep('009', 2), rep('021', 2)),
    foeName: '迟滞演算体',
    foeExistence: 22,
    myExistence: 34,
    watch: 'successor'
  },
  {
    key: 'final',
    title: '毕业考核',
    sub: '第七课 · 综合',
    glyph: '✿',
    colors: '#fde047',
    brief: `最后一场：对手使用完整的<b style="color:var(--cyan)">银之网</b>预组，存在度 <b>22</b>；你有 <b>38</b> 点存在度。<br>
      你会用上前面六课学到的全部东西 —— 算力曲线、战吼亡语、
      层级压制、锐化与结构、以及后继差这条第二条胜利线。`,
    points: [
      ['牌组', '你现在有 30 张牌，是逐关累积起来的完整牌组。'],
      ['对手', '银之网：低费铺场、连续操作，靠后继差取胜。'],
      ['毕业', '赢下这场，就可以去爬塔和正式对战了。']
    ],
    sampleCards: ['014', '009', '016'],
    goal: '击败银之网，完成结业',
    addCards: rep('008', 2),
    foeDeck: null,             // null = 用 silver 预组
    foeName: '银之网',
    foeExistence: 22,
    myExistence: 38
  }
];

/* ---------- Academy ---------- */
const Academy = {
  state: null,
  SAVE_KEY: 'garden_academy_save',
  saveOK: true,
  briefingSeen: {},

  /* ---------- 存档 ---------- */
  start(fresh) {
    const saved = fresh ? null : this.load();
    this.state = saved || {
      lesson: 0,
      cleared: [],
      deck: null,          // null = 首次进入时按第 1 关初始化
      savedAt: 0,
      v: 1
    };
    if (!Array.isArray(this.state.deck) || !this.state.deck.length) {
      this.state.deck = ACADEMY_LESSONS[0].addCards.slice();
    }
    this.save();
    this.render();
  },

  load() {
    try {
      const s = localStorage.getItem(this.SAVE_KEY);
      if (!s) return null;
      const o = JSON.parse(s);
      if (!o || !Array.isArray(o.cleared)) return null;
      return o;
    } catch (e) { return null; }
  },
  save() {
    if (!this.state) return false;
    this.state.savedAt = Date.now();
    try {
      localStorage.setItem(this.SAVE_KEY, JSON.stringify(this.state));
      this.saveOK = true;
    } catch (e) { this.saveOK = false; }
    this.updateSaveChip();
    return this.saveOK;
  },
  updateSaveChip() {
    const chip = document.getElementById('academySaveChip');
    if (!chip) return;
    chip.className = 'save-chip' + (this.saveOK ? '' : ' bad');
    if (!this.saveOK) {
      chip.innerHTML = '<i></i>本次进度无法写入本地存储';
      chip.title = '浏览器禁止了本地存储（隐私模式等），关闭页面后进度会丢失。';
      return;
    }
    const t = this.state && this.state.savedAt ? new Date(this.state.savedAt) : null;
    const hhmm = t ? String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0') : null;
    chip.innerHTML = '<i></i>学习进度已保存' + (hhmm ? ` · ${hhmm}` : '');
    chip.title = '每通一关都会立即写入本地存储，刷新或关闭页面都不会丢失。';
  },

  /* ---------- 牌组：逐关累积 ---------- */
  deckForLesson(i) {
    // 用「逐关新增卡」重放，保证与已通关记录一致。
    // 必须夹住上界：全部结业后 state.lesson 会等于课程总数，
    // 此时 ACADEMY_LESSONS[i] 是 undefined，不夹就会在这里崩掉整个学院视图。
    let deck = ACADEMY_LESSONS[0].addCards.slice();
    const top = Math.max(0, Math.min(i, ACADEMY_LESSONS.length - 1));
    for (let k = 1; k <= top; k++) deck = deck.concat(ACADEMY_LESSONS[k].addCards);
    return deck;
  },

  /* ---------- 渲染 ---------- */
  render() {
    const head = document.getElementById('academyHead');
    const host = document.getElementById('academyPath');
    if (!head || !host) return;
    head.innerHTML = ''; host.innerHTML = '';
    const st = this.state;
    const total = ACADEMY_LESSONS.length;
    const done = st.cleared.length;

    /* 头部 */
    const hrow = el('div', 'th-row');
    hrow.appendChild(el('h3', 'page-title', '序章 · 超限学院'));
    hrow.appendChild(el('div', 'save-chip', ''));
    head.appendChild(hrow);
    head.querySelector('.save-chip').id = 'academySaveChip';
    this.updateSaveChip();

    head.appendChild(pageBanner('academy', '在算力之海，先学会呼吸。',
      'ACADEMY · SEVEN LESSONS', '七课从零到结业：存在度 → 算力 → 战吼亡语 → 层级压制 → 锐化结构 → 后继差 → 毕业考核'));

    const info = el('div', 'page-desc');
    info.innerHTML = `共 <b style="color:var(--cyan)">${total}</b> 课，每课引入一个新机制并给你的牌组补几张新卡。
      从「只会召唤和打脸」一路学到<b style="color:var(--gold)">层级压制</b>与<b style="color:var(--gold)">后继碾压</b>。
      通关后即可放心去爬塔与正式对战。<b style="color:var(--green)">进度自动保存。</b>`;
    head.appendChild(info);

    /* 进度条 */
    const rail = el('div', 'climb-rail');
    const rtop = el('div', 'cr-top');
    rtop.appendChild(el('span', 'cr-lb', '学 习 进 度'));
    rtop.appendChild(el('span', 'cr-v', `${done} / ${total}`));
    rail.appendChild(rtop);
    const track = el('div', 'cr-track');
    const fill = el('div', 'cr-fill');
    fill.style.width = (done / total * 100) + '%';
    track.appendChild(fill);
    rail.appendChild(track);
    const ticks = el('div', 'cr-ticks');
    ACADEMY_LESSONS.forEach((L, i) => {
      const tk = el('span', 'cr-tick' + (st.cleared.includes(i) ? ' on' : '') + (i === st.lesson ? ' cur' : ''));
      tk.style.setProperty('--lc', L.colors);
      tk.title = L.title;
      ticks.appendChild(tk);
    });
    rail.appendChild(ticks);
    head.appendChild(rail);

    const stat = el('div', 'detail-meta');
    stat.style.marginTop = '12px';
    stat.appendChild(el('span', 'chip', `牌组 ${this.deckForLesson(st.lesson).length} 张`));
    stat.appendChild(el('span', 'chip', `已修 ${done} / ${total} 课`));
    head.appendChild(stat);

    /* 课程节点 */
    ACADEMY_LESSONS.forEach((L, i) => {
      const cleared = st.cleared.includes(i);
      const locked = i > st.lesson;
      const current = i === st.lesson;

      const node = el('div', 'tower-node'
        + (cleared ? ' cleared' : '')
        + (locked ? ' locked' : '')
        + (current ? ' current' : '')
        + (i === total - 1 ? ' boss' : ''));
      node.style.setProperty('--lc', L.colors);
      node.dataset.floor = i;          // 兼容 Motion 的通关/失败特效选择器

      const g = el('div', 'tn-glyph', L.glyph);
      g.style.color = L.colors;
      g.style.borderColor = L.colors + '55';
      node.appendChild(g);

      const body = el('div', 'tn-body');
      const ti = el('div', 'tn-title', `第 ${i + 1} 课 · ${L.title}`);
      ti.title = `第 ${i + 1} 课 · ${L.title}`;
      body.appendChild(ti);
      body.appendChild(el('div', 'tn-sub', L.sub + '　—　' + L.goal));
      node.appendChild(body);

      const tags = el('div', 'tn-tags');
      tags.appendChild(el('span', 'tn-tag', L.addCards.length + ' 张新卡'));
      tags.appendChild(el('span', 'tn-tag', `对手 ${L.foeExistence} 存在度`));
      if (cleared) tags.appendChild(el('span', 'tn-tag ok', '✓ 已修'));
      else if (locked) tags.appendChild(el('span', 'tn-tag', '未解锁'));
      else tags.appendChild(el('span', 'tn-tag cur', '当前课程'));
      node.appendChild(tags);

      if (!locked) node.onclick = () => this.enterLesson(i);
      host.appendChild(node);
    });

    fitGlyphs(host, '.tn-glyph');

    /* 底部 */
    const foot = el('div', 'tower-foot');
    const b1 = el('button', 'btn primary', st.lesson >= total ? '已结业 —— 重新学习' : `开始第 ${st.lesson + 1} 课 →`);
    b1.onclick = () => {
      if (st.lesson >= total) { this.start(true); toast('新课程开始了', 'good'); }
      else this.enterLesson(st.lesson);
    };
    const b2 = el('button', 'btn', '查看我的牌组');
    b2.onclick = () => this.showDeck();
    const b3 = el('button', 'btn danger', '重置学习进度');
    b3.onclick = () => this.confirmReset();
    foot.appendChild(b1); foot.appendChild(b2); foot.appendChild(b3);
    host.appendChild(foot);
  },

  /* ---------- 开课：先看简报 ---------- */
  enterLesson(i) {
    const L = ACADEMY_LESSONS[i];
    const wrap = el('div', 'brief');

    const lead = el('div', 'brief-lead');
    lead.style.setProperty('--lc', L.colors);
    lead.appendChild(el('div', 'bl-g', L.glyph));
    const lt = el('div');
    lt.appendChild(el('div', 'bl-t', `第 ${i + 1} 课 · ${L.title}`));
    lt.appendChild(el('div', 'bl-s', L.sub));
    lead.appendChild(lt);
    wrap.appendChild(lead);

    wrap.appendChild(el('p', 'brief-text', L.brief));

    const pl = el('div', 'brief-points');
    L.points.forEach(([k, v]) => {
      const row = el('div', 'bp-row');
      row.appendChild(el('span', 'bp-k', k));
      row.appendChild(el('span', 'bp-v', v));
      pl.appendChild(row);
    });
    wrap.appendChild(pl);

    if (L.sampleCards && L.sampleCards.length) {
      wrap.appendChild(el('div', 'brief-lb', '本课示例卡'));
      const grid = el('div', 'brief-cards');
      L.sampleCards.forEach(id => {
        const c = CARD_MAP[id];
        if (!c) return;
        const holder = el('div', 'bc-item');
        const node = renderCard(c, { size: 'mini' });
        holder.appendChild(node);
        holder.appendChild(el('div', 'bc-n', c.name));
        holder.onclick = () => showCardDetail(c);
        grid.appendChild(holder);
      });
      wrap.appendChild(grid);
    }

    const goal = el('div', 'brief-goal');
    goal.innerHTML = '<b>本关目标：</b>' + L.goal;
    wrap.appendChild(goal);

    const startBtn = el('button', 'btn primary', '开始课程 →');
    startBtn.onclick = () => { closeModal(); this.startLesson(i); };
    openModal(`第 ${i + 1} 课 · ${L.title}`, wrap, [startBtn]);
  },

  /* ---------- 真正开打 ---------- */
  startLesson(i) {
    const L = ACADEMY_LESSONS[i];
    const st = this.state;
    st.deck = this.deckForLesson(i);
    this.save();

    showView('battle');
    Battle.mode = 'academy';
    if (typeof Coach !== 'undefined' && Coach.begin) Coach.begin(i);
    Battle.start({
      deck0: 'silver',
      customDeck0: st.deck,
      name0: '学徒',
      existence0: L.myExistence,
      deck1: L.foeDeck ? 'silver' : 'silver',
      customDeck1: L.foeDeck || null,
      name1: L.foeName,
      existence1: L.foeExistence,
      onEnd: (res) => this.onBattleEnd(res, i)
    });
  },

  onBattleEnd(result, lessonIdx) {
    if (typeof Coach !== 'undefined' && Coach.stop) Coach.stop();
    const st = this.state;
    if (result === 'home') { showView('academy'); this.render(); return; }

    // 结算面板上的「再试一次」：原地重开本课
    if (result === 'retry') { toast('重新开课', 'info'); this.startLesson(lessonIdx); return; }

    if (result === 'win') {
      const first = !st.cleared.includes(lessonIdx);
      if (first) st.cleared.push(lessonIdx);
      if (lessonIdx >= st.lesson) st.lesson = lessonIdx + 1;
      st.deck = this.deckForLesson(Math.min(lessonIdx + 1, ACADEMY_LESSONS.length - 1));
      this.save();
      showView('academy');
      this.render();

      if (st.lesson >= ACADEMY_LESSONS.length) {
        this.showGraduation();
      } else {
        this.showLessonClear(lessonIdx, first);
      }
    } else {
      showView('academy');
      this.render();
      toast('这门课没过 —— 再看一遍要点，随时可以重来', 'warn');
    }
  },

  showLessonClear(i, first) {
    const L = ACADEMY_LESSONS[i];
    const next = ACADEMY_LESSONS[i + 1];
    const wrap = el('div');
    wrap.style.textAlign = 'center';
    const g = el('div', 'end-glyph', '✦');
    g.style.color = '#fbbf24';
    g.style.textShadow = '0 0 30px rgba(251,191,36,.75)';
    wrap.appendChild(g);
    wrap.appendChild(el('h3', 'page-title', `第 ${i + 1} 课 · ${L.title} 完成`));
    const p = el('p', 'page-desc');
    p.innerHTML = first
      ? `新卡已加入你的牌组：<b style="color:var(--cyan)">${next ? next.addCards.length : 0} 张</b>`
        + `（当前共 <b style="color:var(--gold)">${this.state.deck.length} 张</b>）。<br><br>`
        + (next ? `下一课：<b style="color:var(--cyan)">${next.title}</b> —— ${next.sub}` : '')
      : '这门课你已经修过了，进度没有变化。';
    wrap.appendChild(p);
    const b = el('button', 'btn primary', next ? `继续 · 第 ${i + 2} 课 →` : '查看结业');
    b.onclick = () => { closeModal(); this.render(); };
    openModal('课程完成', wrap, [b]);
  },

  showGraduation() {
    const wrap = el('div');
    wrap.style.textAlign = 'center';
    const g = el('div', 'end-glyph', '✿');
    g.style.color = '#fbbf24';
    g.style.textShadow = '0 0 34px rgba(251,191,36,.8), 0 0 76px rgba(251,191,36,.45)';
    wrap.appendChild(g);
    wrap.appendChild(el('h3', 'page-title', '结业 · 你已踏出花园'));
    const p = el('p', 'page-desc');
    p.innerHTML = `七课全部修完。你已经会用<b style="color:var(--gold)">层级压制</b>归虚对手，
      也知道<b style="color:var(--gold)">后继差</b>是通往胜利的第二条路。<br><br>
      牌组最终规模 <b style="color:var(--cyan)">${this.state.deck.length} 张</b>。
      接下来可以去<b style="color:var(--green)">超限阶梯</b>爬塔，或挑一套预组打正式对战了。`;
    wrap.appendChild(p);
    const b1 = el('button', 'btn primary', '去爬塔 →');
    b1.onclick = () => { closeModal(); showView('tower'); };
    const b2 = el('button', 'btn', '去对战');
    b2.onclick = () => { closeModal(); showView('battle'); openDeckSelect(); };
    openModal('结业', wrap, [b1, b2]);
  },

  showDeck() {
    const wrap = el('div');
    const deck = this.deckForLesson(this.state.lesson);
    const grid = el('div', 'codex-grid');
    const cnt = {};
    deck.forEach(id => { cnt[id] = (cnt[id] || 0) + 1; });
    Object.keys(cnt).sort((a, b) => CARD_MAP[a].tier - CARD_MAP[b].tier).forEach(id => {
      const c = CARD_MAP[id];
      const holder = el('div');
      holder.style.position = 'relative';
      const node = renderCard(c, { size: 'mini' });
      node.onclick = () => showCardDetail(c);
      holder.appendChild(node);
      if (cnt[id] > 1) holder.appendChild(el('div', 'pc-count', '×' + cnt[id]));
      grid.appendChild(holder);
    });
    wrap.appendChild(el('p', 'page-desc', `当前教学牌组共 ${deck.length} 张（含重复）：`));
    wrap.appendChild(grid);
    openModal('学徒的牌组', wrap);
  },

  confirmReset() {
    const wrap = el('div');
    wrap.appendChild(el('p', 'page-desc',
      `这会清空学习进度（已修 <b style="color:var(--gold)">${this.state.cleared.length}</b> 课），牌组回到第 1 课的 10 张。<br>此操作不可撤销。`));
    const yes = el('button', 'btn danger', '确认重置');
    yes.onclick = () => {
      try { localStorage.removeItem(this.SAVE_KEY); } catch (e) {}
      closeModal();
      this.start(true);
      toast('已重置学习进度', 'warn');
    };
    openModal('重置学习进度？', wrap, [yes]);
  }
};

if (typeof window !== 'undefined') window.Academy = Academy;
