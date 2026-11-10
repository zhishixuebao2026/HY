/* 构建 garden-standalone.html：所有 CSS/JS 内联 + 首页 / 卡牌 / 页头横幅插画转 base64 */
const fs = require('fs');
const root = __dirname;
const read = f => fs.readFileSync(root + '/' + f, 'utf8');

// 1) CSS 内联（motion 最后，保证覆盖优先级）
const cssFiles = ['css/main.css', 'css/cards.css', 'css/effects.css', 'css/motion.css'];
let css = cssFiles.map(read).join('\n');

/* ---------- 图片 → data URI ---------- */
const MIME = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };
function dataUri(file) {
  const ext = file.split('.').pop().toLowerCase();
  if (!MIME[ext]) throw new Error('不支持的图片格式: ' + file);
  return 'data:' + MIME[ext] + ';base64,' + fs.readFileSync(root + '/' + file).toString('base64');
}

// 1b) CSS 中的本地图片引用（首页主视觉 + 各页横幅）全部内联，保证双击即可显示
const cssImages = [
  '../assets/img/home_garden.jpg',
  '../assets/img/banner_academy.jpg',
  '../assets/img/banner_tower.jpg',
  '../assets/img/banner_codex.jpg',
  '../assets/img/banner_battle.jpg'
];
cssImages.forEach(rel => {
  const file = rel.replace('../', '');
  if (!css.includes(rel)) throw new Error('CSS 中缺少图片引用: ' + rel);
  if (!fs.existsSync(root + '/' + file)) throw new Error('缺少素材文件: ' + file);
  css = css.split(rel).join(dataUri(file));
});

// 2) JS 内联（按依赖顺序，motion 在 main 之前）
const jsFiles = [
  'js/data/cards.js', 'js/core/engine.js', 'js/core/ai.js', 'js/art/procedural.js',
  'js/ui/render.js', 'js/ui/battle.js', 'js/ui/codex.js', 'js/core/roguelike.js',
  'js/core/academy.js',
  // motion 必须在 coach 之前：coach 要在运动层之后包装 Battle.render，才能在最终布局上贴高亮
  'js/ui/motion.js', 'js/ui/coach.js', 'js/main.js'
];
const js = jsFiles.map(f => '/* ===== ' + f + ' ===== */\n' + read(f)).join('\n\n');

// 3) 专属卡牌插画转 base64 data URI（支持 WebP/JPEG 混合源格式）
const arts = ['garden','transcendental','unifier','fractalcorpse','transcendentcube',
  'hyperhorizon','omniversal_axiom','universe_v','silverweb','reckoner','turing',
  'large_cardinals','chainbound','hilbert_hotel','sandbox_war','constructible_l','untree',
  'absolute_infinity','negative_fire_lord','transcendent_vacuum',
  // 新增：预组主力卡专属插画
  'pastoral','real_sea','uncountable','continuum','beta_ordinal','inaccessible',
  'recursion_nest','interval','computation_mine','information_stele'];
const imgMap = {};
arts.forEach(a => {
  const webp = root + '/assets/img/card_' + a + '.webp';
  const jpg = root + '/assets/img/card_' + a + '.jpg';
  const ext = fs.existsSync(webp) ? 'webp' : fs.existsSync(jpg) ? 'jpeg' : null;
  if (!ext) throw new Error('缺少卡牌插画: ' + a);
  const buf = fs.readFileSync(ext === 'webp' ? webp : jpg);
  imgMap[a] = 'data:image/' + ext + ';base64,' + buf.toString('base64');
});
const imgJs = 'window.__IMG = ' + JSON.stringify(imgMap) + ';';

// 4) 注入 index.html 模板
let html = read('index.html');
html = html.replace(/<link rel="stylesheet" href="[^"]+">\s*/g, '');
html = html.replace(/<script src="[^"]+"><\/script>\s*/g, '');
// 内联 SVG favicon（单文件版不发额外请求）
const favicon = '<link rel="icon" href="data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  '<rect width="64" height="64" rx="14" fill="#06070f"/>' +
  '<g fill="none" stroke="#f7c948" stroke-width="2.4" stroke-linecap="round">' +
  '<circle cx="32" cy="32" r="6" fill="#f7c948" stroke="none"/>' +
  '<path d="M32 26V10M32 38v16M26 32H10M38 32h16M27.8 27.8 16.5 16.5M36.2 36.2l11.3 11.3M27.8 36.2 16.5 47.5M36.2 27.8l11.3-11.3"/>' +
  '</g></svg>') + '">\n';
if (!/<link rel="icon"/.test(html)) html = html.replace('<title>', favicon + '<title>');

const inject = '<style>\n' + css + '\n</style>\n'
  + '<script>' + imgJs + '</script>\n'
  + '<script>\n' + js + '\n</script>\n';
html = html.replace('</body>', inject + '</body>');

const out = root + '/garden-standalone.html';
fs.writeFileSync(out, html);
console.log('已生成:', out);
console.log('体积:', (fs.statSync(out).size / 1048576).toFixed(2), 'MB');
console.log('内联脚本字节:', js.length,
  ' 内联图片:', arts.length + cssImages.length, '张（卡牌', arts.length, '张 + 主视觉/横幅', cssImages.length, '张）');
cssFiles.concat(['js/ui/motion.js', 'js/ui/coach.js', 'js/core/academy.js']).forEach(f => {
  const probe = read(f).slice(0, 60);
  const ok = f.endsWith('.css') ? css.includes(probe) : js.includes(probe);
  console.log((ok ? '✓ 已包含 ' : '✗ 缺少 ') + f);
});
