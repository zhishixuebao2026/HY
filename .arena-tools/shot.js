/* 截图 + 布局自检（沙箱内部工具，不参与发布构建）
   W/H/TAG/VIEWS/URL 环境变量控制 */
const puppeteer = require('/tmp/pw/node_modules/puppeteer-core');
const fs = require('fs');
const W = +process.env.W || 1440, H = +process.env.H || 900;
const TAG = process.env.TAG || 'd';
const OUT = process.env.OUT || '/tmp/shots';
const VIEWS = (process.env.VIEWS || 'home,academy,tower,codex,rules,builder,battle').split(',');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/tmp/chromium',
    headless: 'shell',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu',
           '--font-render-hinting=none','--force-color-profile=srgb','--lang=zh-CN']
  });
  const page = await browser.newPage();
  const mobile = W < 700;
  await page.setViewport({width: W, height: H, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile});
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('requestfailed', r => errs.push('REQFAIL: ' + r.url() + ' ' + ((r.failure()||{}).errorText||'')));
  await page.goto(process.env.URL || 'http://localhost:8199/index.html', {waitUntil: 'networkidle2', timeout: 30000});
  await new Promise(r => setTimeout(r, 1300));
  fs.mkdirSync(OUT, {recursive: true});
  const shot = async n => { await new Promise(r=>setTimeout(r,650)); await page.screenshot({path:`${OUT}/${TAG}-${n}.png`}); };

  if (VIEWS.includes('home')) await shot('home');
  for (const v of ['academy','tower','codex','rules','builder']) {
    if (!VIEWS.includes(v)) continue;
    await page.evaluate(vv => showView(vv), v);
    await new Promise(r => setTimeout(r, 900));
    await shot(v);
  }
  if (VIEWS.includes('battle')) {
    await page.evaluate(() => {
      showView('battle');
      Battle.mode = 'ai';
      Battle.start({mode:'ai', deck0:'garden', name0:'你', deck1:'grammar', name1:'语法宇宙', onEnd:()=>{}});
      const e = Battle.eng;
      e.player(0).mana = 12; e.player(0).maxMana = 12;
      const mk = (idx, cardId) => {
        const d = CARD_MAP[cardId];
        e.player(idx).board.push({ uid: 'x' + Math.random().toString(36).slice(2,7), cardId, def: d, name: d.name, type: d.type,
          atk: d.atk, hp: d.hp, maxHp: d.hp, tier: d.tier, baseAtk: d.atk, baseHp: d.hp, keywords: (d.keywords||[]).slice(),
          owner: idx, ascendCount: 0, buffs: [], canAttack: idx === 0, justPlayed: false, attacksLeft: 1 });
      };
      mk(1,'007'); mk(1,'014'); mk(1,'029');
      mk(0,'023'); mk(0,'021'); mk(0,'014'); mk(0,'024');
      e.player(0).successorDelta = 5; e.player(1).successorDelta = 2;
      Battle.render();
    });
    await new Promise(r => setTimeout(r, 900));
    await shot('battle-mid');
    // 选一张需要指定目标的手牌，走真正的 targeting 流程，才能拍到目标横幅 + 合法目标高亮
    await page.evaluate(() => {
      const e = Battle.eng;
      const hand = e.player(0).hand;
      const idx = hand.findIndex(id => {
        const d = CARD_MAP[id];
        const eff = (d.effects || []).find(x => x.needTarget);
        return d.needTarget || eff;
      });
      if (idx >= 0) { e.player(0).mana = 12; Battle.render(); Battle.onHandClick(idx); }
      else if (e.player(0).board[0]) { Battle.sel = {kind:'unit', uid: e.player(0).board[0].uid}; Battle.render(); }
    });
    await new Promise(r => setTimeout(r, 600));
    await shot('battle-target');
    await page.evaluate(() => { Battle.cancelAll(); showCardDetail(CARDS[67]); });
    await new Promise(r => setTimeout(r, 700));
    await shot('modal-detail');
    await page.evaluate(() => { closeModal(); openDeckSelect(); });
    await new Promise(r => setTimeout(r, 500));
    await shot('modal-deck');
    await page.evaluate(() => closeModal());
  }

  const audit = await page.evaluate(() => {
    const out = {offscreen: [], clipped: [], tinyTxt: []};
    const vw = innerWidth;
    document.querySelectorAll('#app *, #toastBox *, .modal-mask *').forEach(n => {
      const cs = getComputedStyle(n);
      if (!n.offsetParent && cs.position !== 'fixed') return;
      const r = n.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (cs.visibility === 'hidden' || cs.opacity === '0') return;
      if (r.right > vw + 2 || r.left < -2) out.offscreen.push({c: (n.className||'').toString().slice(0,44), l: Math.round(r.left), r: Math.round(r.right)});
      if (n.scrollWidth > n.clientWidth + 4 && /tb-in|card-name|cb-goal|tn-sub|cc-d|dr-n|ds-line|rc-name|bl-t/.test((n.className||'').toString()))
        out.clipped.push({c: (n.className||'').toString().slice(0,30), sw: n.scrollWidth, cw: n.clientWidth, t: (n.textContent||'').trim().slice(0,24)});
    });
    return out;
  });
  console.log('ERRORS', JSON.stringify(errs));
  console.log('OFFSCREEN', JSON.stringify(audit.offscreen.slice(0, 12)));
  console.log('CLIPPED', JSON.stringify(audit.clipped.slice(0, 12)));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
