'use strict';
/* =========================================================
   MindSprint — écrans, horloge de jeu, modes solo / entraînement / famille
   ========================================================= */

const app = $('#app');
const LEVELS = { F: { name: 'Échauffement', sub: 'Pour démarrer en douceur', g: 1 }, N: { name: 'En forme', sub: 'Ça va plus vite, ça réfléchit plus', g: 2 }, E: { name: 'Costaud', sub: 'Pour ceux qui aiment transpirer des neurones', g: 3 } };
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
const settings = Object.assign({ sound: true, haptic: true, moreTime: false, theme: 'auto', level: 'F', profile: null, chrono: true, autoLevel: true }, store.get('settings', {}));
/* Profils de joueurs : vitesse du jeu (rate < 1 = plus lent), niveaux permis, gros caractères, chrono par défaut */
const PROFILES = {
  junior: { name: 'Junior', icon: '🧒', sub: '8 ans et plus · jeux faciles, rythme doux', rate: 0.85, min: 'F', max: 'N', start: 'F', big: false, chrono: true },
  classic: { name: 'Classique', icon: '🙂', sub: 'Ado et adulte · le rythme normal', rate: 1, min: 'F', max: 'E', start: 'N', big: false, chrono: true },
  zen: { name: 'Sérénité', icon: '🌿', sub: 'Seniors · plus gros, plus lent, sans chrono', rate: 0.65, min: 'F', max: 'N', start: 'F', big: true, chrono: false },
  muscle: { name: 'Muscle', icon: '💪', sub: 'Pour les cerveaux affûtés · plus dur, plus rapide', rate: 1.15, min: 'N', max: 'E', start: 'E', big: false, chrono: true }
};
const LV_ORDER = ['F', 'N', 'E'];
const prof = () => PROFILES[settings.profile] || PROFILES.classic;
function clampLevel(l, p = prof()) { const i = LV_ORDER.indexOf(l), a = LV_ORDER.indexOf(p.min), b = LV_ORDER.indexOf(p.max); return LV_ORDER[Math.max(a, Math.min(b, i < 0 ? a : i))]; }
/* ---------- Les 6 catégories du grand bilan (champ axis des jeux) ---------- */
const AX_ORDER = ['calc', 'logic', 'reason', 'observe', 'memory', 'speed'];
const AXES = {
  calc: { name: 'Calcul mental', short: 'Calcul', icon: '🧮', games: ['gue', 'bulles', 'boutique'] },
  logic: { name: 'Logique', short: 'Logique', icon: '🧩', games: ['enigmes', 'vitraux', 'suites'] },
  reason: { name: 'Raisonnement', short: 'Raisonnement', icon: '🔎', games: ['cabines', 'mouettes', 'courants'] },
  observe: { name: 'Observation', short: 'Observation', icon: '👁️', games: ['mystere', 'lucioles', 'recif'] },
  memory: { name: 'Mémoire', short: 'Mémoire', icon: '🧠', games: ['phares', 'pont', 'filet'] },
  speed: { name: 'Rapidité', short: 'Rapidité', icon: '⚡', games: ['lanterne', 'vent', 'crabes'] }
};
/* Ordre fixe : on alterne les catégories pour varier le rythme (calcul, rapidité, logique, observation, raisonnement, mémoire) ×3 */
const BILAN_ROUND = ['calc', 'speed', 'logic', 'observe', 'reason', 'memory'];
const BILAN_IDS = [0, 1, 2].flatMap(k => BILAN_ROUND.map(a => AXES[a].games[k]));
/* Niveau de chaque catégorie : réglé par les bilans (niveau automatique) ou fixe (= settings.level) */
function initLevels() {
  const raw = store.get('settings', {}), s = (!settings.levels && raw.level) ? raw.level : prof().start;
  if (!settings.levels || typeof settings.levels !== 'object') settings.levels = {};
  AX_ORDER.forEach(a => { settings.levels[a] = clampLevel(settings.levels[a] || s); });
}
const catLevel = a => clampLevel(settings.autoLevel ? (settings.levels || {})[a] || prof().start : settings.level);
const curLevels = () => Object.fromEntries(AX_ORDER.map(a => [a, catLevel(a)]));
function setProfile(k) { const p = PROFILES[k]; settings.profile = k; settings.level = p.start; settings.chrono = p.chrono; settings.levels = Object.fromEntries(AX_ORDER.map(a => [a, p.start])); saveSettings(); }
function saveSettings() { store.set('settings', settings); applyTheme(); }
function applyTheme() {
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.dataset.big = (PROFILES[settings.profile] || {}).big ? '1' : '0';
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
      if (this.last != null && !this.paused) this.t += Math.min(100, ts - this.last) * (this.rate || 1);
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
    if (e.key === 'Tab') { const f = $$('button,input,textarea', scrim).filter(x => !x.disabled); if (!f.length) return; const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
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
function catPill(cat, axis) { if (axis && AXES[axis]) return `<span class="pill">${AXES[axis].icon} ${AXES[axis].name}</span>`; return cat === 'speed' ? `<span class="pill"><span class="catdot cat-speed" style="position:static;width:20px;height:20px;font-size:.65rem">⚡</span>Rapidité</span>` : `<span class="pill"><span class="catdot cat-logic" style="position:static;width:20px;height:20px;font-size:.65rem">⚙</span>Logique</span>`; }

/* ---------- État de la session en cours ---------- */
let S = null;
let CUR = null; // contexte de l'épreuve en cours
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });

/* =========================================================
   ÉCRANS
   ========================================================= */

function bestOf(id) { return Math.max(-1, ...['F', 'N', 'E'].map(l => store.get(recKey(id, l), -1))); }
/* Description simple de chaque jeu (ce qu'on fait vraiment) */
const WHAT = {
  lanterne: 'Touche dès que la lanterne s’allume', bateaux: 'Touche les bateaux, évite les requins',
  vent: 'Suis la flèche, pas le vent', constellation: 'Retrouve la forme vue un instant',
  gue: 'Calcul mental : choisis le bon résultat', lucioles: 'Quel côté en a le plus ?',
  phares: 'Mémorise l’ordre des lumières', collier: 'Trouve le coquillage suivant',
  recif: 'Repère la même forme tournée', courants: 'Suis les flèches jusqu’à l’île',
  cabines: 'Énigme : place chaque animal', mouettes: 'Devine la règle de tri secrète',
  crabes: 'Tape les crabes qui sortent', bulles: 'Trouve les bulles qui font le total',
  mystere: 'Devine l’image qui se dévoile', vitraux: 'Casse-tête : complète la grille',
  suites: 'Trouve le nombre suivant', boutique: 'Paie le prix exact en euros',
  pont: 'Retrouve l’objet qui a changé', maree: 'Arrête le temps pile à l’heure',
  filet: 'Retiens où brillaient les poissons', enigmes: 'Énigmes de logique, la réponse est sous tes yeux'
};
const NEW_GAMES = ['pont', 'maree', 'filet', 'enigmes'];
/* Compétences travaillées (champ skill de chaque jeu) et parcours thématiques */
const SKILLS = { reflexe: 'Réflexes', memoire: 'Mémoire', logique: 'Logique', calcul: 'Calcul', attention: 'Attention', espace: 'Espace', langage: 'Langage' };
const BAD_PAIRS = [['bateaux', 'crabes'], ['collier', 'vitraux']]; // trop proches : jamais dans la même partie
const pairOk = (list, g) => !BAD_PAIRS.some(([a, b]) => (g.id === a && list.some(x => x.id === b)) || (g.id === b && list.some(x => x.id === a)));
const THEMES = {
  memoire: { name: 'Mémoire', icon: '🧠', sub: 'Retenir des objets, des places et des ordres', near: ['recif', 'courants', 'constellation'] },
  logique: { name: 'Logique', icon: '🧩', sub: 'Règles cachées, déductions et énigmes', near: ['suites', 'courants'] },
  calcul: { name: 'Calcul', icon: '🔢', sub: 'Calcul mental, monnaie et suites de nombres', near: ['lucioles', 'enigmes'] },
  reflexe: { name: 'Réflexes', icon: '⚡', sub: 'Réagir vite, et sans se tromper', near: ['constellation', 'maree', 'filet', 'mystere'] }
};
/* Liste des jeux de l'accueil : rangée par catégorie du bilan, puis les jeux « en plus » */
const GROUPS = [
  ...AX_ORDER.map(a => [a, `${AXES[a].icon} ${AXES[a].name}`, g => g.axis === a]),
  ['more', '🎲 Et aussi (hors bilan)', g => !g.axis]
];
function gameRow(g, lvl) {
  const rec = store.get(recKey(g.id, lvl), null), n = rec == null ? 0 : starsOf(rec);
  return `<button class="grow" data-id="${g.id}" aria-label="${g.name} : ${WHAT[g.id]}. ${n} étoile${n > 1 ? 's' : ''}">
    <span class="gr-ic" style="--c:${g.color}">${g.icon}</span>
    <span class="gr-tx"><b>${g.name}${NEW_GAMES.includes(g.id) ? ' <em class="nw">Nouveau</em>' : ''}</b><small>${WHAT[g.id]}</small></span>
    <span class="gr-st" aria-hidden="true">${'★'.repeat(n)}<i>${'★'.repeat(3 - n)}</i></span></button>`;
}
/* Niveau automatique : voir bilanAdjust() — seuls les grands bilans terminés le font évoluer. */
function profileSheet(first) {
  sheet(`<h2>${first ? 'Bienvenue ! Qui joue ?' : 'Ton profil de joueur'}</h2>
    <p class="small muted" style="margin:-4px 0 12px">Les jeux s’adaptent : vitesse, difficulté, taille du texte et chrono. Tu pourras changer plus tard dans les réglages ⚙.</p>
    <div class="profs">${Object.entries(PROFILES).map(([k, p]) => `<button class="prof ${settings.profile === k ? 'on' : ''}" data-p="${k}" aria-pressed="${settings.profile === k}"><span class="pi">${p.icon}</span><span><b>${p.name}</b><small>${p.sub}</small></span></button>`).join('')}</div>`,
    (root, close) => { $$('.prof', root).forEach(b => b.addEventListener('click', () => { setProfile(b.dataset.p); close(); home(); })); });
}
function chronoSwitch(id = 'chr') { return `<div class="toggle chrono-t"><span><b>⏱ Contre la montre</b><br><span class="small muted">${settings.chrono ? 'Oui : un chrono défile, il faut faire vite' : 'Non : pas de chrono affiché, joue à ton rythme'}</span></span><button class="switch ${settings.chrono ? 'on' : ''}" id="${id}" role="switch" aria-checked="${settings.chrono}" aria-label="Contre la montre"></button></div>`; }
function bindChrono(root, after) { on('#chr', 'click', e => { settings.chrono = !settings.chrono; saveSettings(); after ? after() : null; }, root); }
function readySheet(title, sub, go) {
  const render = () => `<h2>${title}</h2><p class="small muted" style="margin:-4px 0 12px">${sub}</p>
    <div class="ready-row"><span>${prof().icon} Profil <b>${prof().name}</b></span><span>${gauge(LEVELS[settings.level].g)} <b>${LEVELS[settings.level].name}</b></span></div>
    ${chronoSwitch()}
    <button class="btn go" id="go" style="margin-top:16px">C’est parti</button><button class="btn ghost" id="cancel">Annuler</button>`;
  sheet(render(), (root, close) => {
    const bind = () => { bindChrono(root, () => { root.querySelector('.sheet').innerHTML = render(); bind(); }); on('#go', 'click', () => { close(); go(settings.level); }, root); on('#cancel', 'click', close, root); };
    bind(); root.addEventListener('click', e => { if (e.target === root) close(); });
  });
}

function home() {
  Clock.reset(); S = null;
  if (!settings.profile) { const seen = store.get('seen', false); app.innerHTML = `<div class="screen home h2"><div class="home-sky" aria-hidden="true">${HOME_ART}</div><header class="hh"><div><div class="wordmark">Mind<b>Sprint</b></div><div class="slogan">Muscle tes méninges en t’amusant !</div></div></header></div>`; if (seen) { settings.profile = 'classic'; saveSettings(); } else { setTimeout(() => profileSheet(true), 200); return; } }
  settings.level = clampLevel(settings.level); initLevels(); store.set('settings', settings);
  const first = !store.get('seen', false), lvl = settings.level;
  const st = streakNow(), daily = store.get('daily', {}), doneToday = daily.d === today(), jk = st.n > 0 && jokerFree();
  const mine = myBilans(), lastB = mine[mine.length - 1], run = bilanRun(), expired = bilanExpired();
  const ageB = lastB ? dayDiff(lastB.d, today()) : null;
  const streakMsg = st.saved && !doneToday ? `Tu as manqué le défi hier… Pas de panique : ton joker 🛟 de la semaine garde ta série de ${st.n} jour${st.n > 1 ? 's' : ''} si tu joues aujourd’hui !` : st.n ? `Série de ${st.n} jour${st.n > 1 ? 's' : ''} 🔥 ${doneToday ? 'Défi du jour réussi, bravo !' : 'Le défi du jour t’attend.'}` : '';
  const bubble = first ? 'Salut, moi c’est Mèche ! Commence par le grand bilan : 18 jeux pour voir où tu en es dans chaque catégorie.'
    : run ? `Ton bilan t’attend : ${run.idx} jeu${run.idx > 1 ? 'x' : ''} sur ${BILAN_IDS.length} déjà faits. On termine ?`
    : expired ? `Ton bilan commencé il y a plus de 7 jours a expiré. On en recommence un tout neuf ?`
    : lastB && ageB >= 1 ? `Ton dernier bilan date ${ageB === 1 ? 'd’hier' : `de ${ageB} jours`} : ${lastB.global}/100. On en refait un pour voir l’évolution ?`
    : lastB ? `Bilan du jour fait : ${lastB.global}/100 ✔ ${streakMsg || 'Reviens demain pour voir ton évolution.'}`
    : streakMsg || 'Fais ton premier grand bilan : je t’explique les règles avant chaque jeu.';
  const stars = GAMES.map(g => { const b = bestOf(g.id); return b < 0 ? 0 : starsOf(b); }), tot = stars.reduce((a, b) => a + b, 0);
  const myst = GAMES.find(g => g.id === 'mystere');
  app.innerHTML = `<div class="screen home h2">
   <div class="home-sky" aria-hidden="true">${HOME_ART}</div>
   <header class="hh"><div><div class="wordmark">Mind<b>Sprint</b></div><div class="slogan">Muscle tes méninges en t’amusant !</div><button class="prof-chip" id="pchip" aria-label="Profil : ${prof().name}. Changer">${prof().icon} ${prof().name} <span class="pc-ch">· changer</span></button></div>
     <div class="hh-r"><button class="iconbtn" id="help" aria-label="Comment jouer ?">?</button><button class="iconbtn" id="set" aria-label="Réglages">⚙</button></div></header>
   <div class="hello"><div class="bubble">${bubble}</div>${MECHE}</div>
   <div class="home-sheet">
   <section class="hs-play">
     <button class="play-main" id="solo"><span class="pm-ic">${run ? '⏯' : '▶'}</span><span>${run ? `<b>Reprendre le bilan (${run.idx}/${BILAN_IDS.length})</b><small>Tu reprends au jeu ${run.idx + 1} · ${run.chrono ? '⏱ avec chrono' : '🌿 sans chrono'}</small>` : `<b>Le grand bilan</b><small>18 jeux · 6 catégories · ≈ 25 min (plus long la 1re fois) · ${settings.chrono ? '⏱ avec chrono' : '🌿 sans chrono'}</small>`}</span></button>
     ${run ? '<button class="btn ghost restart-b" id="restart">Recommencer le bilan à zéro</button>' : ''}
<button class="mode m-daily ${doneToday ? 'done' : ''}" id="daily"><span class="md-ic">📅</span><span><b>Défi du jour ${st.n ? `<em class="fire">🔥 ${st.n}</em>` : ''}${jk ? '<em class="fire joker" title="Joker de série : sauve ta série si tu rates un seul jour" aria-label="1 joker de série disponible cette semaine">🛟</em>' : ''}</b><small>${doneToday ? `Fait aujourd’hui : ${daily.score}/100. Tu peux le rejouer pour t’entraîner (ta série ne change pas).` : '5 jeux, les mêmes pour tout le monde aujourd’hui. Joue chaque jour pour allonger ta série.'}${jk ? ' 🛟 Joker : 1 jour raté par semaine est pardonné.' : ''}</small></span></button>
     <button class="play-feat" id="feat" style="--c:${myst.color}"><span class="pf-ic">${myst.icon}</span><span><em class="nw">À la une</em><b>${myst.name}</b><small>Une image se dévoile : devine-la avant les autres !</small></span><span class="pf-go">Jouer</span></button>
   </section>
   <section class="hs-sec">
     <div class="sec-h"><h2>Choisis un jeu</h2><span class="small">${GAMES.length} jeux</span></div>
     <div class="lvl-pick" role="group" aria-label="Niveau">${Object.entries(LEVELS).map(([k, v]) => `<button class="${k === lvl ? 'on' : ''}" data-l="${k}" aria-pressed="${k === lvl}" ${clampLevel(k) !== k ? 'disabled title="Pas dans ce profil"' : ''}>${v.name}</button>`).join('')}</div>
     <div class="lvl-note"><p class="small">Niveau pour jouer librement (entraînement). Le grand bilan, lui, règle un niveau par catégorie${settings.autoLevel ? ' selon tes résultats' : ''}.</p>${chronoSwitch('chr')}</div>
     ${GROUPS.map(([k, t, f]) => `<h3 class="grp">${t}</h3><div class="glist">${GAMES.filter(f).map(g => gameRow(g, lvl)).join('')}</div>`).join('')}
   </section>
   <section class="hs-sec">
     <div class="sec-h"><h2>Autres façons de jouer</h2></div>
     <div class="modes">
       <button class="mode m-duel" id="duel"><span class="md-ic">🤖</span><span><b>Duel contre Mèche</b><small>Toi contre l’ordinateur sur un jeu de vitesse : le premier qui marque le plus gagne.</small></span></button>
       <button class="mode m-theme" id="theme"><span class="md-ic">🎯</span><span><b>Parcours thématique</b><small>Mémoire, logique, calcul ou réflexes : 5 jeux pour travailler une compétence.</small></span></button>
       <button class="mode m-fam" id="fam"><span class="md-ic">👨‍👩‍👧‍👦</span><span><b>En famille</b><small>2 à 4 joueurs sur le même téléphone, chacun son tour, podium à la fin.</small></span></button>
       <button class="mode m-turbo" id="turbo"><span class="md-ic">🚀</span><span><b>Mode turbo</b><small>Un jeu qui accélère sans arrêt : tiens le plus longtemps possible.</small></span></button>
       <button class="mode m-prog" id="prog"><span class="md-ic">📈</span><span><b>Mes progrès</b><small>${lastB ? `Dernier bilan : ${lastB.global}/100 · ` : ''}ton tableau de bord bilan après bilan, records et badges.</small></span></button>
     </div>
   </section>
   ${mine.length >= 2 ? `<button class="mini-chart" id="mchart" aria-label="Voir Mes progrès">${sparkline(mine.slice(-12).map(b => b.global))}<span>Tes ${Math.min(12, mine.length)} derniers bilans</span></button>` : ''}
   ${deferredInstall ? `<button class="mode" id="inst"><span class="md-ic">📲</span><span><b>Installer l’app</b><small>Sur l’écran d’accueil, même sans connexion.</small></span></button>` : ''}
   <p class="small foot">${tot} étoile${tot > 1 ? 's' : ''} sur ${GAMES.length * 3}<br>Un bilan par semaine, et tu vois tes progrès.<br>Gratuit · sans pub · sans compte · tes données restent dans ton téléphone</p>
   </div>
  </div>`;
  store.set('seen', true);
  const playOne = id => { const g = GAMES.find(x => x.id === id); S = { mode: 'train', level: settings.level, seed: newSeed(), games: [g], idx: 0, scores: {}, details: {} }; intro(); };
  $$('.grow').forEach(b => b.addEventListener('click', () => playOne(b.dataset.id)));
  $$('.lvl-pick button').forEach(b => b.addEventListener('click', () => { settings.level = b.dataset.l; saveSettings(); const y = window.scrollY; home(); window.scrollTo(0, y); }));
  on('#feat', 'click', () => playOne('mystere'));
  on('#help', 'click', helpSheet);
  on('#set', 'click', settingsSheet);
  on('#daily', 'click', startDaily);
  on('#solo', 'click', () => { if (bilanRun()) resumeBilan(); else bilanSheet(); });
  on('#restart', 'click', e => { const b = e.currentTarget; if (b.dataset.armed) { store.set('bilanRun', null); home(); } else { b.dataset.armed = '1'; b.textContent = 'Sûr ? Touche encore : les jeux déjà faits seront perdus'; } });
  on('#mchart', 'click', progress);
  on('#pchip', 'click', () => profileSheet(false));
  on('#chr', 'click', () => { settings.chrono = !settings.chrono; saveSettings(); const y = window.scrollY; home(); window.scrollTo(0, y); });
  on('#duel', 'click', duelSetup);
  on('#fam', 'click', () => familySetup());
  on('#theme', 'click', themeSheet);
  on('#turbo', 'click', turboPick);
  on('#prog', 'click', progress);
  on('#inst', 'click', async () => { if (!deferredInstall) return; deferredInstall.prompt(); try { await deferredInstall.userChoice; } catch (e) { } deferredInstall = null; home(); });
  if (first) setTimeout(helpSheet, 400);
}
function helpSheet() {
  sheet(`<h2>Comment jouer ?</h2>
    <ol class="howto">
      <li><b>Le grand bilan :</b> 18 jeux, toujours les mêmes et dans le même ordre, 3 par catégorie : 🧮 calcul mental, 🧩 logique (avec les énigmes), 🔎 raisonnement, 👁️ observation, 🧠 mémoire et ⚡ rapidité. Compte 20 à 25 minutes.</li>
      <li><b>Pause quand tu veux :</b> le bilan est gardé après chaque jeu. Tu le reprends depuis l’accueil pendant 7 jours.</li>
      <li><b>À la fin,</b> ton tableau de bord montre un score sur 100 pour chaque catégorie, ton score global, ton point fort et la comparaison avec ton bilan d’avant.</li>
      <li><b>Mes progrès</b> ne compte que les grands bilans : comme ce sont les mêmes jeux, tu peux vraiment comparer. Les autres modes gardent leurs records et badges, mais ne changent pas ta courbe.</li>
      <li><b>Le niveau</b> de chaque catégorie s’ajuste avec tes bilans : 2 bilans d’affilée à 78 ou plus, il monte ; 2 bilans d’affilée sous 42, il baisse. Tu peux le figer dans les réglages ⚙.</li>
      <li><b>Avant chaque jeu,</b> Mèche explique la règle avec un exemple, et tu peux faire un <em>essai sans chrono</em>. Une fois compris, on passe directement au jeu.</li>
      <li><b>Pour varier :</b> défi du jour (garde ta série 🔥), entraînement libre dans la liste, parcours thématique, duel, turbo et partie en famille.</li>
    </ol>
    <button class="btn" id="ok">Compris !</button>`, (root, close) => { on('#ok', 'click', close, root); root.addEventListener('click', e => { if (e.target === root) close(); }); });
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
    <div class="toggle"><span><b>Profil de joueur</b><br><span class="small muted">${prof().icon} ${prof().name} · ${prof().sub}</span></span><button class="chip" id="chp">Changer</button></div>
    ${sw('chrono', 'Contre la montre', 'Sinon : pas de chrono affiché, tu joues à ton rythme')}
    ${sw('autoLevel', 'Niveau automatique', 'Après chaque grand bilan, chaque catégorie monte ou baisse selon ton score. Sinon : niveau fixe pour tout.')}
    ${sw('moreTime', 'Encore plus de temps', '+50 % sur tous les temps d’affichage et de réponse')}
    <div class="toggle"><b>Thème</b><span class="chips" id="th">${[['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']].map(([k, l]) => `<button class="chip ${settings.theme === k ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}</span></div>
    <p class="small muted" style="margin-top:14px">${iOS ? 'Pour installer l’app sur iPhone : touche « Partager », puis « Sur l’écran d’accueil ».' : 'Pour installer l’app : menu du navigateur, puis « Installer l’application » ou « Ajouter à l’écran d’accueil ».'}</p>
    <div class="toggle bk-row"><span><b>Ma progression</b><br><span class="small muted">Elle reste dans ce téléphone. Garde une copie pour ne rien perdre.</span></span></div>
    <button class="btn secondary" id="bksave" style="margin-top:10px">💾 Sauvegarder ma progression</button>
    <button class="btn secondary" id="bkload" style="margin-top:10px">📥 Restaurer une sauvegarde</button>
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
    on('#chp', 'click', () => { close(); profileSheet(false); }, root);
    on('#bksave', 'click', () => { close(); backupSheet(); }, root);
    on('#bkload', 'click', () => { close(); restoreSheet(); }, root);
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
const chronoOn = () => S && S.mode === 'bilan' ? !!S.chrono : settings.chrono;
const moreTimeOn = () => S && S.mode === 'bilan' ? !!S.moreTime : settings.moreTime;
/* Bilan et défi du jour : chaque jeu se joue au niveau de SA catégorie */
function syncLevel() { if (S && S.levels) { const g = S.games[S.idx]; S.level = g.axis && S.levels[g.axis] ? S.levels[g.axis] : (S.baseLevel || settings.level); } }
function intro() {
  Clock.reset(); window.scrollTo(0, 0); syncLevel();
  const g = S.games[S.idx], lvl = S.level, pl = currentPlayer(), T = TUTOS[g.id];
  const bil = S.mode === 'bilan';
  const rec = !['family', 'duel', 'turbo'].includes(S.mode) ? store.get(recKey(g.id, lvl), null) : S.mode === 'turbo' ? store.get('turbo:' + g.id, null) : null;
  const step = S.games.length > 1 ? `${bil ? 'Jeu' : 'Épreuve'} ${S.idx + 1} sur ${S.games.length}` : '';
  const done = store.get(tutoKey(g), false);
  app.innerHTML = `<div class="screen play">${scene(g.id)}
    <div class="topbar"><button class="iconbtn" id="x" aria-label="Quitter">✕</button>${step ? `<span class="plaque small" style="margin-left:auto">${step}</span>` : ''}${pl ? `<span class="plaque small" style="${step ? '' : 'margin-left:auto'}">${esc(pl.name)}</span>` : ''}</div>
    <div class="postcard short">${SCENES[g.id]}<div class="tag"><span class="ic">${g.icon}</span><div><h1>${g.name}</h1><span class="small">${T.but}</span></div></div></div>
    <div class="coach">${MECHE.replace('data-mood="neutral"', 'data-mood="happy"')}<div class="bubble">${rulesHTML(g, lvl)}</div></div>
    ${exampleHTML(g, lvl)}
    <div class="chips" style="margin-top:10px">${catPill(g.cat, g.axis)}<span class="pill">⏱ ${g.info(lvl)}</span><span class="pill">${gauge(LEVELS[lvl].g)} ${LEVELS[lvl].name}</span>${rec != null ? `<span class="pill">🏆 ${rec}</span>` : ''}</div>
    ${bil ? `<p class="small bil-note">${S.chrono ? '⏱ Bilan contre la montre' : '🌿 Bilan sans chrono'} · le réglage reste le même jusqu’à la fin du bilan.</p>` : !['duel', 'turbo', 'family'].includes(S.mode) ? chronoSwitch() : ''}
    <div class="spacer"></div>
    ${done ? `<button class="btn go" id="go">On y va !</button><button class="btn secondary" id="try">Refaire l’essai</button>`
      : `<button class="btn go" id="try">Essayer sans chrono</button><button class="btn ghost light" id="go">Passer l’essai</button>`}
  </div>`;
  on('#x', 'click', () => confirmLeave(false));
  on('#go', 'click', () => { SFX('tap'); play(g, false); });
  on('#try', 'click', () => { SFX('tap'); play(g, true); });
  on('#chr', 'click', () => { settings.chrono = !settings.chrono; saveSettings(); const y = window.scrollY; intro(); window.scrollTo(0, y); });
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
    <p style="font-weight:500">Le vrai jeu commence maintenant${chronoOn() ? ', avec le chrono' : ', à ton rythme'}.</p>${rulesHTML(g, S.level)}</div>
    <div class="spacer"></div><button class="btn go" id="go">C’est parti !</button><button class="btn secondary" id="again">Refaire l’essai</button></div>`;
  on('#go', 'click', () => play(g, false));
  on('#again', 'click', () => play(g, true));
}
function confirmLeave(inGame) {
  if (inGame) Clock.paused = true;
  const fam = S && S.mode === 'family', multi = S && !['train', 'duel', 'turbo'].includes(S.mode), bil = S && S.mode === 'bilan';
  const practice = CUR && CUR.practice && !CUR.over;
  const canSkip = inGame && multi && CUR && !CUR.over && !practice;
  const g = S && S.games[S.idx];
  sheet(`
    <h2>${inGame ? 'Pause' : fam ? 'Arrêter la partie ?' : bil ? 'Pause du bilan ?' : 'Tu quittes ?'}</h2>
    ${inGame && g ? `<details class="rev"><summary>Revoir la consigne</summary>${rulesHTML(g, S.level)}${exampleHTML(g, S.level)}</details>` : ''}
    <p class="muted">${practice ? 'C’est l’essai : rien n’est compté.' : bil ? (inGame ? 'Tu peux reprendre, passer cette épreuve (elle comptera 0 et le bilan sera marqué « incomplet ») ou faire une pause : ton bilan est gardé, tu reprendras à ce jeu.' : `Ton bilan est gardé (${S.idx}/${S.games.length}). Tu le reprendras depuis l’accueil, pendant 7 jours.`) : inGame ? (canSkip ? 'Tu peux reprendre, passer cette épreuve (elle comptera 0, sans record) ou tout arrêter.' : 'Si tu arrêtes, ce score ne sera pas gardé.') : fam ? 'Les scores de la partie seront perdus.' : S && S.mode !== 'train' && S.idx > 0 ? 'La partie en cours sera interrompue.' : 'Tu reviendras quand tu veux.'}</p>
    <button class="btn go" id="cont">${inGame ? 'Reprendre' : 'Rester'}</button>
    ${practice ? '<button class="btn secondary" id="endp">Terminer l’essai</button>' : ''}
    ${canSkip ? '<button class="btn secondary" id="skip">Passer cette épreuve</button>' : ''}
    <button class="btn ${canSkip || practice ? 'ghost' : 'secondary'}" id="stop">${inGame && !multi ? 'Arrêter l’épreuve' : fam ? 'Arrêter la partie' : bil ? 'Pause : je reprendrai plus tard' : multi ? 'Arrêter le test' : 'Quitter'}</button>
  `, (root, close) => {
    on('#cont', 'click', () => { close(); Clock.paused = false; }, root);
    on('#endp', 'click', () => { close(); Clock.paused = false; CUR.over = true; practiceDone(g); }, root);
    on('#skip', 'click', () => { close(); Clock.paused = false; CUR.done(0, 'Épreuve passée', true); }, root);
    on('#stop', 'click', () => { close(); const back = home; Clock.reset(); back(); }, root);
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
  const noChrono = !practice && !chronoOn() && !['duel', 'turbo', 'family'].includes(S.mode);
  Clock.rate = S.mode === 'duel' ? 1 : prof().rate * (S.mode === 'family' ? 1 : 1);
  if (S.mode === 'family') { const pl = currentPlayer(); Clock.rate = (PROFILES[pl && pl.profile] || PROFILES.classic).rate; }
  if (noChrono) fuse.classList.add('nochrono');
  Clock.start();
  const rng = makeRng(hashStr(S.seed + ':' + g.id + ':' + S.level + (practice ? ':essai' : '')));
  let goods = 0, lastInput = 0, tipT = null, nOk = 0, nKo = 0;
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
    stage, level: S.level, mode: S.mode, rng, over: false, practice: !!practice, rate: Clock.rate || 1,
    L: o => o[S.level],
    tm: ms => ms * (moreTimeOn() ? 1.5 : 1) * (practice ? 1.6 : 1) * (turbo ? Math.max(0.55, 1 - Math.max(0, Clock.t - 2100) / 60000 * 0.9) : 1),
    later: (fn, ms) => Clock.later(fn, ms),
    cancel: id => Clock.cancel(id),
    now: () => Clock.t,
    beep: f => { if (settings.sound) beep(f, .1); },
    ok: el => { $$('[data-ok]', stage).forEach(e => { if (e !== el) { delete e.dataset.ok; e.classList.remove('hint'); } }); if (el) { el.dataset.ok = '1'; lastInput = Math.max(lastInput, Clock.t - 1500); if (practice && (g.id === 'lanterne' || g.id === 'bateaux')) { el.classList.add('hint'); say(g.id === 'lanterne' ? 'Elle brille : touche !' : 'Un bateau : touche l’eau !', 1200); } } },
    score: v => { sc.textContent = v; fx($('#buoy'), 'bump'); const n = parseInt(v, 10);  },
    progress: r => { fuse.classList.remove('urgent'); fill.style.width = (Math.max(0, Math.min(1, r)) * 100) + '%'; secs.textContent = ''; },
    timer(sec, onEnd) {
      if (practice || (noChrono && sec < 30)) return () => { };
      const total = c.tm(sec * 1000), st = Clock.t; let fired = false, lastS = null;
      if (noChrono) { const off2 = Clock.tick(t => { if (!fired && t - st >= total) { fired = true; off2(); onEnd(); } }); return () => { if (!fired) { fired = true; off2(); } }; }
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
      nOk++;
      if (S.mode === 'duel' && !practice) { S.duelGood = (S.duelGood || 0) + 1; duelSync(); }
      haptic(15); SFX('ok'); mood($('#hm'), 'happy', 700);
      if (el) { fx(el, 'ok-fx'); burst(el, true); }
      if (word && el) { const r = el.getBoundingClientRect(); floatWord(r.left + r.width / 2, r.top); }
      if (practice) { goods++; if (goods >= T.goal && !c.over) { c.over = true; Clock.later(() => practiceDone(g), 700); } else say(['Bien !', 'C’est ça !', 'Parfait.', 'Oui !'][goods % 4], 1200); }
    },
    bad(el) {
      nKo++;
      if (S.mode === 'duel' && !practice) { S.duelBad = (S.duelBad || 0) + 1; duelSync(); }
      haptic([30, 40, 30]); SFX('ko'); mood($('#hm'), 'surprised', 700);
      if (el) { fx(el, 'ko-fx'); burst(el, false); }
      if (practice) say(T.oops, 3200);
    },
    done(raw, detail, skipped) {
      if (c.over) return; c.over = true;
      if (practice) { if (goods >= T.goal) practiceDone(g); else practiceRetry(g); return; }
      Clock.reset();
      let sc = Math.max(0, Math.min(100, raw));
      /* Anti-hasard : plus de 4 erreurs et moins de 60 % de réponses justes → score fortement réduit (taper au hasard ne paie plus) */
      const acc = nOk + nKo ? nOk / (nOk + nKo) : 1;
      if (nKo > 4 && acc < 0.6) { sc *= Math.max(0, Math.min(1, (acc - 0.3) / 0.3)); detail = (detail ? detail + ' · ' : '') + `précision ${Math.round(acc * 100)} %`; }
      const score = skipped ? 0 : Math.round(sc);
      gameEnd(g, score, detail, !!skipped);
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

function gameEnd(g, score, detail, skipped) {
  S.scores[g.id] = score; S.details[g.id] = detail;
  if (S.mode === 'duel') return duelEnd(g, score, detail);
  if (S.mode === 'bilan') { if (skipped) S.skipped = [...new Set([...(S.skipped || []), g.id])]; else S.skipped = (S.skipped || []).filter(x => x !== g.id); S.idx++; saveRun(); }
  /* Épreuve passée ou défi rejoué : rien n'est enregistré (ni historique, ni record) */
  const counts = !skipped && !(S.mode === 'daily' && S.replay);
  if (counts && !['family', 'duel', 'turbo'].includes(S.mode)) { const gh = store.get('gh', {}); (gh[g.id] = gh[g.id] || []).push(score); gh[g.id] = gh[g.id].slice(-30); store.set('gh', gh); }
  if (S.mode === 'turbo' && counts) { const pv = store.get('turbo:' + g.id, null); if (pv == null || score > pv) store.set('turbo:' + g.id, score); if (score >= 70) award('turbo70'); }
  if (S.mode === 'bilan') return bilanStep(g, score, detail, skipped);
  let prev = null, rec = false;
  if (counts && !['family', 'turbo'].includes(S.mode)) {
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
    on('#other', 'click', home);
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
  const th = S.theme && THEMES[S.theme];
  /* Hors grand bilan : rien ne compte dans la progression. Le défi du jour garde son record (sauf s'il est rejoué). */
  const counts = S.mode === 'daily' && !S.replay;
  const prev = counts ? store.get('best:daily', null) : null, rec = counts && (prev == null || total > prev);
  if (rec) store.set('best:daily', total);
  const hist = store.get('hist', []); if (!(S.mode === 'daily' && S.replay)) { hist.push({ d: today(), t: Date.now(), kind: th ? 'theme' : S.mode, level: S.level, score: total }); store.set('hist', hist.slice(-300)); }
  let dailyMsg = '', jokerMsg = '', stD = null;
  if (S.mode === 'daily' && !S.replay) {
    stD = markDaily(total); dailyMsg = `🔥 Série : ${stD.n} jour${stD.n > 1 ? 's' : ''} d’affilée${stD.n >= 3 ? ' · Bonus de série !' : ''}`; if (total >= 80) award('score80');
    if (stD.joker) jokerMsg = `Tu avais manqué un jour, alors j’ai utilisé ton joker 🛟 de la semaine : ta série continue ! Un nouveau joker arrive lundi.`;
  }
  if (S.mode === 'daily' && !stD) stD = streakNow();
  const md = medalOf(total), nxt = total < 40 ? [40, 'le bronze'] : total < 60 ? [60, 'l’argent'] : total < 80 ? [80, 'l’or'] : null;
  const nextLvl = S.levels ? '' : S.level === 'F' && total >= 70 ? ' Essaie « En forme » la prochaine fois ?' : S.level === 'N' && total >= 70 ? ' Prêt pour « Costaud » ?' : '';
  app.innerHTML = `<div class="screen play result">${scene('constellation')}
    <div class="card">${md ? medalSVG(md) : MECHE}<p class="muted" style="margin:0">${S.mode === 'daily' ? 'Défi du jour' + (S.replay ? ' (rejoué, hors série)' : '') : th ? `Parcours ${th.name}` : 'Partie'} · ${S.levels ? 'niveau de chaque catégorie' : LEVELS[S.level].name}</p>
    <div class="bigscore" id="tot">0<small> / 100</small></div>
    <p style="font-weight:700;margin:0">${md ? MEDALS[md][2] : 'Pas encore de médaille'}${rec && prev != null ? ' · 🏆 Nouveau record !' : ''}</p>
    ${dailyMsg ? `<p class="streakline">${dailyMsg}</p>` : ''}
    ${jokerMsg ? `<div class="coach joker-msg">${MECHE.replace('data-mood="neutral"', 'data-mood="happy"')}<div class="bubble">${jokerMsg}</div></div>` : ''}
    <p class="muted small">${nxt ? `Encore ${nxt[0] - total} point${nxt[0] - total > 1 ? 's' : ''} pour ${nxt[1]}.` : 'Le sommet de l’archipel !'} ${pf.label}.${nextLvl}</p>
    <p class="small muted">Cette partie ne change pas ta courbe de progrès : seul le grand bilan compte.</p>
    <div class="split"><div class="sp">⚡ Rapidité<b>${pf.sp}</b></div><div class="lo">⚙ Logique<b>${pf.lo}</b></div></div>
    <div class="isles">${S.games.map(g => { const s = S.scores[g.id] || 0; return `<span class="isle-w" title="${g.name} : ${s}/100"><span class="isle" aria-hidden="true">${g.icon}<em>${'★'.repeat(starsOf(s)) || s}</em></span><small>${g.short || g.name}</small><span class="sr">${g.name} : ${s} sur 100</span></span>`; }).join('')}</div></div>
    ${S.mode === 'daily' ? '<button class="btn accent share-btn" id="share" style="margin-top:16px">📤 Partager mon score</button>' : ''}
    <button class="btn go" id="again" style="margin-top:${S.mode === 'daily' ? 10 : 16}px">${th ? 'Rejouer le parcours' : 'Rejouer le test'}</button><button class="btn secondary" id="home">Retour à l’accueil</button></div>`;
  countUp($('#tot'), total, '<small> / 100</small>');
  if (rec && prev != null) SFX('record'); else SFX('end');
  if (md) setTimeout(() => confetti(md === 'or' ? 60 : 36), 500);
  on('#again', 'click', () => { if (S.mode === 'daily') { startTurboOrHome(); return; } S = { ...S, seed: newSeed(), idx: 0, scores: {}, details: {} }; intro(); });
  if (S.mode === 'daily') { const b = $('#again'); if (b) b.textContent = 'Essayer le mode turbo 🚀'; on('#share', 'click', () => shareScore(shareText(total, S.games, S.scores, stD ? stD.n : 0))); }
  on('#home', 'click', home);
}
function startTurboOrHome() { turboPick(); }
/* ---------- Partage du défi du jour (texte façon « grille de carrés ») ---------- */
const SHARE_URL = 'https://mbbouazza1975-sys.github.io/mindsprint/';
function shareText(total, games, scores, streak) {
  const d = new Date(), dd = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  const sq = games.map(g => { const s = scores[g.id] || 0; return s >= 65 ? '🟩' : s >= 40 ? '🟨' : '🟥'; }).join('');
  return `MindSprint · Défi du ${dd} · ${total}/100${streak > 0 ? ` 🔥${streak}` : ''}\n${sq}\n${SHARE_URL}`;
}
async function shareScore(text) {
  if (navigator.share) {
    try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  let ok = false;
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); ok = true; } } catch (e) { }
  if (!ok) {
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta); ta.select(); try { ok = document.execCommand('copy'); } catch (e) { } ta.remove();
  }
  if (ok) { toast('📋', 'Copié !', 'Colle ton score dans un message.'); return; }
  sheet(`<h2>Ton score à partager</h2><p class="small muted">Sélectionne le texte et copie-le.</p><textarea class="share-ta" readonly rows="4">${esc(text)}</textarea><button class="btn" id="ok">Fermer</button>`,
    (root, close) => { on('#ok', 'click', close, root); const t = $('textarea', root); if (t) t.select(); });
}
function toast(icon, title, sub, ms = 3000) {
  const d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status');
  d.innerHTML = `<span aria-hidden="true">${icon}</span><span><b>${esc(title)}</b>${sub ? '<br>' + esc(sub) : ''}</span>`;
  document.body.appendChild(d); setTimeout(() => d.remove(), ms);
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
  let format = store.get('famFormat', 'quick'), lvl = store.get('famLevel', settings.level), profs = store.get('famProfiles', []);
  const PK = Object.keys(PROFILES);
  function render() {
    screen(`
      <div class="topbar"><button class="iconbtn" id="back" aria-label="Retour">←</button><h2 style="flex:1">Qui joue ?</h2></div>
      <div id="pl">${names.map((n, i) => `<div class="pinput">${pawn(i)}<input maxlength="16" autocapitalize="words" autocomplete="off" placeholder="Joueur ${i + 1}" value="${esc(n)}" data-i="${i}" aria-label="Prénom du joueur ${i + 1}"><button class="pprof" data-pp="${i}" aria-label="Profil de ${esc(n) || 'ce joueur'} : ${PROFILES[profs[i] || 'classic'].name}. Toucher pour changer">${PROFILES[profs[i] || 'classic'].icon}<small>${PROFILES[profs[i] || 'classic'].name}</small></button>${i >= 2 ? `<button class="iconbtn" data-rm="${i}" aria-label="Retirer">✕</button>` : ''}</div>`).join('')}</div>
      ${names.length < 4 ? `<button class="btn ghost" id="add">+ Ajouter un joueur</button>` : ''}
      <h3 style="margin-top:16px">Format</h3>
      <div class="chips" id="fm" style="margin-top:8px">
        <button class="chip ${format === 'quick' ? 'on' : ''}" data-f="quick">Partie rapide · 4 épreuves</button>
        <button class="chip ${format === 'full' ? 'on' : ''}" data-f="full">Partie longue · 8</button>
      </div>
      <h3 style="margin-top:16px">Niveau</h3>
      <div class="chips" id="lv" style="margin-top:8px">${Object.entries(LEVELS).map(([k, v]) => `<button class="chip ${k === lvl ? 'on' : ''}" data-l="${k}">${v.name}</button>`).join('')}</div>
      <p class="small muted" style="margin-top:10px">Tout le monde joue les mêmes épreuves, avec les mêmes énoncés. Touche l’icône à côté d’un prénom pour choisir son profil : 🧒 Junior et 🌿 Sérénité jouent plus lentement, 💪 Muscle plus vite. Ça équilibre la partie entre petits et grands.</p>
      <div class="spacer"></div>
      <p class="small muted" id="hint" style="text-align:center;margin-top:16px"></p>
      <button class="btn" id="go">On commence</button>
    `);
    const sync = () => { names = $$('#pl input').map(i => i.value); const ok = names.filter(n => n.trim()).length >= 2; $('#go').disabled = !ok; $('#hint').textContent = ok ? '' : 'Il faut au moins deux joueurs.'; };
    $$('#pl input').forEach(i => i.addEventListener('input', sync));
    $$('[data-pp]').forEach(b => b.addEventListener('click', () => { sync(); const i = +b.dataset.pp, cur = profs[i] || 'classic'; profs[i] = PK[(PK.indexOf(cur) + 1) % PK.length]; store.set('famProfiles', profs); render(); }));
    $$('[data-rm]').forEach(b => b.addEventListener('click', () => { sync(); names.splice(+b.dataset.rm, 1); profs.splice(+b.dataset.rm, 1); store.set('famProfiles', profs); render(); }));
    on('#add', 'click', () => { sync(); names.push(''); render(); $$('#pl input').pop().focus(); });
    $$('#fm .chip').forEach(b => b.addEventListener('click', () => { sync(); format = b.dataset.f; render(); }));
    $$('#lv .chip').forEach(b => b.addEventListener('click', () => { sync(); lvl = b.dataset.l; render(); }));
    on('#back', 'click', home);
    on('#go', 'click', () => {
      sync();
      const list = names.map((n, i) => ({ name: n.trim(), i })).filter(p => p.name);
      if (list.length < 2) return;
      store.set('famNames', names); store.set('famFormat', format); store.set('famLevel', lvl); // ne touche plus au niveau du joueur
      startFamily(list.map((p, k) => ({ name: p.name, i: k, profile: profs[p.i] || 'classic', scores: {}, total: 0 })), format, lvl);
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
    <button class="btn go" id="hold">C’est moi, je commence</button>
  `);
  on('#x', 'click', () => confirmLeave(false));
  on('#hold', 'click', () => { haptic(20); intro(); });
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
/* Joker de série : 1 par semaine (lundi → dimanche). S'il reste, un seul jour manqué ne casse pas la série. */
const weekKey = (d = new Date()) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return today(x); };
const jokerFree = () => (store.get('joker', {}).week || null) !== weekKey();
function streakNow() {
  const st = store.get('streak', { last: null, n: 0, best: 0 }); st.saved = false;
  if (st.last) { const dd = dayDiff(st.last, today()); if (dd === 2 && st.n > 0 && jokerFree()) st.saved = true; else if (dd > 1) st.n = 0; }
  return st;
}
function markDaily(score) {
  const st = store.get('streak', { last: null, n: 0, best: 0 }), t = today();
  let joker = false;
  if (st.last !== t) {
    const dd = st.last ? dayDiff(st.last, t) : null;
    if (dd === 1) st.n++;
    else if (dd === 2 && st.n > 0 && jokerFree()) { st.n++; joker = true; store.set('joker', { week: weekKey(), day: t }); }
    else st.n = 1;
    st.last = t; st.best = Math.max(st.best || 0, st.n);
  }
  delete st.saved;
  store.set('streak', st); store.set('daily', { d: t, score });
  award('premier-defi'); if (st.n >= 3) award('serie3'); if (st.n >= 7) award('serie7'); if (st.n >= 30) award('serie30');
  return { ...st, joker };
}
const BADGES = [
  ['bilan1', '📊', 'Premier bilan', 'Terminer un grand bilan'],
  ['bilan10', '🗺️', 'Dix bilans', 'Terminer 10 grands bilans'],
  ['premier-defi', '🌅', 'Premier défi', 'Réussir un défi du jour'],
  ['serie3', '🔥', 'Série de 3', 'Jouer le défi 3 jours d’affilée'],
  ['serie7', '🔥', 'Semaine de feu', '7 jours d’affilée'],
  ['serie30', '🏅', 'Marathon', '30 jours d’affilée'],
  ['score80', '🥇', 'Phare d’or', '80 ou plus au défi du jour'],
  ['etoiles5', '⭐', 'Collection', '3 étoiles sur 5 épreuves'],
  ['explorateur', '🧭', 'Explorateur', 'Jouer toutes les épreuves'],
  ['duel', '🤖', 'Premier duel', 'Battre Mèche une fois'],
  ['duel-fort', '⚡', 'Plus fort que Mèche', 'Battre Mèche en vitesse Fusée'],
  ['turbo70', '🚀', 'Turbo', '70 ou plus en mode turbo'],
  ['famille', '👨‍👩‍👧‍👦', 'En famille', 'Finir une partie en famille']
];
function award(id) {
  const b = store.get('badges', {}); if (b[id]) return;
  b[id] = today(); store.set('badges', b);
  const def = BADGES.find(x => x[0] === id); if (!def) return;
  award.q = (award.q || 0) + 1; const delay = 400 + (award.q - 1) * 3200; setTimeout(() => award.q--, delay + 3000);
  setTimeout(() => { const d = document.createElement('div'); d.className = 'toast'; d.innerHTML = `<span>${def[1]}</span><span><b>Badge débloqué</b><br>${def[2]}</span>`; document.body.appendChild(d); SFX('record'); setTimeout(() => d.remove(), 3000); }, delay);
}
function checkCollectionBadges() {
  const all = GAMES.every(g => ['F', 'N', 'E'].some(l => store.get(recKey(g.id, l), null) != null));
  if (all) award('explorateur');
  const three = GAMES.filter(g => ['F', 'N', 'E'].some(l => (store.get(recKey(g.id, l), -1)) >= 85)).length;
  if (three >= 5) award('etoiles5');
}
function sparkline(vals, w = 300, h = 70, lo = 0, hi = 100) {
  if (vals.length < 2) return '';
  const x = i => 8 + i * (w - 16) / (vals.length - 1), y = v => h - 8 - (v - lo) * (h - 16) / Math.max(1, hi - lo);
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" role="img" aria-label="Évolution des derniers scores"><polyline points="${pts}" fill="none" stroke="var(--chart-a)" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>${vals.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${i === vals.length - 1 ? 6 : 3.5}" fill="${i === vals.length - 1 ? 'var(--chart-end)' : 'var(--chart-dot)'}"/>`).join('')}</svg>`;
}
function dailyGames() {
  const r = makeRng(hashStr('jour:' + today()));
  const sp = r.shuffle(GAMES.filter(g => g.cat === 'speed')), lo = r.shuffle(GAMES.filter(g => g.cat === 'logic'));
  const num = ['gue', 'bulles', 'suites', 'boutique'];
  const pick = [sp[0], lo[0]];
  for (const g of sp.slice(1)) if (pick.length < 3 && pairOk(pick, g)) pick.push(g);
  for (const g of lo.slice(1)) if (pick.length < 4 && pairOk(pick, g)) pick.push(g);
  const extra = r.shuffle(GAMES.filter(g => num.includes(g.id) && !pick.includes(g) && pairOk(pick, g)))[0];
  return [...pick, extra];
}
function startDaily() {
  const d = store.get('daily', {}), replay = d.d === today();
  S = { mode: 'daily', level: settings.level, baseLevel: clampLevel(settings.level), levels: curLevels(), seed: hashStr('jour:' + today()), games: dailyGames(), idx: 0, scores: {}, details: {}, replay };
  intro();
}
/* Parcours thématique : 5 jeux de la compétence choisie, complétés par des jeux proches */
function themeGames(r, k, n = 5) {
  const T = THEMES[k], out = [];
  for (const g of r.shuffle(GAMES.filter(g => g.skill === k))) if (out.length < n && pairOk(out, g)) out.push(g);
  for (const id of r.shuffle(T.near.slice())) { const g = GAMES.find(x => x.id === id); if (out.length < n && g && !out.includes(g) && pairOk(out, g)) out.push(g); }
  return out;
}
function themeSheet() {
  sheet(`<h2>Parcours thématique</h2><p class="small muted" style="margin:-4px 0 12px">5 jeux qui font travailler la même compétence, pour s’entraîner (hors progression).</p>
    <div class="profs">${Object.entries(THEMES).map(([k, t]) => `<button class="prof" data-th="${k}"><span class="pi">${t.icon}</span><span><b>${t.name}</b><small>${t.sub}</small></span></button>`).join('')}</div>
    <button class="btn ghost" id="cancel">Annuler</button>`, (root, close) => {
    $$('[data-th]', root).forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.th, t = THEMES[k], games = themeGames(makeRng(newSeed()), k);
      close();
      readySheet(`${t.icon} Parcours ${t.name}`, `5 jeux : ${games.map(g => g.short || g.name).join(', ')}.`, level => startTheme(k, level, games));
    }));
    on('#cancel', 'click', close, root);
    root.addEventListener('click', e => { if (e.target === root) close(); });
  });
}
function startTheme(k, level, games) {
  S = { mode: 'solo', theme: k, level, seed: newSeed(), games: games || themeGames(makeRng(newSeed()), k), idx: 0, scores: {}, details: {} };
  intro();
}
/* =========================================================
   LE GRAND BILAN : 18 jeux fixes, 6 catégories × 3, toujours dans le même ordre
   ========================================================= */
const BILAN_TTL = 7 * 864e5;
const fmtD = d => { const [y, m, j] = String(d).split('-'); return `${j}/${m}`; };
const bilanGames = () => BILAN_IDS.map(id => GAMES.find(g => g.id === id));
const myProfile = () => settings.profile || 'classic';
function myBilans() { return store.get('bilans', []).filter(b => b && b.profile === myProfile() && b.axes); }
function rawRun() { const r = store.get('bilanRun', null); return r && r.profile === myProfile() && r.idx < BILAN_IDS.length ? r : null; }
function bilanRun() { const r = rawRun(); return r && Date.now() - r.t < BILAN_TTL ? r : null; }
function bilanExpired() { const r = rawRun(); return !!r && Date.now() - r.t >= BILAN_TTL; }
function saveRun() {
  store.set('bilanRun', { v: 1, t: S.start, profile: S.profile, seed: S.seed, idx: S.idx, scores: S.scores, details: S.details, skipped: S.skipped || [], levels: S.levels, chrono: S.chrono, moreTime: S.moreTime });
}
function axisAvg(scores, a) { return Math.round(AXES[a].games.reduce((s, id) => s + (scores[id] || 0), 0) / AXES[a].games.length); }
function levelsLine(levels) { return AX_ORDER.map(a => `<span class="lv-it">${AXES[a].icon} ${gauge(LEVELS[levels[a]].g)}<span class="sr">${AXES[a].name} : ${LEVELS[levels[a]].name}</span></span>`).join(''); }

function bilanSheet() {
  const exp = bilanExpired(), lv = curLevels();
  const render = () => `<h2>Le grand bilan</h2>
    <p class="small muted" style="margin:-4px 0 10px">18 jeux, toujours les mêmes et dans le même ordre, pour comparer d’un bilan à l’autre. Compte <b>20 à 25 minutes</b>. Tu peux faire une pause après chaque jeu.</p>
    ${exp ? '<p class="small bil-warn">Ton bilan commencé il y a plus de 7 jours a expiré : on repart de zéro.</p>' : ''}
    <ul class="bil-cats">${AX_ORDER.map(a => `<li><span class="bc-ic" aria-hidden="true">${AXES[a].icon}</span><span><b>${AXES[a].name}</b><small>${AXES[a].games.map(id => GAMES.find(g => g.id === id).short).join(' · ')}</small></span><span class="bc-lv">${gauge(LEVELS[lv[a]].g)}<small>${LEVELS[lv[a]].name}</small></span></li>`).join('')}</ul>
    <p class="small muted" style="margin:8px 2px 0">${settings.autoLevel ? 'Chaque catégorie a son niveau, qui évolue après chaque bilan.' : 'Niveau fixe pour toutes les catégories (réglages ⚙).'} Profil ${prof().icon} ${prof().name}.</p>
    ${chronoSwitch()}
    <button class="btn go" id="go" style="margin-top:16px">C’est parti</button><button class="btn ghost" id="cancel">Annuler</button>`;
  sheet(render(), (root, close) => {
    const bind = () => { bindChrono(root, () => { root.querySelector('.sheet').innerHTML = render(); bind(); }); on('#go', 'click', () => { close(); startBilan(); }, root); on('#cancel', 'click', close, root); };
    bind(); root.addEventListener('click', e => { if (e.target === root) close(); });
  });
}
function startBilan() {
  S = { mode: 'bilan', start: Date.now(), profile: myProfile(), seed: newSeed(), games: bilanGames(), idx: 0, scores: {}, details: {}, skipped: [], levels: curLevels(), chrono: !!settings.chrono, moreTime: !!settings.moreTime };
  saveRun(); bilanStep(null);
}
function resumeBilan() {
  const r = bilanRun(); if (!r) { bilanSheet(); return; }
  S = { mode: 'bilan', start: r.t, profile: r.profile, seed: r.seed, games: bilanGames(), idx: r.idx, scores: r.scores || {}, details: r.details || {}, skipped: r.skipped || [], levels: r.levels, chrono: r.chrono, moreTime: r.moreTime };
  bilanStep(null);
}
/* Écran entre deux jeux : score du jeu fini, avancée de la catégorie, jeu suivant */
function bilanStep(g, score, detail, skipped) {
  Clock.reset(); window.scrollTo(0, 0);
  let prev = null, rec = false;
  if (g && !skipped) { prev = store.get(recKey(g.id, S.level), null); rec = prev == null || score > prev; if (rec) store.set(recKey(g.id, S.level), score); checkCollectionBadges(); }
  if (S.idx >= S.games.length) return bilanFinal();
  const nx = S.games[S.idx], N = S.games.length;
  syncLevel();
  const ax = g && g.axis, k = ax ? AXES[ax].games.filter(id => S.games.findIndex(x => x.id === id) < S.idx).length : 0;
  const dots = `<div class="prog bil-prog" role="img" aria-label="${S.idx} jeux faits sur ${N}">${S.games.map((x, i) => `<i class="${i < S.idx ? 'd' : i === S.idx ? 'c' : ''}"></i>`).join('')}</div>`;
  const n = g ? starsOf(score) : 0, known = store.get(tutoKey(nx), false);
  app.innerHTML = `<div class="screen play result bil-step">${scene(nx.id)}
    <div class="topbar"><button class="iconbtn" id="x" aria-label="Pause du bilan">✕</button><span class="plaque small" style="margin-left:auto">Grand bilan · ${S.idx}/${N}</span></div>
    <div class="card">
      ${g ? `<p class="bs-cat">${AXES[ax].icon} ${AXES[ax].name} : <b>${k}/3</b></p>
        <h2>${g.icon} ${g.name}</h2>
        ${skipped ? '<p class="muted">Jeu passé : il compte 0 et ce bilan sera marqué « incomplet ».</p>' : `${starsHTML(n)}<div class="bigscore bs-score" id="bs">0<small> / 100</small></div><p class="muted small" style="margin:2px 0 0">${esc(detail || '')}</p>${rec && prev != null ? `<div class="recband">🏆 Nouveau record ! (avant : ${prev})</div>` : ''}`}`
      : `<div class="coach bs-hi">${MECHE.replace('data-mood="neutral"', 'data-mood="happy"')}<div class="bubble">${S.idx ? `On reprend où tu t’étais arrêté : ${S.idx} jeu${S.idx > 1 ? 'x' : ''} sur ${N} déjà faits.` : 'C’est parti pour 18 jeux, 3 par catégorie. Je t’explique chaque jeu la première fois.'}</div></div>`}
      ${dots}
    </div>
    <div class="card bs-next" style="--c:${nx.color}">
      <p class="bs-lab">Jeu suivant · ${S.idx + 1}/${N}</p>
      <div class="bs-row"><span class="gr-ic" style="--c:${nx.color}">${nx.icon}</span><span class="gr-tx"><b>${nx.name}</b><small>${WHAT[nx.id]}</small></span></div>
      <div class="chips" style="margin-top:10px;justify-content:flex-start">${catPill(nx.cat, nx.axis)}<span class="pill">${gauge(LEVELS[S.level].g)} ${LEVELS[S.level].name}</span></div>
      ${known ? '<p class="small muted" style="margin:8px 0 0">Tu connais déjà ce jeu : on passe directement à la partie.</p>' : ''}
    </div>
    <div class="spacer"></div>
    <button class="btn go" id="cont" style="margin-top:16px">Continuer</button>
    <button class="btn secondary" id="pause">Pause</button></div>`;
  if (g && !skipped) { countUp($('#bs'), score, '<small> / 100</small>'); if (rec && prev != null) { SFX('record'); confetti(30); } else SFX('end'); }
  const pause = () => { const i = S.idx; saveRun(); home(); toast('⏸', 'Bilan en pause', `Reprends-le depuis l’accueil (${i}/${N}).`); };
  on('#x', 'click', pause); on('#pause', 'click', pause);
  on('#cont', 'click', () => { SFX('tap'); if (store.get(tutoKey(nx), false)) play(nx, false); else intro(); });
}
/* Score de chaque catégorie, niveaux qui évoluent, sauvegarde du bilan */
function bilanFinal() {
  Clock.reset();
  const axes = Object.fromEntries(AX_ORDER.map(a => [a, axisAvg(S.scores, a)]));
  const global = Math.round(AX_ORDER.reduce((s, a) => s + axes[a], 0) / AX_ORDER.length);
  const incomplete = (S.skipped || []).length > 0;
  const before = myBilans(), prevB = before[before.length - 1] || null;
  const changes = [];
  if (!incomplete && settings.autoLevel) {
    const p = PROFILES[S.profile] || prof();
    initLevels();
    AX_ORDER.forEach(a => {
      const cur = S.levels[a], i = LV_ORDER.indexOf(cur);
      let nl = cur;
      /* Il faut 2 bilans d'affilée au-dessus de 78 (ou sous 42) pour changer de niveau : moins de yo-yo */
      const pv = prevB && !prevB.incomplete && prevB.levels[a] === cur ? prevB.axes[a] : null;
      if (axes[a] >= 78 && pv != null && pv >= 78) nl = clampLevel(LV_ORDER[Math.min(2, i + 1)], p);
      else if (axes[a] < 42 && pv != null && pv < 42) nl = clampLevel(LV_ORDER[Math.max(0, i - 1)], p);
      settings.levels[a] = nl;
      if (nl !== cur) changes.push({ a, from: cur, to: nl, up: LV_ORDER.indexOf(nl) > i });
    });
    saveSettings();
  }
  const b = { d: today(), t: Date.now(), profile: S.profile, chrono: !!S.chrono, moreTime: !!S.moreTime, levels: { ...S.levels }, axes, games: { ...S.scores }, global };
  if (incomplete) { b.incomplete = true; b.skipped = S.skipped.slice(); }
  const all = store.get('bilans', []); all.push(b); store.set('bilans', all.slice(-200));
  store.set('bilanRun', null);
  award('bilan1'); if (myBilans().length >= 10) award('bilan10');
  bilanBoard(b, prevB, changes, all.length);
}
function radarSVG(b, prev) {
  const W = 380, H = 286, cx = 190, cy = 146, R = 92;
  const pt = (i, v) => { const an = -Math.PI / 2 + i * Math.PI / 3; return [cx + Math.cos(an) * R * v / 100, cy + Math.sin(an) * R * v / 100]; };
  const poly = vals => vals.map((v, i) => pt(i, Math.max(4, v)).map(n => n.toFixed(1)).join(',')).join(' ');
  const rings = [25, 50, 75, 100].map(v => `<polygon points="${poly(AX_ORDER.map(() => v))}" fill="none" stroke="var(--chart-grid)" stroke-width="${v === 100 ? 2 : 1.2}"/>`).join('');
  const spokes = AX_ORDER.map((_, i) => { const [x, y] = pt(i, 100); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--chart-grid)" stroke-width="1.2"/>`; }).join('');
  const labels = AX_ORDER.map((a, i) => { const [x, y] = pt(i, 122), anc = Math.abs(x - cx) < 4 ? 'middle' : x > cx ? 'start' : 'end', dy = y < cy - 60 ? -14 : y > cy + 60 ? 12 : -2;
    return `<text x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${anc}" font-size="16" font-weight="800" fill="var(--txt)">${AXES[a].icon} ${b.axes[a]}<tspan x="${x.toFixed(1)}" dy="15" font-size="12" font-weight="700" fill="var(--chart-txt)">${AXES[a].short}</tspan></text>`; }).join('');
  const cur = AX_ORDER.map(a => b.axes[a]);
  const lab = `Radar de tes 6 catégories : ${AX_ORDER.map(a => `${AXES[a].name} ${b.axes[a]} sur 100`).join(', ')}${prev ? '. En pointillés : le bilan précédent' : ''}.`;
  return `<svg class="radar" viewBox="0 0 ${W} ${H}" role="img" aria-label="${lab}">${rings}${spokes}
    ${prev ? `<polygon points="${poly(AX_ORDER.map(a => prev.axes[a]))}" fill="none" stroke="var(--chart-b)" stroke-width="2.5" stroke-dasharray="6 5" stroke-linejoin="round"/>` : ''}
    <polygon points="${poly(cur)}" fill="var(--chart-a)" fill-opacity=".22" stroke="var(--chart-a)" stroke-width="3" stroke-linejoin="round"/>
    ${cur.map((v, i) => { const [x, y] = pt(i, Math.max(4, v)); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="var(--chart-a)"/>`; }).join('')}${labels}</svg>`;
}
const delta = (v, p) => { if (p == null) return ''; const d = v - p; return `<span class="dl ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d > 0 ? '↗ +' + d : d < 0 ? '↘ ' + d : '→ 0'}</span>`; };
function barsHTML(b, prev) {
  return `<div class="axbars">${AX_ORDER.map(a => `<div class="axrow"><span class="ax-n">${AXES[a].icon} ${AXES[a].name}<small>niveau de jeu : ${LEVELS[b.levels[a]].name}</small></span>
    <span class="ax-t" aria-hidden="true"><i style="width:${b.axes[a]}%"></i></span><span class="ax-v"><b>${b.axes[a]}</b>${delta(b.axes[a], prev && prev.axes[a])}</span></div>`).join('')}</div>`;
}
function strongWeak(b) {
  const s = AX_ORDER.slice().sort((x, y) => b.axes[y] - b.axes[x]), hi = s[0], lo = s[5];
  return `<div class="sw-lines"><p>💪 <b>Point fort :</b> ${AXES[hi].icon} ${AXES[hi].name} (${b.axes[hi]})</p><p>🎯 <b>À travailler :</b> ${AXES[lo].icon} ${AXES[lo].name} (${b.axes[lo]})</p></div>`;
}
function mecheSays(b) {
  const s = AX_ORDER.slice().sort((x, y) => b.axes[y] - b.axes[x]), hi = s[0], lo = s[5], A = AXES;
  const pick = arr => arr[b.t % arr.length];
  if (b.axes[hi] - b.axes[lo] < 8) return pick([`Tout est bien équilibré : aucune catégorie ne traîne derrière. Prochaine étape, faire monter l’ensemble !`, `Joli équilibre : tes six catégories sont dans un mouchoir de poche.`]);
  const tip = `Les jeux ${A[lo].games.map(id => `« ${GAMES.find(g => g.id === id).short} »`).join(', ')} t’attendent dans la liste pour t’entraîner.`;
  return pick([
    `Ton point fort, c’est ${A[hi].name.toLowerCase()} (${b.axes[hi]}). Ce qui peut encore grimper : ${A[lo].name.toLowerCase()} (${b.axes[lo]}). ${tip}`,
    `Bravo pour ${A[hi].name.toLowerCase()}, c’est là que tu brilles avec ${b.axes[hi]}. À travailler : ${A[lo].name.toLowerCase()}, à ${b.axes[lo]}. ${tip}`,
    `${A[hi].icon} ${A[hi].name} en tête avec ${b.axes[hi]} ! Côté ${A[lo].name.toLowerCase()} (${b.axes[lo]}), il y a de la marge. ${tip}`
  ]);
}
const sameLevels = (a, b) => AX_ORDER.every(x => a.levels[x] === b.levels[x]);
function bilanShareText(b) {
  const L = a => `${AXES[a].icon} ${b.axes[a]}`;
  return `MindSprint · Mon grand bilan du ${fmtD(b.d)} · ${b.global}/100\n${['calc', 'logic', 'reason'].map(L).join(' · ')}\n${['observe', 'memory', 'speed'].map(L).join(' · ')}\n${SHARE_URL}`;
}
function detailHTML(b) {
  return `<details class="rev bl-det"><summary>Détail des 18 jeux</summary>${AX_ORDER.map(a => `<p class="bd-h">${AXES[a].icon} ${AXES[a].name} · ${b.axes[a]}</p><div class="rlist">${AXES[a].games.map(id => { const g = GAMES.find(x => x.id === id), sk = (b.skipped || []).includes(id); return `<div class="ritem"><span class="mini" style="--c:${g.color};background:${g.color}">${g.icon}</span><span>${g.name}${sk ? '<br><span class="small muted">passé</span>' : ''}</span><span class="v">${b.games[id] ?? 0}</span></div>`; }).join('')}</div>`).join('')}</details>`;
}
function bilanBoard(b, prev, changes, totalCount) {
  Clock.reset(); window.scrollTo(0, 0);
  const md = medalOf(b.global), cmpWarn = prev && (!sameLevels(prev, b) || prev.chrono !== b.chrono);
  app.innerHTML = `<div class="screen play result bil-board">${scene('constellation')}
    <div class="card">${md ? medalSVG(md) : MECHE}
      <p class="muted" style="margin:0">Grand bilan · ${fmtD(b.d)} · ${b.chrono ? '⏱ chrono' : '🌿 sans chrono'}${b.incomplete ? ' · <span class="pastille warn">incomplet</span>' : ''}</p>
      <div class="bigscore" id="tot">0<small> / 100</small></div>
      <p style="font-weight:800;margin:0">${md ? MEDALS[md][2] : 'Pas encore de médaille'}${prev ? ` · ${delta(b.global, prev.global)} <span class="small muted">vs ${fmtD(prev.d)}</span>` : ''}</p>
      ${starsHTML(starsOf(b.global))}
    </div>
    <div class="card panel dash">
      <h3>Ton tableau de bord</h3>
      ${radarSVG(b, prev)}
      ${prev ? `<p class="small muted leg"><span class="lg a"></span>ce bilan <span class="lg b"></span>bilan du ${fmtD(prev.d)}</p>` : ''}
      ${barsHTML(b, prev)}
      ${cmpWarn ? '<p class="small muted">Le bilan d’avant a été fait à un autre niveau ou avec un autre réglage de chrono : la comparaison est indicative.</p>' : ''}
      <div class="coach bs-hi">${MECHE.replace('data-mood="neutral"', 'data-mood="happy"')}<div class="bubble">${mecheSays(b)}</div></div>${strongWeak(b)}
      ${changes.length ? `<div class="lvchg"><b>Tes niveaux changent</b>${changes.map(c => `<p>${AXES[c.a].icon} ${AXES[c.a].name} : ${LEVELS[c.from].name} → <b>${LEVELS[c.to].name}</b> ${c.up ? '💪' : '🙂'}</p>`).join('')}</div>`
        : b.incomplete ? '<p class="small muted">Bilan incomplet : tes niveaux ne changent pas cette fois.</p>' : settings.autoLevel ? '<p class="small muted">Tes niveaux restent les mêmes pour le prochain bilan.</p>' : ''}
      ${detailHTML(b)}
    </div>
    ${totalCount % 5 === 0 ? `<div class="coach bk-remind">${MECHE}<div class="bubble">Pense à sauvegarder ta progression : un petit code à garder, au cas où tu changes de téléphone. <button class="btn ghost" id="bk">Sauvegarder maintenant</button></div></div>` : ''}
    <button class="btn accent share-btn" id="share" style="margin-top:16px">📤 Partager mon bilan</button>
    <button class="btn go" id="prog" style="margin-top:10px">Voir mes progrès</button>
    <button class="btn secondary" id="home">Retour à l’accueil</button></div>`;
  countUp($('#tot'), b.global, '<small> / 100</small>');
  SFX(prev && b.global > prev.global ? 'record' : 'end');
  if (md) setTimeout(() => confetti(md === 'or' ? 60 : 36), 500);
  on('#share', 'click', () => shareScore(bilanShareText(b)));
  on('#prog', 'click', progress); on('#home', 'click', home); on('#bk', 'click', backupSheet);
}

/* ---------- Sauvegarde / restauration (toutes les clés pige:) ---------- */
const b64enc = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const b64dec = s => { const bin = atob(s), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8; };
async function exportCode() {
  const data = {}; Object.keys(localStorage).filter(k => k.startsWith('pige:')).sort().forEach(k => { data[k] = localStorage.getItem(k); });
  let bytes = new TextEncoder().encode(JSON.stringify({ app: 'mindsprint', v: 1, date: new Date().toISOString(), data })), pre = 'MS0:';
  if (window.CompressionStream) { try { const st = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip')); bytes = new Uint8Array(await new Response(st).arrayBuffer()); pre = 'MS1:'; } catch (e) { } }
  return pre + b64enc(bytes);
}
async function readCode(code) {
  code = String(code || '').replace(/\s+/g, '');
  const pre = code.slice(0, 4); if (pre !== 'MS0:' && pre !== 'MS1:') throw new Error('Ce n’est pas un code de sauvegarde MindSprint.');
  let bytes = b64dec(code.slice(4));
  if (pre === 'MS1:') { if (!window.DecompressionStream) throw new Error('Ce navigateur ne sait pas lire ce code compressé.'); const st = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')); bytes = new Uint8Array(await new Response(st).arrayBuffer()); }
  const o = JSON.parse(new TextDecoder().decode(bytes));
  if (!o || o.app !== 'mindsprint' || !o.data || typeof o.data !== 'object') throw new Error('Code incomplet ou abîmé.');
  return o;
}
function applyBackup(o) {
  Object.keys(localStorage).filter(k => k.startsWith('pige:')).forEach(k => localStorage.removeItem(k));
  Object.entries(o.data).forEach(([k, v]) => { if (k.startsWith('pige:') && typeof v === 'string') localStorage.setItem(k, v); });
  location.reload();
}
async function backupSheet() {
  let code = '';
  try { code = await exportCode(); } catch (e) { toast('⚠️', 'Sauvegarde impossible', 'Réessaie dans un instant.'); return; }
  const n = myBilans().length, file = `mindsprint-sauvegarde-${today()}.txt`;
  sheet(`<h2>Sauvegarder ma progression</h2>
    <p class="small muted" style="margin:-4px 0 8px">Ce code contient tout : bilans, records, badges, réglages (${n} bilan${n > 1 ? 's' : ''}). Garde-le dans tes notes, un e-mail ou un fichier. Pour le retrouver : Réglages ⚙ → Restaurer.</p>
    <textarea class="share-ta bk-code" readonly rows="4" aria-label="Code de sauvegarde">${esc(code)}</textarea>
    <div class="bk-btns"><button class="btn secondary" id="bcopy">📋 Copier</button><button class="btn secondary" id="bdl">⬇️ Télécharger</button>${navigator.share ? '<button class="btn secondary" id="bsh">📤 Partager</button>' : ''}</div>
    <button class="btn" id="ok">Fermer</button>`, (root, close) => {
    on('#ok', 'click', close, root);
    on('#bcopy', 'click', async () => { let ok = false; try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(code); ok = true; } } catch (e) { } if (!ok) { const t = $('textarea', root); t.select(); try { ok = document.execCommand('copy'); } catch (e) { } } toast(ok ? '📋' : '✋', ok ? 'Code copié !' : 'Sélectionne le code et copie-le', ok ? 'Colle-le dans tes notes ou un message.' : ''); }, root);
    on('#bdl', 'click', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' })); a.download = file; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }, root);
    on('#bsh', 'click', async () => { try { const f = new File([code], file, { type: 'text/plain' }); if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: 'Sauvegarde MindSprint' }); else await navigator.share({ text: code, title: 'Sauvegarde MindSprint' }); } catch (e) { } }, root);
  });
}
function restoreSheet() {
  sheet(`<h2>Restaurer une sauvegarde</h2>
    <p class="small muted" style="margin:-4px 0 8px">Colle ton code de sauvegarde, ou choisis le fichier .txt.</p>
    <textarea class="share-ta" id="rcode" rows="4" placeholder="MS1:…" aria-label="Code de sauvegarde"></textarea>
    <label class="btn secondary bk-file">📄 Choisir le fichier<input type="file" id="rfile" accept=".txt,text/plain"></label>
    <p class="small bk-err" id="rerr" role="alert"></p>
    <div id="rconf"></div>
    <button class="btn go" id="rgo">Restaurer</button><button class="btn ghost" id="cancel">Annuler</button>`, (root, close) => {
    const err = m => { $('#rerr', root).textContent = m; };
    on('#cancel', 'click', close, root);
    on('#rfile', 'change', async e => { const f = e.target.files && e.target.files[0]; if (!f) return; try { $('#rcode', root).value = (await f.text()).trim(); err(''); } catch (x) { err('Fichier illisible.'); } }, root);
    on('#rgo', 'click', async () => {
      let o; try { o = await readCode($('#rcode', root).value); } catch (x) { err(x.message || 'Code illisible.'); return; }
      err('');
      let nb = 0; try { nb = JSON.parse(o.data['pige:bilans'] || '[]').length; } catch (x) { }
      $('#rconf', root).innerHTML = `<div class="bil-warn"><b>Remplacer toutes tes données actuelles ?</b><br><span class="small">Sauvegarde du ${o.date ? new Date(o.date).toLocaleDateString('fr-BE') : '?'} · ${nb} bilan${nb > 1 ? 's' : ''}. Ce qui est dans ce téléphone sera remplacé.</span></div><button class="btn accent" id="ryes" style="margin-top:10px">Oui, restaurer</button>`;
      $('#rgo', root).hidden = true;
      on('#ryes', 'click', () => applyBackup(o), root);
    }, root);
  });
}
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then(p => { if (!p) navigator.storage.persist().catch(() => { }); }).catch(() => { }); } catch (e) { }

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
  const list = GAMES.filter(g => g.cat === 'speed' && !g.noTurbo);
  app.innerHTML = `<div class="screen play">${scene('bateaux')}
    <div class="topbar"><button class="iconbtn" id="back" aria-label="Retour">←</button><span class="plaque" style="margin-left:4px">Mode turbo 🚀</span></div>
    <div class="coach">${MECHE}<div class="bubble">En turbo, tout accélère au fil de l’épreuve. Jusqu’où tiendras-tu ?</div></div>
    <div class="ggrid">${list.map(g => { const t = store.get('turbo:' + g.id, null); return `<button class="gtok" data-id="${g.id}" style="--c:${g.color};background:${g.color};color:${g.fg}"><span class="ic">${g.icon}</span><span class="nm">${g.name}</span><span class="stars">${t == null ? '—' : '🚀 ' + t}</span></button>`; }).join('')}</div></div>`;
  on('#back', 'click', home);
  $$('.gtok').forEach(b => b.addEventListener('click', () => { S = { mode: 'turbo', level: settings.level, seed: newSeed(), games: [GAMES.find(x => x.id === b.dataset.id)], idx: 0, scores: {}, details: {} }; intro(); }));
}
/* ---------- Mes progrès : uniquement les grands bilans terminés, même profil ---------- */
function flagsOf(b, ref) {
  const f = [];
  if (b.incomplete) f.push(['warn', 'incomplet']);
  if (!b.chrono) f.push(['', 'sans chrono']);
  if (ref && b !== ref && !sameLevels(b, ref)) f.push(['', 'autre niveau']);
  return f;
}
const pastilles = f => f.map(([c, t]) => `<span class="pastille ${c}">${t}</span>`).join('');
function progress() {
  window.scrollTo(0, 0); Clock.reset();
  const mine = myBilans(), st = streakNow(), badges = store.get('badges', {}), gh = store.get('gh', {}), run = bilanRun();
  const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;
  const last = mine[mine.length - 1], prev = mine[mine.length - 2] || null;
  let top;
  if (!last) {
    top = `<div class="card panel empty-prog">${MECHE.replace('data-mood="neutral"', 'data-mood="happy"')}
      <h3>Fais ton premier bilan…</h3>
      <p>…et ton tableau de bord apparaîtra ici : un score pour le calcul mental, la logique, le raisonnement, l’observation, la mémoire et la rapidité. Refais-le dans quelques jours pour voir tes progrès, catégorie par catégorie.</p>
      <button class="btn go" id="gob">${run ? `Reprendre mon bilan (${run.idx}/18)` : 'Faire mon premier bilan'}</button></div>`;
  } else {
    const W = mine.slice(-20), flags = W.map(b => flagsOf(b, last).length > 0);
    const weeks = {}; mine.forEach(b => { const k = weekKey(new Date(b.d + 'T12:00')); (weeks[k] = weeks[k] || []).push(b); });
    const wk = Object.keys(weeks).sort().slice(-8);
    const wrows = wk.map((k, i) => { const v = avg(weeks[k].map(b => b.global)), pv = i ? avg(weeks[wk[i - 1]].map(b => b.global)) : null;
      const end = new Date(k + 'T12:00'); end.setDate(end.getDate() + 6);
      return `<tr><td>${fmtD(k)} → ${fmtD(today(end))}</td><td>${weeks[k].length}</td><td><b>${v}</b></td><td>${pv == null ? '—' : delta(v, pv)}</td></tr>`; }).reverse().join('');
    const best = Math.max(...mine.map(b => b.global));
    top = `<div class="card panel dash">
      <h3>Ton dernier bilan · ${fmtD(last.d)}</h3>
      <div class="dash-top"><div class="bigscore">${last.global}<small> / 100</small></div><div>${prev ? delta(last.global, prev.global) + `<br><span class="small muted">vs ${fmtD(prev.d)}</span>` : '<span class="small muted">Premier bilan</span>'}<br>${pastilles(flagsOf(last, last))}</div></div>
      ${radarSVG(last, prev)}
      ${prev ? `<p class="small muted leg"><span class="lg a"></span>dernier bilan <span class="lg b"></span>bilan du ${fmtD(prev.d)}</p>` : ''}
      ${barsHTML(last, prev)}
      ${run ? `<button class="btn secondary" id="gob" style="margin-top:12px">Reprendre mon bilan (${run.idx}/18)</button>` : `<button class="btn go" id="gob" style="margin-top:12px">Refaire un bilan</button>`}
    </div>
    <div class="card panel">
      <h3>Mon évolution</h3>
      <div class="statgrid"><div><b>${mine.length}</b><span>Bilan${mine.length > 1 ? 's' : ''}</span></div><div><b>${best}</b><span>Meilleur score</span></div><div><b>🔥 ${st.n}</b><span>Série du défi (record ${st.best || 0})</span></div></div>
      ${W.length >= 2 ? `<div class="chart">${chart(W.map(b => b.global), { labels: W.map(b => fmtD(b.d)), flags })}</div>` : '<p class="small muted">La courbe apparaîtra dès ton 2<sup>e</sup> bilan.</p>'}
      ${W.length >= 2 ? `<div class="ax6">${AX_ORDER.map(a => { const v = W.map(b => b.axes[a]); return `<div class="ax6-c"><span class="ax6-h">${AXES[a].icon} ${AXES[a].short}</span><span class="ax6-v"><b>${v[v.length - 1]}</b>${delta(v[v.length - 1], v[0])}</span>${sparkline(v, 140, 44, Math.max(0, Math.min(...v) - 10), Math.min(100, Math.max(...v) + 10)).replace('aria-label="Évolution des derniers scores"', `aria-label="${AXES[a].name} : ${v.join(', ')}"`)}</div>`; }).join('')}</div><p class="small muted">Flèches : écart entre le premier et le dernier bilan de la courbe.</p>` : ''}
      <h3 style="margin-top:14px">Tes derniers bilans</h3>
      <div class="rlist">${mine.slice(-8).reverse().map(b => `<div class="ritem bl-it"><span>${fmtD(b.d)}<br><span class="small muted">${AX_ORDER.map(a => AXES[a].icon + b.axes[a]).join(' ')}</span>${flagsOf(b, last).length ? '<br>' + pastilles(flagsOf(b, last)) : ''}</span><span class="v">${b.global}</span></div>`).join('')}</div>
      <p class="small muted">Pastilles : bilan fait sans chrono, à un autre niveau que ton dernier bilan, ou incomplet. Leurs scores sont moins comparables.</p>
      <h3 style="margin-top:14px">Semaine par semaine</h3>
      <table class="wk"><thead><tr><th>Semaine</th><th>Bilans</th><th>Moyenne</th><th>Évolution</th></tr></thead><tbody>${wrows}</tbody></table>
    </div>`;
  }
  app.innerHTML = `<div class="screen play">${scene('phares')}
    <div class="topbar"><button class="iconbtn" id="back" aria-label="Retour">←</button><span class="plaque" style="margin-left:4px">Mes progrès · ${prof().icon} ${prof().name}</span></div>
    ${top}
    <div class="card panel"><h3>Tes records par jeu</h3><p class="small muted" style="margin:-4px 0 8px">Tous modes confondus (sauf famille et turbo).</p><div class="rlist">${GAMES.map(g => { const a = gh[g.id] || [], b = bestOf(g.id); return `<div class="ritem"><span class="mini" style="--c:${g.color};background:${g.color}">${g.icon}</span><span>${g.name}<br><span class="small muted">${a.length ? `${a.length} partie${a.length > 1 ? 's' : ''} · moyenne récente ${avg(a.slice(-5))}` : 'pas encore jouée'}</span></span><span class="v">${b >= 0 ? b : ''}</span></div>`; }).join('')}</div></div>
    <div class="card panel"><h3>Badges</h3><div class="badges">${BADGES.map(b => `<div class="badge ${badges[b[0]] ? 'got' : ''}"><span>${b[1]}</span><b>${b[2]}</b><small>${badges[b[0]] ? 'Obtenu' : b[3]}</small></div>`).join('')}</div></div>
  </div>`;
  on('#back', 'click', home);
  on('#gob', 'click', () => { if (bilanRun()) resumeBilan(); else bilanSheet(); });
}
function chart(vals, o = {}) {
  const w = 320, h = 172, n = vals.length, x = i => 30 + i * (w - 44) / Math.max(1, n - 1), y = v => h - 34 - v * (h - 50) / 100;
  const grid = [0, 25, 50, 75, 100].map(v => `<line x1="26" x2="${w - 8}" y1="${y(v)}" y2="${y(v)}" stroke="var(--chart-grid)" stroke-dasharray="2 6" stroke-linecap="round"/><text x="2" y="${y(v) + 4}" font-size="11" font-weight="700" fill="var(--chart-txt)">${v}</text>`).join('');
  const area = `M${x(0)},${y(0)} ` + vals.map((v, i) => `L${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ') + ` L${x(n - 1)},${y(0)} Z`;
  const lab = o.labels || [], step = Math.max(1, Math.ceil(n / 5));
  const xl = lab.map((t, i) => i === n - 1 || (i % step === 0 && n - 1 - i >= Math.ceil(step / 2)) ? `<text x="${x(i).toFixed(1)}" y="${h - 14}" font-size="11" font-weight="700" text-anchor="middle" fill="var(--chart-txt)">${t}</text>` : '').join('');
  const fl = o.flags || [];
  const desc = `Score global de tes bilans : ${vals.map((v, i) => `${lab[i] || ''} ${v}`).join(', ')}`;
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${desc}">${grid}<path d="${area}" fill="var(--chart-a)" opacity=".14"/><polyline points="${vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--chart-a)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${vals.map((v, i) => fl[i] ? `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="5" fill="var(--bg)" stroke="var(--chart-end)" stroke-width="3"/>` : `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="4" fill="var(--chart-a)"/>`).join('')}${xl}${fl.some(Boolean) ? `<text x="${w - 8}" y="${h - 1}" font-size="11" font-weight="700" text-anchor="end" fill="var(--chart-txt)">○ bilan avec pastille</text>` : ''}</svg>`;
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
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => { }); });
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded && navigator.serviceWorker.controller) { reloaded = true; location.reload(); } });
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

/* ---------- Bouton « retour » du téléphone : pause en jeu, sinon retour à l'accueil ---------- */
(function backButton() {
  try { history.replaceState('home', ''); } catch (e) { return; }
  document.addEventListener('click', () => setTimeout(() => { if (!document.querySelector('.home.h2') && history.state !== 'in') history.pushState('in', ''); }, 0), true);
  window.addEventListener('popstate', () => {
    const sr = document.querySelector('#sheet-root .scrim, #sheet-root .sheet');
    if (document.querySelector('#stage') && typeof CUR !== 'undefined' && CUR && !CUR.over) { if (!sr) confirmLeave(true); history.pushState('in', ''); return; }
    if (!document.querySelector('.home.h2')) home();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.querySelector('#stage') && !document.querySelector('#sheet-root .sheet') && typeof CUR !== 'undefined' && CUR && !CUR.over) confirmLeave(true); });
})();
