/* ============================================================
   《花园：超限算力战争》 入口
   ============================================================ */

let currentView = 'home';

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('on'));
  const v = document.getElementById('view' + name[0].toUpperCase() + name.slice(1));
  if (v) v.classList.add('on');
  document.querySelectorAll('.navtab').forEach(t => {
    const active = t.dataset.view === name;
    t.classList.toggle('on', active);
    if (active) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  });
  currentView = name;
  if (name === 'codex') Codex.init();
  if (name === 'rules') Rulebook.init();
  if (name === 'builder') Builder.init();
  if (name === 'tower') Tower.start(false);
  if (name === 'academy') Academy.start(false);
  if (name === 'home') renderHome();
  // 视图可见后再校正层级符号字号（隐藏状态下量不到真实宽度）
  requestAnimationFrame(() => fitGlyphs(document.querySelector('.view.on')));
}

/* ============================================================
   首页
   ============================================================ */
function renderHome() {
  const host = document.getElementById('homeBody');
  // 已构建过：只刷新「序章」卡上的进度徽标（课程进度会随时变化）
  if (host.dataset.built) { refreshAcademyCard(); return; }
  host.dataset.built = '1';
  host.className = 'home-hero';

  const artPanel = el('section', 'home-visual');
  artPanel.setAttribute('role', 'img');
  artPanel.setAttribute('aria-label', '星际花园主视觉：一朵由金色数学光丝构成的花，悬浮于深空与轨道之间');
  const artCopy = el('div', 'home-visual-copy');
  artCopy.appendChild(el('div', 'home-visual-kicker', 'THE GARDEN · TRANFINITE CARD BATTLEGROUND'));
  artCopy.appendChild(el('div', 'home-visual-title', '在无限之后，仍有一座花园。'));
  artCopy.appendChild(el('div', 'home-visual-meta', '13 层阶梯　·　72 张卡牌　·　双重胜利路径'));
  artPanel.appendChild(artCopy);
  host.appendChild(artPanel);

  host.appendChild(el('div', 'home-title', '花园：超限算力战争'));
  host.appendChild(el('div', 'home-en', 'The Garden · War of Transfinite Computation'));
  const tag = el('div', 'home-tagline');
  tag.innerHTML = `从 <b>ℵ₀</b> 的无穷旅馆出发，跨越阿列夫不动点、大基数、冯·诺依曼宇宙 V，
    直至那座包容任何事物而否决任何事物之地 —— <b>『花园』</b>。<br>
    在这里，胜负不只属于更高的无限，也属于<b>多出一次的操作后继</b>。`;
  host.appendChild(tag);

  // 层级阶梯
  const ladder = el('div', 'ladder-strip');
  ladder.id = 'ladderStrip';
  TIERS.forEach((t, i) => {
    const step = el('div', 'ladder-step');
    step.style.setProperty('--lc', t.color);
    const bar = el('div', 'lb');
    bar.style.height = (14 + i * 6.6) + 'px';
    step.appendChild(bar);
    step.appendChild(el('div', 'ls', t.symbol));
    step.appendChild(el('div', 'lt', 'T' + i));
    step.onclick = () => showTierDetail(i);
    step.title = t.name;
    ladder.appendChild(step);
  });
  host.appendChild(ladder);
  fitGlyphs(ladder, '.ls');

  // 模式卡
  const modes = el('div', 'home-modes');
  const cards = [
    {
      icon: '✎', color: '#38bdf8', title: '序章 · 超限学院', en: 'Academy · 7 Lessons', badge: '新课', id: 'academyCard',
      desc: '七节课带你从零上手：存在度 → 算力 Ψ → 战吼亡语 → 层级压制 → 锐化结构 → 后继差 → 毕业考核。每课补几张新卡，第 1 课全程手把手。进度自动保存。',
      fn: () => showView('academy')
    },
    {
      icon: '⚔', color: '#22d3ee', title: '构筑对战', en: 'Constructed Battle', badge: null,
      desc: '选择一套牌组，与 AI 在 13 个超限层级上展开算力战争。抹除对方存在度，或累积 12 点后继差碾压取胜。',
      fn: () => openDeckSelect()
    },
    {
      icon: '✦', color: '#fbbf24', title: '超限阶梯', en: 'Roguelike Ascent', badge: '12 层',
      desc: '从委员会文明一路攀升至『花园』。每层通关可选取新卡强化牌组，存在度在层间部分恢复。',
      fn: () => { showView('tower'); }
    },
    {
      icon: '❋', color: '#a78bfa', title: '卡牌图鉴', en: 'Card Codex', badge: CARDS.length + ' 张',
      desc: '浏览全部卡牌与其设定原文出处。按层级、类型筛选，或搜索效果与原文。',
      fn: () => showView('codex')
    },
    {
      icon: '◈', color: '#34d399', title: '规则与组牌', en: 'Rules & Deck Builder', badge: null,
      desc: '阅读完整规则书与关键词词典，并组建你自己的 30 张牌组。',
      fn: () => showView('rules')
    }
  ];
  cards.forEach(c => {
    const node = el('div', 'mode-card');
    node.style.setProperty('--mc', c.color + '22');
    const ic = el('span', 'mode-icon', c.icon);
    ic.style.color = c.color;
    node.appendChild(ic);
    node.appendChild(el('div', 'mode-title', c.title));
    node.appendChild(el('div', 'mode-en', c.en));
    node.appendChild(el('div', 'mode-desc', c.desc));
    if (c.badge) node.appendChild(el('div', 'mode-badge', c.badge));
    if (c.id) node.id = c.id;
    node.onclick = c.fn;
    node.onmousemove = (ev) => {
      const r = node.getBoundingClientRect();
      node.style.setProperty('--mx', ((ev.clientX - r.left) / r.width * 100) + '%');
      node.style.setProperty('--my', ((ev.clientY - r.top) / r.height * 100) + '%');
    };
    modes.appendChild(node);
  });
  host.appendChild(modes);

  // 底部设定注记
  const note = el('div', 'page-desc');
  note.style.cssText = 'text-align:center;font-size:11px;color:var(--txt-mut);max-width:700px;margin:0 auto';
  note.innerHTML = `本作改编自「花园」系列设定集。全部卡牌效果、数值与原文引述均取自设定文档，
    层级体系严格遵循：ℵ₀ → 幂集阶梯 → 超限序数 → 阿列夫不动点 → power-admissible → 大基数 →
    集合论宇宙 → 集合论多宇宙 → 万有公理宇宙 → 超视界拓扑网 → 超巨结构·链界 → 『花园』。`;
  host.appendChild(note);
  refreshAcademyCard();
}

/* 刷新首页「序章」卡片的进度徽标 */
function refreshAcademyCard() {
  const node = document.getElementById('academyCard');
  if (!node || typeof ACADEMY_LESSONS === 'undefined') return;
  let done = 0, total = ACADEMY_LESSONS.length;
  try {
    const s = JSON.parse(localStorage.getItem('garden_academy_save') || 'null');
    if (s && Array.isArray(s.cleared)) done = s.cleared.length;
  } catch (e) {}
  let badge = node.querySelector('.mode-badge');
  if (!badge) { badge = el('div', 'mode-badge', ''); node.appendChild(badge); }
  const finished = done >= total;
  badge.textContent = finished ? '已结业' : (done > 0 ? `已修 ${done}/${total} 课` : '新课');
  badge.style.color = finished ? '#fbbf24' : (done > 0 ? '#34d399' : '');
  badge.style.borderColor = finished ? 'rgba(251,191,36,.6)' : (done > 0 ? 'rgba(52,211,153,.55)' : '');
}

function showTierDetail(i) {
  const t = TIERS[i];
  const inTier = CARDS.filter(c => c.tier === i);
  const wrap = el('div');
  wrap.appendChild(el('p', 'page-desc', t.desc));
  const meta = el('div', 'detail-meta');
  const c1 = el('span', 'chip tier', `T${i}`);
  c1.style.setProperty('--tier-color', t.color);
  c1.style.borderColor = t.color; c1.style.color = t.color;
  meta.appendChild(c1);
  meta.appendChild(el('span', 'chip', t.en));
  meta.appendChild(el('span', 'chip', `本层 ${inTier.length} 张卡`));
  wrap.appendChild(meta);
  const grid = el('div', 'codex-grid');
  grid.style.marginTop = '10px';
  inTier.forEach(c => {
    const holder = el('div');
    const node = renderCard(c, { size: 'mini' });
    node.onclick = () => { closeModal(); setTimeout(() => showCardDetail(c), 60); };
    holder.appendChild(node);
    grid.appendChild(holder);
  });
  wrap.appendChild(grid);
  openModal(`${t.symbol} · T${i} ${t.name}`, wrap);
}

/* ============================================================
   牌组选择
   ============================================================ */
function openDeckSelect() {
  const wrap = el('div');
  const g = el('div', 'choice-grid');
  Object.values(DECKS).forEach(d => {
    const c = el('div', 'choice-card');
    c.appendChild(el('div', 'cc-t', d.name + '　<span style="font-size:10px;color:var(--txt-mut)">T' + d.tier + '</span>'));
    c.appendChild(el('div', 'cc-d', d.desc + '<br><b style="color:' + d.color + '">特点：' + d.hint + '</b>'));
    c.onclick = () => { closeModal(); startBattle(d.id); };
    g.appendChild(c);
  });
  // 自定义
  const custom = Builder.load();
  if (custom && custom.length >= 20) {
    const c = el('div', 'choice-card');
    c.appendChild(el('div', 'cc-t', '自定义牌组　<span style="font-size:10px;color:var(--txt-mut)">' + custom.length + ' 张</span>'));
    c.appendChild(el('div', 'cc-d', '你在组牌器中保存的牌组。<br><b style="color:var(--green)">可在「规则与组牌」中修改</b>'));
    c.onclick = () => { closeModal(); startBattle('silver', custom); };
    g.appendChild(c);
  }
  wrap.appendChild(el('p', 'page-desc', '选择你的牌组。对手将从其余牌组中随机选取。'));
  wrap.appendChild(g);
  openModal('开始对战', wrap);
}

let lastBattleOpts = null;
function startBattle(deckId, customDeck) {
  lastBattleOpts = { deckId, customDeck };
  const others = Object.keys(DECKS).filter(k => k !== deckId);
  const foeId = others[Math.floor(Math.random() * others.length)];
  showView('battle');
  Battle.mode = 'ai';
  Battle.start({
    mode: 'ai',
    deck0: deckId,
    customDeck0: customDeck || null,
    name0: '你',
    deck1: foeId,
    name1: DECKS[foeId].name,
    onEnd: (res) => {
      if (res === 'home') { showView('home'); return; }
      startBattle(lastBattleOpts.deckId, lastBattleOpts.customDeck);
    }
  });
}

/* ============================================================
   初始化
   ============================================================ */
function enhanceKeyboardControls(root = document) {
  const nodes = [];
  if (root.matches && root.matches('*')) nodes.push(root);
  if (root.querySelectorAll) nodes.push(...root.querySelectorAll('*'));
  nodes.forEach(node => {
    if (node.dataset.keyboardControl || typeof node.onclick !== 'function') return;
    if (/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(node.tagName)) return;
    node.dataset.keyboardControl = 'true';
    node.setAttribute('role', 'button');
    node.tabIndex = 0;
    if (!node.hasAttribute('aria-label')) {
      const label = (node.title || node.textContent || '').trim().replace(/\s+/g, ' ');
      if (label) node.setAttribute('aria-label', label.slice(0, 120));
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initStardust();
  enhanceKeyboardControls();
  const controlsObserver = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === 1) enhanceKeyboardControls(node);
    }));
  });
  controlsObserver.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('keydown', ev => {
    if (!['Enter', ' '].includes(ev.key) || ev.repeat) return;
    const control = ev.target.closest('[data-keyboard-control="true"]');
    if (!control) return;
    ev.preventDefault();
    control.click();
  });

  document.querySelectorAll('.navtab').forEach(t => {
    t.onclick = () => showView(t.dataset.view);
  });

  // 对战区：点击空白取消选择
  const main = document.querySelector('.arena-main');
  if (main) main.addEventListener('click', () => { if (Battle.sel || Battle.targeting) Battle.cancelAll(); });

  // 英雄（存在度条）作为攻击目标
  document.getElementById('pstatFoe').addEventListener('click', (e) => { e.stopPropagation(); Battle.onHeroClick(1); });
  document.getElementById('pstatMine').addEventListener('click', (e) => { e.stopPropagation(); Battle.onHeroClick(0); });

  // ESC
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      if (document.getElementById('modalMask').classList.contains('on')) closeModal();
      else if (currentView === 'battle') Battle.cancelAll();
    }
  });

  // 启动动效层（内部会包装 showView / Battle 方法）
  if (typeof Motion !== 'undefined' && Motion.init) Motion.init();
  // 教学引导层必须在 Motion 之后注册：
  // 它同样包装 Battle.render，后注册 = 最外层 = 后置代码最后执行，
  // 因此能看到 Motion.fanHand 之后的手牌最终布局，高亮环才不会贴错位置。
  if (typeof Coach !== 'undefined' && Coach.init) Coach.init();

  showView('home');
  // 预热程序化纹理
  setTimeout(() => { CARDS.slice(0, 12).forEach(c => cardArt(c)); }, 100);
});
