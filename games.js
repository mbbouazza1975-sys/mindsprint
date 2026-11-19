'use strict';
/* =========================================================
   MindSprint — les 18 épreuves (9 rapidité, 9 logique)
   Chaque épreuve : run(c) où c = contexte fourni par app.js
   ========================================================= */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp01 = x => Math.max(0, Math.min(1, x));

/* ---------- Hasard reproductible (même graine = mêmes énoncés pour toute la famille) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function makeRng(seed) {
  const r = mulberry32(seed);
  r.int = (a, b) => a + Math.floor(r() * (b - a + 1));
  r.pick = a => a[Math.floor(r() * a.length)];
  r.chance = p => r() < p;
  r.shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  return r;
}

/* ---------- Formes et couleurs (palette lisible par les daltoniens) ---------- */
const COLORS = [
  { n: 'bleu', h: '#0072B2' }, { n: 'orange', h: '#E69F00' },
  { n: 'vert', h: '#009E73' }, { n: 'rose', h: '#CC79A7' }
];
const SHAPES = ['rond', 'carré', 'triangle', 'losange'];
function shapeInner(shape, color, sw = 6) {
  const st = `fill="${color}" stroke="#1E1B4B" stroke-width="${sw}" stroke-linejoin="round"`;
  switch (shape) {
    case 0: return `<circle cx="50" cy="50" r="40" ${st}/>`;
    case 1: return `<rect x="12" y="12" width="76" height="76" rx="10" ${st}/>`;
    case 2: return `<polygon points="50,8 93,88 7,88" ${st}/>`;
    default: return `<polygon points="50,5 95,50 50,95 5,50" ${st}/>`;
  }
}
function shapeSVG(shape, color, rot = 0, label = '') {
  return `<svg viewBox="0 0 100 100" role="img" aria-label="${label}" style="transform:rotate(${rot}deg)">${shapeInner(shape, color)}</svg>`;
}
const DOTPOS = {
  1: [[50, 52]], 2: [[36, 52], [64, 52]], 3: [[50, 34], [35, 62], [65, 62]],
  4: [[36, 38], [64, 38], [36, 66], [64, 66]], 5: [[34, 36], [66, 36], [50, 52], [34, 68], [66, 68]],
  6: [[34, 32], [66, 32], [34, 52], [66, 52], [34, 72], [66, 72]],
  7: [[34, 32], [66, 32], [34, 52], [50, 52], [66, 52], [34, 72], [66, 72]]
};
function beadSVG(b) {
  // perle de collier : forme + couleur + points
  const dots = (DOTPOS[b.dots] || []).map(([x, y]) => {
    const yy = b.shape === 2 ? y + 8 : y;
    return `<circle cx="${x}" cy="${yy}" r="6.5" fill="#fff" stroke="#1E1B4B" stroke-width="2.5"/>`;
  }).join('');
  return `<svg viewBox="0 0 100 100" role="img" aria-label="${SHAPES[b.shape]} ${COLORS[b.color].n}, ${b.dots} point${b.dots > 1 ? 's' : ''}">${shapeInner(b.shape, COLORS[b.color].h)}${dots}</svg>`;
}
function arrowSVG(dir, color = '#1E1B4B') {
  // dir : 0 haut, 1 droite, 2 bas, 3 gauche
  return `<svg viewBox="0 0 100 100" style="transform:rotate(${dir * 90}deg)" aria-hidden="true"><path d="M50 10 L84 48 L62 48 L62 90 L38 90 L38 48 L16 48 Z" fill="${color}" stroke="#1E1B4B" stroke-width="5" stroke-linejoin="round"/></svg>`;
}
const DIRNAMES = ['vers le haut', 'vers la droite', 'vers le bas', 'vers la gauche'];
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

/* Placement aléatoire avec distance minimale */
function scatter(rng, n, w, h, pad, minD) {
  const pts = [];
  let d = minD;
  for (let tries = 0; pts.length < n && tries < 4000; tries++) {
    if (tries && tries % 800 === 0) d *= 0.85;
    const x = pad + rng() * (w - 2 * pad), y = pad + rng() * (h - 2 * pad);
    if (pts.every(p => (p.x - x) ** 2 + (p.y - y) ** 2 >= d * d)) pts.push({ x, y });
  }
  while (pts.length < n) pts.push({ x: pad + rng() * (w - 2 * pad), y: pad + rng() * (h - 2 * pad) });
  return pts;
}
const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`;
const bonnes = n => `${n} bonne${n > 1 ? 's' : ''} réponse${n > 1 ? 's' : ''}`;

/* =========================================================
   RAPIDITÉ
   ========================================================= */

const G_LANTERNE = {
  id: 'lanterne', name: 'La lanterne du quai', cat: 'speed', color: '#F4B400', fg: '#1E1B4B', icon: '🏮',
  rule: l => l === 'F'
    ? "La lanterne est éteinte. Touche l'écran dès qu'elle s'allume en jaune."
    : "Touche l'écran dès que la lanterne s'allume en jaune. Si elle ne fait que vaciller, ne touche pas : c'est un leurre.",
  info: l => ({ F: '5 essais', N: '6 essais', E: '7 essais' })[l],
  run(c) {
    const P = c.L({
      F: { n: 5, d: [1500, 3500], p: 0, fast: 300, slow: 1050 },
      N: { n: 6, d: [1000, 4000], p: .2, fast: 200, slow: 1100 },
      E: { n: 7, d: [800, 4500], p: .5, fast: 280, slow: 650 }
    });
    c.stage.innerHTML = `<div class="lant-pad" id="lp" role="button" tabindex="0" aria-label="Zone à toucher quand la lanterne s’allume">
      <div class="lantern" id="lan"><div class="cap"></div><div class="glass"></div><div class="base"></div></div>
      <div class="lant-msg" id="lm" aria-live="polite"></div></div>`;
    const pad = $('#lp', c.stage), lan = $('#lan', c.stage), msg = $('#lm', c.stage);
    let i = 0, state = 'pause', litAt = 0, flick = false, pen = 0, ids = [];
    const scores = [], rts = [];
    c.score(`0/${P.n}`); c.progress(0);
    function round() {
      if (i >= P.n) {
        const avg = scores.reduce((a, b) => a + b, 0) / P.n;
        const mean = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length / (c.rate || 1)) : null;
        return c.done(avg - pen, mean ? `Réaction moyenne : ${mean} ms` + (pen ? ` · ${pen / 10 > 1 ? pen / 10 + ' leurres touchés' : '1 leurre touché'}` : '') : 'Aucune réaction valide');
      }
      state = 'wait'; flick = false; lan.className = 'lantern'; pad.classList.remove('lit'); c.ok(null);
      msg.textContent = 'Attends la lumière…';
      const d = c.rng.int(P.d[0], P.d[1]);
      if (P.p && i >= 2 && c.rng.chance(P.p)) {
        const ft = c.rng.int(400, Math.max(500, d - 500));
        ids.push(c.later(() => {
          if (state !== 'wait') return;
          flick = true; lan.className = 'lantern flicker';
          ids.push(c.later(() => { if (state === 'wait') lan.className = 'lantern'; }, 150));
        }, ft));
      }
      ids.push(c.later(() => {
        if (state !== 'wait') return;
        state = 'lit'; lan.className = 'lantern lit'; pad.classList.add('lit'); msg.textContent = '';
        litAt = c.now(); c.ok(pad);
        ids.push(c.later(() => {
          if (state !== 'lit') return;
          state = 'pause'; scores.push(0); lan.className = 'lantern'; pad.classList.remove('lit');
          msg.textContent = 'Trop tard !'; c.ok(null); c.bad(pad); next();
        }, c.tm(2000)));
      }, d));
    }
    function next() { i++; c.progress(i / P.n); c.score(`${i}/${P.n}`); c.later(round, 1100); }
    pad.addEventListener('pointerdown', e => {
      e.preventDefault(); if (c.over) return;
      if (state === 'wait') {
        ids.forEach(c.cancel); ids = []; state = 'pause'; scores.push(0);
        if (flick) { pen += 10; msg.textContent = "C'était un leurre ! −10"; } else msg.textContent = 'Trop tôt !';
        lan.className = 'lantern'; c.bad(pad); next();
      } else if (state === 'lit') {
        ids.forEach(c.cancel); ids = [];
        const rt = c.now() - litAt; state = 'pause';
        scores.push(100 * clamp01((P.slow - rt) / (P.slow - P.fast))); rts.push(rt);
        msg.textContent = `${Math.round(rt / (c.rate || 1))} ms`; c.good(pad, false); next();
      }
    });
    round();
  }
};

const G_BATEAUX = {
  id: 'bateaux', name: 'Bateaux, pas requins', cat: 'speed', color: '#D93A1E', fg: '#fff', icon: '⛵',
  rule: () => "Un bateau ⛵ ou un requin 🦈 surgit de l'eau. Touche vite les bateaux, mais ne touche jamais les requins.",
  info: () => '30 secondes',
  run(c) {
    const P = c.L({ F: { go: .85, show: 1100, isi: 1300 }, N: { go: .85, show: 700, isi: 900 }, E: { go: .7, show: 600, isi: 800, move: true } });
    c.stage.innerHTML = `<div class="sea" id="sea"><div class="sea-item" id="it"></div><div class="sea-legend">⛵ oui · 🦈 non</div></div>`;
    const sea = $('#sea', c.stage), it = $('#it', c.stage);
    let goN = 0, nogoN = 0, hits = 0, fa = 0, run = 0, cur = null;
    c.score(0);
    function spawn() {
      if (c.over) return;
      let isGo = c.rng.chance(P.go); if (run >= 4) isGo = false;
      run = isGo ? run + 1 : 0; isGo ? goN++ : nogoN++;
      const me = { go: isGo, tapped: false }; cur = me;
      it.textContent = isGo ? '⛵' : '🦈';
      if (P.move) { it.style.left = (50 + c.rng.int(-25, 25)) + '%'; it.style.top = (50 + c.rng.int(-22, 22)) + '%'; }
      it.className = 'sea-item show';
      if (isGo) c.ok(sea); else c.ok(null);
      const ramp = c.now() < 8000 ? 1.3 : 1;
      c.later(() => { if (cur === me) { cur = null; c.ok(null); if (!me.tapped) it.className = 'sea-item'; } }, c.tm(P.show * ramp));
      c.later(spawn, c.tm(P.isi * ramp) + c.rng.int(-150, 150));
    }
    sea.addEventListener('pointerdown', e => {
      e.preventDefault(); if (c.over || !cur || cur.tapped) return;
      cur.tapped = true;
      if (cur.go) { hits++; it.className = 'sea-item show hit'; c.good(null, false); c.score(hits); }
      else { fa++; c.bad(sea); }
    });
    spawn();
    c.timer(30, () => {
      const H = goN ? hits / goN : 0, FA = nogoN ? fa / nogoN : 0;
      c.done(100 * H * (1 - FA), `${hits}/${goN} bateaux touchés · ${plural(fa, 'requin')} touché${fa > 1 ? 's' : ''}`);
    });
  }
};

const G_VENT = {
  id: 'vent', name: 'Vent contraire', cat: 'speed', color: '#00A6C8', fg: '#1E1B4B', icon: '🧭',
  rule: l => l === 'E'
    ? "Une flèche apparaît d'un côté de l'écran. Touche le côté vers lequel elle pointe, où qu'elle soit. Mais si la lune 🌙 l'accompagne, touche le côté où elle se trouve."
    : "Une flèche apparaît d'un côté de l'écran. Touche le côté vers lequel elle pointe, peu importe où elle se trouve.",
  info: () => '30 secondes',
  run(c) {
    const P = c.L({ F: { cong: .7, moon: 0, target: 39 }, N: { cong: .5, moon: 0, target: 52 }, E: { cong: .5, moon: .3, target: 50 } });
    c.stage.innerHTML = `<div class="hint-lr"><span>← gauche</span><span>droite →</span></div>
      <div class="halves"><button class="half" data-s="0" aria-label="Côté gauche"></button><button class="half" data-s="1" aria-label="Côté droit"></button></div>`;
    const halves = $$('.half', c.stage);
    let ok = 0, ko = 0, ans = -1, ready = false, nt = 0;
    c.score(0);
    function trial() {
      const side = c.rng.int(0, 1);
      const warm = nt++ < 4;
      const cong = warm ? true : c.rng.chance(P.cong);
      const dirLR = cong ? side : 1 - side; // 0 = gauche, 1 = droite
      const moon = warm ? false : c.rng.chance(P.moon);
      ans = moon ? side : dirLR;
      halves.forEach(h => h.innerHTML = '');
      halves[side].innerHTML = arrowSVG(dirLR ? 1 : 3, '#00A6C8') + (moon ? '<span class="moon" aria-label="lune">🌙</span>' : '');
      c.ok(halves[ans]); ready = true;
    }
    halves.forEach(h => h.addEventListener('pointerdown', e => {
      e.preventDefault(); if (c.over || !ready) return;
      ready = false;
      if (+h.dataset.s === ans) { ok++; c.good(h, false); } else { ko++; c.bad(h); }
      c.score(ok);
      halves.forEach(x => x.innerHTML = '');
      c.later(trial, 250);
    }));
    trial();
    c.timer(30, () => c.done(100 * clamp01((ok - ko) / P.target), `${bonnes(ok)} · ${plural(ko, 'erreur')}`));
  }
};

const G_CONSTEL = {
  id: 'constellation', name: 'Constellation', cat: 'speed', color: '#7A3FF2', fg: '#fff', icon: '⭐',
  rule: l => l === 'F'
    ? "La carte du haut montre l'étoile à trouver. Repère-la dans le ciel et touche-la. Une nouvelle constellation arrive aussitôt."
    : "La carte du haut montre l'étoile à trouver. Attention : les autres ont la même forme ou la même couleur. Seule la bonne a les deux.",
  info: () => '30 secondes',
  run(c) {
    const P = c.L({ F: { n: 8, conj: false, target: 23, rot: 0 }, N: { n: 14, conj: true, target: 25, rot: 0 }, E: { n: 20, conj: true, target: 27, rot: 20 } });
    c.stage.innerHTML = `<div class="target-card" id="tc" aria-live="polite"></div><div class="sky" id="sky"></div>`;
    const sky = $('#sky', c.stage), tc = $('#tc', c.stage);
    let found = 0, err = 0;
    c.score(0);
    function gen() {
      const t = { s: c.rng.int(0, 3), k: c.rng.int(0, 3) };
      tc.innerHTML = `Trouve : <span style="width:40px;height:40px;display:inline-block">${shapeSVG(t.s, COLORS[t.k].h, 0, '')}</span> ${SHAPES[t.s]} ${COLORS[t.k].n}`;
      const W = sky.clientWidth, H = sky.clientHeight;
      const items = [{ ...t, target: true }];
      for (let i = 1; i < P.n; i++) {
        let d;
        if (!P.conj) { d = { s: c.rng.int(0, 3), k: (t.k + c.rng.int(1, 3)) % 4 }; }
        else if (c.rng.chance(.5)) { d = { s: t.s, k: (t.k + c.rng.int(1, 3)) % 4 }; }
        else { d = { s: (t.s + c.rng.int(1, 3)) % 4, k: t.k }; }
        items.push(d);
      }
      c.rng.shuffle(items);
      const pts = scatter(c.rng, items.length, W, H, 28, 56);
      sky.innerHTML = '';
      items.forEach((it, i) => {
        const b = document.createElement('button');
        b.className = 'star';
        b.style.left = (pts[i].x - 26) + 'px'; b.style.top = (pts[i].y - 26) + 'px';
        b.setAttribute('aria-label', `${SHAPES[it.s]} ${COLORS[it.k].n}`);
        b.innerHTML = shapeSVG(it.s, COLORS[it.k].h, P.rot ? c.rng.int(-P.rot, P.rot) : 0);
        if (it.target) c.ok(b);
        b.addEventListener('pointerdown', e => {
          e.preventDefault(); e.stopPropagation(); if (c.over) return;
          if (it.target) { found++; c.score(found); c.good(b, false); gen(); }
          else { err++; c.bad(b); }
        });
        sky.appendChild(b);
      });
    }
    requestAnimationFrame(gen);
    c.timer(30, () => c.done(100 * clamp01((found - 0.5 * err) / P.target), `${plural(found, 'étoile')} trouvée${found > 1 ? 's' : ''} · ${plural(err, 'erreur')}`));
  }
};

const G_GUE = {
  id: 'gue', name: 'Le gué de pierres', cat: 'speed', color: '#8B5A2B', fg: '#fff', icon: '🪨',
  rule: () => "Un calcul s'affiche au-dessus de la rivière. Touche la pierre qui porte le bon résultat pour avancer. Cinq bonnes réponses d'affilée rapportent un bonus.",
  info: () => '30 secondes',
  run(c) {
    const P = c.L({ F: { target: 9 }, N: { target: 16 }, E: { target: 25 } });
    c.stage.innerHTML = `<div class="ford"><div class="prompt" id="q" aria-live="polite"></div><div class="streak" id="st"></div><div class="stones" id="stones"></div></div>`;
    const q = $('#q', c.stage), stones = $('#stones', c.stage), st = $('#st', c.stage);
    let good = 0, bonus = 0, err = 0, streak = 0;
    c.score(0);
    function make() {
      const r = c.rng, lvl = c.level;
      let txt, ans, wrong;
      if (lvl === 'F') {
        if (r.chance(.5)) { const a = r.int(1, 19), b = r.int(1, 20 - a); txt = `${a} + ${b}`; ans = a + b; wrong = Math.abs(a - b); }
        else { const a = r.int(2, 20), b = r.int(1, a); txt = `${a} − ${b}`; ans = a - b; wrong = a + b; }
      } else if (lvl === 'N') {
        const t = r.int(0, 2), miss = r.chance(.3);
        if (t === 0) { const a = r.int(5, 60), b = r.int(2, 100 - a); ans = a + b; wrong = a - b; txt = miss ? `${a} + ? = ${a + b}` : `${a} + ${b}`; if (miss) { ans = b; wrong = a + b - 1; } }
        else if (t === 1) { const a = r.int(10, 100), b = r.int(2, a); ans = a - b; wrong = a + b; txt = miss ? `${a} − ? = ${a - b}` : `${a} − ${b}`; if (miss) { ans = b; wrong = a - b; } }
        else { const a = r.int(2, 5), b = r.int(1, 10); ans = a * b; wrong = a + b; txt = miss ? `${a} × ? = ${a * b}` : `${a} × ${b}`; if (miss) { ans = b; wrong = b + 1; } }
      } else {
        const t = r.int(0, 2);
        if (t === 0) { const a = r.int(2, 10), b = r.int(2, 10); txt = `${a} × ${b}`; ans = a * b; wrong = a + b; }
        else if (t === 1) { const a = r.int(2, 10), b = r.int(2, 10); txt = `${a * b} ÷ ${a}`; ans = b; wrong = a; }
        else { const a = r.int(1, 20), b = r.int(2, 9), cc = r.int(2, 9); txt = `${a} + ${b} × ${cc}`; ans = a + b * cc; wrong = (a + b) * cc; }
      }
      const cand = r.shuffle([ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10, wrong]).filter(v => v >= 0 && v !== ans);
      const opts = [ans];
      for (const v of cand) { if (opts.length >= 3) break; if (!opts.includes(v)) opts.push(v); }
      let k = 3; while (opts.length < 3) { if (!opts.includes(ans + k)) opts.push(ans + k); k++; }
      return { txt, ans, opts: r.shuffle(opts) };
    }
    function next() {
      const Q = make();
      q.textContent = Q.txt.includes('?') ? Q.txt : Q.txt + ' = ?';
      stones.innerHTML = '';
      Q.opts.forEach(v => {
        const b = document.createElement('button'); b.className = 'stone'; b.textContent = v;
        if (v === Q.ans) c.ok(b);
        b.addEventListener('pointerdown', e => {
          e.preventDefault(); if (c.over) return;
          if (v === Q.ans) {
            good++; streak++; c.good(b, true);
            if (streak % 5 === 0) { bonus++; st.textContent = `Série de ${streak} ! +1 bonus`; } else st.textContent = streak >= 2 ? `Série : ${streak}` : '';
          } else { err++; streak = 0; st.textContent = ''; c.bad(b); }
          c.score(good + bonus); next();
        });
        stones.appendChild(b);
      });
    }
    next();
    c.timer(30, () => c.done(100 * clamp01((good + bonus - 0.5 * err) / P.target), `${bonnes(good)}${bonus ? ` + ${bonus} bonus` : ''} · ${plural(err, 'erreur')}`));
  }
};

const G_LUCIOLES = {
  id: 'lucioles', name: 'Nuées de lucioles', cat: 'speed', color: '#7CC242', fg: '#1E1B4B', icon: '✨',
  rule: () => "Deux nuées de lucioles brillent un court instant, une de chaque côté. Pas le temps de compter : touche le côté où il y en avait le plus.",
  info: () => '20 essais',
  run(c) {
    const P = c.L({
      F: { r: [4, 16], ratios: [1.4, 1.33], show: 1200 },
      N: { r: [8, 30], ratios: [1.2], show: 800 },
      E: { r: [15, 45], ratios: [1.17, 1.14], show: 500 }
    });
    const N = 20;
    c.stage.innerHTML = `<div class="question" id="qq" aria-live="polite"></div>
      <div class="banks"><button class="bank" data-s="0" aria-label="Côté gauche"></button><button class="bank" data-s="1" aria-label="Côté droit"></button></div>`;
    const banks = $$('.bank', c.stage), qq = $('#qq', c.stage);
    const areaMode = c.rng.shuffle(Array.from({ length: N }, (_, i) => i % 2 === 0));
    let i = 0, ok = 0, big = -1, ready = false;
    c.score(0); c.progress(0);
    function drawBank(bank, n, rad) {
      const W = bank.clientWidth, H = bank.clientHeight;
      const pts = scatter(c.rng, n, W, H, rad + 6, rad * 2.4);
      bank.innerHTML = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${pts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${rad.toFixed(1)}" fill="#E8FF7A" stroke="#B7E000" stroke-width="2"/>`).join('')}</svg>`;
    }
    function trial() {
      if (i >= N) { const acc = ok / N; return c.done(100 * clamp01((acc - 0.5) / 0.5), `${ok}/${N} bonnes réponses`); }
      const ratio = c.rng.pick(P.ratios);
      const n1 = c.rng.int(P.r[0], Math.max(P.r[0], Math.floor(P.r[1] / ratio)));
      let n2 = Math.round(n1 * ratio); if (n2 <= n1) n2 = n1 + 1;
      big = c.rng.int(0, 1);
      const W = banks[0].clientWidth, H = banks[0].clientHeight;
      const r0 = Math.max(5, Math.min(14, Math.sqrt(W * H * 0.22 / (Math.PI * n2))));
      const rBig = areaMode[i] ? r0 * Math.sqrt(n1 / n2) : r0;
      drawBank(banks[big], n2, rBig); drawBank(banks[1 - big], n1, r0);
      qq.textContent = 'Regarde bien…';
      ready = false;
      c.later(() => {
        banks.forEach(b => b.innerHTML = '<div class="cover">?</div>');
        qq.textContent = 'Où y en avait-il le plus ?'; c.ok(banks[big]); ready = true;
      }, c.tm(P.show));
    }
    banks.forEach(b => b.addEventListener('pointerdown', e => {
      e.preventDefault(); if (c.over || !ready) return;
      ready = false; i++; c.ok(null);
      if (+b.dataset.s === big) { ok++; c.good(b, false); qq.textContent = 'Bien vu !'; } else { c.bad(b); qq.textContent = "C'était l'autre côté."; }
      c.score(ok); c.progress(i / N);
      c.later(trial, 450);
    }));
    requestAnimationFrame(trial);
  }
};

/* =========================================================
   LOGIQUE
   ========================================================= */

const G_PHARES = {
  id: 'phares', name: "Les phares de l'archipel", cat: 'logic', color: '#1F5FE0', fg: '#fff', icon: '🔦',
  rule: l => "Des phares s'allument l'un après l'autre. Quand c'est ton tour, rallume-les dans le même ordre. La série s'allonge à chaque réussite."
    + (l === 'E' ? ' Un éclat rouge est un faux signal : ignore-le.' : ''),
  info: l => ({ F: '3 essais ratés max', N: '2 essais ratés max', E: '2 essais ratés max' })[l],
  run(c) {
    const P = c.L({
      F: { n: 6, start: 2, on: 900, off: 300, fake: false, target: 7, fails: 3 },
      N: { n: 9, start: 3, on: 700, off: 250, fake: false, target: 9, fails: 2 },
      E: { n: 9, start: 3, on: 450, off: 200, fake: true, target: 9, fails: 2 }
    });
    c.stage.innerHTML = `<div class="memmsg" id="mm" aria-live="polite"></div><div class="map" id="map"></div>`;
    const map = $('#map', c.stage), mm = $('#mm', c.stage);
    let beacons = [], seq = [], input = 0, len = P.start, best = 0, fails = 0, seqs = 0, locked = true;
    c.score(0); c.progress(1);
    function build() {
      const W = map.clientWidth, H = map.clientHeight;
      for (let k = 0; k < 5; k++) {
        const s = document.createElement('div'); s.className = 'isl';
        const sz = c.rng.int(60, 140);
        s.style.cssText = `width:${sz}px;height:${sz * 0.7}px;left:${c.rng.int(0, W - sz)}px;top:${c.rng.int(0, H - sz * 0.7)}px`;
        map.appendChild(s);
      }
      const pts = scatter(c.rng, P.n, W, H, 38, 74);
      beacons = pts.map((p, i) => {
        const b = document.createElement('button'); b.className = 'beacon';
        b.style.left = p.x + 'px'; b.style.top = p.y + 'px';
        b.setAttribute('aria-label', `Phare ${i + 1}`);
        b.addEventListener('pointerdown', e => { e.preventDefault(); press(i); });
        map.appendChild(b); return b;
      });
      round();
    }
    function flash(i, cls, ms) { beacons[i].classList.add(cls); c.later(() => beacons[i].classList.remove(cls), ms); }
    function round() {
      if (fails >= P.fails || seqs >= 10) {
        return c.done(100 * clamp01(best / P.target), best ? `Plus longue série retenue : ${best} phares` : 'Aucune série complète');
      }
      locked = true; input = 0; seq = [];
      for (let k = 0; k < len; k++) { let v; do { v = c.rng.int(0, P.n - 1); } while (k && v === seq[k - 1]); seq.push(v); }
      const show = seq.map(v => ({ v, fake: false }));
      if (P.fake && len >= 4) {
        const pos = c.rng.int(1, show.length - 1);
        let fv; do { fv = c.rng.int(0, P.n - 1); } while (fv === show[pos - 1].v);
        show.splice(pos, 0, { v: fv, fake: true });
      }
      mm.textContent = `Regarde bien… (${len} phares)`;
      const on = c.tm(P.on), step = on + c.tm(P.off);
      show.forEach((s, k) => c.later(() => { flash(s.v, s.fake ? 'fake' : 'on', on); c.beep(s.fake ? 300 : 660); }, 600 + k * step));
      c.later(() => { locked = false; mm.textContent = 'À toi !'; c.ok(beacons[seq[0]]); }, 600 + show.length * step);
    }
    function press(i) {
      if (c.over || locked) return;
      if (i === seq[input]) {
        flash(i, 'on', 220); input++; c.ok(input < seq.length ? beacons[seq[input]] : null);
        if (input === seq.length) {
          locked = true; seqs++; best = Math.max(best, len); c.score(best); len++;
          mm.textContent = 'Bravo !'; c.good(null, false);
          c.later(round, 900);
        }
      } else {
        locked = true; seqs++; fails++; c.ok(null); c.bad(beacons[i]);
        beacons[i].classList.add('bad'); flash(seq[input], 'on', 900);
        mm.textContent = fails >= P.fails ? "C'est fini pour cette fois." : `Raté ! Encore ${P.fails - fails} essai${P.fails - fails > 1 ? 's' : ''}.`;
        c.later(() => { beacons[i].classList.remove('bad'); round(); }, 1300);
      }
    }
    requestAnimationFrame(build);
  }
};

const G_COLLIER = {
  id: 'collier', name: 'Le collier de coquillages', cat: 'logic', color: '#FF8FB1', fg: '#1E1B4B', icon: '🐚',
  rule: l => "Les coquillages du collier suivent une règle cachée (forme, couleur ou nombre de points). Touche celui qui vient ensuite."
    + (l === 'F' ? '' : ' Plusieurs choses peuvent changer en même temps.'),
  info: () => '8 colliers',
  run(c) {
    const P = c.L({ F: { vary: 1, len: 4, ch: 3, lim: 14 }, N: { vary: 2, len: 5, ch: 4, lim: 12 }, E: { vary: 3, len: 6, ch: 4, lim: 11 } });
    const ROUNDS = 8;
    c.stage.innerHTML = `<div class="necklace" id="nk"></div><p class="muted small" style="text-align:center;margin:0">Lequel vient ensuite ?</p><div class="answers c${P.ch === 3 ? 3 : 2}" id="ch"></div>`;
    const nk = $('#nk', c.stage), ch = $('#ch', c.stage);
    let r = 0, total = 0, okN = 0, stopT = null;
    c.score(0);
    const key = b => `${b.shape}-${b.color}-${b.dots}`;
    function ruleFor(attr) {
      const R = c.rng, L = P.len + 1;
      const types = attr === 'dots' ? ['cycle2', 'cycle3', 'inc'] : ['cycle2', 'cycle3', 'inc'];
      const t = R.pick(types);
      if (attr === 'dots') {
        if (t === 'inc') { const s = R.int(1, Math.max(1, 7 - L + 1)); return i => s + i; }
        const vals = R.shuffle([1, 2, 3, 4, 5]).slice(0, t === 'cycle2' ? 2 : 3); return i => vals[i % vals.length];
      }
      if (t === 'inc') { const s = R.int(0, 3); return i => (s + i) % 4; }
      const vals = R.shuffle([0, 1, 2, 3]).slice(0, t === 'cycle2' ? 2 : 3); return i => vals[i % vals.length];
    }
    function gen() {
      const R = c.rng;
      let attrs;
      if (P.vary === 1) attrs = [R.chance(.5) ? 'color' : 'dots'];
      else attrs = R.shuffle(['shape', 'color', 'dots']).slice(0, P.vary);
      const base = { shape: R.int(0, 3), color: R.int(0, 3), dots: R.int(1, 4) };
      const rules = {};
      attrs.forEach(a => { rules[a] = (P.vary === 1 && a === 'color') ? (() => { const v = R.shuffle([0, 1, 2, 3]).slice(0, 2); return i => v[i % 2]; })() : ruleFor(a); });
      const seq = [];
      for (let i = 0; i <= P.len; i++) {
        const b = { ...base }; attrs.forEach(a => b[a] = rules[a](i)); seq.push(b);
      }
      const ans = seq[P.len];
      const opts = [ans], seen = new Set([key(ans)]);
      let guard = 0;
      while (opts.length < P.ch && guard++ < 200) {
        const a = R.pick(['shape', 'color', 'dots']);
        const d = { ...ans };
        if (a === 'dots') d.dots = R.int(1, 7); else d[a] = R.int(0, 3);
        if (!seen.has(key(d))) { seen.add(key(d)); opts.push(d); }
      }
      return { seq: seq.slice(0, P.len), ans, opts: R.shuffle(opts) };
    }
    function next() {
      if (r >= ROUNDS) return c.done(total, `${okN}/${ROUNDS} colliers complétés`);
      c.progress(1);
      const Q = gen();
      nk.innerHTML = Q.seq.map(b => `<div class="bead">${beadSVG(b)}</div>`).join('') + '<div class="qslot">?</div>';
      ch.innerHTML = '';
      let answered = false;
      const limit = c.tm(P.lim * 1000), t0 = c.now();
      stopT = c.timer(P.lim, () => { if (answered) return; answered = true; const g2 = $('[data-ok]', ch); if (g2) g2.classList.add('reveal'); r++; c.later(next, 900); });
      Q.opts.forEach(o => {
        const b = document.createElement('button'); b.className = 'ans'; b.innerHTML = beadSVG(o);
        const right = key(o) === key(Q.ans);
        if (right) b.dataset.ok = '1';
        b.addEventListener('pointerdown', e => {
          e.preventDefault(); if (c.over || answered) return; answered = true; stopT();
          if (right) { okN++; total += (100 / ROUNDS) * (0.7 + 0.3 * clamp01(1 - (c.now() - t0) / limit)); c.good(b, true); }
          else { c.bad(b); const g = $('[data-ok]', ch); if (g) g.classList.add('reveal'); }
          c.score(okN); r++;
          c.later(next, right ? 350 : 800);
        });
        ch.appendChild(b);
      });
    }
    next();
  }
};

/* --- polyominos pour le récif --- */
const PX = {
  norm(cells) {
    const mx = Math.min(...cells.map(p => p[0])), my = Math.min(...cells.map(p => p[1]));
    return cells.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  },
  key(cells) { return PX.norm(cells).map(p => p.join(',')).join(';'); },
  rot(cells) { return cells.map(([x, y]) => [-y, x]); },
  rotN(cells, n) { let r = cells; for (let i = 0; i < n; i++) r = PX.rot(r); return PX.norm(r); },
  mir(cells) { return PX.norm(cells.map(([x, y]) => [-x, y])); },
  rotKeys(cells) { return [0, 1, 2, 3].map(n => PX.key(PX.rotN(cells, n))); },
  allKeys(cells) { return [...PX.rotKeys(cells), ...PX.rotKeys(PX.mir(cells))]; },
  connected(cells) {
    const S = new Set(cells.map(p => p.join(','))), seen = new Set([cells[0].join(',')]), st = [cells[0]];
    while (st.length) { const [x, y] = st.pop(); for (let d = 0; d < 4; d++) { const k = (x + DX[d]) + ',' + (y + DY[d]); if (S.has(k) && !seen.has(k)) { seen.add(k); st.push([x + DX[d], y + DY[d]]); } } }
    return seen.size === cells.length;
  },
  fits(cells) { const n = PX.norm(cells); return Math.max(...n.map(p => p[0])) < 5 && Math.max(...n.map(p => p[1])) < 5; },
  grow(rng, k) {
    for (let t = 0; t < 200; t++) {
      const cells = [[0, 0]], S = new Set(['0,0']);
      while (cells.length < k) {
        const [x, y] = rng.pick(cells), d = rng.int(0, 3), nx = x + DX[d], ny = y + DY[d];
        if (!S.has(nx + ',' + ny)) { S.add(nx + ',' + ny); cells.push([nx, ny]); }
      }
      if (PX.fits(cells)) return PX.norm(cells);
    }
    return [[0, 0], [1, 0], [2, 0], [2, 1]].slice(0, k);
  },
  chiral(cells) { return !PX.rotKeys(cells).includes(PX.key(PX.mir(cells))); },
  ext(cells) { const n = PX.norm(cells); return Math.max(Math.max(...n.map(p => p[0])), Math.max(...n.map(p => p[1]))) + 1; },
  svg(cells, color = '#FF6F59', size) {
    const n = PX.norm(cells), w = Math.max(...n.map(p => p[0])) + 1, h = Math.max(...n.map(p => p[1])) + 1, s = size || Math.max(w, h);
    const ox = (s - w) / 2, oy = (s - h) / 2;
    return `<svg viewBox="-0.15 -0.15 ${s + 0.3} ${s + 0.3}" aria-hidden="true">${n.map(([x, y]) => `<rect x="${x + ox}" y="${y + oy}" width="1" height="1" rx=".18" fill="${color}" stroke="#1E1B4B" stroke-width=".09"/>`).join('')}</svg>`;
  }
};

const G_RECIF = {
  id: 'recif', name: 'Le récif tourné', cat: 'logic', color: '#B5179E', fg: '#fff', icon: '🧩',
  rule: l => "Voici un récif de corail vu d'en haut. Parmi les propositions, touche le même récif, simplement tourné."
    + (l === 'F' ? '' : ' Attention aux récifs retournés comme dans un miroir : ils ne comptent pas.'),
  info: () => '8 récifs',
  run(c) {
    const P = c.L({ F: { k: 4, ch: 4, mir: 0, lim: 10, rots: [1, 3] }, N: { k: 5, ch: 4, mir: 1, lim: 12, rots: [1, 2, 3] }, E: { k: 6, ch: 4, mir: 2, lim: 7, rots: [1, 2, 3] } });
    const ROUNDS = 8;
    c.stage.innerHTML = `<div class="reef-model" id="rm"></div><p class="muted small" style="text-align:center;margin:0">Lequel est le même, tourné ?</p><div class="answers c${P.ch === 3 ? 3 : 2}" id="ch"></div>`;
    const rm = $('#rm', c.stage), ch = $('#ch', c.stage);
    let r = 0, total = 0, okN = 0;
    c.score(0);
    function moveOne(S) {
      for (let t = 0; t < 100; t++) {
        const cells = S.map(p => [...p]); const idx = c.rng.int(0, cells.length - 1); cells.splice(idx, 1);
        const [x, y] = c.rng.pick(cells), d = c.rng.int(0, 3), nc = [x + DX[d], y + DY[d]];
        if (cells.some(p => p[0] === nc[0] && p[1] === nc[1])) continue;
        cells.push(nc);
        if (PX.connected(cells) && PX.fits(cells)) return PX.norm(cells);
      }
      return PX.grow(c.rng, S.length);
    }
    function gen() {
      let S; do { S = PX.grow(c.rng, P.k); } while (!PX.chiral(S));
      const forbidden = new Set(PX.allKeys(S));
      const sk = PX.key(S), rotsOk = P.rots.filter(n => PX.key(PX.rotN(S, n)) !== sk);
      const ans = PX.rotN(S, c.rng.pick(rotsOk.length ? rotsOk : [1, 2, 3].filter(n => PX.key(PX.rotN(S, n)) !== sk)));
      const opts = [{ cells: ans, ok: true }], used = new Set([PX.key(ans)]);
      const mirr = PX.mir(S), mirRots = c.rng.shuffle([0, 1, 2, 3]);
      for (let m = 0; m < P.mir; m++) {
        const d = PX.rotN(mirr, mirRots[m]);
        if (!used.has(PX.key(d))) { used.add(PX.key(d)); opts.push({ cells: d, ok: false }); }
      }
      let guard = 0;
      while (opts.length < P.ch && guard++ < 300) {
        const D = c.level === 'F' ? PX.grow(c.rng, P.k) : moveOne(S);
        const ks = PX.allKeys(D);
        if (ks.some(k => forbidden.has(k))) continue;
        if (opts.some(o => !o.ok && PX.allKeys(o.cells).includes(PX.key(D)))) continue;
        const shown = PX.rotN(D, c.rng.int(0, 3));
        if (used.has(PX.key(shown))) continue;
        used.add(PX.key(shown)); opts.push({ cells: shown, ok: false });
      }
      return { S, opts: c.rng.shuffle(opts) };
    }
    function next() {
      if (r >= ROUNDS) return c.done(total, `${okN}/${ROUNDS} récifs reconnus`);
      const Q = gen();
      const SZ = Math.max(PX.ext(Q.S), ...Q.opts.map(o => PX.ext(o.cells)));
      rm.innerHTML = PX.svg(Q.S, '#FF6F59', SZ);
      ch.innerHTML = '';
      let answered = false;
      const limit = c.tm(P.lim * 1000), t0 = c.now();
      const stop = c.timer(P.lim, () => { if (answered) return; answered = true; const g2 = $('[data-ok]', ch); if (g2) g2.classList.add('reveal'); r++; c.later(next, 900); });
      Q.opts.forEach(o => {
        const b = document.createElement('button'); b.className = 'ans reef'; b.innerHTML = PX.svg(o.cells, '#FF9F80', SZ);
        b.setAttribute('aria-label', 'Proposition ' + 'ABCD'[ch.children.length]);
        if (o.ok) b.dataset.ok = '1';
        b.addEventListener('pointerdown', e => {
          e.preventDefault(); if (c.over || answered) return; answered = true; stop();
          if (o.ok) { okN++; total += (100 / ROUNDS) * (0.7 + 0.3 * clamp01(1 - (c.now() - t0) / limit)); c.good(b, true); }
          else { c.bad(b); const g = $('[data-ok]', ch); if (g) g.classList.add('reveal'); }
          c.score(okN); r++;
          c.later(next, o.ok ? 350 : 900);
        });
        ch.appendChild(b);
      });
    }
    next();
  }
};

const G_COURANTS = {
  id: 'courants', name: 'Les courants', cat: 'logic', color: '#2EC4B6', fg: '#1E1B4B', icon: '🌊',
  rule: l => "La barque ⛵ part de sa case et suit les flèches des courants, case après case. Touche l'île 🏝️ où elle va accoster."
    + (l === 'E' ? " Un tourbillon 🌀 fait tourner son courant d'un quart de tour dans le sens des aiguilles d'une montre." : ''),
  info: () => '6 traversées',
  run(c) {
    const P = c.L({ F: { n: 4, L: [5, 6], isl: 3, wh: 0, lim: 20 }, N: { n: 5, L: [8, 10], isl: 4, wh: 0, lim: 12 }, E: { n: 6, L: [9, 12], isl: 4, wh: 1, lim: 12 } });
    const ROUNDS = 6;
    c.stage.innerHTML = `<div class="cgrid" id="cg"></div>`;
    const cg = $('#cg', c.stage);
    let r = 0, total = 0, okN = 0;
    c.score(0);
    function gen() {
      const n = P.n, R = c.rng;
      for (let att = 0; att < 2000; att++) {
        const L = R.int(P.L[0], P.L[1]);
        const side = R.int(0, 3), p = R.int(0, n - 1);
        const start = side === 0 ? [p, 0] : side === 1 ? [n - 1, p] : side === 2 ? [p, n - 1] : [0, p];
        const path = [start], vis = new Set([start.join(',')]);
        while (path.length < L) {
          const [x, y] = path[path.length - 1];
          const opts = [0, 1, 2, 3].filter(d => { const nx = x + DX[d], ny = y + DY[d]; return nx >= 0 && ny >= 0 && nx < n && ny < n && !vis.has(nx + ',' + ny); });
          if (!opts.length) break;
          const d = R.pick(opts); const nc = [x + DX[d], y + DY[d]]; path.push(nc); vis.add(nc.join(','));
        }
        if (path.length < L) continue;
        const [lx, ly] = path[L - 1];
        const exits = [0, 1, 2, 3].filter(d => { const nx = lx + DX[d], ny = ly + DY[d]; return nx < 0 || ny < 0 || nx >= n || ny >= n; });
        if (!exits.length) continue;
        const ex = R.pick(exits);
        const dirs = {};
        for (let i = 0; i < L - 1; i++) { const [a, b] = path[i], [cx, cy] = path[i + 1]; dirs[a + ',' + b] = [0, 1, 2, 3].find(d => a + DX[d] === cx && b + DY[d] === cy); }
        dirs[lx + ',' + ly] = ex;
        const exitRing = [lx + DX[ex] + 1, ly + DY[ex] + 1];
        // anneau des îles possibles
        const ring = [];
        for (let i = 1; i <= n; i++) ring.push([i, 0], [i, n + 1], [0, i], [n + 1, i]);
        const sr = [start[0] + 1, start[1] + 1];
        const decoys = R.shuffle(ring.filter(([a, b]) => !(a === exitRing[0] && b === exitRing[1]) && Math.abs(a - sr[0]) + Math.abs(b - sr[1]) > 1)).slice(0, P.isl - 1);
        const whirl = new Set();
        if (P.wh) { const cand = R.shuffle(path.slice(1).map(p => p.join(','))); cand.slice(0, R.int(1, P.wh)).forEach(k => whirl.add(k)); }
        return { n, start, dirs, exitRing, decoys, whirl };
      }
      return null;
    }
    function next() {
      if (r >= ROUNDS) return c.done(total, `${okN}/${ROUNDS} barques bien suivies`);
      const Q = gen(), n = Q.n, M = n + 2;
      cg.style.gridTemplateColumns = `repeat(${M},1fr)`;
      cg.innerHTML = '';
      let answered = false;
      const limit = c.tm(P.lim * 1000), t0 = c.now();
      const stop = c.timer(P.lim, () => { if (answered) return; answered = true; const g2 = $('[data-ok]', cg); if (g2) g2.classList.add('reveal'); r++; c.later(next, 1000); });
      const isles = [Q.exitRing, ...Q.decoys].map(p => p.join(','));
      for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) {
        const inner = x >= 1 && y >= 1 && x <= n && y <= n;
        const k = x + ',' + y;
        if (inner) {
          const gx = x - 1, gy = y - 1, gk = gx + ',' + gy;
          const d = document.createElement('div'); d.className = 'cg cell';
          let dir = Q.dirs[gk];
          if (dir === undefined) dir = c.rng.int(0, 3);
          const shown = Q.whirl.has(gk) ? (dir + 3) % 4 : dir;
          d.innerHTML = arrowSVG(shown, '#fff');
          if (gx === Q.start[0] && gy === Q.start[1]) { d.classList.add('start'); d.innerHTML += '<span class="boat">⛵</span>'; }
          if (Q.whirl.has(gk)) d.innerHTML += '<span class="whirl">🌀</span>';
          cg.appendChild(d);
        } else if (isles.includes(k)) {
          const b = document.createElement('button'); b.className = 'cg isle'; b.textContent = '🏝️'; b.setAttribute('aria-label', y === 0 ? `Île en haut, colonne ${x}` : y === M - 1 ? `Île en bas, colonne ${x}` : x === 0 ? `Île à gauche, ligne ${y}` : `Île à droite, ligne ${y}`);
          const ok = k === Q.exitRing.join(','); if (ok) b.dataset.ok = '1';
          b.addEventListener('pointerdown', e => {
            e.preventDefault(); if (c.over || answered) return; answered = true; stop();
            if (ok) { okN++; total += (100 / ROUNDS) * (0.7 + 0.3 * clamp01(1 - (c.now() - t0) / limit)); c.good(b, true); }
            else { c.bad(b); const g = $('[data-ok]', cg); if (g) g.classList.add('reveal'); }
            c.score(okN); r++;
            c.later(next, ok ? 400 : 1000);
          });
          cg.appendChild(b);
        } else { const d = document.createElement('div'); d.className = 'cg'; cg.appendChild(d); }
      }
    }
    next();
  }
};

/* --- énigmes des cabines --- */
const ANIMALS = [
  { e: '🐱', n: 'chat', le: 'le', du: 'du' }, { e: '🐶', n: 'chien', le: 'le', du: 'du' },
  { e: '🐰', n: 'lapin', le: 'le', du: 'du' }, { e: '🐸', n: 'grenouille', le: 'la', du: 'de la' },
  { e: '🐟', n: 'poisson', le: 'le', du: 'du' }
];
const LE = a => `${a.le[0].toUpperCase() + a.le.slice(1)} ${a.e} ${a.n}`;
const DU = a => `${a.du} ${a.e} ${a.n}`;
function perms(n) { const out = [], a = [...Array(n).keys()]; const rec = k => { if (k === n) { out.push(a.slice()); return; } for (let i = k; i < n; i++) { [a[k], a[i]] = [a[i], a[k]]; rec(k + 1); [a[k], a[i]] = [a[i], a[k]]; } }; rec(0); return out; }

const G_CABINES = {
  id: 'cabines', name: 'Les cabines de plage', cat: 'logic', color: '#0B7A42', fg: '#fff', icon: '🏖️',
  rule: () => "Lis les indices, puis range chaque animal dans sa cabine : touche un animal, puis une cabine. Quand tout est rangé, valide.",
  info: l => ({ F: '4 énigmes', N: '4 énigmes', E: '3 énigmes' })[l],
  run(c) {
    const P = c.L({
      F: { n: 3, tpl: ['end', 'mid', 'left'], max: 3, puz: 4, lim: 40, neg: false },
      N: { n: 4, tpl: ['end', 'mid', 'left', 'next', 'adj', 'nadj', 'notin'], max: 5, puz: 4, lim: 45, neg: false },
      E: { n: 5, tpl: ['end', 'mid', 'left', 'next', 'adj', 'nadj', 'notin'], max: 6, puz: 3, lim: 40, neg: true }
    });
    let pz = 0, total = 0, perfect = 0;
    c.score(0);
    function clueList(sol, animals) {
      // sol[pos] = indice animal ; renvoie tous les indices vrais
      const n = sol.length, pos = {}; sol.forEach((a, p) => pos[a] = p);
      const out = [];
      const A = i => animals[i];
      animals.forEach((_, x) => {
        if (P.tpl.includes('end')) { if (pos[x] === 0) out.push({ t: `${LE(A(x))} est dans la cabine tout à gauche.`, f: s => s[0] === x }); if (pos[x] === n - 1) out.push({ t: `${LE(A(x))} est dans la cabine tout à droite.`, f: s => s[n - 1] === x }); }
        if (P.tpl.includes('mid') && n % 2 === 1 && pos[x] === (n - 1) / 2) out.push({ t: `${LE(A(x))} est dans la cabine du milieu.`, f: s => s[(n - 1) / 2] === x });
        if (P.tpl.includes('notin')) for (let k = 0; k < n; k++) if (pos[x] !== k) out.push({ t: `${LE(A(x))} n'est pas dans la cabine ${k + 1}.`, f: s => s[k] !== x, neg: true });
        animals.forEach((_, y) => {
          if (x === y) return;
          const pi = s => s.indexOf(x), pj = s => s.indexOf(y);
          if (P.tpl.includes('left') && pos[x] < pos[y]) out.push({ t: `${LE(A(x))} est quelque part à gauche ${DU(A(y))}.`, f: s => pi(s) < pj(s) });
          if (P.tpl.includes('next') && pos[x] === pos[y] + 1) out.push({ t: `${LE(A(x))} est juste à droite ${DU(A(y))}.`, f: s => pi(s) === pj(s) + 1 });
          if (x < y && P.tpl.includes('adj') && Math.abs(pos[x] - pos[y]) === 1) out.push({ t: `${LE(A(x))} est juste à côté ${DU(A(y))}.`, f: s => Math.abs(pi(s) - pj(s)) === 1 });
          if (x < y && P.tpl.includes('nadj') && Math.abs(pos[x] - pos[y]) > 1) out.push({ t: `${LE(A(x))} n'est pas à côté ${DU(A(y))}.`, f: s => Math.abs(pi(s) - pj(s)) !== 1, neg: true });
        });
      });
      return out;
    }
    function gen() {
      const all = perms(P.n);
      let best = null;
      for (let att = 0; att < 200; att++) {
        const animals = c.rng.shuffle(ANIMALS.slice()).slice(0, P.n);
        const sol = c.rng.pick(all);
        const clues = c.rng.shuffle(clueList(sol, animals));
        let cand = all, chosen = [];
        for (const cl of clues) {
          const nc = cand.filter(cl.f);
          if (nc.length < cand.length) { chosen.push(cl); cand = nc; }
          if (cand.length === 1) break;
        }
        if (cand.length !== 1) continue;
        // retirer les indices devenus inutiles
        for (let i = chosen.length - 1; i >= 0; i--) {
          const rest = chosen.filter((_, j) => j !== i);
          if (all.filter(s => rest.every(cl => cl.f(s))).length === 1) chosen = rest;
        }
        if (P.neg && !chosen.some(cl => cl.neg)) continue;
        const res = { animals, sol, clues: c.rng.shuffle(chosen) };
        if (chosen.length <= P.max) return res;
        if (!best || chosen.length < best.clues.length) best = res;
      }
      return best;
    }
    function next() {
      if (pz >= (c.practice ? 2 : P.puz)) return c.done(total, `${perfect}/${P.puz} énigme${P.puz > 1 ? 's' : ''} parfaitement résolue${P.puz > 1 ? 's' : ''}`);
      const Q = gen(), n = P.n;
      const place = Array(n).fill(null); // place[cabine] = indice animal
      let sel = null, answered = false;
      const limit = c.tm(P.lim * 1000), t0 = c.now();
      const stop = c.timer(P.lim, () => finish());
      c.stage.innerHTML = `<div class="clues">${Q.clues.map(cl => `<div class="clue">${cl.t}</div>`).join('')}</div>
        <div class="cabins" style="grid-template-columns:repeat(${n},minmax(0,1fr))" id="cab"></div>
        <div class="tray" id="tray"></div>
        <button class="btn" id="val" disabled>Valider</button>`;
      const cab = $('#cab', c.stage), tray = $('#tray', c.stage), val = $('#val', c.stage);
      function draw() {
        cab.innerHTML = '';
        for (let k = 0; k < n; k++) {
          const b = document.createElement('button'); b.className = 'cabin';
          b.innerHTML = `<span class="num">${k + 1}</span><span class="an">${place[k] !== null ? Q.animals[place[k]].e : ''}</span><span class="lr">${k === 0 ? 'gauche' : k === n - 1 ? 'droite' : ''}</span>`;
          b.setAttribute('aria-label', `Cabine ${k + 1}`);
          b.addEventListener('pointerdown', e => {
            e.preventDefault(); if (c.over || answered) return;
            if (sel !== null) {
              const prev = place.indexOf(sel); if (prev >= 0) place[prev] = null;
              place[k] = sel; sel = null;
            } else if (place[k] !== null) { sel = place[k]; place[k] = null; }
            draw();
          });
          cab.appendChild(b);
        }
        tray.innerHTML = '';
        Q.animals.forEach((a, i) => {
          if (place.includes(i)) return;
          const b = document.createElement('button'); b.className = 'animal' + (sel === i ? ' sel' : ''); b.textContent = a.e; b.setAttribute('aria-label', a.n);
          b.addEventListener('pointerdown', e => { e.preventDefault(); if (c.over || answered) return; sel = sel === i ? null : i; draw(); });
          tray.appendChild(b);
        });
        val.disabled = place.includes(null);
        if (sel !== null) c.ok(cab.children[Q.sol.indexOf(sel)]);
        else { const wrong = place.findIndex((v, k) => v !== null && v !== Q.sol[k]); c.ok(wrong >= 0 ? cab.children[wrong] : place.includes(null) ? tray.children[0] : val); }
      }
      function finish() {
        if (answered) return; answered = true; stop();
        let good = 0;
        $$('.cabin', cab).forEach((b, k) => { const ok = place[k] === Q.sol[k]; if (ok) good++; b.classList.add(ok ? 'good' : 'wrong'); });
        const frac = good / n;
        total += (100 / P.puz) * frac * (0.7 + 0.3 * clamp01(1 - (c.now() - t0) / limit));
        if (good === n) { perfect++; c.good(null, true); } else c.bad(cab);
        c.score(perfect); pz++;
        c.later(next, 1400);
      }
      val.addEventListener('click', finish);
      draw();
    }
    next();
  }
};

const G_MOUETTES = {
  id: 'mouettes', name: 'Le tri des mouettes', cat: 'logic', color: '#4E5A73', fg: '#fff', icon: '🕊️',
  rule: l => "La mouette apporte une carte. Dépose-la dans le bon panier. La règle de tri est secrète : seuls ✓ et ✗ te guident. Et elle change en cours de route !"
    + (l === 'F' ? ' On te préviendra quand elle change.' : ''),
  info: () => '24 cartes',
  run(c) {
    const P = c.L({ F: { B: 3, dims: ['color', 'shape', 'count'], K: [3, 3], warn: true }, N: { B: 3, dims: ['color', 'shape', 'count'], K: [3, 3], warn: false }, E: { B: 3, dims: ['color', 'shape', 'count'], K: [3, 3], warn: false, pers: true } });
    const TOTAL = 24, DN = { color: 'la couleur', shape: 'la forme', count: 'le nombre' };
    const models = Array.from({ length: P.B }, (_, b) => ({ shape: b, color: b, count: b + 1 }));
    c.stage.innerHTML = `<div class="banner" id="bn" aria-live="polite"></div><div class="sortcard" id="card"></div>
      <div class="baskets" style="grid-template-columns:repeat(${P.B},1fr)" id="bk"></div>`;
    const bn = $('#bn', c.stage), cardEl = $('#card', c.stage), bk = $('#bk', c.stage);
    const cardHTML = k => Array.from({ length: k.count }, () => shapeSVG(k.shape, COLORS[k.color].h)).join('');
    models.forEach((m, b) => {
      const el = document.createElement('button'); el.className = 'basket'; el.innerHTML = cardHTML(m);
      el.setAttribute('aria-label', `Panier ${b + 1} : ${m.count} ${SHAPES[m.shape]} ${COLORS[m.color].n}`);
      el.addEventListener('pointerdown', e => { e.preventDefault(); choose(b, el); });
      bk.appendChild(el);
    });
    let rule = c.rng.pick(P.dims), prevRule = null, need = c.rng.int(P.K[0], P.K[1]), streak = 0, errRun = 0;
    let i = 0, ok = 0, pen = 0, card = null, ready = false;
    c.score(0); c.progress(0);
    const target = (k, dim) => dim === 'count' ? k.count - 1 : k[dim];
    function newCard() {
      for (let t = 0; t < 200; t++) {
        const k = { shape: c.rng.int(0, P.B - 1), color: c.rng.int(0, P.B - 1), count: c.rng.int(1, 3) };
        if (P.B === 2) k.count = c.rng.int(1, 3);
        const vals = P.dims.map(d => target(k, d));
        if (new Set(vals).size >= 2) return k;
      }
      return { shape: 0, color: 1, count: 3 };
    }
    function show() {
      if (i >= TOTAL) return c.done(100 * ok / TOTAL - pen, `${ok}/${TOTAL} cartes bien triées` + (pen ? ` · pénalité −${pen} (ancienne règle gardée trop longtemps)` : ''));
      card = newCard(); cardEl.innerHTML = cardHTML(card); c.ok(bk.children[target(card, rule)]); ready = true;
    }
    function choose(b, el) {
      if (c.over || !ready) return; ready = false;
      const right = target(card, rule) === b;
      i++; c.progress(i / TOTAL);
      const v = document.createElement('div'); v.className = 'verdict ' + (right ? 'mark-ok' : 'mark-ko'); v.textContent = right ? '✓' : '✗';
      cardEl.appendChild(v);
      if (right) {
        ok++; streak++; errRun = 0; c.good(el, false); bn.textContent = '';
        if (streak >= need) {
          prevRule = rule; const others = P.dims.filter(d => d !== rule); rule = c.rng.pick(others);
          streak = 0; need = c.rng.int(P.K[0], P.K[1]);
          if (P.warn) bn.textContent = 'La règle change !';
        }
      } else {
        streak = 0; errRun++; c.bad(el);
        if (P.pers && prevRule && errRun >= 2 && target(card, prevRule) === b) pen += 2;
        if (P.warn && errRun >= 3) bn.textContent = `Indice : essaie de trier selon ${DN[rule]}.`;
      }
      c.score(ok);
      c.later(show, 550);
    }
    show();
  }
};


/* =========================================================
   NOUVELLES ÉPREUVES (v3)
   ========================================================= */
const CRAB_COLS = [{ n: 'rouges', h: '#D93A1E' }, { n: 'bleus', h: '#1F5FE0' }, { n: 'verts', h: '#0B7A42' }];
const CRAB_SYM = ['<circle cx="50" cy="50" r="7" fill="#fff"/>', '<polygon points="50,41 59,57 41,57" fill="#fff"/>', '<rect x="43" y="43" width="14" height="14" fill="#fff"/>'];
function crabSVG(k) {
  const c = CRAB_COLS[k].h;
  return `<svg viewBox="0 0 100 80" class="crab" role="img" aria-label="crabe ${CRAB_COLS[k].n.slice(0, -1)}">
<g stroke="#13224A" stroke-width="4" stroke-linecap="round" fill="none"><path d="M36 32 30 16M64 32 70 16"/><path d="M22 52 8 62M24 60 12 72M78 52 92 62M76 60 88 72"/></g>
<circle cx="30" cy="13" r="7" fill="#fff" stroke="#13224A" stroke-width="3"/><circle cx="70" cy="13" r="7" fill="#fff" stroke="#13224A" stroke-width="3"/><circle cx="31" cy="14" r="3" fill="#13224A"/><circle cx="71" cy="14" r="3" fill="#13224A"/>
<path d="M16 34q-14-6-9-20 11 2 15 13zM84 34q14-6 9-20-11 2-15 13z" fill="${c}" stroke="#13224A" stroke-width="3"/>
<ellipse cx="50" cy="50" rx="31" ry="21" fill="${c}" stroke="#13224A" stroke-width="4"/>${CRAB_SYM[k]}</svg>`;
}
const flagHTML = k => `<span class="crabflag"><span class="cf-dot" style="background:${CRAB_COLS[k].h}"><svg viewBox="0 0 100 100" width="22" height="22">${CRAB_SYM[k].replace(/50/g, '50')}</svg></span>${CRAB_COLS[k].n}</span>`;

const G_CRABES = {
  id: 'crabes', name: 'Les crabes farceurs', cat: 'speed', color: '#C2410C', fg: '#fff', icon: '🦀',
  rule: l => l === 'F' ? 'Des crabes sortent de leurs trous. Touche-les vite avant qu’ils redescendent.'
    : 'Des crabes sortent de leurs trous. Touche seulement ceux de la couleur du drapeau, et vite !',
  info: () => '30 secondes',
  run(c) {
    const P = c.L({
      F: { show: 850, gap: 900, max: 1, cols: 1, flag: 0, pt: 1 },
      N: { show: 780, gap: 700, max: 2, cols: 2, flag: 8000, pt: .6 },
      E: { show: 690, gap: 560, max: 3, cols: 3, flag: 6000, pt: .55 }
    });
    c.stage.innerHTML = `<div class="crabbar plaque" id="fl" aria-live="polite"></div><div class="beach" id="ho">${Array.from({ length: 9 }, (_, i) => `<button class="hole" data-i="${i}" aria-label="Trou ${i + 1}"><span class="crabw"></span></button>`).join('')}</div>`;
    const holes = $$('.hole', c.stage), fl = $('#fl', c.stage);
    const occ = Array(9).fill(null);
    let want = 0, hits = 0, wrong = 0, shown = 0, missed = 0;
    c.score(0);
    function setFlag(first) {
      if (P.cols === 1) { fl.innerHTML = 'Touche tous les crabes !'; return; }
      let k; do { k = c.rng.int(0, P.cols - 1); } while (!first && k === want); want = k;
      fl.innerHTML = `Touche les crabes ${flagHTML(want)}`; if (!first) { fx(fl, 'ok-fx'); c.beep(520); }
    }
    setFlag(true);
    if (P.flag) (function loop() { c.later(() => { if (c.over) return; setFlag(false); refreshOk(); loop(); }, c.tm(P.flag)); })();
    function refreshOk() { const i = occ.findIndex(o => o && !o.tapped && o.k === want); c.ok(i >= 0 ? holes[i] : null); }
    function spawn() {
      if (c.over) return;
      const ramp = c.now() < 6000 ? 1.3 : 1;
      if (occ.filter(Boolean).length < P.max) {
        const free = occ.map((o, i) => o ? -1 : i).filter(i => i >= 0);
        const i = c.rng.pick(free);
        let k = want;
        if (P.cols > 1 && !c.rng.chance(P.pt)) { do { k = c.rng.int(0, P.cols - 1); } while (k === want); }
        const me = { k, tapped: false }; occ[i] = me;
        if (k === want) shown++;
        const w = holes[i].firstElementChild; w.innerHTML = crabSVG(k); holes[i].classList.add('up');
        refreshOk();
        c.later(() => {
          if (occ[i] !== me) return;
          occ[i] = null; holes[i].classList.remove('up', 'hit');
          if (!me.tapped && me.k === want) missed++;
          refreshOk();
        }, c.tm(P.show * ramp));
      }
      c.later(spawn, c.tm(P.gap * ramp) + c.rng.int(-120, 120));
    }
    holes.forEach((h, i) => h.addEventListener('pointerdown', e => {
      e.preventDefault(); if (c.over) return;
      const o = occ[i]; if (!o || o.tapped) return;
      o.tapped = true;
      if (o.k === want) { hits++; h.classList.add('hit'); c.good(h, false); c.score(hits); }
      else { wrong++; c.bad(h); }
      refreshOk();
    }));
    spawn();
    c.timer(30, () => c.done(100 * clamp01((hits - 0.5 * wrong) / Math.max(1, shown)), `${hits}/${shown} crabe${shown > 1 ? 's' : ''} attrapé${hits > 1 ? 's' : ''}${wrong ? ` · ${plural(wrong, 'erreur')} de couleur` : ''}`));
  }
};

const G_BULLES = {
  id: 'bulles', name: 'Les bulles du plongeur', cat: 'logic', color: '#0E7490', fg: '#fff', icon: '🤿',
  rule: l => l === 'E' ? 'L’ardoise du plongeur montre un total. Touche les 3 bulles dont la somme fait ce total.'
    : 'L’ardoise du plongeur montre un total. Touche les 2 bulles dont la somme fait ce total.',
  info: () => '40 secondes',
  run(c) {
    const P = c.L({ F: { k: 2, max: 10, n: 5, target: 11 }, N: { k: 2, max: 25, n: 6, target: 12 }, E: { k: 3, max: 20, n: 6, target: 8 } });
    c.stage.innerHTML = `<div class="slate" id="sl" aria-live="polite"></div><div class="bubbles" id="bb"></div><div class="streak" id="hint"></div>`;
    const sl = $('#sl', c.stage), bb = $('#bb', c.stage), hint = $('#hint', c.stage);
    let good = 0, err = 0, np = 0, Q = null, sel = [], busy = false;
    c.score(0);
    function combos(arr, k, start = 0, acc = [], out = []) { if (acc.length === k) { out.push(acc.slice()); return out; } for (let i = start; i < arr.length; i++) { acc.push(i); combos(arr, k, i + 1, acc, out); acc.pop(); } return out; }
    function gen() {
      const k = (c.level === 'E' && np < 2) ? 2 : P.k;
      for (let t = 0; t < 500; t++) {
        const nums = Array.from({ length: P.n }, () => c.rng.int(1, P.max));
        const sol = c.rng.shuffle([...Array(P.n).keys()]).slice(0, k);
        const T = sol.reduce((s, i) => s + nums[i], 0);
        const all = combos(nums, k).filter(cb => cb.reduce((s, i) => s + nums[i], 0) === T);
        if (all.length === 1) return { nums, sol, T, k };
      }
      return { nums: [2, 3, 4, 5, 6, 7].slice(0, P.n), sol: [0, 1], T: 5, k: 2 };
    }
    function drawSlate() { sl.innerHTML = `<span class="sl-sum">${Array.from({ length: Q.k }, (_, j) => `<b>${sel[j] !== undefined ? Q.nums[sel[j]] : '?'}</b>`).join('<i>+</i>')}<i>=</i><strong>${Q.T}</strong></span>`; }
    function markOk() { const nxt = Q.sol.find(i => !sel.includes(i)); c.ok(nxt !== undefined && sel.every(i => Q.sol.includes(i)) ? bb.children[nxt] : null); }
    function next() {
      Q = gen(); np++; sel = []; busy = false; hint.textContent = Q.k === 3 ? 'Trois bulles cette fois !' : '';
      bb.innerHTML = '';
      Q.nums.forEach((v, i) => {
        const b = document.createElement('button'); b.className = 'bubble-n'; b.textContent = v;
        b.style.animationDelay = (-c.rng() * 3).toFixed(2) + 's';
        b.addEventListener('pointerdown', e => {
          e.preventDefault(); if (c.over || busy) return;
          const at = sel.indexOf(i);
          if (at >= 0) { sel.splice(at, 1); b.classList.remove('sel'); }
          else { sel.push(i); b.classList.add('sel'); c.beep(700); }
          drawSlate(); markOk();
          if (sel.length === Q.k) {
            busy = true;
            const sum = sel.reduce((s, j) => s + Q.nums[j], 0);
            if (sum === Q.T) { good++; c.score(good); sel.forEach(j => bb.children[j].classList.add('pop')); c.good(sl, true); c.later(next, 380); }
            else { err++; c.bad(bb); sl.classList.add('wrong'); hint.textContent = `${sel.map(j => Q.nums[j]).join(' + ')} = ${sum}, pas ${Q.T}.`; c.later(() => { sl.classList.remove('wrong'); sel = []; $$('.bubble-n', bb).forEach(x => x.classList.remove('sel')); busy = false; drawSlate(); markOk(); }, 700); }
          }
        });
        bb.appendChild(b);
      });
      drawSlate(); markOk();
    }
    next();
    c.timer(40, () => c.done(100 * clamp01((good - 0.5 * err) / P.target), `${good} ${good > 1 ? 'totaux' : 'total'} trouvé${good > 1 ? 's' : ''} · ${plural(err, 'erreur')}`));
  }
};

/* =========================================================
   NOUVELLES ÉPREUVES (v4) : image mystère, vitraux (QI), suites, boutique
   ========================================================= */
const MYST = {
  animaux: [['🐘', 'Éléphant'], ['🦒', 'Girafe'], ['🐢', 'Tortue'], ['🦉', 'Hibou'], ['🐙', 'Pieuvre'], ['🦋', 'Papillon'], ['🐧', 'Manchot'], ['🦊', 'Renard'], ['🐌', 'Escargot'], ['🦀', 'Crabe'], ['🐝', 'Abeille'], ['🦓', 'Zèbre'], ['🐳', 'Baleine'], ['🦔', 'Hérisson'], ['🐊', 'Crocodile'], ['🦩', 'Flamant rose']],
  objets: [['⏰', 'Réveil'], ['🔑', 'Clé'], ['☂️', 'Parapluie'], ['🎸', 'Guitare'], ['🔦', 'Lampe de poche'], ['✂️', 'Ciseaux'], ['🧲', 'Aimant'], ['🎈', 'Ballon de baudruche'], ['📷', 'Appareil photo'], ['🔨', 'Marteau'], ['🧭', 'Boussole'], ['⚽', 'Ballon de foot'], ['🪁', 'Cerf-volant'], ['🎁', 'Cadeau'], ['🕯️', 'Bougie'], ['🧸', 'Ours en peluche']],
  nourriture: [['🍓', 'Fraise'], ['🍌', 'Banane'], ['🍕', 'Pizza'], ['🥕', 'Carotte'], ['🍉', 'Pastèque'], ['🧀', 'Fromage'], ['🍩', 'Beignet'], ['🥐', 'Croissant'], ['🍍', 'Ananas'], ['🌽', 'Maïs'], ['🍒', 'Cerises'], ['🥦', 'Brocoli']],
  vehicules: [['🚒', 'Camion de pompiers'], ['🚁', 'Hélicoptère'], ['🚲', 'Vélo'], ['⛵', 'Voilier'], ['🚀', 'Fusée'], ['🚂', 'Locomotive'], ['🚜', 'Tracteur'], ['🛴', 'Trottinette'], ['✈️', 'Avion'], ['🚌', 'Bus']],
  personnages: [['👩‍🚒', 'Pompière'], ['👨‍🍳', 'Cuisinier'], ['🧑‍🚀', 'Astronaute'], ['👮', 'Policier'], ['🧙', 'Magicien'], ['🧑‍⚕️', 'Médecin'], ['🤴', 'Prince'], ['👸', 'Princesse'], ['🧜', 'Sirène'], ['🧑‍🌾', 'Fermier'], ['🦸', 'Super-héros'], ['🥷', 'Ninja']],
  chiffres: [['2', 'Deux'], ['3', 'Trois'], ['4', 'Quatre'], ['5', 'Cinq'], ['6', 'Six'], ['7', 'Sept'], ['8', 'Huit'], ['9', 'Neuf']]
};
const MYST_CAT = { animaux: 'un animal', objets: 'un objet', nourriture: 'quelque chose à manger', vehicules: 'un véhicule', personnages: 'un personnage', chiffres: 'un chiffre' };

const G_MYSTERE = {
  id: 'mystere', name: 'La photo mystère', cat: 'speed', color: '#9333EA', fg: '#fff', icon: '🖼️',
  rule: () => 'Une image se dévoile petit à petit sous des carreaux. Devine le plus vite possible ce qu’elle représente parmi les 4 réponses.',
  info: () => '8 images',
  run(c) {
    const P = c.L({ F: { step: 420, same: false, grid: 6 }, N: { step: 300, same: .5, grid: 7 }, E: { step: 230, same: 1, grid: 8 } });
    const ROUNDS = 8;
    c.stage.innerHTML = `<div class="myst-cat plaque" id="mc"></div><div class="myst" id="my"><div class="myst-img" id="mi"></div><div class="myst-grid" id="mg"></div></div><div class="answers c2" id="ch"></div>`;
    const mi = $('#mi', c.stage), mg = $('#mg', c.stage), ch = $('#ch', c.stage), mc = $('#mc', c.stage);
    let r = 0, total = 0, okN = 0;
    const used = new Set();
    c.score(0);
    function next() {
      if (r >= ROUNDS) return c.done(total, `${okN}/${ROUNDS} image${okN > 1 ? 's' : ''} trouvée${okN > 1 ? 's' : ''}`);
      const cats = Object.keys(MYST);
      let cat, item;
      do { cat = c.rng.pick(cats); item = c.rng.pick(MYST[cat]); } while (used.has(item[0]));
      used.add(item[0]);
      const sameCat = P.same === 1 || (P.same && c.rng.chance(P.same));
      const pool = sameCat ? MYST[cat].filter(x => x !== item) : cats.filter(k => k !== cat).map(k => c.rng.pick(MYST[k]));
      const opts = c.rng.shuffle([item, ...c.rng.shuffle(pool.slice()).slice(0, 3)]);
      mc.textContent = sameCat ? `C’est ${MYST_CAT[cat]}… lequel ?` : 'Qu’est-ce que c’est ?';
      mi.innerHTML = cat === 'chiffres' ? `<span class="myst-num">${item[0]}</span>` : `<span class="myst-emo">${item[0]}</span>`;
      const N = P.grid * P.grid;
      mg.style.gridTemplateColumns = `repeat(${P.grid},1fr)`;
      mg.innerHTML = Array.from({ length: N }, () => '<i></i>').join('');
      const order = c.rng.shuffle([...Array(N).keys()]);
      let shown = 0, answered = false, tick = null;
      const tiles = mg.children;
      const reveal = () => {
        if (answered || c.over) return;
        if (shown < N) { tiles[order[shown++]].classList.add('off'); if (shown < N) tick = c.later(reveal, c.tm(P.step)); else tick = c.later(() => finish(null), 2500); }
      };
      function finish(btn) {
        if (answered) return; answered = true; c.cancel(tick);
        const right = btn && btn.dataset.ok;
        if (right) { okN++; const cover = 1 - shown / N; total += (100 / ROUNDS) * (0.35 + 0.65 * cover); c.good(btn, true); }
        else { if (btn) c.bad(btn); const g2 = $('[data-ok]', ch); if (g2) g2.classList.add('reveal'); }
        [...tiles].forEach(t => t.classList.add('off'));
        c.score(okN); r++;
        c.later(next, right ? 700 : 1300);
      }
      ch.innerHTML = '';
      opts.forEach(o => {
        const b = document.createElement('button'); b.className = 'ans word'; b.textContent = o[1];
        if (o === item) { b.dataset.ok = '1'; }
        b.addEventListener('pointerdown', e => { e.preventDefault(); if (c.over || answered) return; finish(b); });
        ch.appendChild(b);
      });
      if (c.practice) c.ok(ch.querySelector('[data-ok]'));
      tick = c.later(reveal, 500);
    }
    next();
  }
};

/* --- Vitraux : matrices 3×3 (QI ludique) --- */
function vitralCell(a) {
  const n = a.count, size = n === 1 ? 46 : n === 2 ? 34 : 26;
  return `<span class="vc n${n}">${Array.from({ length: n }, () => `<svg viewBox="0 0 100 100" style="width:${size}px;height:${size}px">${shapeInner(a.shape, COLORS[a.color].h, 7)}</svg>`).join('')}</span>`;
}
const G_VITRAUX = {
  id: 'vitraux', name: 'Les vitraux du phare', cat: 'logic', color: '#4338CA', fg: '#fff', icon: '🪟',
  rule: () => 'Chaque ligne du vitrail suit des règles (forme, couleur, nombre). Trouve la pièce qui complète la case vide.',
  info: () => '8 vitraux',
  run(c) {
    const P = c.L({ F: { rules: 1, lim: 25 }, N: { rules: 2, lim: 22 }, E: { rules: 3, lim: 20 } });
    const ROUNDS = 8;
    c.stage.innerHTML = `<div class="vitrail" id="vt"></div><p class="plaque small" style="margin:0">Quelle pièce va dans le « ? » ?</p><div class="answers c2" id="ch"></div>`;
    const vt = $('#vt', c.stage), ch = $('#ch', c.stage);
    let r = 0, total = 0, okN = 0;
    c.score(0);
    const key = a => `${a.shape}-${a.color}-${a.count}`;
    function gen() {
      const R = c.rng;
      const idx = { row: (rr, cc) => rr, col: (rr, cc) => cc, latin: (rr, cc) => (rr + cc) % 3, latin2: (rr, cc) => (rr + 2 * cc) % 3, const: () => 0 };
      let T;
      if (c.level === 'F' || r < 1) T = R.chance(.5) ? { shape: 'row', count: 'col', color: 'const' } : { color: 'row', count: 'col', shape: 'const' };
      else if (c.level === 'N' || r < 2) T = R.chance(.5) ? { shape: 'row', color: 'latin', count: 'col' } : { color: 'row', shape: 'latin', count: 'col' };
      else T = R.chance(.5) ? { shape: 'latin', color: 'latin2', count: 'col' } : { shape: 'latin2', color: 'latin', count: 'row' };
      const vals = { shape: R.shuffle([0, 1, 2, 3]).slice(0, 3), color: R.shuffle([0, 1, 2, 3]).slice(0, 3), count: R.chance(.5) ? [1, 2, 3] : [3, 2, 1] };
      const grid = [];
      for (let rr = 0; rr < 3; rr++) for (let cc = 0; cc < 3; cc++) {
        const o = {}; ['shape', 'color', 'count'].forEach(a => o[a] = vals[a][idx[T[a]](rr, cc)]); grid.push(o);
      }
      const ans = grid[8];
      const opts = [ans], seen = new Set([key(ans)]);
      let guard = 0;
      while (opts.length < 4 && guard++ < 200) {
        const a = R.pick(['shape', 'color', 'count']), d = { ...ans };
        if (a === 'count') d.count = R.int(1, 3); else d[a] = R.pick(vals[a]);
        if (!seen.has(key(d))) { seen.add(key(d)); opts.push(d); }
      }
      return { grid, ans, opts: R.shuffle(opts) };
    }
    function next() {
      if (r >= ROUNDS) return c.done(total, `${okN}/${ROUNDS} vitraux complétés`);
      const Q = gen();
      vt.innerHTML = Q.grid.map((a, i) => i === 8 ? '<span class="vc q">?</span>' : vitralCell(a)).join('');
      ch.innerHTML = '';
      let answered = false;
      const limit = c.tm(P.lim * 1000), t0 = c.now();
      const stop = c.timer(P.lim, () => { if (answered) return; answered = true; const g2 = $('[data-ok]', ch); if (g2) g2.classList.add('reveal'); r++; c.later(next, 1000); });
      Q.opts.forEach(o => {
        const b = document.createElement('button'); b.className = 'ans vit'; b.innerHTML = vitralCell(o);
        const right = key(o) === key(Q.ans); if (right) b.dataset.ok = '1';
        b.addEventListener('pointerdown', e => {
          e.preventDefault(); if (c.over || answered) return; answered = true; stop();
          if (right) { okN++; total += (100 / ROUNDS) * (0.7 + 0.3 * clamp01(1 - (c.now() - t0) / limit)); c.good(b, true); }
          else { c.bad(b); const g = $('[data-ok]', ch); if (g) g.classList.add('reveal'); }
          c.score(okN); r++; c.later(next, right ? 400 : 1100);
        });
        ch.appendChild(b);
      });
      if (c.practice) c.ok(ch.querySelector('[data-ok]'));
    }
    next();
  }
};

/* --- Suites de nombres --- */
const G_SUITES = {
  id: 'suites', name: 'Les bouées numérotées', cat: 'logic', color: '#B45309', fg: '#fff', icon: '🔢',
  rule: () => 'Les bouées suivent une règle de nombres. Trouve le nombre qui vient ensuite.',
  info: () => '8 suites',
  run(c) {
    const P = c.L({ F: { lim: 20 }, N: { lim: 18 }, E: { lim: 18 } });
    const ROUNDS = 8;
    c.stage.innerHTML = `<div class="buoys" id="bu"></div><p class="plaque small" style="margin:0" id="sx">Quel nombre vient ensuite ?</p><div class="answers c2" id="ch"></div>`;
    const bu = $('#bu', c.stage), ch = $('#ch', c.stage);
    let r = 0, total = 0, okN = 0;
    c.score(0);
    function gen() {
      const R = c.rng, L = c.level, lv = r < 2 && L !== 'F' ? (L === 'E' ? 'N' : 'F') : L;
      const T = { F: ['add', 'sub', 'add2'], N: ['mul2', 'inc', 'alt', 'add', 'sub3'], E: ['fib', 'sq', 'mul2p1', 'alt2', 'inc2', 'mul3'] }[lv];
      const t = R.pick(T); let s = [];
      if (t === 'add') { const a = R.int(1, 10), k = R.int(2, 5); for (let i = 0; i < 6; i++) s.push(a + k * i); }
      else if (t === 'sub') { const k = R.int(2, 4), a = k * 6 + R.int(1, 10); for (let i = 0; i < 6; i++) s.push(a - k * i); }
      else if (t === 'add2') { const a = R.int(0, 6); for (let i = 0; i < 6; i++) s.push(a + 10 * i); }
      else if (t === 'mul2') { const a = R.int(1, 4); for (let i = 0; i < 6; i++) s.push(a * 2 ** i); }
      else if (t === 'inc') { let v = R.int(1, 8); for (let i = 0; i < 6; i++) { s.push(v); v += i + 1; } }
      else if (t === 'alt') { const a = R.int(1, 9), b = R.int(20, 40), k = R.int(1, 3); for (let i = 0; i < 6; i++) s.push(i % 2 ? b - k * ((i - 1) / 2) : a + k * (i / 2)); }
      else if (t === 'sub3') { const a = R.int(40, 60); for (let i = 0; i < 6; i++) s.push(a - 3 * i - 0); }
      else if (t === 'fib') { let a = R.int(1, 3), b = R.int(2, 4); s = [a, b]; while (s.length < 6) s.push(s[s.length - 1] + s[s.length - 2]); }
      else if (t === 'sq') { const o = R.int(1, 3); for (let i = 0; i < 6; i++) s.push((i + o) ** 2); }
      else if (t === 'mul2p1') { let v = R.int(1, 3); for (let i = 0; i < 6; i++) { s.push(v); v = v * 2 + 1; } }
      else if (t === 'alt2') { let v = R.int(2, 6); const a = R.int(3, 6); for (let i = 0; i < 6; i++) { s.push(v); v = i % 2 ? v * 2 : v + a; } }
      else if (t === 'inc2') { let v = R.int(1, 5); const k = R.int(2, 3); for (let i = 0; i < 6; i++) { s.push(v); v += k * (i + 1); } }
      else { const a = R.int(1, 3); for (let i = 0; i < 6; i++) s.push(a * 3 ** i); }
      const ans = s[5], shown = s.slice(0, 5), d = s[4] - s[3];
      const cand = R.shuffle([ans + 1, ans - 1, ans + 2, ans - 2, s[4] + (s[1] - s[0]), ans + d, ans - d, s[4] * 2, ans + 10]).filter(v => v !== ans && v >= 0);
      const opts = [ans]; for (const v of cand) { if (opts.length >= 4) break; if (!opts.includes(v)) opts.push(v); }
      let k = 3; while (opts.length < 4) { if (!opts.includes(ans + k)) opts.push(ans + k); k++; }
      return { shown, ans, opts: R.shuffle(opts) };
    }
    function next() {
      if (r >= ROUNDS) return c.done(total, `${okN}/${ROUNDS} suites trouvées`);
      const Q = gen();
      bu.innerHTML = Q.shown.map(v => `<span class="buoy-n">${v}</span>`).join('') + '<span class="buoy-n q">?</span>';
      ch.innerHTML = '';
      let answered = false;
      const limit = c.tm(P.lim * 1000), t0 = c.now();
      const stop = c.timer(P.lim, () => { if (answered) return; answered = true; const g2 = $('[data-ok]', ch); if (g2) g2.classList.add('reveal'); r++; c.later(next, 1000); });
      Q.opts.forEach(v => {
        const b = document.createElement('button'); b.className = 'ans'; b.textContent = v;
        const right = v === Q.ans; if (right) b.dataset.ok = '1';
        b.addEventListener('pointerdown', e => {
          e.preventDefault(); if (c.over || answered) return; answered = true; stop();
          if (right) { okN++; total += (100 / ROUNDS) * (0.7 + 0.3 * clamp01(1 - (c.now() - t0) / limit)); c.good(b, true); }
          else { c.bad(b); const g = $('[data-ok]', ch); if (g) g.classList.add('reveal'); }
          c.score(okN); r++; c.later(next, right ? 400 : 1100);
        });
        ch.appendChild(b);
      });
      if (c.practice) c.ok(ch.querySelector('[data-ok]'));
    }
    next();
  }
};

/* --- Boutique du port : payer le compte juste --- */
const SHOP = [['🍦', 'une glace'], ['🥐', 'un croissant'], ['🎈', 'un ballon'], ['🧃', 'un jus'], ['🪁', 'un cerf-volant'], ['🍭', 'une sucette'], ['📒', 'un carnet'], ['🧢', 'une casquette'], ['🐚', 'un coquillage'], ['🍩', 'un beignet'], ['🧸', 'une peluche'], ['🕶️', 'des lunettes']];
const euro = c => (c % 100 ? (c / 100).toFixed(2).replace('.', ',') : String(c / 100)) + ' €';
const G_BOUTIQUE = {
  id: 'boutique', name: 'La boutique du port', cat: 'speed', color: '#15803D', fg: '#fff', icon: '🪙',
  rule: l => 'Un client achète un objet. Touche les pièces et billets pour payer le prix exact.' + (l === 'E' ? ' Bonus si tu utilises le moins de pièces possible.' : ''),
  info: () => '40 secondes',
  run(c) {
    const P = c.L({
      F: { coins: [500, 200, 100], min: 1, max: 9, step: 100, target: 9 },
      N: { coins: [200, 100, 50, 20, 10], min: 1, max: 9, step: 10, target: 8 },
      E: { coins: [1000, 500, 200, 100, 50, 20, 10], min: 2, max: 25, step: 10, target: 7, few: true }
    });
    c.stage.innerHTML = `<div class="shop" id="sh"></div><div class="counter" id="ct" aria-live="polite"></div><div class="coins" id="co"></div>`;
    const sh = $('#sh', c.stage), ct = $('#ct', c.stage), co = $('#co', c.stage);
    let paid = 0, err = 0, bonus = 0, price = 0, sum = 0, used = 0, busy = false;
    c.score(0);
    const minCoins = v => { let n = 0; for (const x of P.coins) { n += Math.floor(v / x); v %= x; } return n; };
    function next() {
      const it = c.rng.pick(SHOP);
      price = c.rng.int(P.min * 100 / P.step, P.max * 100 / P.step) * P.step; sum = 0; used = 0; busy = false;
      sh.innerHTML = `<span class="shop-item">${it[0]}</span><span class="tag-price">${euro(price)}</span><span class="small">pour ${it[1]}</span>`;
      draw();
    }
    function draw() {
      ct.innerHTML = `Comptoir : <b>${euro(sum)}</b>`;
      const rest = price - sum;
      const nxt = P.coins.find(x => x <= rest);
      c.ok(nxt ? co.querySelector(`[data-v="${nxt}"]`) : null);
    }
    P.coins.forEach(v => {
      const b = document.createElement('button'); b.className = 'coin' + (v >= 500 ? ' bill' : v >= 100 ? ' gold' : ''); b.dataset.v = v; b.textContent = v >= 100 ? (v / 100) + ' €' : v + ' c';
      b.addEventListener('pointerdown', e => {
        e.preventDefault(); if (c.over || busy) return;
        sum += v; used++; c.beep(600); fx(b, 'ok-fx');
        if (sum === price) {
          busy = true; paid++; let b2 = '';
          if (P.few && used === minCoins(price)) { bonus++; b2 = ' Bonus : le moins de pièces !'; }
          c.good(ct, true); c.score(paid + bonus); ct.innerHTML = `✓ Compte juste !${b2}`; c.later(next, 600);
        } else if (sum > price) {
          busy = true; err++; c.bad(ct); ct.innerHTML = `Trop : ${euro(sum)} au lieu de ${euro(price)}. On recommence.`;
          c.later(() => { sum = 0; used = 0; busy = false; draw(); }, 900);
        } else draw();
      });
      co.appendChild(b);
    });
    next();
    c.timer(40, () => c.done(100 * clamp01((paid + bonus * 0.5 - 0.5 * err) / P.target), `${paid} achat${paid > 1 ? 's' : ''} payé${paid > 1 ? 's' : ''}${bonus ? ` · ${bonus} bonus` : ''} · ${plural(err, 'erreur')}`));
  }
};

const GAMES = [G_LANTERNE, G_BATEAUX, G_VENT, G_CONSTEL, G_GUE, G_LUCIOLES, G_PHARES, G_COLLIER, G_RECIF, G_COURANTS, G_CABINES, G_MOUETTES, G_CRABES, G_BULLES, G_MYSTERE, G_VITRAUX, G_SUITES, G_BOUTIQUE];
