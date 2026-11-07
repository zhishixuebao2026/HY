/* ============================================================
   程序化卡面纹理生成器
   为无专属插画的卡牌生成数学抽象底图（Canvas 2D）
   同种子 → 同结果，保证渲染稳定
   ============================================================ */

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* 主色 → HSL 辅助 */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.substr(0, 2), 16), g: parseInt(h.substr(2, 2), 16), b: parseInt(h.substr(4, 2), 16) };
}
function rgba(c, a) { return `rgba(${c.r},${c.g},${c.b},${a})`; }
function mixWhite(c, t) {
  return { r: Math.round(c.r + (255 - c.r) * t), g: Math.round(c.g + (255 - c.g) * t), b: Math.round(c.b + (255 - c.b) * t) };
}

/* ---------- 12 种生成算法 ---------- */
const PROC_GENS = {
  /* 星云：多层径向渐变 + 星点 */
  nebula(ctx, w, h, c, rnd) {
    const g0 = ctx.createLinearGradient(0, 0, w, h);
    g0.addColorStop(0, '#05060f'); g0.addColorStop(1, '#0b0a1e');
    ctx.fillStyle = g0; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) {
      const x = rnd() * w, y = rnd() * h, r = (0.18 + rnd() * 0.4) * w;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const a = 0.13 + rnd() * 0.2;
      g.addColorStop(0, rgba(mixWhite(c, 0.35), a));
      g.addColorStop(0.45, rgba(c, a * 0.4));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    for (let i = 0; i < 190; i++) {
      const x = rnd() * w, y = rnd() * h, s = rnd() * 1.5 + 0.25;
      ctx.fillStyle = rgba(mixWhite(c, 0.6), 0.15 + rnd() * 0.75);
      ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.fill();
    }
  },

  /* 分形：递归枝干 */
  fractal(ctx, w, h, c, rnd) {
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, w, h);
    const cx = w / 2, base = h * 0.92;
    const branch = (x, y, len, ang, depth) => {
      if (depth === 0 || len < 2) return;
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      ctx.strokeStyle = rgba(mixWhite(c, depth / 11), 0.28 + (9 - depth) * 0.07);
      ctx.lineWidth = Math.max(0.4, depth * 0.5);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
      const spread = 0.42 + rnd() * 0.32;
      branch(x2, y2, len * (0.68 + rnd() * 0.12), ang - spread, depth - 1);
      branch(x2, y2, len * (0.68 + rnd() * 0.12), ang + spread, depth - 1);
      if (rnd() > 0.72) branch(x2, y2, len * 0.55, ang + (rnd() - 0.5) * 0.2, depth - 1);
    };
    branch(cx, base, h * 0.2, -Math.PI / 2, 9);
    // 顶部辉光
    const g = ctx.createRadialGradient(cx, h * 0.28, 0, cx, h * 0.28, w * 0.42);
    g.addColorStop(0, rgba(mixWhite(c, 0.5), 0.3)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  },

  /* 拓扑网络：节点与连线 */
  topology(ctx, w, h, c, rnd) {
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, w, h);
    const N = 46, pts = [];
    for (let i = 0; i < N; i++) pts.push({ x: rnd() * w, y: rnd() * h, r: 1 + rnd() * 2.6 });
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < w * 0.19) {
          ctx.strokeStyle = rgba(c, 0.42 * (1 - d / (w * 0.19)));
          ctx.lineWidth = 0.55;
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
        }
      }
    }
    for (const p of pts) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
      g.addColorStop(0, rgba(mixWhite(c, 0.65), 0.95));
      g.addColorStop(0.3, rgba(c, 0.5)); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 6, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.6, 0, 7); ctx.fill();
    }
  },

  /* 晶格：等距投影立方体阵列 */
  lattice(ctx, w, h, c, rnd) {
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, w, h);
    const s = w / 9;
    for (let gy = -1; gy < 10; gy++) {
      for (let gx = -1; gx < 10; gx++) {
        const ox = gx * s * 1.5 + (gy % 2 ? s * 0.75 : 0);
        const oy = gy * s * 0.86;
        const lift = (Math.sin(gx * 0.7 + gy * 0.9) + 1) * 0.5;
        const ht = s * (0.15 + lift * 0.75);
        const a = 0.18 + lift * 0.5;
        // 顶面
        ctx.fillStyle = rgba(mixWhite(c, 0.35), a);
        ctx.beginPath();
        ctx.moveTo(ox, oy); ctx.lineTo(ox + s / 2, oy - s * 0.29);
        ctx.lineTo(ox + s, oy); ctx.lineTo(ox + s / 2, oy + s * 0.29); ctx.closePath(); ctx.fill();
        // 左面
        ctx.fillStyle = rgba(c, a * 0.55);
        ctx.beginPath();
        ctx.moveTo(ox, oy); ctx.lineTo(ox + s / 2, oy + s * 0.29);
        ctx.lineTo(ox + s / 2, oy + s * 0.29 + ht); ctx.lineTo(ox, oy + ht); ctx.closePath(); ctx.fill();
        // 右面
        ctx.fillStyle = rgba(c, a * 0.32);
        ctx.beginPath();
        ctx.moveTo(ox + s, oy); ctx.lineTo(ox + s / 2, oy + s * 0.29);
        ctx.lineTo(ox + s / 2, oy + s * 0.29 + ht); ctx.lineTo(ox + s, oy + ht); ctx.closePath(); ctx.fill();
      }
    }
  },

  /* 螺旋：对数螺旋族 */
  spiral(ctx, w, h, c, rnd) {
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const arms = 3 + Math.floor(rnd() * 3);
    for (let a = 0; a < arms; a++) {
      ctx.beginPath();
      for (let t = 0; t < 26; t += 0.045) {
        const r = Math.exp(t * 0.19) * (w * 0.0055);
        const ang = t + (a / arms) * Math.PI * 2;
        const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r * 0.82;
        t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        if (r > w * 0.75) break;
      }
      ctx.strokeStyle = rgba(mixWhite(c, 0.3), 0.5);
      ctx.lineWidth = 1.1; ctx.stroke();
    }
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.5);
    g.addColorStop(0, rgba(mixWhite(c, 0.6), 0.42)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  },

  /* 沃罗诺伊：多面分割 */
  voronoi(ctx, w, h, c, rnd) {
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, w, h);
    const N = 26, sites = [];
    for (let i = 0; i < N; i++) sites.push({ x: rnd() * w, y: rnd() * h, v: rnd() });
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const step = 3;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        let m1 = 1e9, m2 = 1e9, bi = 0;
        for (let i = 0; i < N; i++) {
          const dd = (sites[i].x - x) ** 2 + (sites[i].y - y) ** 2;
          if (dd < m1) { m2 = m1; m1 = dd; bi = i; } else if (dd < m2) m2 = dd;
        }
        const edge = Math.min(1, (Math.sqrt(m2) - Math.sqrt(m1)) / (w * 0.035));
        const base = sites[bi].v;
        const lum = (0.06 + base * 0.2) * (1 - edge * 0.55) + edge * 0.5;
        const col = mixWhite(c, lum * 0.9);
        for (let dy = 0; dy < step && y + dy < h; dy++) {
          for (let dx = 0; dx < step && x + dx < w; dx++) {
            const o = ((y + dy) * w + (x + dx)) * 4;
            d[o] = col.r * lum * 1.6; d[o + 1] = col.g * lum * 1.6; d[o + 2] = col.b * lum * 1.6; d[o + 3] = 255;
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  },

  /* 曼德勃罗集 */
  mandelbrot(ctx, w, h, c, rnd) {
    const img = ctx.createImageData(w, h), d = img.data;
    const cx0 = -0.65 + (rnd() - 0.5) * 0.5, cy0 = (rnd() - 0.5) * 0.35;
    const zoom = 3.2 / w * 1.6;
    const MAX = 90;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const zx0 = cx0 + (x - w / 2) * zoom, zy0 = cy0 + (y - h / 2) * zoom;
        let zx = 0, zy = 0, i = 0;
        while (zx * zx + zy * zy < 4 && i < MAX) {
          const t = zx * zx - zy * zy + zx0;
          zy = 2 * zx * zy + zy0; zx = t; i++;
        }
        const t = i / MAX;
        const o = (y * w + x) * 4;
        if (i === MAX) {
          d[o] = 4; d[o + 1] = 5; d[o + 2] = 14; d[o + 3] = 255;
        } else {
          const k = Math.pow(t, 0.55);
          const col = mixWhite(c, k * 0.85);
          const glow = Math.pow(1 - t, 2.2);
          d[o] = col.r * (0.25 + k * 1.35) + glow * 30;
          d[o + 1] = col.g * (0.25 + k * 1.35) + glow * 34;
          d[o + 2] = col.b * (0.25 + k * 1.35) + glow * 52;
          d[o + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  },

  /* 希尔伯特曲线 */
  hilbert(ctx, w, h, c, rnd) {
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, w, h);
    const order = 6, n = 1 << order;
    const pts = [];
    for (let i = 0; i < n * n; i++) {
      let rx, ry, t = i, x = 0, y = 0;
      for (let s = 1; s < n; s *= 2) {
        rx = 1 & (t / 2); ry = 1 & (t ^ rx);
        if (ry === 0) { if (rx === 1) { x = s - 1 - x; y = s - 1 - y; } [x, y] = [y, x]; }
        x += s * rx; y += s * ry; t /= 4;
      }
      pts.push({ x: (x + 0.5) / n * w, y: (y + 0.5) / n * h });
    }
    ctx.lineWidth = 1.3; ctx.lineJoin = 'round';
    for (let i = 1; i < pts.length; i++) {
      const t = i / pts.length;
      ctx.strokeStyle = rgba(mixWhite(c, t * 0.6), 0.32 + t * 0.5);
      ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
    }
  },

  /* 流场 */
  flow(ctx, w, h, c, rnd) {
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, w, h);
    const noise = (x, y) => Math.sin(x * 0.017) * Math.cos(y * 0.021) + Math.sin((x + y) * 0.011) * 0.7;
    for (let i = 0; i < 620; i++) {
      let x = rnd() * w, y = rnd() * h;
      ctx.beginPath(); ctx.moveTo(x, y);
      const alpha = 0.05 + rnd() * 0.3;
      for (let s = 0; s < 32; s++) {
        const a = noise(x, y) * Math.PI * 2.2;
        x += Math.cos(a) * 3.4; y += Math.sin(a) * 3.4;
        if (x < 0 || x > w || y < 0 || y > h) break;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(mixWhite(c, rnd() * 0.75), alpha);
      ctx.lineWidth = 0.5 + rnd() * 0.7; ctx.stroke();
    }
    const g = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.6);
    g.addColorStop(0, rgba(c, 0.14)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  },

  /* 莫尔条纹 */
  moire(ctx, w, h, c, rnd) {
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, w, h);
    const N = 130;
    for (let i = 0; i < N; i++) {
      ctx.strokeStyle = rgba(mixWhite(c, 0.45), 0.30);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, i * (w / N) * 1.15, 0, 7);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(w * 0.5, h * 0.5); ctx.rotate(rnd() * 0.7 - 0.35); ctx.translate(-w * 0.5, -h * 0.5);
    for (let i = 0; i < N; i++) {
      ctx.strokeStyle = rgba(mixWhite(c, 0.2), 0.26);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(w * 0.48, h * 0.52, i * (w / N) * 1.1, 0, 7);
      ctx.stroke();
    }
    ctx.restore();
    const g = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.55);
    g.addColorStop(0, rgba(c, 0.2)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  },

  /* 递归树（公理森林） */
  tree(ctx, w, h, c, rnd) {
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, w, h);
    const draw = (x, y, len, ang, depth) => {
      if (depth === 0) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
        g.addColorStop(0, rgba(mixWhite(c, 0.7), 0.55)); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill();
        return;
      }
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      ctx.strokeStyle = rgba(mixWhite(c, depth / 9), 0.4);
      ctx.lineWidth = depth * 0.6;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
      const k = 0.62 + rnd() * 0.16;
      draw(x2, y2, len * k, ang - 0.38 - rnd() * 0.28, depth - 1);
      draw(x2, y2, len * k, ang + 0.38 + rnd() * 0.28, depth - 1);
    };
    const n = 3 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) {
      const x = w * (i + 0.5) / n + (rnd() - 0.5) * w * 0.1;
      draw(x, h * 0.96, h * (0.13 + rnd() * 0.06), -Math.PI / 2 + (rnd() - 0.5) * 0.24, 7);
    }
  },

  /* 波干涉 */
  wave(ctx, w, h, c, rnd) {
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, w, h);
    const src = [];
    for (let i = 0; i < 3 + Math.floor(rnd() * 3); i++) {
      src.push({ x: rnd() * w, y: rnd() * h, f: 0.05 + rnd() * 0.06, p: rnd() * 6.28 });
    }
    const img = ctx.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let v = 0;
        for (const s of src) {
          const dd = Math.hypot(x - s.x, y - s.y);
          v += Math.sin(dd * s.f + s.p) / (1 + dd * 0.012);
        }
        const t = (v / src.length + 1) / 2;
        const col = mixWhite(c, t * 0.9);
        const o = (y * w + x) * 4;
        d[o] = col.r * t * 1.5; d[o + 1] = col.g * t * 1.5; d[o + 2] = col.b * t * 1.5; d[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
};

/* ---------- 对外接口：生成并返回 dataURL ---------- */
const _procCache = {};

function procTexture(cardId, style, tierColor, size = 320) {
  const key = cardId + '|' + style + '|' + tierColor + '|' + size;
  if (_procCache[key]) return _procCache[key];
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const ctx = cv.getContext('2d');
  const c = hexToRgb(tierColor || '#38bdf8');
  const rnd = mulberry32(hashStr(cardId + style));
  const gen = PROC_GENS[style] || PROC_GENS.nebula;
  gen(ctx, size, size, c, rnd);
  // 统一暗角，让文字更易读
  const vg = ctx.createRadialGradient(size / 2, size / 2, size * 0.28, size / 2, size / 2, size * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.62)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, size, size);
  const url = cv.toDataURL('image/webp', 0.86);
  _procCache[key] = url;
  return url;
}

/* 卡面插画：优先用 AI 生成图，否则程序化生成 */
function cardArt(card) {
  if (card.art) {
    if (window.__IMG && window.__IMG[card.art]) return window.__IMG[card.art];
    return 'assets/img/card_' + card.art + '.' + (card.artExt || 'webp');
  }
  const style = card.proc || PROC_STYLES[hashStr(card.id) % PROC_STYLES.length];
  const color = (TIERS[card.tier] || TIERS[0]).color;
  return procTexture(card.id, style, color, 320);
}

if (typeof window !== 'undefined') { window.procTexture = procTexture; window.cardArt = cardArt; }
