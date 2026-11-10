const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'js/data/cards.js'), 'utf8'), context);
const data = JSON.parse(vm.runInContext('JSON.stringify({TIERS, CARDS, DECKS, PROC_STYLES})', context));

test('card catalogue is internally complete and tier-safe', () => {
  assert.equal(data.TIERS.length, 13);
  assert.equal(data.CARDS.length, 72);
  const ids = new Set();
  for (const card of data.CARDS) {
    assert.ok(card.id && !ids.has(card.id), `duplicate or empty card id: ${card.id}`);
    ids.add(card.id);
    assert.ok(data.TIERS[card.tier], `${card.id} references missing tier ${card.tier}`);
    assert.ok(card.name && card.text && card.source, `${card.id} is missing display/lore metadata`);
    assert.ok(card.art || data.PROC_STYLES.includes(card.proc), `${card.id} has no art or procedural fallback`);
    if (card.art) {
      const ext = card.artExt || 'webp';
      assert.ok(['webp', 'jpg'].includes(ext), `${card.id} has an unsupported art extension`);
      assert.ok(fs.existsSync(path.join(root, 'assets/img', `card_${card.art}.${ext}`)), `${card.id} art is missing or its extension is incorrect`);
    }
    if (card.type === 'ENTITY') {
      assert.ok(Number.isFinite(card.atk) && Number.isFinite(card.hp), `${card.id} has invalid entity stats`);
    }
  }
});

test('JPG card illustrations resolve to their real source paths', () => {
  const artContext = vm.createContext({ window: {} });
  vm.runInContext(fs.readFileSync(path.join(root, 'js/data/cards.js'), 'utf8'), artContext);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/art/procedural.js'), 'utf8'), artContext);
  for (const id of ['065', '066', '067', '072']) {
    const imagePath = vm.runInContext(`cardArt(CARD_MAP['${id}'])`, artContext);
    const card = data.CARDS.find(item => item.id === id);
    assert.equal(imagePath, `assets/img/card_${card.art}.jpg`);
    assert.ok(fs.existsSync(path.join(root, imagePath)), `${id} image URL does not resolve`);
  }
});

test('all preset decks contain 30 valid cards and respect copy limits', () => {
  const ids = new Set(data.CARDS.map(card => card.id));
  for (const deck of Object.values(data.DECKS)) {
    assert.equal(deck.cardIds.length, 30, `${deck.name} should contain 30 cards`);
    const copies = new Map();
    for (const id of deck.cardIds) {
      assert.ok(ids.has(id), `${deck.name} references unknown card ${id}`);
      copies.set(id, (copies.get(id) || 0) + 1);
    }
    for (const [id, count] of copies) assert.ok(count <= 3, `${deck.name} has ${count} copies of ${id}`);
  }
});

test('source entry only references resolvable local script and stylesheet paths', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="(css|js)\/[^\"]+"/g)].map(match => match[0].match(/"([^"]+)"/)[1]);
  assert.ok(refs.length > 0);
  for (const ref of refs) assert.ok(fs.existsSync(path.join(root, ref)), `broken local reference: ${ref}`);
  const css = fs.readFileSync(path.join(root, 'css/effects.css'), 'utf8');
  assert.ok(css.includes("url('../assets/img/home_garden.jpg')"));
  assert.ok(fs.existsSync(path.join(root, 'assets/img/home_garden.jpg')));
});

test('standalone build embeds its styles, scripts and card art without network assets', () => {
  const html = fs.readFileSync(path.join(root, 'garden-standalone.html'), 'utf8');
  assert.doesNotMatch(html, /<script\s+src=/i);
  assert.doesNotMatch(html, /<link\s+rel="stylesheet"/i);
  assert.match(html, /window\.__IMG\s*=\s*\{/);
  const mapMatch = html.match(/window\.__IMG\s*=\s*(\{[^\n]+\});/);
  assert.ok(mapMatch, 'standalone build should contain a parseable inline image map');
  const imageMap = JSON.parse(mapMatch[1]);
  for (const art of new Set(data.CARDS.filter(card => card.art).map(card => card.art))) {
    assert.match(imageMap[art] || '', /^data:image\/(?:webp|jpeg);base64,/, `standalone art ${art} is missing`);
  }
  // 16 张卡牌 WebP + 20 张卡牌 JPEG(其中 4 张为 .jpg 源) + 5 张主视觉/页头横幅 JPEG
  assert.equal((html.match(/data:image\/webp;base64,/g) || []).length, 26);
  assert.equal((html.match(/data:image\/jpeg;base64,/g) || []).length, 9);
  // 单文件版不得残留指向本地子目录的相对图片引用
  assert.doesNotMatch(html, /url\('\.\.\/assets\/img\//);
});
