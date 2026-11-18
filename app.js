'use strict';
/* =========================================================
   MindSprint — écrans, horloge de jeu, modes solo / entraînement / famille
   ========================================================= */

const app = $('#app');
const LEVELS = { F: { name: 'Échauffement', sub: 'Pour démarrer tranquille, dès 8 ans', g: 1 }, N: { name: 'En forme', sub: 'Ça va plus vite, ça réfléchit plus', g: 2 }, E: { name: 'Costaud', sub: 'Pour ceux qui aiment transpirer des neurones', g: 3 } };
const PLAYER_STYLE = [
  { color: '#F4B400', shape: 0 }, { color: '#2EC4B6', shape: 2 }, { color: '#FF8FB1', shape: 3 }, { color: '#1F5FE0', shape: 1 }
];
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
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  const dark = settings.theme === 'dark' || (settings.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.mode = dark ? 'dark' : 'light';
  root.style.colorScheme = dark ? 'dark' : 'light';
  document.querySelectorAll('meta[name=theme-color]').forEach(m => { m.content = dark ? '#101848' : '#1F6FE0'; m.removeAttribute('media'); });
}
applyTheme();
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (settings.theme === 'auto') applyTheme(); }); } catch (e) { }
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
  const st = streakNow(), daily = store.get('daily', {}), doneToday = daily.d === today();
  const hist = store.get('hist', []), m10 = hist.length ? Math.round(hist.slice(-10).reduce((x, h) => x + h.score, 0) / Math.min(10, hist.length)) : null;
  const dg = dailyGames();
  const hello = first ? 'Salut ! Je suis Mèche. Un petit défi chaque jour, et ton archipel s’illumine !'
    : doneToday ? `Bravo, défi du jour réussi${st.n > 1 ? ` : ${st.n} jours d’affilée` : ''} ! Tente un duel ou le mode turbo.`
      : st.n ? `Ta série est de ${st.n} jour${st.n > 1 ? 's' : ''} 🔥 Ne la casse pas : le défi du jour t’attend !` : 'Prêt pour le défi du jour ? Cinq épreuves, environ 4 minutes.';
  app.innerHTML = `<div class="screen home">
   <div class="home-sky" aria-hidden="true">${HOME_ART}</div>
   <div class="topbar between"><div><div class="wordmark">Mind<b>Sprint</b></div><div class="slogan">Muscle tes méninges en t’amusant !</div></div><button class="iconbtn" id="set" aria-label="Réglages">⚙</button></div>
   <div class="hello"><div class="bubble">${hello}</div>${MECHE}</div>
   <div class="home-sheet">${HOME_ISLES}
   <button class="hero-daily ${doneToday ? 'done' : ''}" id="daily">
     <span class="hd-top"><span class="hd-title">${doneToday ? 'Défi du jour réussi ✓' : 'Défi du jour'}</span><span class="hd-streak">🔥 ${st.n}</span></span>
     <span class="hd-games">${dg.map(g => `<span title="${g.name}">${g.icon}</span>`).join('')}</span>
     <span class="hd-sub">${doneToday ? `Score ${daily.score}/100 · reviens demain pour la suite de ta série` : '5 épreuves · ~4 min · garde ta série en vie'}</span>
   </button>
   <div class="tiles">
     <button class="tile t-duel" id="duel"><span class="ti">🤖</span><b>Duel</b><small>contre Mèche</small></button>
     <button class="tile t-solo" id="solo"><span class="ti">🧭</span><b>Test express</b><small>8 épreuves</small></button>
     <button class="tile t-fam" id="fam"><span class="ti">👨‍👩‍👧‍👦</span><b>En famille</b><small>2 à 4 joueurs</small></button>
     <button class="tile t-train" id="train"><span class="ti">🏝️</span><b>Entraînement</b><small>${GAMES.length} épreuves</small></button>
     <button class="tile t-turbo" id="turbo"><span class="ti">🚀</span><b>Turbo</b><small>ça accélère</small></button>
     <button class="tile t-prog" id="prog"><span class="ti">📈</span><b>Mes progrès</b><small>${m10 != null ? 'moyenne ' + m10 : 'graphique'}</small></button>
   </div>
   ${hist.length >= 2 ? `<div class="mini-chart">${sparkline(hist.slice(-12).map(h => h.score))}<span>Tes ${Math.min(12, hist.length)} derniers tests</span></div>` : ''}
   ${deferredInstall ? `<button class="tile wide" id="inst"><span class="ti">📲</span><b>Installer l’app</b><small>même sans connexion</small></button>` : ''}
   <div class="archi" aria-label="Étoiles gagnées : ${tot} sur ${GAMES.length * 3}">${stars.map(n => `<i class="s${n}"></i>`).join('')}</div>
   <p class="small foot">Ton archipel : ${tot} étoile${tot > 1 ? 's' : ''} sur ${GAMES.length * 3} · Un jeu pour s’amuser, pas un test scientifique.</p>
   </div>
  </div>`;
  store.set('seen', true);
  on('#set', 'click', settingsSheet);
  on('#daily', 'click', startDaily);
  on('#solo', 'click', () => levelSheet(level => startExpress(level)));
  on('#duel', 'click', duelSetup);
  on('#fam', 'click', () => familySetup());
  on('#train', 'click', () => trainGrid());
  on('#turbo', 'click', turboPick);
  on('#prog', 'click', progress);
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
    <button class="btn secondary" id="wipe" style="margin-top:14px">Tout effacer (records, progrès, badges)</button>
    <button class="btn" id="ok">Fermer</button>
  `, (root, close) => {
    $$('.switch', root).forEach(b => b.addEventListener('click', () => { const k = b.dataset.k; settings[k] = !settings[k]; b.classList.toggle('on', settings[k]); b.setAttribute('aria-checked', settings[k]); saveSettings(); if (k === 'sound' && settings.sound) beep(660); }));
    $$('#th .chip', root).forEach(b => b.addEventListener('click', () => { settings.theme = b.dataset.t; saveSettings(); $$('#th .chip', root).forEach(x => x.classList.toggle('on', x === b)); }));
    on('#wipe', 'click', e => {
      const b = e.currentTarget;
      if (b.dataset.armed) { const keep = { ...settings }; store.clear(); store.set('settings', keep); store.set('seen', true); b.textContent = 'Tout est effacé'; b.disabled = true; }
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
      return `<button class="gtok" data-id="${g.id}" style="--c:${g.color};background:${g.color};color:${g.fg};animation-delay:${i * 30}ms" aria-label="${g.name}, ${n} étoile${n > 1 ? 's' : ''}, record ${rec ?? 'aucun'}">
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
  const rec = !['family', 'duel', 'turbo'].includes(S.mode) ? store.get(recKey(g.id, lvl), null) : S.mode === 'turbo' ? store.get('turbo:' + g.id, null) : null;
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
  const fam = S && S.mode === 'family', multi = S && !['train', 'duel', 'turbo'].includes(S.mode);
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
  let lastCount = 0;
  if (S.mode === 'duel' && !practice) {
    S.duelMe = 0; S.duelBot = 0; S.duelGood = 0; S.duelBad = 0;
    const base = DUEL[g.id] * ROBOT[S.robot][1] * (S.level === 'F' ? 1.15 : S.level === 'E' ? 1.1 : 1);
    $('.hud').insertAdjacentHTML('afterend', '<div class="duelbar"><span>Toi <b id="dme">0</b></span><span class="dvs">VS<small>erreur = −1</small></span><span>Mèche <b id="dbot">0</b> 🤖</span></div>');
    let nextAt = 2300 + base * (0.75 + Math.random() * 0.5);
    Clock.tick(t => { if (t > 2100 && t >= nextAt && !CUR.over) { S.duelBot++; $('#dbot').textContent = S.duelBot; fx($('#dbot'), 'ok-fx'); nextAt += base * (0.75 + Math.random() * 0.5); } });
  }
  const turbo = S.mode === 'turbo' && !practice;
  if (turbo) $('.hud').insertAdjacentHTML('afterend', '<div class="duelbar">🚀 Turbo : ça accélère !</div>');
  const c = CUR = {
    stage, level: S.level, rng, over: false, practice: !!practice,
    L: o => o[S.level],
    tm: ms => ms * (settings.moreTime ? 1.5 : 1) * (practice ? 1.6 : 1) * (turbo ? Math.max(0.55, 1 - Math.max(0, Clock.t - 2100) / 60000 * 0.9) : 1),
    later: (fn, ms) => Clock.later(fn, ms),
    cancel: id => Clock.cancel(id),
    now: () => Clock.t,
    beep: f => { if (settings.sound) beep(f, .1); },
    ok: el => { $$('[data-ok]', stage).forEach(e => { if (e !== el) { delete e.dataset.ok; e.classList.remove('hint'); } }); if (el) { el.dataset.ok = '1'; lastInput = Math.max(lastInput, Clock.t - 1500); if (practice && (g.id === 'lanterne' || g.id === 'bateaux')) { el.classList.add('hint'); say(g.id === 'lanterne' ? 'Elle brille : touche !' : 'Un bateau : touche l’eau !', 1200); } } },
    score: v => { sc.textContent = v; fx($('#buoy'), 'bump'); const n = parseInt(v, 10); if (S.mode === 'duel' && !isNaN(n)) { S.duelGood = n; duelSync(); } },
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
      if (S.mode === 'duel' && !practice) { S.duelBad = (S.duelBad || 0) + 1; duelSync(); }
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
  if (S.mode === 'duel') return duelEnd(g, score, detail);
  if (S.mode !== 'family') { const gh = store.get('gh', {}); (gh[g.id] = gh[g.id] || []).push(score); gh[g.id] = gh[g.id].slice(-30); store.set('gh', gh); }
  if (S.mode === 'turbo') { const pv = store.get('turbo:' + g.id, null); if (pv == null || score > pv) store.set('turbo:' + g.id, score); if (score >= 70) award('turbo70'); }
  let prev = null, rec = false;
  if (!['family', 'turbo'].includes(S.mode)) {
    prev = store.get(recKey(g.id, S.level), null);
    rec = prev == null || score > prev;
    if (rec) store.set(recKey(g.id, S.level), score);
    checkCollectionBadges();
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
  if (S.mode === 'train' || S.mode === 'turbo') {
    acts.innerHTML = `<button class="btn go" id="again">Rejouer</button><button class="btn secondary" id="other">Autres épreuves</button>`;
    on('#again', 'click', () => { S.seed = newSeed(); S.scores = {}; intro(); });
    on('#other', 'click', () => trainGrid(S.filter));
  } else if (S.mode === 'solo' || S.mode === 'daily') {
    acts.innerHTML = `<button class="btn go" id="nx">${last ? 'Voir mon résultat' : 'Épreuve suivante'}</button>`;
    on('#nx', 'click', () => { if (last) soloFinal(); else { S.idx++; intro(); } });
  } else {
    const lastPlayer = S.p >= S.players.length - 1;
    acts.innerHTML = `<button class="btn go" id="nx">${!last ? 'Épreuve suivante' : lastPlayer ? 'Voir le podium' : 'Au joueur suivant'}</button>`;
    on('#nx', 'click', () => {
      if (!last) { S.idx++; intro(); return; }
      pl.total = totalOf(pl.scores, S.games);
      if (lastPlayer) { award('famille'); podium(); } else { S.p++; S.idx = 0; S.scores = S.players[S.p].scores; S.details = {}; handover(); }
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
  const hist = store.get('hist', []); hist.push({ d: today(), t: Date.now(), kind: S.mode, level: S.level, score: total, sp: pf.sp, lo: pf.lo }); store.set('hist', hist.slice(-300));
  let dailyMsg = '';
  if (S.mode === 'daily' && !S.replay) { const st = markDaily(total); dailyMsg = `🔥 Série : ${st.n} jour${st.n > 1 ? 's' : ''} d’affilée${st.n >= 3 ? ' · Bonus de série !' : ''}`; if (total >= 80) award('score80'); }
  const md = medalOf(total), nxt = total < 40 ? [40, 'le bronze'] : total < 60 ? [60, 'l’argent'] : total < 80 ? [80, 'l’or'] : null;
  const nextLvl = S.level === 'F' && total >= 70 ? ' Essaie « En forme » la prochaine fois ?' : S.level === 'N' && total >= 70 ? ' Prêt pour « Costaud » ?' : '';
  app.innerHTML = `<div class="screen play result">${scene('constellation')}
    <div class="card">${md ? medalSVG(md) : MECHE}<p class="muted" style="margin:0">${S.mode === 'daily' ? 'Défi du jour' + (S.replay ? ' (rejoué, hors série)' : '') : 'Test express'} · ${LEVELS[S.level].name}</p>
    <div class="bigscore" id="tot">0<small> / 100</small></div>
    <p style="font-weight:700;margin:0">${md ? MEDALS[md][2] : 'Pas encore de médaille'}${rec && prev != null ? ' · 🏆 Nouveau record !' : ''}</p>
    ${dailyMsg ? `<p class="streakline">${dailyMsg}</p>` : ''}
    ${sparkline(hist.slice(-12).map(h => h.score))}
    <p class="muted small">${nxt ? `Encore ${nxt[0] - total} point${nxt[0] - total > 1 ? 's' : ''} pour ${nxt[1]}.` : 'Le sommet de l’archipel !'} ${pf.label}.${nextLvl}</p>
    <div class="split"><div class="sp">⚡ Rapidité<b>${pf.sp}</b></div><div class="lo">⚙ Logique<b>${pf.lo}</b></div></div>
    <div class="isles">${S.games.map(g => { const s = S.scores[g.id] || 0; return `<span class="isle" title="${g.name} : ${s}">${g.icon}<em>${'★'.repeat(starsOf(s)) || s}</em></span>`; }).join('')}</div></div>
    <button class="btn go" id="again" style="margin-top:16px">Rejouer le test</button><button class="btn secondary" id="home">Retour à l’accueil</button></div>`;
  countUp($('#tot'), total, '<small> / 100</small>');
  if (rec && prev != null) SFX('record'); else SFX('end');
  if (md) setTimeout(() => confetti(md === 'or' ? 60 : 36), 500);
  on('#again', 'click', () => { if (S.mode === 'daily') { startTurboOrHome(); return; } S = { ...S, seed: newSeed(), idx: 0, scores: {}, details: {} }; intro(); });
  if (S.mode === 'daily') { const b = $('#again'); if (b) b.textContent = 'Essayer le mode turbo 🚀'; }
  on('#home', 'click', home);
}
function startTurboOrHome() { turboPick(); }
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
        <button class="chip ${format === 'full' ? 'on' : ''}" data-f="full">Partie longue · 8</button>
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
  if (format === 'full') { const sp = r.shuffle(GAMES.filter(g => g.cat === 'speed')).slice(0, 4), lo = r.shuffle(GAMES.filter(g => g.cat === 'logic')).slice(0, 4); games = []; for (let i = 0; i < 4; i++) games.push(sp[i], lo[i]); }
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
    <div class="res-head"><p class="muted">${S.format === 'full' ? 'Partie longue' : 'Partie rapide'} · ${LEVELS[S.level].name}</p><h1>${title}</h1></div>
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

/* =========================================================
   MOTIVATION : défi du jour, série, badges, progrès, duel, turbo
   ========================================================= */
const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayDiff = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 864e5);
function streakNow() { const st = store.get('streak', { last: null, n: 0, best: 0 }); if (st.last && dayDiff(st.last, today()) > 1) st.n = 0; return st; }
function markDaily(score) {
  const st = store.get('streak', { last: null, n: 0, best: 0 }), t = today();
  if (st.last !== t) { st.n = st.last && dayDiff(st.last, t) === 1 ? st.n + 1 : 1; st.last = t; st.best = Math.max(st.best || 0, st.n); }
  store.set('streak', st); store.set('daily', { d: t, score });
  award('premier-defi'); if (st.n >= 3) award('serie3'); if (st.n >= 7) award('serie7'); if (st.n >= 30) award('serie30');
  return st;
}
const BADGES = [
  ['premier-defi', '🌅', 'Premier défi', 'Réussir un défi du jour'],
  ['serie3', '🔥', 'Série de 3', 'Jouer le défi 3 jours d’affilée'],
  ['serie7', '🔥', 'Semaine de feu', '7 jours d’affilée'],
  ['serie30', '🏅', 'Marathon', '30 jours d’affilée'],
  ['score80', '🥇', 'Phare d’or', '80 ou plus au défi du jour'],
  ['etoiles5', '⭐', 'Collection', '3 étoiles sur 5 épreuves'],
  ['explorateur', '🧭', 'Explorateur', 'Jouer toutes les épreuves'],
  ['duel', '🤖', 'Premier duel', 'Battre Mèche une fois'],
  ['duel-fort', '⚡', 'Plus fort que Mèche', 'Battre Mèche au niveau Fort'],
  ['turbo70', '🚀', 'Turbo', '70 ou plus en mode turbo'],
  ['famille', '👨‍👩‍👧‍👦', 'En famille', 'Finir une partie en famille']
];
function award(id) {
  const b = store.get('badges', {}); if (b[id]) return;
  b[id] = today(); store.set('badges', b);
  const def = BADGES.find(x => x[0] === id); if (!def) return;
  setTimeout(() => { const d = document.createElement('div'); d.className = 'toast'; d.innerHTML = `<span>${def[1]}</span><span><b>Badge débloqué</b><br>${def[2]}</span>`; document.body.appendChild(d); SFX('record'); setTimeout(() => d.remove(), 3200); }, 900);
}
function checkCollectionBadges() {
  const all = GAMES.every(g => ['F', 'N', 'E'].some(l => store.get(recKey(g.id, l), null) != null));
  if (all) award('explorateur');
  const three = GAMES.filter(g => ['F', 'N', 'E'].some(l => (store.get(recKey(g.id, l), -1)) >= 85)).length;
  if (three >= 5) award('etoiles5');
}
function sparkline(vals, w = 300, h = 70) {
  if (vals.length < 2) return '';
  const x = i => 8 + i * (w - 16) / (vals.length - 1), y = v => h - 8 - v * (h - 16) / 100;
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" role="img" aria-label="Évolution des derniers scores"><polyline points="${pts}" fill="none" stroke="var(--chart-a)" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>${vals.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${i === vals.length - 1 ? 6 : 3.5}" fill="${i === vals.length - 1 ? 'var(--chart-end)' : 'var(--chart-dot)'}"/>`).join('')}</svg>`;
}
function dailyGames() {
  const r = makeRng(hashStr('jour:' + today()));
  const sp = r.shuffle(GAMES.filter(g => g.cat === 'speed')), lo = r.shuffle(GAMES.filter(g => g.cat === 'logic'));
  const num = ['gue', 'bulles', 'suites', 'boutique'];
  const pick = [sp[0], lo[0], sp[1], lo[1]];
  const extra = r.shuffle(GAMES.filter(g => num.includes(g.id) && !pick.includes(g)))[0];
  return [...pick, extra];
}
function startDaily() {
  const d = store.get('daily', {}), replay = d.d === today();
  S = { mode: 'daily', level: settings.level, seed: hashStr('jour:' + today()), games: dailyGames(), idx: 0, scores: {}, details: {}, replay };
  intro();
}
function startExpress(level) {
  const r = makeRng(newSeed());
  const sp = r.shuffle(GAMES.filter(g => g.cat === 'speed')).slice(0, 4), lo = r.shuffle(GAMES.filter(g => g.cat === 'logic')).slice(0, 4);
  const games = []; for (let i = 0; i < 4; i++) games.push(sp[i], lo[i]);
  S = { mode: 'solo', level, seed: newSeed(), games, idx: 0, scores: {}, details: {} };
  intro();
}
/* ---------- Duel contre Mèche ---------- */
const DUEL = { gue: 2000, bulles: 5200, constellation: 1500, crabes: 1900, boutique: 5000, vent: 950 };
const ROBOT = { facile: ['Tranquille', 1.5], moyen: ['Rusé', 1.0], fort: ['Fusée', 0.72] };
function duelSetup() {
  Clock.reset();
  let gid = store.get('duelGame', 'gue'), lvl = store.get('duelLvl', 'moyen');
  const render = () => {
    app.innerHTML = `<div class="screen play">${scene('constellation')}
    <div class="topbar"><button class="iconbtn" id="back" aria-label="Retour">←</button><span class="plaque" style="margin-left:4px">Duel contre Mèche</span></div>
    <div class="coach">${MECHE.replace('data-mood="neutral"', 'data-mood="happy"')}<div class="bubble">Tu crois aller plus vite que moi ? Choisis l’épreuve et ma vitesse, et que le meilleur gagne !</div></div>
    <p class="plaque small">Épreuve</p>
    <div class="ggrid">${Object.keys(DUEL).map(id => { const g = GAMES.find(x => x.id === id); return `<button class="gtok ${id === gid ? 'pick' : ''}" data-id="${id}" style="--c:${g.color};background:${g.color};color:${g.fg}"><span class="ic">${g.icon}</span><span class="nm">${g.name}</span></button>`; }).join('')}</div>
    <p class="plaque small" style="margin-top:14px">Vitesse de Mèche</p>
    <div class="chips">${Object.entries(ROBOT).map(([k, v]) => `<button class="chip ${k === lvl ? 'on' : ''}" data-r="${k}">${v[0]}</button>`).join('')}</div>
    <p class="plaque small" style="margin-top:8px">Ton niveau : ${LEVELS[settings.level].name}</p>
    <div class="spacer"></div><button class="btn go" id="go">Lancer le duel</button></div>`;
    on('#back', 'click', home);
    $$('.gtok').forEach(b => b.addEventListener('click', () => { gid = b.dataset.id; render(); }));
    $$('[data-r]').forEach(b => b.addEventListener('click', () => { lvl = b.dataset.r; render(); }));
    on('#go', 'click', () => { store.set('duelGame', gid); store.set('duelLvl', lvl); S = { mode: 'duel', level: settings.level, seed: newSeed(), games: [GAMES.find(x => x.id === gid)], idx: 0, scores: {}, details: {}, robot: lvl }; intro(); });
  };
  render();
}
function duelSync() { S.duelMe = Math.max(0, (S.duelGood || 0) - (S.duelBad || 0)); const e = $('#dme'); if (e) e.textContent = S.duelMe; }
function duelEnd(g, score, detail) {
  const me = S.duelMe || 0, bot = S.duelBot || 0, win = me > bot, tie = me === bot;
  if (win) { award('duel'); if (S.robot === 'fort') award('duel-fort'); }
  const ds = store.get('duelStats', { w: 0, l: 0, t: 0 }); win ? ds.w++ : tie ? ds.t++ : ds.l++; store.set('duelStats', ds);
  app.innerHTML = `<div class="screen play result">${scene(g.id)}
    <div class="card">${MECHE.replace('data-mood="neutral"', `data-mood="${win ? 'surprised' : 'happy'}"`)}
    <h2>${win ? 'Tu as battu Mèche !' : tie ? 'Égalité parfaite !' : 'Mèche gagne cette fois…'}</h2>
    <div class="versus"><div class="vs-me"><b>${me}</b><span>Toi</span></div><span class="vs-x">VS</span><div class="vs-bot"><b>${bot}</b><span>Mèche ${ROBOT[S.robot][0]}</span></div></div>
    <p class="muted">${S.duelGood || 0} bonne${(S.duelGood || 0) > 1 ? 's' : ''} − ${S.duelBad || 0} erreur${(S.duelBad || 0) > 1 ? 's' : ''} · score ${score}/100</p>
    <p class="small">Bilan des duels : ${ds.w} victoire${ds.w > 1 ? 's' : ''}, ${ds.l} défaite${ds.l > 1 ? 's' : ''}${ds.t ? `, ${ds.t} égalité${ds.t > 1 ? 's' : ''}` : ''}</p></div>
    <div class="spacer"></div><button class="btn go" id="again">Revanche</button><button class="btn secondary" id="other">Changer de duel</button></div>`;
  win ? (SFX('record'), confetti(50)) : SFX('end');
  on('#again', 'click', () => { S.seed = newSeed(); intro(); });
  on('#other', 'click', duelSetup);
}
/* ---------- Turbo ---------- */
function turboPick() {
  Clock.reset();
  const list = GAMES.filter(g => g.cat === 'speed');
  app.innerHTML = `<div class="screen play">${scene('bateaux')}
    <div class="topbar"><button class="iconbtn" id="back" aria-label="Retour">←</button><span class="plaque" style="margin-left:4px">Mode turbo 🚀</span></div>
    <div class="coach">${MECHE}<div class="bubble">En turbo, tout accélère au fil de l’épreuve. Jusqu’où tiendras-tu ?</div></div>
    <div class="ggrid">${list.map(g => { const t = store.get('turbo:' + g.id, null); return `<button class="gtok" data-id="${g.id}" style="--c:${g.color};background:${g.color};color:${g.fg}"><span class="ic">${g.icon}</span><span class="nm">${g.name}</span><span class="stars">${t == null ? '—' : '🚀 ' + t}</span></button>`; }).join('')}</div></div>`;
  on('#back', 'click', home);
  $$('.gtok').forEach(b => b.addEventListener('click', () => { S = { mode: 'turbo', level: settings.level, seed: newSeed(), games: [GAMES.find(x => x.id === b.dataset.id)], idx: 0, scores: {}, details: {} }; intro(); }));
}
/* ---------- Mes progrès ---------- */
function progress() {
  Clock.reset();
  const hist = store.get('hist', []), st = streakNow(), badges = store.get('badges', {}), gh = store.get('gh', {});
  const last = hist.slice(-20).map(h => h.score);
  const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;
  const m10 = avg(hist.slice(-10).map(h => h.score)), mPrev = avg(hist.slice(-20, -10).map(h => h.score));
  const trend = m10 != null && mPrev != null ? (m10 > mPrev ? `↗ +${m10 - mPrev} par rapport aux 10 parties d’avant` : m10 < mPrev ? `↘ ${m10 - mPrev} par rapport aux 10 parties d’avant` : '→ stable') : 'Joue encore quelques parties pour voir ta tendance.';
  const sp = avg(hist.slice(-10).map(h => h.sp)), lo = avg(hist.slice(-10).map(h => h.lo));
  app.innerHTML = `<div class="screen play">${scene('phares')}
    <div class="topbar"><button class="iconbtn" id="back" aria-label="Retour">←</button><span class="plaque" style="margin-left:4px">Mes progrès</span></div>
    <div class="card panel">
      <div class="statgrid"><div><b>${m10 ?? '—'}</b><span>Ta moyenne (10 dernières)</span></div><div><b>🔥 ${st.n}</b><span>Série actuelle (record ${st.best || 0})</span></div><div><b>${hist.length}</b><span>Tests joués</span></div></div>
      <p class="small" style="margin:8px 0 0">${trend}</p>
      ${last.length >= 2 ? `<div class="chart">${chart(last)}</div>` : '<p class="muted">Ton graphique apparaîtra après 2 tests (défi du jour ou test express).</p>'}
      ${sp != null ? `<div class="split"><div class="sp">⚡ Rapidité<b>${sp}</b></div><div class="lo">⚙ Logique<b>${lo}</b></div></div>` : ''}
    </div>
    <div class="card panel"><h3>Tes épreuves</h3><div class="rlist">${GAMES.map(g => { const a = gh[g.id] || []; const m = avg(a.slice(-5)); return `<div class="ritem"><span class="mini" style="--c:${g.color};background:${g.color}">${g.icon}</span><span>${g.name}<br><span class="small muted">${a.length ? `${a.length} partie${a.length > 1 ? 's' : ''} · moyenne récente ${m}` : 'pas encore jouée'}</span></span><span class="v">${a.length ? Math.max(...a) : ''}</span></div>`; }).join('')}</div></div>
    <div class="card panel"><h3>Badges</h3><div class="badges">${BADGES.map(b => `<div class="badge ${badges[b[0]] ? 'got' : ''}"><span>${b[1]}</span><b>${b[2]}</b><small>${badges[b[0]] ? 'Obtenu' : b[3]}</small></div>`).join('')}</div></div>
  </div>`;
  on('#back', 'click', home);
}
function chart(vals) {
  const w = 320, h = 160, n = vals.length, x = i => 28 + i * (w - 40) / Math.max(1, n - 1), y = v => h - 22 - v * (h - 40) / 100;
  const ma = vals.map((_, i) => { const s = vals.slice(Math.max(0, i - 4), i + 1); return s.reduce((a, b) => a + b, 0) / s.length; });
  const grid = [0, 25, 50, 75, 100].map(v => `<line x1="24" x2="${w - 8}" y1="${y(v)}" y2="${y(v)}" stroke="var(--chart-grid)" stroke-dasharray="2 6" stroke-linecap="round"/><text x="2" y="${y(v) + 4}" font-size="11" font-weight="700" fill="var(--chart-txt)">${v}</text>`).join('');
  const area = `M${x(0)},${y(0)} ` + vals.map((v, i) => `L${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ') + ` L${x(n - 1)},${y(0)} Z`;
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Évolution de tes scores">${grid}<path d="${area}" fill="var(--chart-a)" opacity=".14"/><polyline points="${vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--chart-a)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><polyline points="${ma.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--chart-b)" stroke-width="3" stroke-dasharray="6 5" stroke-linecap="round"/>${vals.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.5" fill="var(--chart-a)"/>`).join('')}<text x="${w - 8}" y="${h - 4}" font-size="11" font-weight="700" text-anchor="end" fill="var(--chart-txt)">— scores · - - moyenne</text></svg>`;
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

/* ---------- Typographie française (espaces insécables, apostrophes) ---------- */
(function frTypo() {
  const fix = t => t.replace(/(\S) ([?!:;»])/g, '$1 $2').replace(/« /g, '« ').replace(/([A-Za-zÀ-ÿ])'([A-Za-zÀ-ÿ])/g, '$1’$2');
  const walk = root => {
    if (root.nodeType === 3) { const v = fix(root.nodeValue); if (v !== root.nodeValue) root.nodeValue = v; return; }
    if (root.nodeType !== 1 || /^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(root.nodeName)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) { const v = fix(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
  };
  walk(document.body);
  new MutationObserver(ms => ms.forEach(m => m.type === 'characterData' ? walk(m.target) : m.addedNodes.forEach(walk)))
    .observe(document.body, { childList: true, subtree: true, characterData: true });
})();
