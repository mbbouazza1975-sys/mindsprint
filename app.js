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
const settings = Object.assign({ sound: true, haptic: true, moreTime: false, theme: 'auto', level: 'F' }, store.get('settings', {}));
function saveSettings() { store.set('settings', settings); applyTheme(); }
function applyTheme() {
  document.documentElement.dataset.theme = settings.theme;
  const dark = settings.theme === 'dark' || (settings.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = dark ? '#14133A' : '#3B3FE0';
}
applyTheme();
['F','N','E'].forEach(l => { const v = store.get('best:' + l, null); if (v != null && v > 100) store.set('best:' + l, Math.round(v / 10)); });

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

function bestOf(id) { return Math.max(-1, ...['F', 'N', 'E'].map(l => store.get(recKey(id, l), -1))); }
function home() {
  Clock.reset(); S = null;
  const first = !store.get('seen', false);
  const stars = GAMES.map(g => { const b = bestOf(g.id); return b < 0 ? 0 : starsOf(b); });
  const tot = stars.reduce((a, b) => a + b, 0);
  const bests = ['F', 'N', 'E'].map(l => [l, store.get('best:' + l, null)]).filter(([, v]) => v != null);
  const hello = first ? 'Salut ! Je suis Mèche. Les phares de l’archipel t’attendent : on en allume combien ce soir ?'
    : tot ? `Re-bonjour ! Ton archipel brille de ${tot} étoile${tot > 1 ? 's' : ''} sur 36. On continue ?` : 'Re-bonjour ! Prêt pour une nouvelle partie ?';
  app.innerHTML = `<div class="screen home">
   <div class="home-sky"><div class="beam"></div><div class="home-sea"><svg viewBox="0 0 360 200" preserveAspectRatio="none"><path d="M0 40Q60 20 120 36T240 30T360 38V200H0Z" fill="#1B6F8A"/><g class="sc-wave"><path d="M-60 90q30-14 60 0t60 0 60 0 60 0 60 0 60 0 60 0 60 0V200H-60Z" fill="#155A72"/></g><g class="sc-wave sc-w2"><path d="M-60 140q30-14 60 0t60 0 60 0 60 0 60 0 60 0 60 0 60 0V200H-60Z" fill="#0F4A60"/></g><path d="M230 40q30-26 70-6l10 6z" fill="#0E1B42"/><rect x="254" y="-18" width="14" height="44" fill="#F7FBFA" stroke="#0E1B42" stroke-width="3"/><rect x="254" y="-4" width="14" height="8" fill="#FF7A6B"/><circle cx="261" cy="-22" r="6" fill="#FFD27A"/></svg></div></div>
   <div class="topbar between"><div class="wordmark">Mind<b>Sprint</b></div><button class="iconbtn" id="set" aria-label="Réglages">⚙</button></div>
   <div class="hello">${MECHE}<div class="bubble">${hello}</div></div>
   <button class="mode-solo" id="solo"><span><span class="t">Jouer seul</span><br>Les 12 épreuves, environ 10 min</span><span class="ico">🧭</span></button>
   <button class="mode-fam" id="fam"><span style="font-size:1.8rem">👨‍👩‍👧‍👦</span><span>En famille<br><span class="small" style="font-weight:500">2 à 4 joueurs, un seul téléphone</span></span></button>
   <button class="mode-fam" id="train" style="background:var(--foam)"><span style="font-size:1.8rem">🏝️</span><span>Entraînement libre<br><span class="small" style="font-weight:500">Choisis une île, bats ton record</span></span></button>
   ${deferredInstall ? `<button class="mode-fam" id="inst" style="background:var(--foam)"><span style="font-size:1.8rem">📲</span><span>Installer l’app<br><span class="small" style="font-weight:500">Sur l’écran d’accueil, même sans connexion</span></span></button>` : ''}
   <div class="archi" aria-label="Étoiles gagnées : ${tot} sur 36">${stars.map(n => `<i class="s${n}"></i>`).join('')}</div>
   <p class="small" style="color:#C9D6F2;margin:0">Ton archipel : ${tot} étoile${tot > 1 ? 's' : ''} sur 36${bests.length ? ' · Meilleur test : ' + bests.map(([l, v]) => `${LEVELS[l].name} ${v}/100`).join(', ') : ''}</p>
   <div class="spacer"></div>
   <p class="small" style="color:#C9D6F2;text-align:center;margin-top:18px">Un jeu pour s’amuser. Il ne mesure ni n’améliore l’intelligence.</p>
  </div>`;
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
  app.innerHTML = `<div class="screen home">${scene('phares')}
    <div class="topbar"><button class="iconbtn" id="back" aria-label="Retour">←</button><span class="plaque" style="margin-left:4px">Entraînement</span></div>
    <div class="chips" id="lv" style="margin-top:10px">${Object.entries(LEVELS).map(([k, v]) => `<button class="chip ${k === lvl ? 'on' : ''}" data-l="${k}">${v.name}</button>`).join('')}</div>
    <div class="chips" id="ft" style="margin-top:8px">${[['all', 'Toutes'], ['speed', '⚡ Rapidité'], ['logic', '⚙ Logique']].map(([k, l]) => `<button class="chip ${k === filter ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
    <div class="ggrid">${list.map((g, i) => {
      const rec = store.get(recKey(g.id, lvl), null), n = rec == null ? 0 : starsOf(rec);
      return `<button class="gtok" data-id="${g.id}" style="background:${g.color};color:${g.fg};animation-delay:${i * 30}ms" aria-label="${g.name}, ${n} étoile${n > 1 ? 's' : ''}, record ${rec ?? 'aucun'}">
        <span class="catdot ${g.cat === 'speed' ? 'cat-speed' : 'cat-logic'}" aria-hidden="true">${g.cat === 'speed' ? '⚡' : '⚙'}</span>
        <span class="ic">${g.icon}</span><span class="nm">${g.name}</span><span class="stars">${'★'.repeat(n)}${'☆'.repeat(3 - n)}</span></button>`;
    }).join('')}</div>
    <p class="plaque small" style="margin-top:14px">Étoiles : 40, 65 et 85 points au niveau choisi.</p></div>`;
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

function profileKey() { const pl = S && S.mode === 'family' ? S.players[S.p] : null; return pl ? pl.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') : 'moi'; }
const tutoKey = g => `tuto:${profileKey()}:${g.id}:${S.level}`;
function rulesHTML(g, lvl) { return `<ul class="rules">${tutoRules(g.id, lvl).map(r => `<li>${r}</li>`).join('')}</ul>`; }
function exampleHTML(g, lvl) { const T = TUTOS[g.id]; return `<div class="example"><div class="ex-title">Exemple</div><div class="ex-body">${T.ex(lvl)}</div><p class="ex-leg">${T.legend(lvl)}</p></div>`; }
function intro() {
  Clock.reset();
  const g = S.games[S.idx], lvl = S.level, pl = currentPlayer(), T = TUTOS[g.id];
  const rec = S.mode !== 'family' ? store.get(recKey(g.id, lvl), null) : null;
  const step = S.games.length > 1 ? `Épreuve ${S.idx + 1} sur ${S.games.length}` : '';
  const done = store.get(tutoKey(g), false);
  app.innerHTML = `<div class="screen play">${scene(g.id)}
    <div class="topbar"><button class="iconbtn" id="x" aria-label="Quitter">✕</button>${step ? `<span class="plaque small" style="margin-left:auto">${step}</span>` : ''}${pl ? `<span class="plaque small" style="${step ? '' : 'margin-left:auto'}">${esc(pl.name)}</span>` : ''}</div>
    <div class="postcard short">${SCENES[g.id]}<div class="tag"><span class="ic">${g.icon}</span><div><h1>${g.name}</h1><span class="small">${T.but}</span></div></div></div>
    <div class="coach">${MECHE.replace('data-mood="neutral"', 'data-mood="happy"')}<div class="bubble">${rulesHTML(g, lvl)}</div></div>
    ${exampleHTML(g, lvl)}
    <div class="chips" style="margin-top:10px">${catPill(g.cat)}<span class="pill">⏱ ${g.info(lvl)}</span><span class="pill">${gauge(LEVELS[lvl].g)} ${LEVELS[lvl].name}</span>${rec != null ? `<span class="pill">🏆 ${rec}</span>` : ''}</div>
    <div class="spacer"></div>
    ${done ? `<button class="btn go" id="go">On y va !</button><button class="btn secondary" id="try">Refaire l’essai</button>`
      : `<button class="btn go" id="try">Essayer sans chrono</button><button class="btn ghost light" id="go">Passer l’essai</button>`}
  </div>`;
  on('#x', 'click', () => confirmLeave(false));
  on('#go', 'click', () => { SFX('tap'); play(g, false); });
  on('#try', 'click', () => { SFX('tap'); play(g, true); });
}
function practiceRetry(g) {
  Clock.reset(); SFX('ko');
  app.innerHTML = `<div class="screen play result">${scene(g.id)}
    <div class="card">${MECHE.replace('data-mood="neutral"', 'data-mood="surprised"')}<h2>Pas encore tout à fait…</h2>
    <p style="font-weight:500">${TUTOS[g.id].oops}</p>${exampleHTML(g, S.level)}</div>
    <div class="spacer"></div><button class="btn go" id="again">On réessaie</button><button class="btn secondary" id="go">Passer au vrai jeu</button></div>`;
  on('#again', 'click', () => play(g, true));
  on('#go', 'click', () => play(g, false));
}
function practiceDone(g) {
  Clock.reset(); store.set(tutoKey(g), true); SFX('end');
  app.innerHTML = `<div class="screen play result">${scene(g.id)}
    <div class="card">${MECHE.replace('data-mood="neutral"', 'data-mood="happy"')}<h2>Tu as compris !</h2>
    <p style="font-weight:500">Le vrai jeu commence maintenant, avec le chrono.</p>${rulesHTML(g, S.level)}</div>
    <div class="spacer"></div><button class="btn go" id="go">C’est parti !</button><button class="btn secondary" id="again">Refaire l’essai</button></div>`;
  on('#go', 'click', () => play(g, false));
  on('#again', 'click', () => play(g, true));
}
function confirmLeave(inGame) {
  if (inGame) Clock.paused = true;
  const fam = S && S.mode === 'family', multi = S && S.mode !== 'train';
  const practice = CUR && CUR.practice && !CUR.over;
  const canSkip = inGame && multi && CUR && !CUR.over && !practice;
  const g = S && S.games[S.idx];
  sheet(`
    <h2>${inGame ? 'Pause' : fam ? 'Arrêter la partie ?' : 'Tu quittes ?'}</h2>
    ${inGame && g ? `<details class="rev"><summary>Revoir la consigne</summary>${rulesHTML(g, S.level)}${exampleHTML(g, S.level)}</details>` : ''}
    <p class="muted">${practice ? 'C’est l’essai : rien n’est compté.' : inGame ? (canSkip ? 'Tu peux reprendre, passer cette épreuve (elle comptera 0) ou tout arrêter.' : 'Si tu arrêtes, ce score ne sera pas gardé.') : fam ? 'Les scores de la partie seront perdus.' : S && S.mode === 'solo' && S.idx > 0 ? 'Le test complet sera interrompu.' : 'Tu reviendras quand tu veux.'}</p>
    <button class="btn go" id="cont">${inGame ? 'Reprendre' : 'Rester'}</button>
    ${practice ? '<button class="btn secondary" id="endp">Terminer l’essai</button>' : ''}
    ${canSkip ? '<button class="btn secondary" id="skip">Passer cette épreuve</button>' : ''}
    <button class="btn ${canSkip || practice ? 'ghost' : 'secondary'}" id="stop">${inGame && !multi ? 'Arrêter l’épreuve' : fam ? 'Arrêter la partie' : multi ? 'Arrêter le test' : 'Quitter'}</button>
  `, (root, close) => {
    on('#cont', 'click', () => { close(); Clock.paused = false; }, root);
    on('#endp', 'click', () => { close(); Clock.paused = false; CUR.over = true; practiceDone(g); }, root);
    on('#skip', 'click', () => { close(); Clock.paused = false; CUR.done(0, 'Épreuve passée'); }, root);
    on('#stop', 'click', () => { close(); const back = S && S.mode === 'train' ? () => trainGrid(S.filter) : home; Clock.reset(); back(); }, root);
  });
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && $('#stage') && !Clock.paused && !$('#sheet-root').innerHTML) confirmLeave(true);
});

function play(g, practice) {
  Clock.reset();
  app.innerHTML = `<div class="screen play">${scene(g.id)}<div class="hud"><button class="iconbtn" id="x" aria-label="Pause">⏸</button>
    ${MECHE.replace('class="mascot"', 'class="mascot" id="hm"')}<span class="gn">${g.name}</span>
    <span class="buoy" id="buoy"><span id="sc" aria-live="polite">0</span></span></div>
    <div class="fuse" id="fuse"><div class="track"><div class="fill" id="fill"></div></div><span class="secs" id="secs"></span></div>
    ${practice ? '<div class="practice-pill">Essai · ne compte pas</div>' : ''}
    <div class="coachtip" id="tip" aria-live="polite"></div>
    <div class="stage" id="stage"></div></div>`;
  window.scrollTo(0, 0);
  const stage = $('#stage'), fill = $('#fill'), secs = $('#secs'), fuse = $('#fuse'), sc = $('#sc'), tip = $('#tip'), T = TUTOS[g.id];
  on('#x', 'click', () => confirmLeave(true));
  Clock.start();
  const rng = makeRng(hashStr(S.seed + ':' + g.id + ':' + S.level + (practice ? ':essai' : '')));
  let goods = 0, lastInput = 0, tipT = null;
  const say = (txt, ms = 2600) => { tip.textContent = txt; tip.classList.add('show'); clearTimeout(tipT); tipT = setTimeout(() => tip.classList.remove('show'), ms); };
  if (practice) {
    stage.addEventListener('pointerdown', () => { lastInput = Clock.t; $$('.hint', stage).forEach(e => e.classList.remove('hint')); }, true);
    Clock.tick(t => { if (t - lastInput > 5000) { const h = $('[data-ok]', stage); if (h && !h.classList.contains('hint')) { h.classList.add('hint'); say('Indice : c’est celui qui clignote.'); } } });
    fuse.style.visibility = 'hidden';
  }
  const c = CUR = {
    stage, level: S.level, rng, over: false, practice: !!practice,
    L: o => o[S.level],
    tm: ms => ms * (settings.moreTime ? 1.5 : 1) * (practice ? 1.6 : 1),
    later: (fn, ms) => Clock.later(fn, ms),
    cancel: id => Clock.cancel(id),
    now: () => Clock.t,
    beep: f => { if (settings.sound) beep(f, .1); },
    ok: el => { $$('[data-ok]', stage).forEach(e => { if (e !== el) { delete e.dataset.ok; e.classList.remove('hint'); } }); if (el) { el.dataset.ok = '1'; lastInput = Math.max(lastInput, Clock.t - 1500); if (practice && (g.id === 'lanterne' || g.id === 'bateaux')) { el.classList.add('hint'); say(g.id === 'lanterne' ? 'Elle brille : touche !' : 'Un bateau : touche l’eau !', 1200); } } },
    score: v => { sc.textContent = v; fx($('#buoy'), 'bump'); },
    progress: r => { fuse.classList.remove('urgent'); fill.style.width = (Math.max(0, Math.min(1, r)) * 100) + '%'; secs.textContent = ''; },
    timer(sec, onEnd) {
      if (practice) return () => { };
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
      haptic(15); SFX('ok'); mood($('#hm'), 'happy', 700);
      if (el) { fx(el, 'ok-fx'); burst(el, true); }
      if (word && el) { const r = el.getBoundingClientRect(); floatWord(r.left + r.width / 2, r.top); }
      if (practice) { goods++; if (goods >= T.goal && !c.over) { c.over = true; Clock.later(() => practiceDone(g), 700); } else say(['Bien !', 'C’est ça !', 'Parfait.', 'Oui !'][goods % 4], 1200); }
    },
    bad(el) {
      haptic([30, 40, 30]); SFX('ko'); mood($('#hm'), 'surprised', 700);
      if (el) { fx(el, 'ko-fx'); burst(el, false); }
      if (practice) say(T.oops, 3200);
    },
    done(raw, detail) {
      if (c.over) return; c.over = true;
      if (practice) { if (goods >= T.goal) practiceDone(g); else practiceRetry(g); return; }
      Clock.reset();
      const score = Math.round(Math.max(0, Math.min(100, raw)));
      gameEnd(g, score, detail);
    }
  };
  let n = 3;
  const cd = () => {
    if (n === 0) { stage.innerHTML = ''; SFX('count', 0); if (practice) say('Essai sans chrono : prends ton temps.', 2500); g.run(c); return; }
    stage.innerHTML = `<div class="cd"><span>${n}</span></div>`;
    SFX('count', n); n--; Clock.later(cd, 700);
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
  const n = starsOf(score), next = [40, 65, 85].find(s => s > score);
  const prog = S.games.length > 1 ? `<div class="prog" aria-label="Progression">${S.games.map((_, k) => `<i class="${k < S.idx ? 'd' : k === S.idx ? 'c' : ''}"></i>`).join('')}</div>` : '';
  app.innerHTML = `<div class="screen play result">${scene(g.id)}
    <div class="card">${MECHE.replace('data-mood="neutral"', `data-mood="${n >= 2 ? 'happy' : 'neutral'}"`)}<h2>${g.name}</h2>
    ${pl ? `<p class="muted" style="margin:0">${esc(pl.name)}</p>` : ''}
    ${starsHTML(n, true)}<div class="bigscore" id="bs">0<small> / 100</small></div>
    <p class="muted">${esc(detail)}</p>
    ${rec && prev != null ? `<div class="recband">🏆 Nouveau record ! (avant : ${prev})</div>` : ''}
    <p style="font-weight:500;margin-top:10px">${next ? `Encore ${next - score} point${next - score > 1 ? 's' : ''} pour la ${n === 0 ? '1<sup>re</sup>' : (n + 1) + '<sup>e</sup>'} étoile.` : 'Trois étoiles : le maximum !'} ${phrase(score)}</p>
    ${prog}</div>
    <div class="spacer"></div><div id="acts" style="margin-top:16px"></div></div>`;
  countUp($('#bs'), score, '<small> / 100</small>');
  if (rec && prev != null) { SFX('record'); confetti(40); } else { SFX('end'); if (n === 3) confetti(30); }
  const acts = $('#acts');
  if (S.mode === 'train') {
    acts.innerHTML = `<button class="btn go" id="again">Rejouer</button><button class="btn secondary" id="other">Autres épreuves</button>`;
    on('#again', 'click', () => { S.seed = newSeed(); S.scores = {}; intro(); });
    on('#other', 'click', () => trainGrid(S.filter));
  } else if (S.mode === 'solo') {
    acts.innerHTML = `<button class="btn go" id="nx">${last ? 'Voir mon résultat' : 'Épreuve suivante'}</button>`;
    on('#nx', 'click', () => { if (last) soloFinal(); else { S.idx++; intro(); } });
  } else {
    const lastPlayer = S.p >= S.players.length - 1;
    acts.innerHTML = `<button class="btn go" id="nx">${!last ? 'Épreuve suivante' : lastPlayer ? 'Voir le podium' : 'Au joueur suivant'}</button>`;
    on('#nx', 'click', () => {
      if (!last) { S.idx++; intro(); return; }
      pl.total = totalOf(pl.scores, S.games);
      if (lastPlayer) podium(); else { S.p++; S.idx = 0; S.scores = S.players[S.p].scores; S.details = {}; handover(); }
    });
  }
}
function totalOf(scores, games) { const v = games.map(g => scores[g.id] || 0); return Math.round(v.reduce((a, b) => a + b, 0) / v.length); }
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
  const md = medalOf(total), nxt = total < 40 ? [40, 'le bronze'] : total < 60 ? [60, 'l’argent'] : total < 80 ? [80, 'l’or'] : null;
  const nextLvl = S.level === 'F' && total >= 70 ? ' Essaie « En forme » la prochaine fois ?' : S.level === 'N' && total >= 70 ? ' Prêt pour « Costaud » ?' : '';
  app.innerHTML = `<div class="screen play result">${scene('constellation')}
    <div class="card">${md ? medalSVG(md) : MECHE}<p class="muted" style="margin:0">Test complet · ${LEVELS[S.level].name}</p>
    <div class="bigscore" id="tot">0<small> / 100</small></div>
    <p style="font-weight:700;margin:0">${md ? MEDALS[md][2] : 'Pas encore de médaille'}${rec && prev != null ? ' · 🏆 Nouveau record !' : ''}</p>
    <p class="muted small">${nxt ? `Encore ${nxt[0] - total} point${nxt[0] - total > 1 ? 's' : ''} pour ${nxt[1]}.` : 'Le sommet de l’archipel !'} ${pf.label}.${nextLvl}</p>
    <div class="split"><div class="sp">⚡ Rapidité<b>${pf.sp}</b></div><div class="lo">⚙ Logique<b>${pf.lo}</b></div></div>
    <div class="isles">${S.games.map(g => { const s = S.scores[g.id] || 0; return `<span class="isle" title="${g.name} : ${s}">${g.icon}<em>${'★'.repeat(starsOf(s)) || s}</em></span>`; }).join('')}</div></div>
    <button class="btn go" id="again" style="margin-top:16px">Rejouer le test</button><button class="btn secondary" id="home">Retour à l’accueil</button></div>`;
  countUp($('#tot'), total, '<small> / 100</small>');
  if (rec && prev != null) SFX('record'); else SFX('end');
  if (md) setTimeout(() => confetti(md === 'or' ? 60 : 36), 500);
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
  const title = second && gap === 0 ? 'Ex æquo !' : gap < 3 ? `${esc(top.name)} gagne, de justesse !` : `${esc(top.name)} gagne, de ${gap} points !`;
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
    <p class="small muted" style="margin-top:10px">Score sur 100 : moyenne des épreuves.</p>
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
