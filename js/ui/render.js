/* ============================================================
   渲染层 —— 卡牌 DOM 构建 / 特效 / 背景
   ============================================================ */

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

/* ------------------------------------------------------------
   符号框自适应
   层级符号里有 2^ℵ₀ / ℵ(1,0) / ΩA 这类宽度差异极大的数学记号，
   固定字号会撑破 48px 的符号方框。这里按实际宽度自动降号，
   保证「字数永远不会超过那个框」。
   ------------------------------------------------------------ */
function fitGlyph(node, min) {
  if (!node || !node.parentNode) return;
  node.style.letterSpacing = '';
  node.style.fontSize = '';
  let fs = parseFloat(getComputedStyle(node).fontSize) || 16;
  const floor = min || 6.5;
  let guard = 0;
  while (node.scrollWidth > node.clientWidth + 1 && fs > floor && guard++ < 40) {
    fs = Math.max(floor, fs - 0.5);
    node.style.fontSize = fs.toFixed(2) + 'px';
  }
  if (node.scrollWidth > node.clientWidth + 1) node.style.letterSpacing = '-0.7px';
}
function fitGlyphs(root, sel) {
  const scope = root || document;
  scope.querySelectorAll(sel || '.tn-glyph, .cg-sym, .ls').forEach(n => fitGlyph(n));
}

/* ---------- 效果文本高亮 ---------- */
const HL_WORDS = ['战吼','亡语','嘲讽','锐化','不可指定','丰饶','终焉','延展','封顶','进化','锁定','悖论','归虚','压制','抹除','免疫','搜寻','检视','复制','归虚','锁定'];
function highlightText(t) {
  if (!t) return '';
  let s = String(t).replace(/</g, '&lt;');
  // 关键词着色
  s = s.replace(/(战吼|亡语|嘲讽|锐化|不可指定|丰饶|终焉|延展|封顶|进化|锁定|悖论|归虚|压制|抹除|免疫)/g, '<span class="kw">$1</span>');
  // 数值着色
  s = s.replace(/([+-]?\d+)\s*(张|点|层|\/\+|\/-)/g, '<b>$1</b>$2');
  return s;
}

/* 层级徽章：符号长度差异很大（'κ' 1 字 vs 'ℵ(1,0)' 7 字），
   固定字号会把 25px 的徽章撑破并被卡片圆角裁掉尾部，故按长度分档缩放。 */
function makeTierBadge(tier) {
  const b = el('div', 'tier-badge', tier.symbol);
  const n = tier.symbol.length;
  if (n >= 6) b.classList.add('sym-xl');
  else if (n >= 4) b.classList.add('sym-lg');
  else if (n >= 3) b.classList.add('sym-md');
  b.title = tier.name + '（层级 ' + tier.id + '）';
  return b;
}

/* ---------- 渲染一张静态卡 ---------- */
function renderCard(def, opts = {}) {
  const size = opts.size || 'normal';
  // opts.tier 用于展示「延展」等效果加成后的层级（卡面基础值不变）
  const tierIdx = opts.tier != null ? Math.min(12, opts.tier) : def.tier;
  const tier = TIERS[tierIdx] || TIERS[0];
  const wrap = el('div', 'card ' + (size === 'normal' ? '' : size === 'board' ? 'board-card' : size === 'mini' ? 'mini' : size === 'large' ? 'large' : size === 'huge' ? 'huge' : ''));
  wrap.style.setProperty('--tier-color', tier.color);
  wrap.style.setProperty('--tier-glow', hexToGlow(tier.color));
  if (tierIdx >= 9) wrap.classList.add('hi-tier');
  if (opts.tier != null && opts.tier !== def.tier) wrap.classList.add('tier-boosted');
  wrap.dataset.cardId = def.id;

  const inner = el('div', 'card-inner');
  const frame = el('div', 'card-frame');

  // 插画
  const art = el('div', 'card-art');
  const img = el('img');
  img.src = cardArt(def);
  img.alt = def.name;
  img.loading = 'lazy';
  img.draggable = false;
  art.appendChild(img);
  frame.appendChild(art);

  // 费用 / 层级
  frame.appendChild(el('div', 'cost', String(def.cost)));
  frame.appendChild(makeTierBadge(tier));

  // 名称（小卡会省略号截断，补 title 以便悬停看全名）
  const nb = el('div', 'name-bar');
  const nameNode = el('span', 'card-name', def.name);
  nameNode.title = def.name;
  nb.appendChild(nameNode);
  if (size === 'large' || size === 'huge') nb.appendChild(el('span', 'card-name-en', def.en || ''));
  frame.appendChild(nb);

  // 类型
  frame.appendChild(el('div', 'type-line', TYPE_INFO[def.type].name));

  // 效果文本
  // 关键：text-box 是 flex 容器，若直接把高亮后的 <span class="kw"> 放进去，
  // 每个 span 都会变成独立的 flex 项 —— 不换行、只压到 min-content，
  // 总和会撑破卡面被硬裁切。包一层内联容器即可恢复正常的文本流换行。
  const tb = el('div', 'text-box');
  const tbIn = el('span', 'tb-in');
  tbIn.innerHTML = highlightText(def.text || '');
  tb.appendChild(tbIn);
  frame.appendChild(tb);

  // 关键词标签
  if (def.keywords && def.keywords.length && size !== 'mini') {
    const tags = el('div', 'kw-tags');
    def.keywords.forEach(k => tags.appendChild(el('span', 'kw-tag', k)));
    frame.appendChild(tags);
  }

  // 数值
  const st = el('div', 'stats');
  if (def.type === 'ENTITY') {
    st.appendChild(el('div', 'stat atk', String(def.atk)));
    st.appendChild(el('div', 'stat hp', String(def.hp)));
  } else if (def.type === 'STRUCTURE') {
    st.appendChild(el('div', 'stat only', '耐久 ' + def.hp));
  } else {
    st.appendChild(el('div', 'stat only', def.type === 'PARADOX' ? '悖 论' : '概 念'));
  }
  frame.appendChild(st);

  inner.appendChild(frame);
  wrap.appendChild(inner);
  return wrap;
}

/* ---------- 渲染场上单位（实时数值） ---------- */
function renderUnit(unit, opts = {}) {
  const def = unit.def;
  const tier = TIERS[Math.min(12, unit.tier)] || TIERS[0];
  const wrap = el('div', 'card board-card');
  wrap.style.setProperty('--tier-color', tier.color);
  wrap.style.setProperty('--tier-glow', hexToGlow(tier.color));
  if (unit.tier >= 9) wrap.classList.add('hi-tier');
  wrap.dataset.uid = unit.uid;
  wrap.dataset.cardId = unit.cardId;

  const inner = el('div', 'card-inner');
  const frame = el('div', 'card-frame');

  const art = el('div', 'card-art');
  const img = el('img');
  img.src = cardArt(def); img.alt = def.name; img.draggable = false; img.loading = 'lazy';
  art.appendChild(img);
  frame.appendChild(art);

  frame.appendChild(makeTierBadge(tier));

  const nb = el('div', 'name-bar');
  nb.appendChild(el('span', 'card-name', unit.name));
  frame.appendChild(nb);
  frame.appendChild(el('div', 'type-line', TYPE_INFO[unit.type].name));

  const tb = el('div', 'text-box');
  const tbIn = el('span', 'tb-in');
  tbIn.innerHTML = highlightText(def.text || '');
  tb.appendChild(tbIn);
  frame.appendChild(tb);

  if (unit.keywords && unit.keywords.length) {
    const tags = el('div', 'kw-tags');
    unit.keywords.forEach(k => tags.appendChild(el('span', 'kw-tag', k)));
    frame.appendChild(tags);
  }

  const st = el('div', 'stats');
  if (unit.type === 'ENTITY') {
    const a = el('div', 'stat atk', String(unit.atk));
    const h = el('div', 'stat hp', String(Math.max(0, unit.hp)));
    if (unit.baseAtk != null && unit.atk > unit.baseAtk) a.classList.add('buffed');
    if (unit.hp < unit.maxHp) h.classList.add('hurt');
    st.appendChild(a); st.appendChild(h);
  } else {
    st.appendChild(el('div', 'stat only', String(Math.max(0, unit.hp))));
  }
  frame.appendChild(st);

  inner.appendChild(frame);
  wrap.appendChild(inner);
  return wrap;
}

function hexToGlow(hex) {
  const c = hexToRgb(hex);
  return `rgba(${c.r},${c.g},${c.b},.55)`;
}

/* ---------- 卡背 ---------- */
function renderCardBack(size = '') {
  const wrap = el('div', 'card card-back ' + size);
  const inner = el('div', 'card-inner');
  const frame = el('div', 'card-frame');
  frame.appendChild(el('div', 'glyph', '✿'));
  inner.appendChild(frame);
  wrap.appendChild(inner);
  return wrap;
}

/* ============================================================
   背景星尘
   ============================================================ */
function initStardust() {
  const cv = document.getElementById('stardust');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, stars = [], dust = [];

  function resize() {
    W = cv.width = window.innerWidth;
    H = cv.height = window.innerHeight;
    stars = [];
    const n = Math.floor(W * H / 9000);
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.35 + 0.2,
        a: Math.random() * 0.65 + 0.15,
        sp: Math.random() * 0.22 + 0.04,
        tw: Math.random() * 6.28,
        hue: Math.random() < 0.72 ? '210,226,255' : (Math.random() < 0.5 ? '167,139,250' : '253,224,71')
      });
    }
    dust = [];
    for (let i = 0; i < 26; i++) {
      dust.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 130 + 55,
        a: Math.random() * 0.035 + 0.012,
        vx: (Math.random() - 0.5) * 0.14, vy: (Math.random() - 0.5) * 0.1,
        hue: Math.random() < 0.5 ? '56,189,248' : '167,139,250'
      });
    }
  }
  resize();
  window.addEventListener('resize', resize);

  let t = 0;
  function loop() {
    t += 0.016;
    ctx.clearRect(0, 0, W, H);
    // 星云团
    for (const d of dust) {
      d.x += d.vx; d.y += d.vy;
      if (d.x < -d.r) d.x = W + d.r; if (d.x > W + d.r) d.x = -d.r;
      if (d.y < -d.r) d.y = H + d.r; if (d.y > H + d.r) d.y = -d.r;
      const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
      g.addColorStop(0, `rgba(${d.hue},${d.a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill();
    }
    // 星点
    for (const s of stars) {
      s.y -= s.sp;
      if (s.y < -2) { s.y = H + 2; s.x = Math.random() * W; }
      const tw = 0.62 + Math.sin(t * 1.7 + s.tw) * 0.38;
      ctx.fillStyle = `rgba(${s.hue},${s.a * tw})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
    }
    requestAnimationFrame(loop);
  }
  loop();
}

/* ============================================================
   粒子 / 冲击特效
   ============================================================ */
function spawnParticles(x, y, color, n = 14, spread = 90) {
  for (let i = 0; i < n; i++) {
    const p = el('div', 'fx-particle');
    const s = 3 + Math.random() * 5;
    p.style.width = s + 'px'; p.style.height = s + 'px';
    p.style.left = x + 'px'; p.style.top = y + 'px';
    p.style.background = color;
    p.style.boxShadow = `0 0 ${s * 2.4}px ${color}`;
    const ang = Math.random() * Math.PI * 2;
    const dist = spread * (0.35 + Math.random() * 0.65);
    p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
    p.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
    p.style.animationDuration = (0.6 + Math.random() * 0.5) + 's';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1150);
  }
}

function spawnShockwave(x, y, color = '#fbbf24') {
  const s = el('div', 'shockwave');
  s.style.left = x + 'px'; s.style.top = y + 'px';
  s.style.borderColor = color;
  s.style.boxShadow = `0 0 40px ${color}, inset 0 0 40px ${color}`;
  document.body.appendChild(s);
  setTimeout(() => s.remove(), 820);
}

function flashWhite() {
  const f = el('div', 'flash-white');
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 620);
}

function paradoxFlash() {
  document.body.classList.add('paradox-flash');
  setTimeout(() => document.body.classList.remove('paradox-flash'), 620);
}

function centerOf(node) {
  if (!node) return { x: innerWidth / 2, y: innerHeight / 2 };
  const r = node.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/* ---------- toast ---------- */
function toast(msg, kind = '') {
  const box = document.getElementById('toastBox');
  if (!box) return;
  const t = el('div', 'toast ' + kind, msg);
  box.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity .3s, transform .3s';
    t.style.opacity = '0'; t.style.transform = 'translateY(-10px)';
    setTimeout(() => t.remove(), 320);
  }, 2000);
}

/* ---------- 弹窗 ---------- */
function openModal(title, bodyNode, footNodes) {
  const mask = document.getElementById('modalMask');
  const m = el('div', 'modal');
  const head = el('div', 'modal-head');
  head.appendChild(el('h3', null, title));
  const x = el('button', 'x-close', '×');
  x.onclick = closeModal;
  head.appendChild(x);
  m.appendChild(head);
  const body = el('div', 'modal-body');
  if (typeof bodyNode === 'string') body.innerHTML = bodyNode; else body.appendChild(bodyNode);
  m.appendChild(body);
  if (footNodes && footNodes.length) {
    const foot = el('div', 'modal-foot');
    footNodes.forEach(n => foot.appendChild(n));
    m.appendChild(foot);
  }
  mask.innerHTML = '';
  mask.appendChild(m);
  mask.classList.add('on');
  return m;
}
function closeModal() {
  const mask = document.getElementById('modalMask');
  mask.classList.remove('on');
  mask.innerHTML = '';
}

if (typeof window !== 'undefined') {
  Object.assign(window, {
    el, renderCard, renderUnit, renderCardBack, initStardust,
    spawnParticles, spawnShockwave, flashWhite, paradoxFlash, centerOf, toast, openModal, closeModal, highlightText
  });
}
