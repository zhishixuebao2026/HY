/* ============================================================
   AI 对手 —— 启发式贪心决策
   ============================================================ */

function unitValue(u) {
  if (!u) return 0;
  let v = u.atk * 1.0 + u.hp * 0.85 + u.tier * 2.4;
  const kw = u.keywords || [];
  if (kw.includes('嘲讽')) v += 1.5;
  if (kw.includes('锐化')) v += 3;
  if (kw.includes('不可指定')) v += 2.5;
  if (kw.includes('丰饶')) v += 4;
  if (kw.includes('进化')) v += 3;
  if (u.type === 'STRUCTURE') v += 1.5;
  return v;
}

function boardScore(p) {
  let s = p.existence * 1.6;
  for (const u of p.board) if (u.hp > 0) s += unitValue(u);
  s += p.successorDelta * 2.2;
  s += p.hand.length * 1.1;
  s += p.deck.length * 0.18;
  s += p.maxMana * 0.6;
  return s;
}

function evaluate(eng, myIdx) {
  const me = eng.player(myIdx), foe = eng.player(1 - myIdx);
  return boardScore(me) - boardScore(foe);
}

/* ---------- 枚举所有合法动作 ---------- */
function enumerateActions(eng, myIdx) {
  const s = eng.state;
  const p = eng.player(myIdx), foe = eng.player(1 - myIdx);
  const acts = [];
  const orig = s.current;
  s.current = myIdx;   // 临时切换以便调用 canPlay/canAttack

  // 出牌
  for (let i = 0; i < p.hand.length; i++) {
    if (!eng.canPlay(i)) continue;
    const def = CARD_MAP[p.hand[i]];
    const needEff = (def.effects || []).find(e => e.needTarget);
    const needsTarget = !!def.needTarget || !!needEff;
    if (needsTarget) {
      const filter = def.targetFilter || (needEff && (needEff.targetFilter || needEff.target)) || 'anyUnit';
      const sourceTier = eng.handCardTier(myIdx, i);
      const valid = eng.getValidTargets(filter, myIdx, sourceTier, def);
      for (const targetUid of valid) acts.push({ type: 'play', handIdx: i, targetUid });
    } else {
      acts.push({ type: 'play', handIdx: i, targetUid: null });
    }
  }

  // 攻击
  const taunts = foe.board.filter(u => u.hp > 0 && (u.keywords || []).includes('嘲讽'));
  for (const u of p.board) {
    if (!eng.canAttack(u.uid)) continue;
    if (taunts.length) {
      for (const t of taunts) acts.push({ type: 'attack', uid: u.uid, targetUid: t.uid });
    } else {
      acts.push({ type: 'attack', uid: u.uid, targetUid: 'hero' });
      for (const t of foe.board) {
        if (t.hp > 0 && t.type === 'ENTITY') acts.push({ type: 'attack', uid: u.uid, targetUid: t.uid });
      }
    }
  }

  // 跃迁
  for (const u of p.board) {
    if (eng.canAscend(u.uid)) acts.push({ type: 'ascend', uid: u.uid });
  }

  s.current = orig;
  return acts;
}

/* ---------- 动作即时收益估算 ---------- */
function scoreAction(eng, act, myIdx) {
  const s = eng.state;
  const p = eng.player(myIdx), foe = eng.player(1 - myIdx);
  const jitter = () => (Math.random() - 0.5) * 1.2;

  if (act.type === 'play') {
    const def = CARD_MAP[p.hand[act.handIdx]];
    const cardTier = eng.handCardTier(myIdx, act.handIdx);
    let v = 0;
    if (def.type === 'ENTITY' || def.type === 'STRUCTURE') {
      v += (def.atk || 0) * 1.0 + (def.hp || 0) * 0.85 + cardTier * 2.4;
      if ((def.keywords || []).includes('嘲讽')) v += 1.5;
      if ((def.keywords || []).includes('丰饶')) v += 5;
      if (def.type === 'STRUCTURE') v += 2;
      // 战吼粗略收益
      if ((def.effects || []).some(e => e.when === 'battlecry')) v += 3.5;
      if ((def.effects || []).some(e => e.op === 'destroyTierBelow')) {
        const kills = foe.board.filter(u => u.hp > 0 && u.type === 'ENTITY' && u.tier < def.effects.find(e => e.op === 'destroyTierBelow').n).length;
        v += kills * 4;
      }
    } else {
      v += 4 + cardTier * 0.5;
      if (def.type === 'PARADOX') v += 4;
      const ops = (def.effects || []).map(e => e.op);
      if (ops.includes('annihilateAll')) {
        const enemyVal = foe.board.reduce((a, u) => a + unitValue(u), 0);
        const myVal = p.board.reduce((a, u) => a + unitValue(u), 0);
        v += (enemyVal - myVal) * 0.55;
      }
      if (ops.includes('winIfSuccessorLead')) {
        const need = def.effects.find(e => e.op === 'winIfSuccessorLead').n;
        if (p.successorDelta >= need) v += 100000;
        else v -= 20;
      }
      if (ops.includes('extraTurn')) v += 12;
      if (ops.includes('destroyAllStructures')) {
        const es = foe.board.filter(u => u.type === 'STRUCTURE').length;
        const ms = p.board.filter(u => u.type === 'STRUCTURE').length;
        v += (es - ms) * 4;
      }
      if (ops.includes('millOpponent')) v += foe.deck.length > 8 ? 1 : 6;
    }
    // 目标相关收益
    if (act.targetUid) {
      const t = eng.findUnit(act.targetUid);
      if (t) {
        const op = (def.effects || []).find(e => ['destroyEnemyTierBelow', 'destroyEnemyStructure', 'tierDownEnemy', 'buffAlly', 'tierUpAlly', 'upgradeAlly', 'copyStatsToAlly', 'grantIndestructible'].includes(e.op));
        if (t.owner === myIdx) {
          v += 1;
          if (op && op.op === 'buffAlly') v += 2 + (op.atk || 0) + (op.hp || 0);
          if (op && op.op === 'tierUpAlly') {
            const boost = Math.min(op.bonus || op.n || 1, 3 - t.ascendCount);
            const improvesPress = foe.board.some(enemy => enemy.hp > 0 && t.tier - enemy.tier < eng.pressThreshold(t) && t.tier + boost - enemy.tier >= eng.pressThreshold(t));
            v += 3 + (improvesPress ? 7 : 0);
          }
          if (op && op.op === 'upgradeAlly') v += Math.max(2, unitValue(t) * 0.2);
          if (op && op.op === 'copyStatsToAlly') v += 2;
          if (op && op.op === 'grantIndestructible') v += t.hp <= 3 ? 6 : 2;
        } else {
          if (op && (op.op === 'destroyEnemyTierBelow' || op.op === 'destroyEnemyStructure')) v += unitValue(t) * 0.9;
          if (op && op.op === 'tierDownEnemy') v += t.tier >= 3 ? 5 : 2;
        }
      }
    }
    // 费用效率
    v -= def.cost * 0.35;
    return v + jitter();
  }

  if (act.type === 'attack') {
    const a = eng.findUnit(act.uid);
    if (!a) return -999;
    let v = 0;
    const enemyBoardVal = foe.board.filter(u => u.hp > 0).reduce((s, u) => s + unitValue(u), 0);
    const myBoardVal = p.board.filter(u => u.hp > 0).reduce((s, u) => s + unitValue(u), 0);
    // 场面落后时降低打脸倾向、提高解场倾向，避免无脑抢血
    const behind = enemyBoardVal > myBoardVal * 1.35;

    if (act.targetUid === 'hero') {
      const faceMul = behind ? 0.75 : 1.7;
      v += a.atk * faceMul;
      if (a.atk >= foe.existence) v += 100000;   // 致命
      if (behind) v -= 3;
    } else {
      const d = eng.findUnit(act.targetUid);
      if (!d) return -999;
      const thr = eng.pressThreshold(a);
      if (a.tier - d.tier >= thr) {
        v += unitValue(d) * 1.25 + 6;            // 归虚，无伤
      } else {
        const dealt = Math.min(a.atk, d.hp);
        const ret = d.hp > a.atk ? d.atk : 0;
        v += dealt * 0.95 - ret * 0.85;
        if (d.hp <= a.atk) v += unitValue(d) * (behind ? 0.95 : 0.55);  // 击杀
        if (a.hp <= ret) v -= unitValue(a) * (behind ? 0.45 : 0.6);     // 自己会死
      }
      if ((d.keywords || []).includes('嘲讽')) v += behind ? 3 : 1;
      if (d.atk >= a.hp) v += behind ? 2 : 0;    // 优先处理威胁
    }
    return v + jitter();
  }

  if (act.type === 'ascend') {
    const u = eng.findUnit(act.uid);
    if (!u) return -999;
    // 层级提升的价值：若能让某单位压制对手高价值目标，价值极高
    let v = 5.5 + u.atk * 0.12;
    const thr = eng.pressThreshold(u);
    for (const d of foe.board) {
      if (d.hp > 0 && (u.tier + 1) - d.tier >= thr && u.tier - d.tier < thr) v += unitValue(d) * 0.7 + 4;
    }
    return v + jitter();
  }
  return -999;
}

/* ---------- 执行一个 AI 回合 ---------- */
function runAITurn(eng, myIdx, onStep) {
  const s = eng.state;
  const orig = s.current;
  s.current = myIdx;
  let guard = 0;
  const MAX_STEPS = 40;

  while (guard++ < MAX_STEPS) {
    if (s.winner !== null) break;
    const acts = enumerateActions(eng, myIdx);
    if (acts.length === 0) break;
    let best = null, bestScore = -Infinity;
    for (const a of acts) {
      const sc = scoreAction(eng, a, myIdx);
      if (sc > bestScore) { bestScore = sc; best = a; }
    }
    if (!best || bestScore < -50) break;

    // 执行
    if (best.type === 'play') {
      const def = CARD_MAP[eng.player(myIdx).hand[best.handIdx]];
      let ctx = {};
      if ((def.effects || []).some(e => e.op === 'narrativeChoice')) ctx.narrativeChoice = pickNarrative(eng, myIdx);
      if ((def.effects || []).some(e => e.op === 'transcendentalChoice')) ctx.transcendentalChoice = pickTranscendental(eng, myIdx);
      const scry = (def.effects || []).find(e => e.op === 'scryPick');
      if (scry) ctx.scryPickId = eng.player(myIdx).deck.slice(0, scry.n)
        .sort((a, b) => CARD_MAP[b].cost - CARD_MAP[a].cost)[0];
      const r = eng.playCard(best.handIdx, best.targetUid, ctx);
      if (!r.ok) break;
    } else if (best.type === 'attack') {
      const r = eng.attack(best.uid, best.targetUid);
      if (!r.ok) break;
    } else if (best.type === 'ascend') {
      const r = eng.ascend(best.uid);
      if (!r.ok) break;
    }
    if (onStep) onStep(best);
    if (s.winner !== null) break;
    // 致命一击直接结束
    if (eng.player(1 - myIdx).existence <= 0) break;
  }

  s.current = orig;
  if (s.winner === null && s.current === myIdx) eng.endTurn();
}

function pickNarrative(eng, myIdx) {
  const p = eng.player(myIdx), foe = eng.player(1 - myIdx);
  const bestEnemy = foe.board.filter(u => u.hp > 0 && u.type === 'ENTITY').sort((a, b) => b.atk - a.atk)[0];
  const myEnts = p.board.filter(u => u.hp > 0 && u.type === 'ENTITY');
  if (bestEnemy && bestEnemy.tier >= 3 && bestEnemy.atk >= 7) return 1;
  if (myEnts.length >= 3) return 2;
  return 0;
}

function pickTranscendental(eng, myIdx) {
  const p = eng.player(myIdx), foe = eng.player(1 - myIdx);
  // 选项一只抹除实体，结构会留下；只比较实际受影响的场面价值。
  const enemyVal = foe.board.filter(u => u.type === 'ENTITY' && u.hp > 0).reduce((a, u) => a + unitValue(u), 0);
  const myVal = p.board.filter(u => u.type === 'ENTITY' && u.hp > 0).reduce((a, u) => a + unitValue(u), 0);
  return enemyVal > myVal + 6 ? 0 : 1;
}

if (typeof window !== 'undefined') { window.runAITurn = runAITurn; window.unitValue = unitValue; }
