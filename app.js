'use strict';
/* =========================================================
   MindSprint — écrans, horloge de jeu, modes solo / entraînement / famille
   ========================================================= */

const app = $('#app');
const LEVELS = { F: { name: 'Échauffement', sub: 'Pour démarrer tranquille, dès 8 ans', g: 1 }, N: { name: 'En forme', sub: 'Ça va plus vite, ça réfléchit plus', g: 2 }, E: { name: 'Costaud', sub: 'Pour ceux qui aiment transpirer des neurones', g: 3 } };
const PLAYER_STYLE = [
  { color: '#F4B400', shape: 0 }, { color: '#2EC4B6', shape: 2 }, { color: '#FF8FB1', shape: 3 }, { color: '#1F5FE0', shape: 1 }
];
const FULL_ORDER = [0, 6, 1, 7, 2, 8, 3, 9, 4, 10, 5, 11];
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

/* ---------- Stockage (navigateur de l'appareil uniquement) ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('pige:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('pige:' + k, JSON.stringify(v)); } catch (e) { } },
  clear() { try { Object.keys(localStorage).filter(k => k.startsWith('pige:')).forEach(k => localStorage.removeItem(k)); } catch (e) { } }
};
const settings = Object.assign({ sound: false, haptic: true, moreTime: false, theme: 'auto', level: 'F' }, store.get('settings', {}));
function saveSettings() { store.set('settings', settings); applyTheme(); }
function applyTheme() {
  document.documentElement.dataset.theme = settings.theme;
  const dark = settings.theme === 'dark' || (settings.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = dark ? '#14133A' : '#3B3FE0';
}
applyTheme();

/* ---------- Son & vibrations ---------- */
let AC = null;
function beep(freq = 880, dur = .12) {
  if (!settings.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(.08, AC.currentTime); g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + dur);
    o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + dur + .02);
  } catch (e) { }
}
function haptic(p) { if (settings.haptic && 'vibrate' in navigator) { try { navigator.vibrate(p); } catch (e) { } } }

/* ---------- Horloge de jeu (pausable) ---------- */
const Clock = {
  t: 0, last: null, paused: false, tasks: [], tickers: [], id: 0, raf: null, gen: 0,
  start() {
    const g = this.gen;
    const loop = ts => {
      if (g !== this.gen) return;
      if (this.last != null && !this.paused) this.t += Math.min(100, ts - this.last);
      this.last = ts;
      if (!this.paused) {
        if (this.tasks.length) {
          const due = [], keep = [];
          for (const k of this.tasks) (k.at <= this.t ? due : keep).push(k);
          if (due.length) {
            this.tasks = keep;
            due.sort((a, b) => a.at - b.at || a.id - b.id);
            for (const k of due) { if (g !== this.gen) return; k.fn(); }
          }
        }
        for (const f of this.tickers.slice()) { if (g !== this.gen) return; f(this.t); }
      }
      if (g === this.gen) this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  },
  reset() { this.gen++; if (this.raf) cancelAnimationFrame(this.raf); this.raf = null; this.t = 0; this.last = null; this.paused = false; this.tasks = []; this.tickers = []; },
  later(fn, ms) { const id = ++this.id; this.tasks.push({ id, at: this.t + ms, fn }); return id; },
  cancel(id) { Clock.tasks = Clock.tasks.filter(k => k.id !== id); },
  tick(f) { this.tickers.push(f); return () => { this.tickers = this.tickers.filter(x => x !== f); }; }
};

/* ---------- Petits utilitaires d'interface ---------- */
const LOGO = `<svg viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" fill="#3B3FE0"/><circle cx="256" cy="272" r="150" fill="#1E1B4B"/><circle cx="256" cy="256" r="144" fill="#FFC93C" stroke="#1E1B4B" stroke-width="12"/><path d="M184 262 L236 314 L328 206" fill="none" stroke="#1E1B4B" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/><g stroke="#FFC93C" stroke-width="18" stroke-linecap="round"><line x1="299" y1="96" x2="306" y2="71"/><line x1="373" y1="139" x2="391" y2="121"/><line x1="416" y1="213" x2="441" y2="206"/></g></svg>`;
function screen(html) { app.innerHTML = `<div class="screen">${html}</div>`; window.scrollTo(0, 0); return app.firstElementChild; }
function on(sel, ev, fn, root = app) { const el = $(sel, root); if (el) el.addEventListener(ev, fn); return el; }
function gauge(n) { return `<span class="gauge" aria-hidden="true">${[1, 2, 3].map(k => `<i class="${k <= n ? 'f' : ''}" style="height:${8 + k * 6}px"></i>`).join('')}</span>`; }
function pawn(i, size = 44, fill) { const p = PLAYER_STYLE[i]; return `<span class="pawn" style="width:${size}px;height:${size}px"><svg viewBox="0 0 100 100" width="${size}" height="${size}">${shapeInner(p.shape, fill || p.color)}</svg></span>`; }
function sheet(html, onOpen) {
  const root = $('#sheet-root');
  root.innerHTML = `<div class="scrim"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
  const scrim = root.firstElementChild;
  const prevFocus = document.activeElement;
  const close = () => { root.innerHTML = ''; document.removeEventListener('keydown', onKey); if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) { } };
  const onKey = e => {
    if (e.key === 'Escape') { e.preventDefault(); const b = $('#cont, #cancel, #ok', scrim); if (b) b.click(); else close(); }
    if (e.key === 'Tab') { const f = $$('button,input', scrim).filter(x => !x.disabled); if (!f.length) return; const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
  };
  document.addEventListener('keydown', onKey);
  if (onOpen) onOpen(scrim, close);
  const first = $('button', scrim); if (first) first.focus();
  return close;
}
function floatWord(x, y) {
  const w = ['Bien joué !', 'Bien vu', 'Oui !', 'Exact'][Math.floor(Math.random() * 4)];
  const d = document.createElement('div'); d.className = 'float'; d.textContent = w;
  d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.appendChild(d);
  setTimeout(() => d.remove(), 650);
}
function fx(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
const recKey = (id, l) => `rec:${id}:${l}`;
const newSeed = () => (Math.random() * 4294967296) >>> 0;
function catPill(cat) { return cat === 'speed' ? `<span class="pill"><span class="catdot cat-speed" style="position:static;width:20px;height:20px;font-size:.65rem">⚡</span>Rapidité</span>` : `<span class="pill"><span class="catdot cat-logic" style="position:static;width:20px;height:20px;font-size:.65rem">⚙</span>Logique</span>`; }

/* ---------- État de la session en cours ---------- */
let S = null;
let CUR = null; // contexte de l'épreuve en cours
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });

/* =========================================================
   ÉCRANS
   ========================================================= */

function home() {
  Clock.reset(); S = null;
  const first = !store.get('seen', false);
  const bests = ['F', 'N', 'E'].map(l => [l, store.get('best:' + l, null)]).filter(([, v]) => v != null);
  screen(`
    <div class="topbar between">
      <div class="logo">${LOGO}<span>MindSprint</span></div>
      <button class="iconbtn" id="set" aria-label="Réglages">⚙</button>
    </div>
    <h1 style="margin-top:18px">${first ? 'Salut ! On joue ?' : 'On s’y remet ?'}</h1>
    <p class="muted">${first ? 'Douze petites épreuves de vitesse et de logique. Une demi-minute à une minute chacune.' : 'Rapidité, logique, ou les deux. À toi de voir.'}</p>
    <div class="tokens2">
      <button class="token" id="solo" style="background:var(--brand);color:#fff">
        <span class="big">🎯</span><span><span class="t">Seul</span><br><span class="s">Le test complet, 12 épreuves</span></span>
      </button>
      <button class="token" id="fam" style="background:var(--accent);color:#1E1B4B;animation-delay:30ms">
        <span class="big">👨‍👩‍👧‍👦</span><span><span class="t">En famille</span><br><span class="s">2 à 4 joueurs, un seul téléphone</span></span>
      </button>
    </div>
    <button class="listrow" id="train"><span style="font-size:1.6rem">🧪</span><span><b>Entraînement libre</b><br><span class="small muted">Choisis une épreuve et bats ton record</span></span><span class="chev">›</span></button>
    ${deferredInstall ? `<button class="listrow" id="inst"><span style="font-size:1.6rem">📲</span><span><b>Installer l’app</b><br><span class="small muted">Sur l’écran d’accueil, même sans connexion</span></span><span class="chev">›</span></button>` : ''}
    ${bests.length ? `<div class="statline">${bests.map(([l, v]) => `<span class="pill">🏆 ${LEVELS[l].name} : ${v}/1000</span>`).join('')}</div>` : ''}
    <div class="spacer"></div>
    <p class="small muted" style="text-align:center;margin-top:24px">Un jeu pour s’amuser. Il ne mesure ni n’améliore l’intelligence.</p>
  `);
  store.set('seen', true);
  on('#set', 'click', settingsSheet);
  on('#solo', 'click', () => levelSheet(level => {
    S = { mode: 'solo', level, seed: newSeed(), games: FULL_ORDER.map(i => GAMES[i]), idx: 0, scores: {}, details: {} };
    intro();
  }));
  on('#fam', 'click', () => familySetup());
  on('#train', 'click', () => trainGrid());
  on('#inst', 'click', async () => { if (!deferredInstall) return; deferredInstall.prompt(); try { await deferredInstall.userChoice; } catch (e) { } deferredInstall = null; home(); });
}

function levelSheet(go) {
  let sel = settings.level;
  sheet(`
    <h2>Quel niveau ?</h2>
    <div id="lv">${Object.entries(LEVELS).map(([k, v]) => `<button class="lvl ${k === sel ? 'on' : ''}" data-l="${k}">${gauge(v.g)}<span><b>${v.name}</b><br><span class="small muted">${v.sub}</span></span></button>`).join('')}</div>
    <button class="btn" id="go" style="margin-top:18px">C’est parti</button>
    <button class="btn ghost" id="cancel">Annuler</button>
  `, (root, close) => {
    $$('.lvl', root).forEach(b => b.addEventListener('click', () => { sel = b.dataset.l; $$('.lvl', root).forEach(x => x.classList.toggle('on', x === b)); }));
    on('#go', 'click', () => { settings.level = sel; saveSettings(); close(); go(sel); }, root);
    on('#cancel', 'click', close, root);
    root.addEventListener('click', e => { if (e.target === root) close(); });
  });
}

function settingsSheet() {
  const sw = (k, label, sub) => `<div class="toggle"><span><b>${label}</b>${sub ? `<br><span class="small muted">${sub}</span>` : ''}</span><button class="switch ${settings[k] ? 'on' : ''}" data-k="${k}" role="switch" aria-checked="${settings[k]}" aria-label="${label}"></button></div>`;
  const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  sheet(`
    <h2>Réglages</h2>
    ${sw('sound', 'Sons', 'Petits bips de réussite et d’erreur')}
    ${sw('haptic', 'Vibrations', 'Sur les téléphones qui le permettent')}
    ${sw('moreTime', 'Plus de temps', '+50 % sur les chronos, pratique pour les plus jeunes')}
    <div class="toggle"><b>Thème</b><span class="chips" id="th">${[['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']].map(([k, l]) => `<button class="chip ${settings.theme === k ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}</span></div>
    <p class="small muted" style="margin-top:14px">${iOS ? 'Pour installer l’app sur iPhone : touche « Partager », puis « Sur l’écran d’accueil ».' : 'Pour installer l’app : menu du navigateur, puis « Installer l’application » ou « Ajouter à l’écran d’accueil ».'}</p>
    <button class="btn secondary" id="wipe" style="margin-top:14px">Effacer mes records</button>
    <button class="btn" id="ok">Fermer</button>
  `, (root, close) => {
    $$('.switch', root).forEach(b => b.addEventListener('click', () => { const k = b.dataset.k; settings[k] = !settings[k]; b.classList.toggle('on', settings[k]); b.setAttribute('aria-checked', settings[k]); saveSettings(); if (k === 'sound' && settings.sound) beep(660); }));
    $$('#th .chip', root).forEach(b => b.addEventListener('click', () => { settings.theme = b.dataset.t; saveSettings(); $$('#th .chip', root).forEach(x => x.classList.toggle('on', x === b)); }));
    on('#wipe', 'click', e => {
      const b = e.currentTarget;
      if (b.dataset.armed) { const keep = { ...settings }; store.clear(); store.set('settings', keep); store.set('seen', true); b.textContent = 'Records effacés'; b.disabled = true; }
      else { b.dataset.armed = '1'; b.textContent = 'Sûr ? Touche encore pour confirmer'; }
    }, root);
    on('#ok', 'click', () => { close(); home(); }, root);
    root.addEventListener('click', e => { if (e.target === root) { close(); home(); } });
  });
}

function trainGrid(filter = 'all') {
  Clock.reset(); S = null;
  const lvl = settings.level;
  const list = GAMES.filter(g => filter === 'all' || g.cat === filter);
  screen(`
    <div class="topbar"><button class="iconbtn" id="back" aria-label="Retour">←</button><h2 style="flex:1">Entraînement</h2></div>
    <div class="chips" id="lv" style="margin-top:6px">${Object.entries(LEVELS).map(([k, v]) => `<button class="chip ${k === lvl ? 'on' : ''}" data-l="${k}">${v.name}</button>`).join('')}</div>
    <div class="chips" id="ft" style="margin-top:8px">${[['all', 'Toutes'], ['speed', '⚡ Rapidité'], ['logic', '⚙ Logique']].map(([k, l]) => `<button class="chip ${k === filter ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
    <div class="ggrid">${list.map((g, i) => {
      const stars = ['F', 'N', 'E'].map(l => { const r = store.get(recKey(g.id, l), null); return r != null && r >= 70 ? '★' : '☆'; }).join('');
      const rec = store.get(recKey(g.id, lvl), null);
      return `<button class="gtok" data-id="${g.id}" style="background:${g.color};color:${g.fg};animation-delay:${i * 30}ms" aria-label="${g.name}, record ${rec ?? 'aucun'}">
        <span class="catdot ${g.cat === 'speed' ? 'cat-speed' : 'cat-logic'}" aria-hidden="true">${g.cat === 'speed' ? '⚡' : '⚙'}</span>
        <span class="ic">${g.icon}</span><span class="nm">${g.name}</span><span class="stars" title="Étoile : 70+ par niveau">${stars}</span></button>`;
    }).join('')}</div>
    <p class="small muted" style="margin-top:14px">Une étoile par niveau quand tu dépasses 70/100.</p>
  `);
  on('#back', 'click', home);
  $$('#lv .chip').forEach(b => b.addEventListener('click', () => { settings.level = b.dataset.l; saveSettings(); trainGrid(filter); }));
  $$('#ft .chip').forEach(b => b.addEventListener('click', () => trainGrid(b.dataset.f)));
  $$('.gtok').forEach(b => b.addEventListener('click', () => {
    const g = GAMES.find(x => x.id === b.dataset.id);
    S = { mode: 'train', level: settings.level, seed: newSeed(), games: [g], idx: 0, scores: {}, details: {}, filter };
    intro();
  }));
}

function currentPlayer() { return S.mode === 'family' ? S.players[S.p] : null; }

function intro() {
  Clock.reset();
  const g = S.games[S.idx], lvl = S.level, pl = currentPlayer();
  const rec = S.mode !== 'family' ? store.get(recKey(g.id, lvl), null) : null;
  const step = S.games.length > 1 ? `Épreuve ${S.idx + 1} sur ${S.games.length}` : '';
  screen(`
    <div class="topbar"><button class="iconbtn" id="x" aria-label="Quitter">✕</button>
      <span class="muted small" style="flex:1">${step}</span>
      ${pl ? `<span class="pill">${pawn(pl.i, 22)}${esc(pl.name)}</span>` : ''}</div>
    <div class="intro-top" style="background:${g.color};color:${g.fg}">
      <div class="ic">${g.icon}</div><h1>${g.name}</h1>
    </div>
    <p class="intro-rule">${g.rule(lvl)}</p>
    <div class="chips">${catPill(g.cat)}<span class="pill">⏱ ${g.info(lvl)}</span><span class="pill">${gauge(LEVELS[lvl].g)} ${LEVELS[lvl].name}</span>${rec != null ? `<span class="pill">🏆 Record : ${rec}</span>` : ''}</div>
    <div class="spacer"></div>
    <button class="btn" id="go" style="margin-top:20px">On y va !</button>
  `);
  on('#x', 'click', () => confirmLeave(false));
  on('#go', 'click', () => { if (settings.sound) beep(660); play(g); });
}

function confirmLeave(inGame) {
  if (inGame) Clock.paused = true;
  const fam = S && S.mode === 'family', multi = S && S.mode !== 'train';
  const canSkip = inGame && multi && CUR && !CUR.over;
  sheet(`
    <h2>${inGame ? 'Pause' : fam ? 'Arrêter la partie ?' : 'Tu quittes ?'}</h2>
    <p class="muted">${inGame ? (canSkip ? 'Tu peux reprendre, passer cette épreuve (elle comptera 0) ou tout arrêter.' : 'Si tu arrêtes, ce score ne sera pas gardé.') : fam ? 'Les scores de la partie seront perdus.' : S && S.mode === 'solo' && S.idx > 0 ? 'Le test complet sera interrompu.' : 'Tu reviendras quand tu veux.'}</p>
    <button class="btn" id="cont">${inGame ? 'Reprendre' : 'Rester'}</button>
    ${canSkip ? '<button class="btn secondary" id="skip">Passer cette épreuve</button>' : ''}
    <button class="btn ${canSkip ? 'ghost' : 'secondary'}" id="stop">${inGame && !multi ? 'Arrêter l’épreuve' : fam ? 'Arrêter la partie' : multi ? 'Arrêter le test' : 'Quitter'}</button>
  `, (root, close) => {
    on('#cont', 'click', () => { close(); Clock.paused = false; }, root);
    on('#skip', 'click', () => { close(); Clock.paused = false; CUR.done(0, 'Épreuve passée'); }, root);
    on('#stop', 'click', () => { close(); const back = S && S.mode === 'train' ? () => trainGrid(S.filter) : home; Clock.reset(); back(); }, root);
  });
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && $('#stage') && !Clock.paused && !$('#sheet-root').innerHTML) confirmLeave(true);
});

function play(g) {
  Clock.reset();
  screen(`
    <div class="hud"><button class="iconbtn" id="x" aria-label="Arrêter l’épreuve">✕</button>
      <span class="gn" style="color:inherit">${g.icon} ${g.name}</span>
      <span class="sc" id="sc" aria-live="polite">0</span></div>
    <div class="fuse" id="fuse"><div class="track"><div class="fill" id="fill" style="background:${g.color}"></div></div><span class="secs" id="secs"></span></div>
    <div class="stage" id="stage"></div>
  `);
  const stage = $('#stage'), fill = $('#fill'), secs = $('#secs'), fuse = $('#fuse'), sc = $('#sc');
  on('#x', 'click', () => confirmLeave(true));
  Clock.start();
  const rng = makeRng(hashStr(S.seed + ':' + g.id + ':' + S.level));
  const c = CUR = {
    stage, level: S.level, rng, over: false,
    L: o => o[S.level],
    tm: ms => ms * (settings.moreTime ? 1.5 : 1),
    later: (fn, ms) => Clock.later(fn, ms),
    cancel: id => Clock.cancel(id),
    now: () => Clock.t,
    beep: f => beep(f, .1),
    score: v => { sc.textContent = v; },
    progress: r => { fuse.classList.remove('urgent'); fill.style.width = (Math.max(0, Math.min(1, r)) * 100) + '%'; secs.textContent = ''; },
    timer(sec, onEnd) {
      const total = c.tm(sec * 1000), st = Clock.t; let fired = false, lastS = null;
      fuse.classList.remove('urgent');
      const off = Clock.tick(t => {
        if (fired) return;
        const rem = Math.max(0, total - (t - st));
        fill.style.width = (rem / total * 100) + '%';
        const s = Math.ceil(rem / 1000); secs.textContent = s;
        if (rem <= 5000 && rem > 0) { fuse.classList.add('urgent'); if (s !== lastS) { lastS = s; haptic(10); } }
        if (rem <= 0) { fired = true; off(); onEnd(); }
      });
      return () => { if (!fired) { fired = true; off(); } };
    },
    good(el, word) {
      haptic(15); beep(880);
      if (el) fx(el, 'ok-fx');
      if (word && el) { const r = el.getBoundingClientRect(); floatWord(r.left + r.width / 2, r.top); }
    },
    bad(el) { haptic([30, 40, 30]); beep(200); if (el) fx(el, 'ko-fx'); },
    done(raw, detail) {
      if (c.over) return; c.over = true;
      Clock.reset();
      const score = Math.round(Math.max(0, Math.min(100, raw)));
      gameEnd(g, score, detail);
    }
  };
  // compte à rebours 3-2-1
  let n = 3;
  const cd = () => {
    if (n === 0) { stage.innerHTML = ''; g.run(c); return; }
    stage.innerHTML = `<div class="cd" style="color:${g.color}"><span>${n}</span></div>`;
    beep(440 + (3 - n) * 80, .08); n--; Clock.later(cd, 700);
  };
  cd();
}

function phrase(score) {
  const pick = a => a[Math.floor(Math.random() * a.length)];
  if (score >= 85) return pick(['Impressionnant, vraiment.', 'Là, tu as tout pigé.', 'Difficile de faire mieux !']);
  if (score >= 60) return pick(['Solide ! Encore un petit effort pour le haut du tableau.', 'Belle épreuve.', 'Du bon travail, rapide et propre.']);
  if (score >= 35) return pick(['Pas mal du tout. La prochaine sera meilleure.', 'Ça se met en place.', 'Un bon début, il y a de la marge.']);
  return pick(['Échauffement terminé. On retente ?', 'Pas facile, celle-là. Elle demande un peu d’entraînement.', 'Prends le temps de relire la consigne et retente.']);
}

function gameEnd(g, score, detail) {
  S.scores[g.id] = score; S.details[g.id] = detail;
  let prev = null, rec = false;
  if (S.mode !== 'family') {
    prev = store.get(recKey(g.id, S.level), null);
    rec = prev == null || score > prev;
    if (rec) store.set(recKey(g.id, S.level), score);
  }
  const last = S.idx >= S.games.length - 1;
  const pl = currentPlayer();
  const prog = S.games.length > 1 ? `<div class="prog" aria-label="Progression">${S.games.map((_, k) => `<i class="${k < S.idx ? 'd' : k === S.idx ? 'c' : ''}"></i>`).join('')}</div><p class="small muted" style="text-align:center;margin:0">${S.idx + 1} sur ${S.games.length}</p>` : '';
  screen(`
    <div class="res-head">
      <div class="intro-top" style="background:${g.color};color:${g.fg};display:inline-block;padding:12px 26px;margin-bottom:12px"><span style="font-size:2.6rem">${g.icon}</span></div>
      <h2>${g.name}</h2>
      ${pl ? `<p class="muted">${esc(pl.name)}</p>` : ''}
      <div class="bigscore" style="margin-top:10px">${score}<small> / 100</small></div>
      <p class="muted" style="font-size:1.05rem">${esc(detail)}</p>
      ${rec && prev != null ? `<div class="recband">Nouveau record ! Tu bats ton record (${prev}).</div>` : ''}
      <p style="margin-top:12px;font-weight:500">${phrase(score)}</p>
    </div>
    ${prog}
    <div class="spacer"></div>
    <div id="acts" style="margin-top:18px"></div>
  `);
  const acts = $('#acts');
  if (S.mode === 'train') {
    acts.innerHTML = `<button class="btn" id="again">Rejouer</button><button class="btn secondary" id="other">Autres épreuves</button>`;
    on('#again', 'click', () => { S.seed = newSeed(); S.scores = {}; intro(); });
    on('#other', 'click', () => trainGrid(S.filter));
  } else if (S.mode === 'solo') {
    acts.innerHTML = `<button class="btn ${last ? 'accent' : ''}" id="nx">${last ? 'Voir mon résultat' : 'Épreuve suivante'}</button>`;
    on('#nx', 'click', () => { if (last) soloFinal(); else { S.idx++; intro(); } });
  } else {
    const lastPlayer = S.p >= S.players.length - 1;
    acts.innerHTML = `<button class="btn ${last ? 'accent' : ''}" id="nx">${!last ? 'Épreuve suivante' : lastPlayer ? 'Voir le podium' : 'Au joueur suivant'}</button>`;
    on('#nx', 'click', () => {
      if (!last) { S.idx++; intro(); return; }
      pl.total = totalOf(pl.scores, S.games);
      if (lastPlayer) podium(); else { S.p++; S.idx = 0; S.scores = S.players[S.p].scores; S.details = {}; handover(); }
    });
  }
}

function totalOf(scores, games) { const v = games.map(g => scores[g.id] || 0); return Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10); }
function profileOf(scores, games) {
  const avg = cat => { const v = games.filter(g => g.cat === cat).map(g => scores[g.id] || 0); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
  const sp = avg('speed'), lo = avg('logic'), sum = sp + lo;
  const pct = sum ? Math.round(sp / sum * 100) : 50;
  const label = pct > 55 ? 'Plutôt éclair' : pct < 45 ? 'Plutôt stratège' : 'Bien équilibré';
  return { sp: Math.round(sp), lo: Math.round(lo), pct, label };
}

function soloFinal() {
  const total = totalOf(S.scores, S.games), pf = profileOf(S.scores, S.games);
  const prev = store.get('best:' + S.level, null), rec = prev == null || total > prev;
  if (rec) store.set('best:' + S.level, total);
  const sorted = S.games.slice().sort((a, b) => (S.scores[b.id] || 0) - (S.scores[a.id] || 0));
  const msg = pf.label === 'Plutôt éclair' ? 'Tu réagis au quart de tour. Côté logique, il reste de quoi grimper.'
    : pf.label === 'Plutôt stratège' ? 'Tu réfléchis bien, et la vitesse peut encore suivre.' : 'Rapidité et logique avancent ensemble. Bel équilibre.';
  const nextLvl = S.level === 'F' && total >= 600 ? ' Essaie « En forme » la prochaine fois ?' : S.level === 'N' && total >= 650 ? ' Prêt pour « Costaud » ?' : '';
  screen(`
    <div class="res-head">
      <p class="muted">Test complet · ${LEVELS[S.level].name}</p>
      <div class="bigscore" id="tot">0<small> / 1000</small></div>
      ${rec && prev != null ? `<div class="recband">Nouveau record ! (avant : ${prev})</div>` : ''}
      <h2 style="margin-top:14px">${pf.label}</h2>
      <p class="muted">${msg}${nextLvl}</p>
    </div>
    <div class="balance">
      <div class="bar"><div style="width:50%;background:var(--cat-speed);color:#1E1B4B" id="bs">⚡</div><div style="width:50%;background:var(--cat-logic);color:#fff" id="bl">⚙</div></div>
      <div class="lbl"><span>Rapidité ${pf.sp}/100</span><span>Logique ${pf.lo}/100</span></div>
    </div>
    <div class="rlist">${sorted.map(g => `<div class="ritem"><span class="mini" style="background:${g.color}">${g.icon}</span><span>${g.name}</span><span class="v">${S.scores[g.id] || 0}</span></div>`).join('')}</div>
    <button class="btn accent" id="again" style="margin-top:18px">Rejouer le test</button>
    <button class="btn secondary" id="home">Retour à l’accueil</button>
  `);
  countUp($('#tot'), total, '<small> / 1000</small>');
  requestAnimationFrame(() => { $('#bs').style.width = pf.pct + '%'; $('#bl').style.width = (100 - pf.pct) + '%'; });
  on('#again', 'click', () => { S = { ...S, seed: newSeed(), idx: 0, scores: {}, details: {} }; intro(); });
  on('#home', 'click', home);
}
function countUp(el, to, suffix) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.innerHTML = to + suffix; return; }
  const t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 3); el.innerHTML = Math.round(to * e) + suffix; if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/* =========================================================
   MODE FAMILLE
   ========================================================= */

function familySetup(prevNames) {
  Clock.reset();
  const saved = prevNames || store.get('famNames', ['', '']);
  let names = saved.length >= 2 ? saved.slice(0, 4) : ['', ''];
  let format = store.get('famFormat', 'quick'), lvl = settings.level;
  function render() {
    screen(`
      <div class="topbar"><button class="iconbtn" id="back" aria-label="Retour">←</button><h2 style="flex:1">Qui joue ?</h2></div>
      <div id="pl">${names.map((n, i) => `<div class="pinput">${pawn(i)}<input maxlength="16" autocapitalize="words" autocomplete="off" placeholder="Joueur ${i + 1}" value="${esc(n)}" data-i="${i}" aria-label="Prénom du joueur ${i + 1}">${i >= 2 ? `<button class="iconbtn" data-rm="${i}" aria-label="Retirer">✕</button>` : ''}</div>`).join('')}</div>
      ${names.length < 4 ? `<button class="btn ghost" id="add">+ Ajouter un joueur</button>` : ''}
      <h3 style="margin-top:16px">Format</h3>
      <div class="chips" id="fm" style="margin-top:8px">
        <button class="chip ${format === 'quick' ? 'on' : ''}" data-f="quick">Partie rapide · 4 épreuves</button>
        <button class="chip ${format === 'full' ? 'on' : ''}" data-f="full">Test complet · 12</button>
      </div>
      <h3 style="margin-top:16px">Niveau</h3>
      <div class="chips" id="lv" style="margin-top:8px">${Object.entries(LEVELS).map(([k, v]) => `<button class="chip ${k === lvl ? 'on' : ''}" data-l="${k}">${v.name}</button>`).join('')}</div>
      <p class="small muted" style="margin-top:10px">Tout le monde joue les mêmes épreuves, avec les mêmes énoncés.</p>
      <div class="spacer"></div>
      <p class="small muted" id="hint" style="text-align:center;margin-top:16px"></p>
      <button class="btn" id="go">On commence</button>
    `);
    const sync = () => { names = $$('#pl input').map(i => i.value); const ok = names.filter(n => n.trim()).length >= 2; $('#go').disabled = !ok; $('#hint').textContent = ok ? '' : 'Il faut au moins deux joueurs.'; };
    $$('#pl input').forEach(i => i.addEventListener('input', sync));
    $$('[data-rm]').forEach(b => b.addEventListener('click', () => { sync(); names.splice(+b.dataset.rm, 1); render(); }));
    on('#add', 'click', () => { sync(); names.push(''); render(); $$('#pl input').pop().focus(); });
    $$('#fm .chip').forEach(b => b.addEventListener('click', () => { sync(); format = b.dataset.f; render(); }));
    $$('#lv .chip').forEach(b => b.addEventListener('click', () => { sync(); lvl = b.dataset.l; render(); }));
    on('#back', 'click', home);
    on('#go', 'click', () => {
      sync();
      const list = names.map((n, i) => ({ name: n.trim(), i })).filter(p => p.name);
      if (list.length < 2) return;
      store.set('famNames', names); store.set('famFormat', format); settings.level = lvl; saveSettings();
      startFamily(list.map((p, k) => ({ name: p.name, i: k, scores: {}, total: 0 })), format, lvl);
    });
    sync();
  }
  render();
}

function startFamily(players, format, lvl) {
  const seed = newSeed(), r = makeRng(seed);
  let games;
  if (format === 'full') games = FULL_ORDER.map(i => GAMES[i]);
  else {
    const sp = r.shuffle(GAMES.filter(g => g.cat === 'speed')).slice(0, 2), lo = r.shuffle(GAMES.filter(g => g.cat === 'logic')).slice(0, 2);
    games = [sp[0], lo[0], sp[1], lo[1]];
  }
  players.forEach(p => { p.scores = {}; p.total = 0; });
  S = { mode: 'family', level: lvl, seed, games, idx: 0, players, p: 0, scores: players[0].scores, details: {}, format };
  handover();
}

function handover() {
  Clock.reset();
  const pl = S.players[S.p], st = PLAYER_STYLE[pl.i];
  const dark = st.color === '#1F5FE0';
  screen(`
    <div class="topbar"><button class="iconbtn" id="x" aria-label="Arrêter la partie">✕</button><span class="muted small" style="flex:1">Joueur ${S.p + 1} sur ${S.players.length}</span></div>
    <div class="handover" style="background:${st.color};color:${dark ? '#fff' : '#1E1B4B'}">
      ${pawn(pl.i, 120, '#fff')}
      <h1>Au tour de ${esc(pl.name)} !</h1>
      <p style="font-size:1.1rem">Passe le téléphone à ${esc(pl.name)}.</p>
      ${S.p > 0 ? '<p class="small">Les scores des autres restent secrets jusqu’au podium.</p>' : ''}
      <p class="small">${S.games.length} épreuve${S.games.length > 1 ? 's' : ''} · ${LEVELS[S.level].name}</p>
    </div>
    <button class="btn hold" id="hold"><span class="ring" id="ring"></span><span style="position:relative">C’est moi, je commence</span></button>
    <p class="small muted" style="text-align:center;margin:6px 0 0">Garde le doigt appuyé un instant.</p>
  `);
  on('#x', 'click', () => confirmLeave(false));
  const hold = $('#hold'), ring = $('#ring');
  let t0 = null, raf = null;
  const reset = () => { t0 = null; if (raf) cancelAnimationFrame(raf); ring.style.width = '0'; };
  const step = t => { if (t0 == null) return; const k = Math.min(1, (t - t0) / 600); ring.style.width = (k * 100) + '%'; if (k >= 1) { reset(); haptic(20); intro(); return; } raf = requestAnimationFrame(step); };
  hold.addEventListener('contextmenu', e => e.preventDefault());
  hold.addEventListener('pointerdown', e => { e.preventDefault(); t0 = performance.now(); raf = requestAnimationFrame(step); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => hold.addEventListener(ev, reset));
  hold.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); intro(); } });
}

function podium() {
  Clock.reset();
  const P = S.players.slice().sort((a, b) => b.total - a.total);
  const top = P[0], second = P[1];
  const gap = second ? top.total - second.total : 0;
  const title = second && gap === 0 ? 'Ex æquo !' : gap < 30 ? `${esc(top.name)} gagne, de justesse !` : `${esc(top.name)} gagne, de ${gap} points !`;
  const order = [P[1], P[0], P[2]].filter(Boolean);
  const heights = { 0: 160, 1: 128, 2: 96 };
  const rankOf = p => P.indexOf(p);
  const steps = order.map((p, k) => {
    const rk = P.filter(o => o.total > p.total).length, h = heights[rk];
    return `<div class="step"><div class="nm">${esc(p.name)}</div>${pawn(p.i, 40)}
      <div class="blk ${rk === 0 ? 'first' : ''}" style="height:${h}px;animation-delay:${k * 150}ms">${rk + 1}</div>
      <div class="pt">${p.total}</div></div>`;
  }).join('');
  const notes = S.players.map(p => {
    const best = S.games.slice().sort((a, b) => (p.scores[b.id] || 0) - (p.scores[a.id] || 0))[0];
    const champion = S.players.every(o => (o.scores[best.id] || 0) <= (p.scores[best.id] || 0));
    return `<div class="ritem">${pawn(p.i, 32)}<span><b>${esc(p.name)}</b> · ${champion ? 'imbattable en' : 'point fort'} : ${best.name} (${p.scores[best.id] || 0})</span></div>`;
  }).join('');
  screen(`
    <div class="res-head"><p class="muted">${S.format === 'full' ? 'Test complet' : 'Partie rapide'} · ${LEVELS[S.level].name}</p><h1>${title}</h1></div>
    <div class="podium">${steps}</div>
    ${P[3] ? `<div class="ritem">${pawn(P[3].i, 32)}<span>${P.filter(o => o.total > P[3].total).length + 1}. ${esc(P[3].name)}</span><span class="v">${P[3].total}</span></div>` : ''}
    <h3 style="margin-top:16px">Les points forts</h3>
    <div class="rlist">${notes}</div>
    <p class="small muted" style="margin-top:10px">Score sur 1000 : moyenne des épreuves × 10.</p>
    <button class="btn accent" id="rev" style="margin-top:16px">Revanche</button>
    <button class="btn secondary" id="chg">Changer de joueurs</button>
    <button class="btn ghost" id="home">Accueil</button>
  `);
  on('#rev', 'click', () => startFamily(S.players.map((p, k) => ({ name: p.name, i: k })), S.format, S.level));
  on('#chg', 'click', () => familySetup());
  on('#home', 'click', home);
}

/* ---------- Clavier : Entrée / Espace jouent comme un toucher ---------- */
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const t = e.target;
  if (!t || !t.closest || !t.closest('#stage') || t.id === 'val' || !t.matches('button,[role=button]')) return;
  e.preventDefault();
  t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
});

/* ---------- Démarrage ---------- */
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { }); });
}
home();
