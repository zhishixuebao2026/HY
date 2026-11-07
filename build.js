/* 构建 garden-standalone.html：所有 CSS/JS 内联 + 首页与卡牌插画转 base64 */
const fs = require('fs');
const root = __dirname;
const read = f => fs.readFileSync(root + '/' + f, 'utf8');

// 1) CSS 内联（motion 最后，保证覆盖优先级）
const sourceCss = ['css/main.css', 'css/cards.css', 'css/effects.css', 'css/motion.css'].map(read).join('\n');
const homeArt = fs.readFileSync(root + '/assets/img/home_garden.jpg');
const css = sourceCss.replaceAll('../assets/img/home_garden.jpg', 'data:image/jpeg;base64,' + homeArt.toString('base64'));

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
  'absolute_infinity','negative_fire_lord','transcendent_vacuum'];
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
const inject = '<style>\n' + css + '\n</style>\n'
  + '<script>' + imgJs + '</script>\n'
  + '<script>\n' + js + '\n</script>\n';
html = html.replace('</body>', inject + '</body>');

const out = root + '/garden-standalone.html';
fs.writeFileSync(out, html);
console.log('已生成:', out);
console.log('体积:', (fs.statSync(out).size / 1048576).toFixed(2), 'MB');
console.log('内联脚本字节:', js.length, ' 内联图片:', arts.length + 1, '张（卡牌', arts.length, '张 + 首页 1 张）');
['css/motion.css', 'js/ui/motion.js', 'js/ui/coach.js', 'js/core/academy.js'].forEach(f => {
  console.log((js + css).includes(read(f).slice(0, 60)) ? '✓ 已包含 ' + f : '✗ 缺少 ' + f);
});
