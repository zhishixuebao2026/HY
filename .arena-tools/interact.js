/* 交互回归：手牌→召唤→攻击→回合结束→AI 回合，另跑教学第 1 课与结算画面 */
const puppeteer = require('/tmp/pw/node_modules/puppeteer-core');
const fs = require('fs');
const OUT = '/tmp/shots';
const TAG = process.env.TAG || 'i';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/tmp/chromium', headless: 'shell',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--font-render-hinting=none','--lang=zh-CN']
  });
  const page = await browser.newPage();
  await page.setViewport({width: +process.env.W || 1440, height: +process.env.H || 900});
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await page.goto(process.env.URL || 'http://localhost:8199/index.html', {waitUntil: 'networkidle2'});
  await new Promise(r => setTimeout(r, 1200));
  fs.mkdirSync(OUT, {recursive: true});
  const shot = async n => { await new Promise(r=>setTimeout(r,600)); await page.screenshot({path:`${OUT}/${TAG}-${n}.png`}); };

  // 1) 构筑对战：点击手牌 → 空槽 → 攻击
  await page.evaluate(() => { showView('battle'); Battle.mode='ai'; Battle.start({mode:'ai',deck0:'silver',name0:'你',deck1:'grammar',name1:'语法宇宙',onEnd:()=>{}}); });
  await new Promise(r => setTimeout(r, 800));
  const playable = await page.evaluate(() => { Battle.eng.player(0).mana = 12; Battle.render(); return [...document.querySelectorAll('#hand .card:not(.unplayable)')].length; });
  console.log('playable hand cards:', playable);
  // 点击第一张可出的牌
  await page.evaluate(() => { document.querySelector('#hand .card:not(.unplayable)').click(); });
  await new Promise(r => setTimeout(r, 300));
  await shot('01-select');
  // 点空槽召唤
  await page.evaluate(() => { const s=document.querySelector("#boardMine .slot-empty"); if(s) s.click(); else document.querySelector("#boardMine").click(); });
  await new Promise(r => setTimeout(r, 500));
  const boardN = await page.evaluate(() => document.querySelectorAll('#boardMine .card').length);
  console.log('board after summon:', boardN);
  await shot('02-summoned');

  // 推进若干回合，让 AI 行动，检查是否卡死
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => { const e = Battle.eng; if (e.state.current === 0 && e.state.winner === null) Battle.endTurn(); });
    await new Promise(r => setTimeout(r, 2200));
  }
  const st = await page.evaluate(() => ({ turn: Battle.eng.state.turn, cur: Battle.eng.state.current, winner: Battle.eng.state.winner,
    boards: [Battle.eng.player(0).board.length, Battle.eng.player(1).board.length],
    hand: [Battle.eng.player(0).hand.length, Battle.eng.player(1).hand.length],
    logs: Battle.eng.log.length }));
  console.log('after turns:', JSON.stringify(st));
  await shot('03-after-turns');

  // 2) 结算画面
  await page.evaluate(() => { const e = Battle.eng; e.player(1).existence = 2; e._damageHero(1, 99, 'test'); Battle.render(); });
  await new Promise(r => setTimeout(r, 800));
  await shot('04-end');
  await page.evaluate(() => document.getElementById('endOverlay').classList.remove('on'));

  // 3) 教学第 1 课
  await page.evaluate(() => { showView('academy'); Academy.state.lesson = 0; Academy.render(); Academy.enterLesson(0); });
  await new Promise(r => setTimeout(r, 700));
  await shot('05-lesson-brief');
  await page.evaluate(() => { document.querySelectorAll('.modal-foot .btn')[0].click(); });
  await new Promise(r => setTimeout(r, 1600));
  await shot('06-lesson-coach');

  // 4) 卡牌详情 / 牌组选择
  await page.evaluate(() => { showView('codex'); Codex.init(); });
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => { document.querySelector('#codexGrid .card').click(); });
  await new Promise(r => setTimeout(r, 700));
  await shot('07-card-detail');

  console.log('ERRORS', JSON.stringify(errs));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
