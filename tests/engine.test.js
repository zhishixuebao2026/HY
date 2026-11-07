const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'js/data/cards.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/core/engine.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/core/ai.js'), 'utf8'), context);
const makeEngine = () => {
  const engine = vm.runInContext('new GardenEngine({ rng: () => 0.25 })', context);
  engine.setup({
    p0: { deckId: 'silver', name: 'Player' },
    p1: { deckId: 'grammar', name: 'Opponent' }
  });
  return engine;
};
const unit = (id, owner) => vm.runInContext(`makeUnit('${id}', ${owner})`, context);

test('player zero victories are terminal, not falsy', () => {
  const engine = makeEngine();
  engine.player(1).existence = 1;
  engine._damageHero(1, 2, 'test');
  assert.equal(engine.state.winner, 0);
  const turn = engine.state.turn;
  engine.startTurn();
  assert.equal(engine.state.turn, turn);
  engine.player(0).hand = ['001'];
  engine.player(0).mana = 12;
  assert.equal(engine.canPlay(0), false);
});

test('top-level target metadata works and untargetable cards cannot be consumed without targets', () => {
  const engine = makeEngine();
  const player = engine.player(0);
  player.hand = ['005']; // 递归套娃：友方实体目标
  player.mana = 5;
  assert.equal(engine.canPlay(0), false);
  assert.equal(engine.playCard(0).ok, false);
  assert.deepEqual(Array.from(player.hand), ['005']);
  assert.equal(player.mana, 5);

  const ally = unit('001', 0);
  player.board.push(ally);
  assert.equal(engine.canPlay(0), true);
  const result = engine.playCard(0);
  assert.equal(result.ok, true);
  assert.equal(ally.tier, 3); // 顶层目标声明命中后获得 +2 层
  assert.equal(player.opsThisTurn, 1);
});

test('targeted effects expose only targets on which their effect can resolve', () => {
  const engine = makeEngine();
  const player = engine.player(0);
  const enemy = engine.player(1);
  player.hand = ['018'];
  player.mana = 12;
  enemy.board.push(unit('027', 1)); // T6：高于清账者先遣队的目标范围
  assert.equal(engine.canPlay(0), false);
  const legalEnemy = unit('001', 1);
  enemy.board.push(legalEnemy);
  assert.equal(engine.canPlay(0), true);
  const cardDef = vm.runInContext("CARD_MAP['018']", context);
  assert.deepEqual(Array.from(engine.getValidTargets('enemyEntity', 0, 4, cardDef)), [legalEnemy.uid]);
  const result = engine.playCard(0, legalEnemy.uid);
  assert.equal(result.ok, true);
  assert.equal(engine.findUnit(legalEnemy.uid), null);
});

test('AI enumerates legal top-level target choices instead of stalling', () => {
  const engine = makeEngine();
  const player = engine.player(0);
  player.hand = ['005'];
  player.mana = 10;
  const first = unit('001', 0), second = unit('002', 0);
  player.board.push(first, second);
  const actions = vm.runInContext('enumerateActions', context)(engine, 0).filter(action => action.type === 'play');
  assert.deepEqual(Array.from(actions, action => action.targetUid).sort(), [first.uid, second.uid].sort());
});

test('targeted plays reject stale or foreign targets without spending resources', () => {
  const engine = makeEngine();
  const player = engine.player(0);
  const ally = unit('001', 0);
  const foe = unit('002', 1);
  player.board.push(ally);
  engine.player(1).board.push(foe);
  player.hand = ['005'];
  player.mana = 5;
  const result = engine.playCard(0, foe.uid);
  assert.equal(result.invalidTarget, true);
  assert.deepEqual(Array.from(player.hand), ['005']);
  assert.equal(player.mana, 5);
  assert.equal(player.opsThisTurn, 0);
});

test('invalid attacks do not consume an attack or an operation', () => {
  const engine = makeEngine();
  const attacker = unit('001', 0);
  attacker.justPlayed = false;
  attacker.canAttack = true;
  engine.player(0).board.push(attacker);
  const result = engine.attack(attacker.uid, attacker.uid);
  assert.equal(result.ok, false);
  assert.equal(engine.player(0).opsThisTurn, 0);
  assert.equal(attacker.canAttack, true);
});

test('temporary tier and attack bonuses expire at their owner end step', () => {
  const engine = makeEngine();
  const player = engine.player(0);
  const ally = unit('001', 0);
  player.board.push(ally);
  engine.startTurn();
  engine._execEffect(unit('031', 0), { op: 'tempTierUpAll', n: 1 }, {});
  engine.recompute();
  assert.equal(ally.tier, 2);
  engine.endTurn();
  assert.equal(ally.tier, 1);

  // The same expiry rule applies to the temporary branch of 叙事者.
  engine.state.current = 0;
  engine.startTurn();
  engine._execEffect(unit('060', 0), { op: 'narrativeChoice' }, { narrativeChoice: 2 });
  engine.recompute();
  assert.equal(ally.atk, 6);
  engine.endTurn();
  assert.equal(ally.atk, 3);
});

test('simultaneous lethal damage resolves as a draw and honors inversion', () => {
  const engine = makeEngine();
  engine.player(0).existence = 5;
  engine.player(1).existence = 4;
  engine._execEffect(unit('069', 0), { op: 'damageBothHeroes', n: 5 }, {});
  assert.equal(engine.state.winner, 'draw');

  const inverted = makeEngine();
  inverted.player(0).existence = 20;
  inverted.player(1).existence = 18;
  inverted.state.damageInverted = true;
  inverted._execEffect(unit('069', 0), { op: 'damageBothHeroes', n: 5 }, {});
  assert.equal(inverted.player(0).existence, 25);
  assert.equal(inverted.player(1).existence, 23);
  assert.equal(inverted.state.winner, null);
});

test('entity-only effects leave structures intact', () => {
  const engine = makeEngine();
  const source = unit('068', 0);
  const allyEntity = unit('001', 0);
  const allyStructure = unit('020', 0);
  const foeEntity = unit('002', 1);
  const foeStructure = unit('024', 1);
  engine.player(0).board.push(source, allyEntity, allyStructure);
  engine.player(1).board.push(foeEntity, foeStructure);

  engine._execEffect(source, { op: 'transcendentalChoice' }, { transcendentalChoice: 0 });
  assert.equal(engine.findUnit(allyEntity.uid), null);
  assert.equal(engine.findUnit(foeEntity.uid), null);
  assert.ok(engine.findUnit(source.uid));
  assert.ok(engine.findUnit(allyStructure.uid));
  assert.ok(engine.findUnit(foeStructure.uid));
});

test('scry lets the chosen card be picked and preserves duplicate deck copies', () => {
  const engine = makeEngine();
  const player = engine.player(0);
  player.deck = ['001', '001', '002', '003'];
  player.hand = [];
  player.handTierBonuses = [];
  engine._execEffect(unit('028', 0), { op: 'scryPick', n: 3 }, { scryPickId: '002' });
  assert.deepEqual(Array.from(player.hand), ['002']);
  assert.deepEqual(Array.from(player.deck).sort(), ['001', '001', '003']);
});

test('Infinite Time Turing Machine grants and preserves the drawn entity tier bonus', () => {
  const engine = makeEngine();
  const player = engine.player(0);
  player.deck = ['001'];
  player.hand = [];
  player.handTierBonuses = [];
  player.mana = 5;
  engine._execEffect(unit('026', 0), { op: 'itmDraw' }, {});
  assert.deepEqual(Array.from(player.hand), ['001']);
  assert.equal(engine.handCardTier(0, 0), 2);
  const result = engine.playCard(0);
  assert.equal(result.ok, true);
  assert.equal(player.board.at(-1).tier, 2);
  assert.deepEqual(Array.from(player.handTierBonuses), []);
});
