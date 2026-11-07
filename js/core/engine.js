/* ============================================================
   《花园：超限算力战争》核心规则引擎
   ============================================================ */

const MAX_MANA = 12;
const START_EXISTENCE = 35;
const SUCCESSOR_WIN = 12;      // 后继差达到此值触发碾压胜利
const SUCCESSOR_MIN_LEAD = 2;  // 每回合操作数至少领先 2 次，才开始累积后继差
const SUCCESSOR_CAP_PER_TURN = 3; // 每回合最多累积的后继差
const ASCEND_COST = 2;         // 幂集跃迁消耗
const ASCEND_LIMIT = 3;        // 每张卡的递归上界
const BOARD_LIMIT = 7;
const HAND_LIMIT = 10;
const FATIGUE_BASE = 1;

let _uid = 0;
const nextUid = () => 'u' + (++_uid);

/* ---------- 工具 ---------- */
const shuffle = (arr, rng) => {
  const a = arr.slice();
  const r = rng || Math.random;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const cloneCard = c => JSON.parse(JSON.stringify(c));

/* ============================================================
   单位实例构造
   ============================================================ */
function makeUnit(cardId, owner, overrides = {}) {
  const def = CARD_MAP[cardId];
  if (!def) throw new Error('未知卡牌: ' + cardId);
  const u = {
    uid: nextUid(),
    cardId,
    def,
    owner,
    name: def.name,
    type: def.type,
    baseAtk: def.atk || 0,
    baseHp: def.hp || 0,
    baseTier: def.tier,
    baseCost: def.cost,
    atk: def.atk || 0,
    hp: def.hp || 0,
    maxHp: def.hp || 0,
    tier: def.tier,
    cost: def.cost,
    ascendCount: 0,
    buffs: [],
    canAttack: false,
    justPlayed: true,
    attackedThisTurn: 0,
    indestructibleUntil: 0,
    frozen: false,
    isToken: false,
    keywords: (def.keywords || []).slice()
  };
  Object.assign(u, overrides);
  if (overrides.atk != null) { u.baseAtk = overrides.atk; u.atk = overrides.atk; }
  if (overrides.hp != null) { u.baseHp = overrides.hp; u.hp = overrides.hp; u.maxHp = overrides.hp; }
  if (overrides.tier != null) { u.baseTier = overrides.tier; u.tier = overrides.tier; }
  return u;
}

/* ============================================================
   游戏状态
   ============================================================ */
class GardenEngine {
  constructor(opts = {}) {
    this.rng = opts.rng || Math.random;
    this.onUpdate = opts.onUpdate || (() => {});
    this.log = [];
    this.animQueue = [];
    this.state = null;
  }

  /* ---------- 初始化 ---------- */
  setup(config) {
    this.state = {
      players: [],
      current: 0,
      turn: 0,
      phase: 'main',
      winner: null,
      winReason: '',
      pending: null,
      extraTurnOwner: null,
      damageInverted: false,
      successorPerPlay: { 0: null, 1: null },
      chainLock: { 0: 0, 1: 0 },
      recursionCount: { 0: 0, 1: 0 }
    };
    const p0 = this._makePlayer(0, config.p0);
    const p1 = this._makePlayer(1, config.p1);
    this.state.players = [p0, p1];
    // 起手：后手多抽 1 张，并在其第一个回合额外获得 2 点临时算力，作为后手补偿
    for (let i = 0; i < 4; i++) this._draw(p0);
    for (let i = 0; i < 5; i++) this._draw(p1);
    p1.bonusMana = 2;
    this.recompute();
    return this.state;
  }

  _makePlayer(idx, cfg) {
    const deckDef = DECKS[cfg.deckId] || DECKS.silver;
    const deck = shuffle((cfg.customDeck || deckDef.cardIds).map(id => id), this.rng);
    const p = {
      idx,
      name: cfg.name || deckDef.name,
      deckId: deckDef.id,
      deckColor: deckDef.color,
      existence: cfg.existence || START_EXISTENCE,
      maxExistence: cfg.existence || START_EXISTENCE,
      mana: 0,
      maxMana: 0,
      deck,
      hand: [],
      handTierBonuses: [],
      board: [],
      graveyard: [],
      opsThisTurn: 0,
      successorDelta: 0,
      paradoxUsed: false,
      ascendUsed: false,
      freeAscendUsed: false,
      fatigue: 0,
      firstAttackDone: false,
      opLimit: Infinity,
      bonusMana: 0
    };
    return p;
  }

  get me() { return this.state.players[this.state.current]; }
  get foe() { return this.state.players[1 - this.state.current]; }
  player(i) { return this.state.players[i]; }
  other(i) { return this.state.players[1 - i]; }

  /* ---------- 日志 ---------- */
  addLog(text, kind = 'info') {
    this.log.push({ text, kind, turn: this.state ? this.state.turn : 0 });
    if (this.log.length > 300) this.log.shift();
  }
  fx(type, data) { this.animQueue.push({ type, ...data }); }

  /* ============================================================
     光环 / 静态能力重算
     ============================================================ */
  recompute() {
    if (!this.state) return;
    // 1. 重置到基础值
    for (const p of this.state.players) {
      for (const u of p.board) {
        u.atk = u.baseAtk;
        u.maxHp = u.baseHp;
        u.tier = u.baseTier;
        for (const b of u.buffs) {
          u.atk += b.atk || 0;
          u.maxHp += b.hp || 0;
          u.tier += b.tier || 0;
        }
        u.tier += u.ascendCount;
        if (u.hp > u.maxHp) u.hp = u.maxHp;
      }
    }
    // 2. 应用光环（aura）
    for (const p of this.state.players) {
      for (const src of p.board) {
        if (src.hp <= 0) continue;
        for (const eff of (src.def.effects || [])) {
          if (eff.when !== 'aura') continue;
          this._applyAura(p.idx, src, eff);
        }
      }
    }
    // 3. 夹取
    for (const p of this.state.players) {
      for (const u of p.board) {
        if (u.atk < 0) u.atk = 0;
        if (u.tier < 0) u.tier = 0;
        if (u.tier > 12) u.tier = 12;
      }
    }
  }

  _applyAura(ownerIdx, src, eff) {
    const p = this.player(ownerIdx);
    switch (eff.op) {
      case 'buffAllAllies':
        for (const u of p.board) {
          if (u === src || u.type !== 'ENTITY') continue;
          u.atk += eff.atk || 0;
          u.maxHp += eff.hp || 0;
        }
        break;
      case 'buffEntityCards':
        for (const u of p.board) {
          if (u === src || u.type !== 'ENTITY') continue;
          u.atk += eff.atk || 0;
          u.maxHp += eff.hp || 0;
        }
        break;
      case 'tierUpStructures':
        for (const u of p.board) {
          if (u === src || u.type !== 'STRUCTURE') continue;
          u.tier += eff.n || 1;
        }
        break;
      case 'tierUpAllOwn':
        for (const u of p.board) {
          if (u === src) continue;
          u.tier += eff.n || 1;
        }
        break;
    }
  }

  /* ---------- 静态查询 ---------- */
  hasStatic(ownerIdx, op) {
    return this.player(ownerIdx).board.some(u =>
      u.hp > 0 && (u.def.effects || []).some(e => e.when === 'static' && e.op === op)
    );
  }
  staticValue(ownerIdx, op) {
    let best = null;
    for (const u of this.player(ownerIdx).board) {
      if (u.hp <= 0) continue;
      for (const e of (u.def.effects || [])) {
        if (e.when === 'static' && e.op === op) {
          if (best === null || e.n > best) best = e.n;
        }
      }
    }
    return best;
  }
  unitStatic(unit, op) {
    const e = (unit.def.effects || []).find(x => x.when === 'static' && x.op === op);
    return e ? e.n : null;
  }
  // 「延展」类效果：手牌与牌库中的卡在召唤时统一抬升的层级
  handTierBonus(idx) {
    return this.staticValue(idx, 'handTierBonus') || 0;
  }
  handCardTier(idx, handIdx) {
    const p = this.player(idx), def = CARD_MAP[p.hand[handIdx]];
    if (!def) return 0;
    const personalBonus = Array.isArray(p.handTierBonuses) ? (p.handTierBonuses[handIdx] || 0) : 0;
    return Math.min(12, def.tier + this.handTierBonus(idx) + personalBonus);
  }
  canPlayParadox(idx) {
    const p = this.player(idx);
    if (p.paradoxUsed) return false;
    return this.hasStatic(idx, 'unlockParadox') ||
           p.board.some(u => u.hp > 0 && (u.keywords || []).includes('丰饶'));
  }
  isUntargetable(unit, sourceTier) {
    const n = this.unitStatic(unit, 'untargetableBelow');
    if (n == null) return false;
    return (sourceTier || 0) < n;
  }
  isImmuneTo(unit, sourceTier) {
    const n = this.unitStatic(unit, 'immuneBelow');
    if (n == null) return false;
    return (sourceTier || 0) < n;
  }
  pressThreshold(attacker) {
    const s = this.unitStatic(attacker, 'sharpness');
    return s ? 1 : 2;   // 锐化：只需高出1层
  }

  /* ============================================================
     回合流程
     ============================================================ */
  startTurn() {
    const s = this.state;
    if (s.winner !== null) return;
    s.turn++;
    const p = this.me;
    p.maxMana = Math.min(MAX_MANA, p.maxMana + 1);
    p.mana = Math.min(MAX_MANA, p.maxMana + p.bonusMana);
    if (p.bonusMana > 0) {
      this.addLog(`后手补偿：${p.name} 本回合额外获得 ${p.bonusMana} 点算力`, 'mana');
      p.bonusMana = 0;
    }
    p.opsThisTurn = 0;
    p.paradoxUsed = false;
    p.ascendUsed = false;
    p.freeAscendUsed = false;
    p.firstAttackDone = false;
    p.opLimit = s.chainLock[p.idx] > 0 ? s.chainLock[p.idx] : Infinity;
    s.chainLock[p.idx] = 0;
    s.damageInverted = false;
    s.successorPerPlay[p.idx] = null;
    s.recursionCount[p.idx] = 0;

    for (const u of p.board) {
      u.justPlayed = false;
      u.attackedThisTurn = 0;
      u.canAttack = u.type === 'ENTITY' && !u.frozen;
      u.frozen = false;
    }
    this.addLog(`—— 第 ${s.turn} 回合 · ${p.name} ——`, 'turn');
    this._triggerAll('startOfTurn', p.idx);
    this._draw(p);
    this.recompute();
    this.onUpdate();
  }

  endTurn() {
    const s = this.state;
    if (s.winner !== null) return;
    const p = this.me;
    this._triggerAll('endOfTurn', p.idx);
    // 本回合专属增益在结束阶段的触发效果结算后移除，避免跨回合残留。
    for (const u of p.board) u.buffs = u.buffs.filter(buff => !buff.untilTurnEnd);
    this.recompute();
    this._cleanupDeaths();
    if (s.winner !== null) { this.onUpdate(); return; }

    // 后继差结算
    const foe = this.foe;
    this._settleSuccessors(p.opsThisTurn, foe.opsThisTurn);
    if (s.winner !== null) { this.onUpdate(); return; }

    // 切换玩家
    if (s.extraTurnOwner !== null) {
      s.current = s.extraTurnOwner;
      s.extraTurnOwner = null;
    } else {
      s.current = 1 - s.current;
    }
    this.startTurn();
  }

  _settleSuccessors(myOps, foeOps) {
    const s = this.state;
    const p = this.me, foe = this.foe;
    // 只有「显著压制」才累积后继：领先 2 次操作起算，每回合最多 +3
    // 对应原文「哪怕最终只多出一次，胜负便已能分晓」——但一次必须是压倒性的
    if (myOps - foeOps >= SUCCESSOR_MIN_LEAD) {
      const gain = Math.min(SUCCESSOR_CAP_PER_TURN, myOps - foeOps - (SUCCESSOR_MIN_LEAD - 1));
      p.successorDelta += gain;
      this.addLog(`后继差 +${gain} → ${p.name} 累积 ${p.successorDelta}（操作 ${myOps} : ${foeOps}）`, 'successor');
      if (p.successorDelta >= SUCCESSOR_WIN) {
        this._win(p.idx, `后继碾压 —— 累积后继差达到 ${SUCCESSOR_WIN}，操作后继完全压制对手`);
        return;
      }
    } else if (foeOps - myOps >= SUCCESSOR_MIN_LEAD) {
      const gain = Math.min(SUCCESSOR_CAP_PER_TURN, foeOps - myOps - (SUCCESSOR_MIN_LEAD - 1));
      foe.successorDelta += gain;
      this.addLog(`后继差 +${gain} → ${foe.name} 累积 ${foe.successorDelta}（操作 ${foeOps} : ${myOps}）`, 'successor');
      if (foe.successorDelta >= SUCCESSOR_WIN) {
        this._win(foe.idx, `后继碾压 —— 累积后继差达到 ${SUCCESSOR_WIN}，操作后继完全压制对手`);
        return;
      }
    } else {
      this.addLog(`后继持平（操作 ${myOps} : ${foeOps}），无累积`, 'info');
    }
    this.fx('successor', { p0: this.player(0).successorDelta, p1: this.player(1).successorDelta });
  }

  /* ============================================================
     抽牌
     ============================================================ */
  _draw(p, n = 1) {
    for (let i = 0; i < n; i++) {
      if (this.state.winner !== null) return;
      if (p.deck.length === 0) {
        p.fatigue++;
        const dmg = FATIGUE_BASE + p.fatigue - 1;
        p.existence -= dmg;
        this.addLog(`${p.name} 牌库耗尽，受到 ${dmg} 点归虚伤害`, 'damage');
        if (p.existence <= 0) this._win(1 - p.idx, `${p.name} 的存在度被牌库枯竭磨灭`);
        continue;
      }
      if (p.hand.length >= HAND_LIMIT) {
        this.addLog(`${p.name} 手牌已满，${p.deck[0]} 被烧掉`, 'info');
        p.deck.shift();
        continue;
      }
      p.hand.push(p.deck.shift());
      p.handTierBonuses.push(0);
    }
  }

  /* ============================================================
     出牌
     ============================================================ */
  targetSpec(def) {
    const effects = def.effects || [];
    const effect = effects.find(candidate => candidate.needTarget) || effects.find(candidate =>
      ['tierUpAlly', 'buffAlly', 'upgradeAlly', 'destroyEnemyTierBelow', 'grantIndestructible', 'copyStatsToAlly', 'tierDownEnemy', 'destroyEnemyStructure'].includes(candidate.op)
    );
    if (!def.needTarget && !effect) return null;
    return {
      effect,
      filter: def.targetFilter || (effect && (effect.targetFilter || effect.target)) || 'anyUnit'
    };
  }

  canPlay(handIdx) {
    const s = this.state, p = this.me;
    if (s.winner !== null) return false;
    const cardId = p.hand[handIdx];
    if (!cardId) return false;
    const def = CARD_MAP[cardId];
    if (p.opsThisTurn >= p.opLimit) return false;
    if (def.type === 'PARADOX' && !this.canPlayParadox(p.idx)) return false;
    let cost = this.effectiveCost(def, p);
    if (p.mana < cost) return false;
    if (def.type === 'ENTITY' || def.type === 'STRUCTURE') {
      if (p.board.length >= BOARD_LIMIT) return false;
    }
    const target = this.targetSpec(def);
    if (target) {
      const sourceTier = this.handCardTier(p.idx, handIdx);
      if (!this.getValidTargets(target.filter, p.idx, sourceTier, def).length) return false;
    }
    return true;
  }

  effectiveCost(def, p) {
    let c = def.cost;
    if (p._discount && p._discount > 0) { c = Math.max(0, c - p._discount); }
    return c;
  }

  playCard(handIdx, targetUid = null, extraCtx = {}) {
    const s = this.state, p = this.me;
    if (!this.canPlay(handIdx)) return { ok: false };
    const cardId = p.hand[handIdx];
    const def = CARD_MAP[cardId];

    const target = this.targetSpec(def);
    const sourceTier = this.handCardTier(p.idx, handIdx);
    if (target) {
      const valid = this.getValidTargets(target.filter, p.idx, sourceTier, def);
      if (!valid.length) return { ok: false, needTarget: true, noTargets: true, filter: target.filter, valid };
      if (targetUid == null) {
        if (valid.length > 1) {
          s.pending = { kind: 'play', handIdx, cardId, filter: target.filter };
          return { ok: false, needTarget: true, filter: target.filter, valid };
        }
        targetUid = valid[0];
      } else if (!valid.includes(targetUid)) {
        return { ok: false, needTarget: true, invalidTarget: true, filter: target.filter, valid };
      }
    }

    p.hand.splice(handIdx, 1);
    if (Array.isArray(p.handTierBonuses)) p.handTierBonuses.splice(handIdx, 1);
    const cost = this.effectiveCost(def, p);
    p.mana -= cost;
    p.opsThisTurn++;
    if (p._discount) p._discount = 0;
    this.addLog(`${p.name} 打出【${def.name}】（${cost} Ψ）`, 'play');

    if (def.type === 'ENTITY' || def.type === 'STRUCTURE') {
      const u = makeUnit(cardId, p.idx);
      // L 的实体卡加成（手牌/牌库侧）
      if (p.board.some(x => x.hp > 0 && x.cardId === '034') && def.type === 'ENTITY') {
        u.baseAtk += 1; u.baseHp += 1; u.atk += 1; u.hp += 1; u.maxHp += 1;
      }
      // 延展：手牌 / 牌库侧抬升，入场即生效（故也写回 baseTier，避免被 recompute 抹掉）
      const tierBonus = sourceTier - def.tier;
      if (tierBonus > 0) {
        u.baseTier = sourceTier; u.tier = sourceTier;
        this.addLog(`层级加成：【${def.name}】入场时层级 +${tierBonus}（当前 ${u.tier}）`, 'buff');
      }
      p.board.push(u);
      this.recompute();
      this.fx('summon', { uid: u.uid, owner: p.idx });
      if (def.type === 'STRUCTURE') this._triggerAll('onPlayStructure', p.idx, u);
      this._runEffects(u, 'battlecry', Object.assign({ targetUid }, extraCtx));
    } else {
      // CONCEPT / PARADOX
        if (def.type === 'PARADOX') p.paradoxUsed = true;
      const temp = makeUnit(cardId, p.idx);
      temp.baseTier = sourceTier; temp.tier = sourceTier;
      temp.uid = '_cast_' + nextUid();
      this._runEffects(temp, 'cast', Object.assign({ targetUid }, extraCtx));
      p.graveyard.push(cardId);
      this.fx('spell', { cardId, owner: p.idx });
    }

    // 超限时间推演：每打一张牌后继+1
    const spp = s.successorPerPlay[p.idx];
    if (spp && spp.left > 0) {
      spp.left--;
      p.successorDelta += spp.n;
      this.addLog(`超限时间推演：后继 +${spp.n}（剩余 ${spp.left}）`, 'successor');
      if (p.successorDelta >= SUCCESSOR_WIN) this._win(p.idx, `后继碾压 —— 累积后继差达到 ${SUCCESSOR_WIN}`);
    }

    this.recompute();
    this._cleanupDeaths();
    this.onUpdate();
    return { ok: true };
  }

  /* ---------- 目标选择 ---------- */
  getValidTargets(filter, myIdx, sourceTier = 99, cardDef = null) {
    const out = [];
    const mine = this.player(myIdx), foes = this.player(1 - myIdx);
    const effect = cardDef ? this.targetSpec(cardDef)?.effect : null;
    const canResolve = u => {
      if (!effect) return true;
      switch (effect.op) {
        case 'tierUpAlly': {
          const top = !mine.board.some(other => other !== u && other.type === 'ENTITY' && other.hp > 0 && other.tier > u.tier);
          const amount = (top && effect.bonus) ? effect.bonus : effect.n;
          return u.tier < 12 && u.ascendCount + amount <= ASCEND_LIMIT;
        }
        case 'upgradeAlly':
          return mine.deck.some(id => CARD_MAP[id].type === 'ENTITY' && CARD_MAP[id].cost >= u.cost + effect.n);
        case 'copyStatsToAlly':
          return mine.board.some(other => other !== u && other.type === 'ENTITY' && other.hp > 0);
        case 'destroyEnemyTierBelow':
          return u.tier < effect.n && !this.isImmuneTo(u, sourceTier);
        case 'tierDownEnemy':
          return !this.isImmuneTo(u, sourceTier);
        default:
          return true;
      }
    };
    const push = (u) => {
      if (u.hp <= 0 || this.isUntargetable(u, sourceTier) || !canResolve(u)) return;
      out.push(u.uid);
    };
    switch (filter) {
      case 'allyEntity': mine.board.filter(u => u.type === 'ENTITY').forEach(push); break;
      case 'allyUnit': mine.board.forEach(push); break;
      case 'enemyEntity': foes.board.filter(u => u.type === 'ENTITY').forEach(push); break;
      case 'enemyStructure': foes.board.filter(u => u.type === 'STRUCTURE').forEach(push); break;
      case 'enemyUnit': foes.board.forEach(push); break;
      case 'anyUnit': mine.board.concat(foes.board).forEach(push); break;
      default: mine.board.concat(foes.board).forEach(push); break;
    }
    return out;
  }

  /* ============================================================
     效果执行
     ============================================================ */
  _runEffects(unit, when, ctx = {}) {
    const def = unit.def;
    if (!def || !def.effects) return;
    for (const eff of def.effects) {
      if (eff.when !== when) continue;
      this._execEffect(unit, eff, ctx);
      if (this.state.winner !== null) return;
    }
  }

  _triggerAll(when, playerIdx, extraUnit = null) {
    const p = this.player(playerIdx);
    const list = p.board.slice();
    for (const u of list) {
      if (u.hp <= 0) continue;
      this._runEffects(u, when, { extraUnit });
      if (this.state.winner !== null) return;
    }
  }

  _execEffect(src, eff, ctx) {
    const s = this.state;
    const p = this.player(src.owner);
    const foe = this.other(src.owner);
    const tgtUid = ctx.targetUid;
    let target = tgtUid ? this.findUnit(tgtUid) : null;

    switch (eff.op) {
      /* ---- 延展：己方场上已有单位永久抬升层级 ---- */
      case 'extendAll': {
        const n = eff.n || 1;
        let hit = 0;
        for (const u of p.board) {
          if (u === src || u.hp <= 0) continue;   // 自身不参与，与 tierUpAllOwn 光环口径一致
          u.baseTier += n; u.tier += n;
          hit++;
        }
        if (hit) this.addLog(`延展：己方 ${hit} 个单位层级 +${n}`, 'buff');
        break;
      }

      /* ---- 抽牌 / 资源 ---- */
      case 'draw':
        this._draw(p, eff.n);
        this.addLog(`${p.name} 抽 ${eff.n} 张牌`, 'draw');
        break;
      case 'discard':
        for (let i = 0; i < eff.n && p.hand.length; i++) {
          const idx = Math.floor(this.rng() * p.hand.length);
          const c = p.hand.splice(idx, 1)[0];
          p.handTierBonuses.splice(idx, 1);
          p.graveyard.push(c);
          this.addLog(`${p.name} 弃掉【${CARD_MAP[c].name}】`, 'info');
        }
        break;
      case 'discardDraw': {
        for (let i = 0; i < eff.discard && p.hand.length; i++) {
          const idx = Math.floor(this.rng() * p.hand.length);
          p.graveyard.push(p.hand.splice(idx, 1)[0]);
          p.handTierBonuses.splice(idx, 1);
        }
        this._draw(p, eff.draw);
        this.addLog(`${p.name} 弃 ${eff.discard} 抽 ${eff.draw}`, 'draw');
        break;
      }
      case 'gainMana':
        p.mana += eff.n;
        this.addLog(`${p.name} 获得 ${eff.n} 点算力`, 'mana');
        break;
      case 'discountNext':
        p._discount = (p._discount || 0) + eff.n;
        this.addLog(`${p.name} 的下一张牌费用 -${eff.n}`, 'info');
        break;

      /* ---- 后继 ---- */
      case 'successor':
        p.successorDelta += eff.n;
        this.addLog(`${p.name} 后继 +${eff.n} → 累积 ${p.successorDelta}`, 'successor');
        if (p.successorDelta >= SUCCESSOR_WIN) this._win(p.idx, `后继碾压 —— 累积后继差达到 ${SUCCESSOR_WIN}`);
        break;
      case 'successorPerPlay':
        s.successorPerPlay[p.idx] = { left: eff.cap, n: eff.n };
        this.addLog(`${p.name} 激活超限时间推演：本回合每张牌后继 +${eff.n}（最多 ${eff.cap} 次）`, 'successor');
        break;

      /* ---- 增益 ---- */
      case 'buffSelf':
        src.buffs.push({ atk: eff.atk || 0, hp: eff.hp || 0 });
        src.atk += eff.atk || 0; src.maxHp += eff.hp || 0; src.hp += eff.hp || 0;
        this.addLog(`【${src.name}】获得 +${eff.atk}/+${eff.hp}`, 'buff');
        break;
      case 'buffSelfPerStructure': {
        const n = p.board.filter(u => u.type === 'STRUCTURE' && u !== src && u.hp > 0).length;
        src.buffs.push({ atk: (eff.atk || 0) * n, hp: (eff.hp || 0) * n });
        src.atk += (eff.atk || 0) * n; src.maxHp += (eff.hp || 0) * n; src.hp += (eff.hp || 0) * n;
        this.addLog(`【${src.name}】因 ${n} 个结构获得 +${n}/+${n}`, 'buff');
        break;
      }
      case 'buffAlly':
        if (target) {
          target.buffs.push({ atk: eff.atk || 0, hp: eff.hp || 0 });
          target.atk += eff.atk || 0; target.maxHp += eff.hp || 0; target.hp += eff.hp || 0;
          this.addLog(`【${target.name}】获得 +${eff.atk}/+${eff.hp}`, 'buff');
        }
        break;
      case 'copyStatsToAlly': {
        const srcU = target;
        if (srcU) {
          // 取己方最高攻实体作为模板
          const best = p.board.filter(u => u !== srcU && u.type === 'ENTITY' && u.hp > 0)
                             .sort((a, b) => b.atk - a.atk)[0];
          if (best) {
            srcU.buffs.push({ atk: best.atk - srcU.atk, hp: 0, tier: best.tier - srcU.tier });
            this.recompute();
            this.addLog(`初等嵌入：将【${best.name}】的攻击力复制到【${srcU.name}】`, 'buff');
          }
        }
        break;
      }

      /* ---- 层级 ---- */
      case 'tierUpAlly': {
        if (target) {
          const isTop = !p.board.some(u => u !== target && u.type === 'ENTITY' && u.hp > 0 && u.tier > target.tier);
          const n = (isTop && eff.bonus) ? eff.bonus : eff.n;
          if (target.ascendCount + n > ASCEND_LIMIT) {
            this.addLog(`【${target.name}】已达递归上界，无法继续跃迁`, 'info');
          } else {
            target.ascendCount += n;
            this.addLog(`【${target.name}】层级 +${n} → 层级 ${target.tier + n}`, 'tier');
            this.fx('ascend', { uid: target.uid });
          }
        }
        break;
      }
      case 'tierUpLeftmost': {
        const e = p.board.find(u => u.type === 'ENTITY' && u.hp > 0);
        if (e) {
          if (e.ascendCount >= eff.limit) { this.addLog(`【${e.name}】已达递归上界`, 'info'); }
          else { e.ascendCount += eff.n; this.addLog(`【${e.name}】层级 +${eff.n} → ${e.tier + eff.n}`, 'tier'); this.fx('ascend', { uid: e.uid }); }
        }
        break;
      }
      case 'buffHighestTier': {
        const e = p.board.filter(u => u.type === 'ENTITY' && u.hp > 0).sort((a, b) => b.tier - a.tier)[0];
        if (e) { e.buffs.push({ atk: eff.atk, hp: eff.hp }); this.addLog(`【${e.name}】获得 +${eff.atk}/+${eff.hp}`, 'buff'); }
        break;
      }
      case 'tempTierUpAll':
        for (const u of p.board) { if (u.type === 'ENTITY' && u.hp > 0) u.buffs.push({ tier: eff.n, untilTurnEnd: true }); }
        this.addLog(`${p.name} 的全部实体本回合层级视为 +${eff.n}`, 'tier');
        break;
      case 'tierDownEnemy':
        if (target && !this.isImmuneTo(target, src.tier)) {
          target.buffs.push({ tier: -(eff.n) });
          this.addLog(`【${target.name}】层级 -${eff.n}`, 'tier');
        }
        break;
      case 'tierDownAll':
        for (const pl of s.players) for (const u of pl.board) {
          if (u.type === 'ENTITY' && u.hp > 0) u.buffs.push({ tier: -(eff.n) });
        }
        this.addLog(`战场所有实体层级 -${eff.n}`, 'tier');
        break;

      /* ---- 消灭 ---- */
      case 'destroyTierBelow':
        for (const pl of s.players) {
          for (const u of pl.board.slice()) {
            if (u.hp > 0 && u.type === 'ENTITY' && u.tier < eff.n) this._destroy(u, false, '效果');
          }
        }
        break;
      case 'destroyEnemyTierBelow':
        if (target && target.tier < eff.n) this._destroy(target, true, '压制');
        break;
      case 'destroyAllStructures':
        for (const pl of s.players) for (const u of pl.board.slice()) {
          if (u.hp > 0 && u.type === 'STRUCTURE') this._destroy(u, true, '悖论');
        }
        break;
      case 'destroyEnemyStructure': {
        // 若有目标则用目标，否则自动选第一个
        let t = target;
        if (!t) t = foe.board.find(u => u.type === 'STRUCTURE' && u.hp > 0);
        if (t) this._destroy(t, true, '战吼');
        break;
      }
      case 'destroyRandomEnemy': {
        const es = foe.board.filter(u => u.hp > 0 && u.type === 'ENTITY');
        if (es.length) this._destroy(es[Math.floor(this.rng() * es.length)], false, '亡语');
        break;
      }
      case 'annihilateEnemyStructures': {
        const list = foe.board.filter(u => u.hp > 0 && u.type === 'STRUCTURE');
        for (const u of list.slice()) this._destroy(u, true, '抹除');
        if (list.length) {
          src.buffs.push({ atk: (eff.atk || 0) * list.length, hp: (eff.hp || 0) * list.length });
          this.addLog(`【${src.name}】因抹除 ${list.length} 个结构获得 +${(eff.atk||0)*list.length}/+${(eff.hp||0)*list.length}`, 'buff');
        }
        break;
      }
      case 'annihilateAll':
        for (const pl of s.players) for (const u of pl.board.slice()) if (u.hp > 0) this._destroy(u, true, '超验矩');
        break;

      /* ---- 群体削弱 ---- */
      case 'debuffAllOthers':
        for (const pl of s.players) for (const u of pl.board) {
          if (u === src || u.type !== 'ENTITY' || u.hp <= 0) continue;
          u.buffs.push({ atk: -(eff.atk || 0), hp: -(eff.hp || 0) });
          u.atk = Math.max(0, u.atk - (eff.atk || 0));
          u.maxHp = Math.max(1, u.maxHp - (eff.hp || 0));
          u.hp = Math.min(u.hp, u.maxHp);
        }
        this.addLog(`战场所有其他实体 -${eff.atk}/-${eff.hp}`, 'debuff');
        break;

      /* ---- 特殊 ---- */
      case 'revealDiscardEven': {
        if (foe.hand.length) {
          const i = Math.floor(this.rng() * foe.hand.length);
          const cid = foe.hand[i];
          const d = CARD_MAP[cid];
          if (d && d.tier % 2 === 0) {
            foe.hand.splice(i, 1);
            foe.handTierBonuses.splice(i, 1);
            foe.graveyard.push(cid);
            this.addLog(`康托尔对角线命中：弃掉对手的【${d.name}】（层级 ${d.tier}）`, 'debuff');
          } else {
            this.addLog(`康托尔对角线：对手的【${d ? d.name : '?'}】层级为奇数，免疫`, 'info');
          }
        }
        break;
      }
      case 'addCardToHand':
        if (p.hand.length < HAND_LIMIT) {
          p.hand.push(eff.cardId);
          p.handTierBonuses.push(0);
          this.addLog(`${p.name} 将【${CARD_MAP[eff.cardId].name}】置入手牌`, 'draw');
        }
        break;
      case 'scryPick': {
        const n = Math.min(eff.n, p.deck.length);
        if (n === 0) break;
        const cands = p.deck.splice(0, n);
        // 玩家可指定检视结果；AI / 未传选择时采用最高费用的稳定默认策略。
        let pickIdx = ctx.scryPickId ? cands.indexOf(ctx.scryPickId) : -1;
        if (pickIdx < 0) {
          pickIdx = 0;
          for (let i = 1; i < cands.length; i++) {
            if (CARD_MAP[cands[i]].cost > CARD_MAP[cands[pickIdx]].cost) pickIdx = i;
          }
        }
        const pick = cands.splice(pickIdx, 1)[0];
        if (p.hand.length < HAND_LIMIT) {
          p.hand.push(pick);
          p.handTierBonuses.push(0);
        } else {
          p.deck.push(pick);
        }
        p.deck = shuffle(p.deck.concat(cands), this.rng);
        this.addLog(`可测基数检视 ${n} 张，取走【${CARD_MAP[pick].name}】`, 'draw');
        break;
      }
      case 'tutorStructure': {
        const i = p.deck.findIndex(c => CARD_MAP[c].type === 'STRUCTURE');
        if (i >= 0 && p.hand.length < HAND_LIMIT) {
          const c = p.deck.splice(i, 1)[0];
          p.hand.push(c);
          p.handTierBonuses.push(0);
          this.addLog(`理论世界搜寻到【${CARD_MAP[c].name}】`, 'draw');
        }
        break;
      }
      case 'copyHighestHandCard': {
        if (!p.hand.length || p.hand.length >= HAND_LIMIT) break;
        let bestIdx = 0;
        for (let i = 1; i < p.hand.length; i++) {
          if (this.handCardTier(p.idx, i) > this.handCardTier(p.idx, bestIdx)) bestIdx = i;
        }
        const best = p.hand[bestIdx];
        p.hand.push(best);
        p.handTierBonuses.push(p.handTierBonuses[bestIdx] || 0);
        this.addLog(`镜像宇宙复制了【${CARD_MAP[best].name}】`, 'draw');
        break;
      }
      case 'summonSelfTierDown': {
        const t = makeUnit(src.cardId, p.idx, { tier: Math.max(0, src.tier - eff.n) });
        t.baseTier = Math.max(0, src.baseTier - eff.n);
        t.ascendCount = 0;
        if (p.board.length < BOARD_LIMIT) { p.board.push(t); this.addLog(`【${t.name}】以层级 -${eff.n} 的形态回归`, 'summon'); }
        break;
      }
      case 'summonToken': {
        if (p.board.length < BOARD_LIMIT) {
          const t = makeUnit(src.cardId, p.idx, { atk: eff.atk, hp: eff.hp, tier: eff.tier, isToken: true });
          t.name = eff.tokenName; t.baseTier = eff.tier;
          p.board.push(t);
          this.addLog(`【${eff.tokenName}】进入战场`, 'summon');
        }
        break;
      }
      case 'ifControlL': {
        if (p.board.some(u => u.hp > 0 && u.cardId === '034')) {
          this._draw(p, eff.draw || 1);
          const e = p.board.filter(u => u.type === 'ENTITY' && u.hp > 0).sort((a, b) => b.atk - a.atk)[0];
          if (e) { e.buffs.push({ atk: eff.atk || 0, hp: eff.hp || 0 }); this.addLog(`【${e.name}】获得 +${eff.atk}/+${eff.hp}`, 'buff'); }
        }
        break;
      }
      case 'itmDraw': {
        if (!p.deck.length) { this._draw(p, 1); break; }
        const c = p.deck.shift();
        if (p.hand.length < HAND_LIMIT) {
          const drawnDef = CARD_MAP[c];
          const baseTier = Math.min(12, drawnDef.tier + this.handTierBonus(p.idx));
          const tierBonus = drawnDef.type === 'ENTITY' ? Math.max(0, Math.min(1, 12 - baseTier)) : 0;
          p.hand.push(c);
          p.handTierBonuses.push(tierBonus);
          this.addLog(`无限时间图灵机推演出【${CARD_MAP[c].name}】${tierBonus ? '（层级 +1）' : ''}`, 'draw');
        } else {
          this.addLog(`手牌已满：无限时间图灵机推演出的【${CARD_MAP[c].name}】被烧掉`, 'info');
        }
        break;
      }
      case 'upgradeAlly': {
        if (!target) break;
        const cands = p.deck.filter(c => CARD_MAP[c].type === 'ENTITY' && CARD_MAP[c].cost >= target.cost + eff.n);
        if (cands.length) {
          const pick = cands[Math.floor(this.rng() * cands.length)];
          p.deck.splice(p.deck.indexOf(pick), 1);
          const nu = makeUnit(pick, p.idx);
          p.board[p.board.indexOf(target)] = nu;
          p.graveyard.push(target.cardId);
          this.addLog(`替代公理：【${target.name}】被替换为【${nu.name}】`, 'summon');
        } else {
          this.addLog('替代公理：牌库中没有更强的实体', 'info');
        }
        break;
      }
      case 'grantIndestructible':
        if (target) { target.indestructibleUntil = s.turn; this.addLog(`【${target.name}】本回合无法被消灭`, 'buff'); }
        break;
      case 'invertDamage':
        s.damageInverted = true;
        this.addLog('0=1：本回合伤害与治疗完全倒置！', 'paradox');
        this.fx('paradox', {});
        break;
      case 'drawPerSuccessor': {
        const n = Math.min(eff.cap, p.successorDelta);
        if (n > 0) { this._draw(p, n); this.addLog(`over-万有公理宇宙：按后继数抽 ${n} 张牌`, 'draw'); }
        else this.addLog('over-万有公理宇宙：后继数为 0，无事发生', 'info');
        break;
      }
      case 'swapEnemyStats':
        for (const u of foe.board) {
          if (u.hp <= 0 || u.type !== 'ENTITY') continue;
          const a = u.atk, h = u.maxHp;
          u.buffs.push({ atk: h - a, hp: a - h });
          const na = u.atk; u.atk = u.maxHp; u.maxHp = na; u.hp = Math.min(u.hp, u.maxHp);
        }
        this.addLog('anti-超视界拓扑网：敌方所有实体攻防互换', 'paradox');
        break;
      case 'extraTurn':
        s.extraTurnOwner = p.idx;
        this.addLog('over-超视界拓扑网：获得一个额外的回合！', 'paradox');
        this.fx('paradox', {});
        break;
      case 'lockOpponent':
        s.chainLock[1 - p.idx] = eff.n;
        this.addLog(`链界：对手下回合只能执行 ${eff.n} 次操作`, 'debuff');
        break;
      case 'millOpponent': {
        const n = Math.min(eff.n, foe.deck.length);
        for (let i = 0; i < n; i++) foe.deck.shift();
        this.addLog(`transcend-超巨网络：对手牌库顶 ${n} 张被归虚`, 'debuff');
        break;
      }
      case 'damageBothHeroes': {
        if (s.damageInverted) {
          for (const pl of s.players) this._damageHero(pl.idx, eff.n, '超验矩');
          break;
        }
        for (const pl of s.players) {
          pl.existence -= eff.n;
          this.addLog(`超验矩使 ${pl.name} 的存在度 -${eff.n}（剩余 ${Math.max(0, pl.existence)}）`, 'damage');
          this.fx('heroDamage', { idx: pl.idx, amount: eff.n });
        }
        const fallen = s.players.map(pl => pl.existence <= 0);
        if (fallen[0] && fallen[1]) {
          this._win('draw', `超验矩同时抹除了双方存在度，战局归于平局`);
        } else if (fallen[0]) {
          this._win(1, `${s.players[0].name} 的存在度被超验矩抹除`);
        } else if (fallen[1]) {
          this._win(0, `${s.players[1].name} 的存在度被超验矩抹除`);
        }
        break;
      }
      case 'winIfSuccessorLead':
        if (p.successorDelta >= eff.n) {
          this._win(p.idx, `『花园』最终丰饶 —— 后继差 ${p.successorDelta} ≥ ${eff.n}，花园为自身呈现了最终丰饶`);
        } else {
          this.addLog(`『花园』最终丰饶：后继差 ${p.successorDelta} < ${eff.n}，此卡完全失效`, 'info');
        }
        break;
      /* ---- 多选一（对战中弹窗，AI 自动选择） ---- */
      case 'narrativeChoice': {
        const choice = ctx.narrativeChoice != null ? ctx.narrativeChoice : 0;
        if (choice === 0) { this._draw(p, 2); this.addLog('叙事：抽 2 张牌', 'draw'); }
        else if (choice === 1) {
          const e = foe.board.filter(u => u.type === 'ENTITY' && u.hp > 0).sort((a, b) => b.atk - a.atk)[0];
          if (e) { e.buffs.push({ tier: -3 }); this.addLog(`叙事：【${e.name}】层级 -3`, 'tier'); }
        } else {
          for (const u of p.board) if (u.type === 'ENTITY' && u.hp > 0) u.buffs.push({ atk: 3, hp: 0, untilTurnEnd: true });
          this.addLog('叙事：本回合己方实体 +3 攻击', 'buff');
        }
        break;
      }
      case 'transcendentalChoice': {
        const choice = ctx.transcendentalChoice != null ? ctx.transcendentalChoice : 0;
        if (choice === 0) {
          for (const pl of s.players) for (const u of pl.board.slice()) {
            if (u !== src && u.type === 'ENTITY' && u.hp > 0) this._destroy(u, true, 'transcendental');
          }
          this.addLog('Transcendental 抹除了战场上所有实体', 'annihilate');
        } else {
          for (const u of p.board) if (u !== src && u.type === 'ENTITY' && u.hp > 0) u.buffs.push({ tier: 2 });
          this.addLog('Transcendental 使己方实体层级 +2', 'tier');
        }
        break;
      }
    }
  }

  /* ============================================================
     攻击
     ============================================================ */
  canAttack(uid) {
    const u = this.findUnit(uid);
    if (!u || u.owner !== this.state.current) return false;
    if (u.type !== 'ENTITY') return false;
    if (u.atk <= 0) return false;
    if (!u.canAttack || u.justPlayed || u.frozen) return false;
    if (this.me.opsThisTurn >= this.me.opLimit) return false;
    // 注：嘲讽不在这里拦截 —— 它限制的是「能打谁」而非「能不能攻击」，
    // 真正的目标校验在 attack() 里做（那里同时保护英雄不被跳过嘲讽直接点脸）。
    return true;
  }

  attack(attackerUid, targetUid) {
    const s = this.state;
    const a = this.findUnit(attackerUid);
    if (!a) return { ok: false };
    if (!this.canAttack(attackerUid)) return { ok: false, msg: '该单位无法攻击' };

    const p = this.player(a.owner);
    const foe = this.other(a.owner);
    const defender = targetUid === 'hero' ? null : this.findUnit(targetUid);
    if (targetUid !== 'hero' && (!defender || defender.hp <= 0 || defender.owner === a.owner)) {
      return { ok: false, msg: '攻击目标无效' };
    }
    const taunts = foe.board.filter(x => x.hp > 0 && (x.keywords || []).includes('嘲讽'));
    // 只要对手场上还有存活的嘲讽单位，就只能打嘲讽 —— 英雄同样受保护。
    // 原写法多了一个 targetUid !== 'hero' 的条件，导致可以直接点脸绕过嘲讽，
    // 嘲讽这个关键词就完全失去意义了。
    if (taunts.length && !taunts.some(t => t.uid === targetUid)) {
      return { ok: false, msg: '敌方存在嘲讽单位，必须先攻击它' };
    }

    p.opsThisTurn++;
    a.canAttack = false;
    a.attackedThisTurn++;

    // 银之网：本回合首个发起攻击的实体获得加成
    let atkBonus = 0;
    if (!p.firstAttackDone) {
      p.firstAttackDone = true;
      atkBonus = this.staticValue(p.idx, 'firstStrikeBonus') || 0;
      if (atkBonus) this.addLog(`银之网：首个攻击者 +${atkBonus} 攻击`, 'buff');
    }

    if (targetUid === 'hero') {
      this._damageHero(foe.idx, a.atk + atkBonus, `【${a.name}】`);
      this.fx('attack', { uid: a.uid, target: 'hero', owner: a.owner });
    } else {
      const d = defender;
      const thr = this.pressThreshold(a);
      const diff = a.tier - d.tier;
      if (diff >= thr) {
        // 压制归虚
        this.addLog(`超限压制！【${a.name}】（层级 ${a.tier}）归虚【${d.name}】（层级 ${d.tier}）`, 'annihilate');
        this.fx('annihilate', { uid: d.uid });
        this._destroy(d, true, '压制');
        this._triggerAll('onAnnihilate', p.idx);
      } else {
        const dmgToDef = a.atk + atkBonus;
        this.addLog(`【${a.name}】攻击【${d.name}】（${dmgToDef} 伤害）`, 'attack');
        this.fx('attack', { uid: a.uid, target: d.uid, owner: a.owner });
        this._damageUnit(d, dmgToDef, a);
        if (d.hp > 0) this._damageUnit(a, d.atk, d);
      }
    }
    this.recompute();
    this._cleanupDeaths();
    this.onUpdate();
    return { ok: true };
  }

  /* ============================================================
     幂集跃迁
     ============================================================ */
  canAscend(uid) {
    const u = this.findUnit(uid);
    if (!u || u.owner !== this.state.current) return false;
    if (u.ascendCount >= ASCEND_LIMIT) return false;
    if (this.me.ascendUsed) return false;
    if (this.me.opsThisTurn >= this.me.opLimit) return false;
    const free = this.hasStatic(this.me.idx, 'freeFirstAscend') && !this.me.freeAscendUsed;
    if (!free && this.me.mana < ASCEND_COST) return false;
    if (this.hasStatic(0, 'recursionCap') || this.hasStatic(1, 'recursionCap')) {
      if (this.state.recursionCount[this.me.idx] >= 1) return false;
    }
    return true;
  }

  ascend(uid) {
    if (!this.canAscend(uid)) return { ok: false, msg: '无法跃迁' };
    const u = this.findUnit(uid);
    const p = this.me;
    const free = this.hasStatic(p.idx, 'freeFirstAscend') && !p.freeAscendUsed;
    if (free) { p.freeAscendUsed = true; } else { p.mana -= ASCEND_COST; }
    p.ascendUsed = true;
    p.opsThisTurn++;
    this.state.recursionCount[p.idx] = (this.state.recursionCount[p.idx] || 0) + 1;
    u.ascendCount++;
    this.addLog(`幂集跃迁：【${u.name}】层级 ${u.tier} → ${u.tier + 1}（消耗 ${free ? 0 : ASCEND_COST} Ψ）`, 'tier');
    this.fx('ascend', { uid: u.uid });
    this._triggerAll('onAscend', p.idx, u);
    this.recompute();
    this.onUpdate();
    return { ok: true };
  }

  /* ============================================================
     伤害 / 消灭
     ============================================================ */
  _damageUnit(unit, amount, source) {
    if (unit.hp <= 0) return;
    if (this.isImmuneTo(unit, source ? source.tier : 0)) {
      this.addLog(`【${unit.name}】免疫了这次效果`, 'info');
      return;
    }
    if (this.state.damageInverted) {
      unit.hp = Math.min(unit.maxHp, unit.hp + amount);
      this.addLog(`0=1 倒置：【${unit.name}】恢复 ${amount} 点`, 'heal');
      return;
    }
    unit.hp -= amount;
    this.fx('damage', { uid: unit.uid, amount });
    if (unit.hp <= 0) this._destroy(unit, false, '战斗');
  }

  _damageHero(idx, amount, label = '') {
    const pl = this.player(idx);
    if (this.state.damageInverted) {
      pl.existence = Math.min(pl.maxExistence, pl.existence + amount);
      this.addLog(`0=1 倒置：${pl.name} 恢复 ${amount} 点存在度`, 'heal');
      return;
    }
    pl.existence -= amount;
    this.addLog(`${label} 对 ${pl.name} 造成 ${amount} 点存在度伤害（剩余 ${Math.max(0, pl.existence)}）`, 'damage');
    this.fx('heroDamage', { idx, amount });
    if (pl.existence <= 0) this._win(1 - idx, `${pl.name} 的存在度被抹除`);
  }

  _destroy(unit, isAnnihilate = false, reason = '') {
    if (unit.hp <= 0 && unit._dead) return;
    if (!isAnnihilate && unit.indestructibleUntil === this.state.turn) {
      unit.hp = Math.max(1, unit.hp);
      this.addLog(`【${unit.name}】无法被消灭`, 'info');
      return;
    }
    unit.hp = 0;
    unit._dead = true;
    const p = this.player(unit.owner);
    const i = p.board.indexOf(unit);
    if (i >= 0) p.board.splice(i, 1);
    p.graveyard.push(unit.cardId);
    this.addLog(`【${unit.name}】被${isAnnihilate ? '归虚' : '消灭'}（${reason}）`, isAnnihilate ? 'annihilate' : 'death');
    this.fx('death', { uid: unit.uid, annihilate: isAnnihilate });

    // 亡语
    if (unit.def && unit.def.effects) {
      for (const eff of unit.def.effects) {
        if (eff.when === 'deathrattle') this._execEffect(unit, eff, {});
        if (this.state.winner !== null) return;
      }
    }
    // 哈姆金斯实在论：半血复活
    if (this.hasStatic(unit.owner, 'reviveHalved') && !isAnnihilate) {
      const half = Math.max(1, Math.floor(unit.baseHp / 2));
      const t = makeUnit(unit.cardId, unit.owner, { hp: half });
      t.ascendCount = unit.ascendCount;
      // 复活的仍是你的一张卡，同样享受延展加成（否则会凭空掉一级）
      const rhb = this.handTierBonus(unit.owner);
      if (rhb) { t.baseTier += rhb; t.tier += rhb; }
      if (p.board.length < BOARD_LIMIT) {
        p.board.push(t);
        this.addLog(`哈姆金斯实在论：【${t.name}】以 ${half} 点生命回归`, 'summon');
      }
    }
    // 己方死亡触发
    for (const u of p.board) {
      if (u.hp > 0 && (u.def.effects || []).some(e => e.when === 'onAllyDeath')) {
        this._execEffect(u, { when: 'onAllyDeath', op: 'buffSelf', atk: u.def.effects.find(e => e.when === 'onAllyDeath').atk, hp: u.def.effects.find(e => e.when === 'onAllyDeath').hp }, {});
      }
    }
  }

  _cleanupDeaths() {
    for (const p of this.state.players) {
      for (const u of p.board.slice()) {
        if (u.hp <= 0) p.board.splice(p.board.indexOf(u), 1);
      }
    }
  }

  findUnit(uid) {
    if (!uid) return null;
    for (const p of this.state.players) {
      const u = p.board.find(x => x.uid === uid);
      if (u) return u;
    }
    return null;
  }

  _win(idx, reason) {
    if (this.state.winner !== null) return;
    this.state.winner = idx;
    this.state.winReason = reason;
    const result = idx === 'draw' ? '对局平局' : `${this.player(idx).name} 获胜`;
    this.addLog(`★ ${result} —— ${reason}`, idx === 'draw' ? 'info' : 'win');
    this.fx(idx === 'draw' ? 'draw' : 'win', { idx });
  }

  /* ---------- 序列化快照（AI 用） ---------- */
  snapshot() {
    return JSON.parse(JSON.stringify(this.state, (k, v) => (k === 'def' ? undefined : v)));
  }
}

if (typeof window !== 'undefined') window.GardenEngine = GardenEngine;
