'use strict';
/* =========================================================
   MindSprint — consignes, exemples illustrés et essais guidés
   (textes : rédacteur-pédagogue du groupe d'étude)
   ========================================================= */

const exTile = (inner, label, ok) =>
  `<div class="ex-tile ${ok === true ? 'good' : ok === false ? 'bad' : ''}">${inner}<span class="ex-lab">${ok === true ? '✓ ' : ok === false ? '✗ ' : ''}${label}</span></div>`;
const lamp = cls => `<div class="ex-lamp ${cls}"></div>`;
const stoneEx = (v, ok) => `<span class="ex-stone ${ok ? 'good' : ''}">${v}</span>`;
const dots = (n, r, W = 90, H = 80, seed = 3) => {
  const rng = makeRng(seed + n); const pts = scatter(rng, n, W, H, r + 3, r * 2.3);
  return `<svg viewBox="0 0 ${W} ${H}" class="ex-dots">${pts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="#E8FF7A" stroke="#B7E000" stroke-width="1.5"/>`).join('')}</svg>`;
};
const miniShape = (s, k, extra = '') => `<span class="ex-shape ${extra}">${shapeSVG(s, COLORS[k].h)}</span>`;
const L_SHAPE = [[0, 0], [0, 1], [0, 2], [1, 2]];

const TUTOS = {
  lanterne: {
    but: 'Touche dès qu’elle s’allume',
    rules: {
      base: ['Attends : au début, la lanterne est éteinte.', 'Touche l’écran dès qu’elle brille en jaune.', 'Ne touche pas avant, sinon c’est « trop tôt ».'],
      N: ['Ignore les clignotements rapides : ce sont des pièges.'], E: ['Ignore les clignotements rapides : ce sont des pièges.']
    },
    ex: l => exTile(lamp('off'), 'Pas encore', null) + exTile(lamp('on'), 'Maintenant !', true) + (l !== 'F' ? exTile(lamp('flick'), 'Piège', false) : ''),
    legend: l => l === 'F' ? 'Tant qu’elle est éteinte, on attend. Dès qu’elle brille en jaune → touche !' : 'Un éclat très court, c’est un piège. Attends qu’elle reste bien allumée.',
    oops: 'Attends qu’elle soit bien jaune, puis touche tout de suite.',
    goal: 2
  },
  bateaux: {
    but: 'Bateaux oui, requins non !',
    rules: {
      base: ['Touche l’eau dès qu’un bateau ⛵ apparaît.', 'Ne touche rien quand c’est un requin 🦈.', 'Touche n’importe où dans l’eau, pas besoin de viser.'],
      E: ['Garde l’œil partout : les images changent de place.']
    },
    ex: () => exTile('<span class="ex-emo">⛵</span>', 'Touche l’eau', true) + exTile('<span class="ex-emo">🦈</span>', 'Laisse passer', false),
    legend: () => 'Un bateau → touche l’eau, même à côté. Un requin → ne touche rien, même si tu es lancé.',
    oops: 'C’était un requin : laisse-le passer sans toucher.',
    goal: 4
  },
  vent: {
    but: 'Suis la pointe de la flèche',
    rules: {
      base: ['Regarde vers où pointe la flèche.', 'Touche ce côté-là de l’écran.', 'Oublie l’endroit où la flèche est posée.'],
      E: ['Vois-tu la lune 🌙 ? Touche alors le côté où est la flèche.']
    },
    ex: l => `<div class="ex-halves"><div class="ex-half">${arrowSVG(1, '#00A6C8')}${l === 'E' ? '' : ''}</div><div class="ex-half good"><span class="ex-lab">✓ Touche ici</span></div></div>`
      + (l === 'E' ? `<div class="ex-halves"><div class="ex-half good">${arrowSVG(1, '#00A6C8')}<span class="ex-moon">🌙</span><span class="ex-lab">✓ Avec la lune : ici</span></div><div class="ex-half"></div></div>` : ''),
    legend: l => 'La flèche est à gauche mais elle pointe à droite → touche à DROITE.' + (l === 'E' ? ' Avec la lune, on touche le côté où se trouve la flèche.' : ''),
    oops: 'Suis la pointe de la flèche, pas sa place.',
    goal: 4
  },
  constellation: {
    but: 'Trouve l’étoile du modèle',
    rules: {
      base: ['Regarde le modèle sur la carte du haut.', 'Cherche la même forme ET la même couleur.', 'Touche-la vite, sans tapoter au hasard.'],
      N: ['Méfie-toi des sosies : bonne forme ou bonne couleur, pas les deux.'],
      E: ['Méfie-toi des sosies : bonne forme ou bonne couleur, pas les deux.', 'Une étoile penchée reste la même.']
    },
    ex: () => `<div class="ex-target">Trouve : ${miniShape(2, 1)} triangle orange</div><div class="ex-sky">${miniShape(2, 0, 'x')}${miniShape(2, 1, 'good')}${miniShape(3, 1, 'x')}${miniShape(0, 2)}</div>`,
    legend: () => 'Il faut les deux à la fois : triangle ET orange. Les autres n’ont au mieux qu’un seul point commun.',
    oops: 'Il faut la même forme ET la même couleur que le modèle.',
    goal: 3
  },
  gue: {
    but: 'Touche la pierre du bon résultat',
    rules: {
      base: ['Calcule l’opération écrite au-dessus de la rivière.', 'Touche la pierre qui porte le résultat.', 'Ne devine pas : une erreur casse ta série.'],
      N: ['Vois-tu un ? Trouve le nombre caché, pas le total.'],
      E: ['Fais × et ÷ avant + : 3 + 4 × 2 = 11.']
    },
    ex: l => l === 'E' ? `<div class="ex-op">3 + 4 × 2 = ?</div><div class="ex-stones">${stoneEx(11, 1)}${stoneEx(14)}${stoneEx(12)}</div>`
      : l === 'N' ? `<div class="ex-op">8 + ? = 13</div><div class="ex-stones">${stoneEx(5, 1)}${stoneEx(12)}${stoneEx(6)}</div>`
        : `<div class="ex-op">7 + 5 = ?</div><div class="ex-stones">${stoneEx(2)}${stoneEx(12, 1)}${stoneEx(13)}</div>`,
    legend: l => l === 'E' ? 'D’abord 4 × 2 = 8, puis 3 + 8 = 11. Le 14 est un piège.' : l === 'N' ? 'Le ? cache un nombre : 8 + 5 = 13, donc on touche 5.' : '7 + 5 = 12 → touche la pierre 12. Cinq bonnes réponses d’affilée donnent un bonus.',
    oops: 'Pas tout à fait : refais le calcul calmement.',
    goal: 3
  },
  lucioles: {
    but: 'Où y en avait-il le plus ?',
    rules: { base: ['Regarde bien : les lucioles se cachent très vite.', 'Touche le côté où il y en avait le plus.', 'Juge le nombre, pas la taille : les grosses trompent.'] },
    ex: () => `<div class="ex-banks"><div class="ex-bank">${dots(8, 7)}</div><div class="ex-bank good">${dots(12, 4)}<span class="ex-lab">✓ Plus nombreuses</span></div></div>`,
    legend: () => 'À gauche elles sont plus grosses, mais à droite il y en a plus → touche à DROITE. Pas le temps de compter : fais confiance à ton coup d’œil.',
    oops: 'Il y en avait plus de l’autre côté. Regarde le nombre, pas la taille.',
    goal: 3
  },
  phares: {
    but: 'Rallume les phares dans l’ordre',
    rules: {
      base: ['Regarde les phares s’allumer l’un après l’autre.', 'Attends « À toi ! », puis touche-les dans le même ordre.', 'Ne touche pas pendant la démonstration.'],
      E: ['Ignore les éclats rouges : ce sont de faux signaux.']
    },
    ex: l => `<div class="ex-map"><span class="ex-bc" style="left:14%;top:30%">1</span><span class="ex-bc" style="left:62%;top:18%">2</span><span class="ex-bc" style="left:44%;top:66%">3</span><span class="ex-bc off" style="left:82%;top:62%"></span><span class="ex-bc off" style="left:20%;top:74%"></span>${l === 'E' ? '<span class="ex-bc red" style="left:84%;top:22%">✗</span>' : ''}</div>`,
    legend: l => 'Ils se sont allumés dans l’ordre 1, 2, 3 → touche-les dans le même ordre. La série s’allonge à chaque réussite.' + (l === 'E' ? ' Le rouge est un faux signal.' : ''),
    oops: 'Raté : regarde bien l’ordre, la série recommence.',
    goal: 1
  },
  collier: {
    but: 'Trouve le coquillage qui suit',
    rules: {
      base: ['Compare les coquillages : qu’est-ce qui change à chaque fois ?', 'Touche celui qui continue la suite, à la place du ?.', 'Vérifie la forme, la couleur et les points.'],
      N: ['Deux choses peuvent changer en même temps.'], E: ['Les trois peuvent changer en même temps.']
    },
    ex: () => `<div class="ex-neck">${[1, 2, 3, 4].map(d => `<span class="ex-bead">${beadSVG({ shape: 0, color: 0, dots: d })}</span>`).join('')}<span class="ex-q">?</span></div><div class="ex-row">${['5', '4', '5o'].map((d, i) => `<span class="ex-bead big ${i === 0 ? 'good' : ''}">${beadSVG({ shape: 0, color: d === '5o' ? 1 : 0, dots: parseInt(d) })}</span>`).join('')}</div>`,
    legend: () => 'Un point de plus à chaque fois : après 4 vient 5. La forme et la couleur ne bougent pas.',
    oops: 'Regarde ce qui change d’un coquillage à l’autre : forme, couleur, points.',
    goal: 2
  },
  recif: {
    but: 'Le même récif, juste tourné',
    rules: {
      base: ['Observe bien la forme du récif modèle.', 'Touche le même récif, tourné dans un autre sens.', 'Repère un coin particulier et cherche-le partout.'],
      N: ['Écarte les récifs « miroir » : ils sont retournés, pas tournés.'], E: ['Écarte les récifs « miroir » : ils sont retournés, pas tournés.']
    },
    ex: l => `<div class="ex-reef"><span class="ex-model">${PX.svg(L_SHAPE, '#FF6F59', 3)}<em>Modèle</em></span><span class="ex-opt good">${PX.svg(PX.rotN(L_SHAPE, 1), '#FF9F80', 3)}<em>✓ Tourné</em></span>${l !== 'F' ? `<span class="ex-opt bad">${PX.svg(PX.mir(L_SHAPE), '#FF9F80', 3)}<em>✗ Miroir</em></span>` : `<span class="ex-opt bad">${PX.svg([[0, 0], [1, 0], [2, 0], [1, 1]], '#FF9F80', 3)}<em>✗ Autre forme</em></span>`}</div>`,
    legend: l => 'Si on fait tourner le modèle, il se pose exactement sur la bonne réponse.' + (l !== 'F' ? ' Le miroir ressemble, mais même en le tournant il ne colle jamais (comme ta main gauche et ta main droite).' : ''),
    oops: 'Fais tourner le modèle dans ta tête et compare case par case.',
    goal: 2
  },
  courants: {
    but: 'Où la barque va-t-elle accoster ?',
    rules: {
      base: ['Pars de la case où se trouve la barque ⛵.', 'Suis chaque flèche, case après case, avec les yeux.', 'Touche l’île 🏝️ où la barque sort de la grille.'],
      E: ['Sur un tourbillon 🌀, fais tourner la flèche d’un quart de tour ↻.']
    },
    ex: l => {
      const D = [[1, 3, 2], [1, 2, 0], [0, 1, 1]], path = { '0,0': 1, '1,0': 2, '1,1': 2, '1,2': 1, '2,2': 1 };
      let h = '<div class="ex-grid">';
      for (let y = -1; y <= 3; y++) for (let x = -1; x <= 3; x++) {
        const inner = x >= 0 && y >= 0 && x < 3 && y < 3, k = x + ',' + y;
        if (inner) { const wh = l === 'E' && k === '1,1'; h += `<span class="ex-c ${k in path ? 'p' : ''} ${k === '0,0' ? 's' : ''}">${arrowSVG(wh ? 1 : k in path ? path[k] : D[y][x], '#fff')}${k === '0,0' ? '<b>⛵</b>' : ''}${wh ? '<b class="wh">🌀</b>' : ''}</span>`; }
        else if (k === '3,2') h += '<span class="ex-i good">🏝️</span>';
        else if (k === '1,-1' || k === '-1,2') h += '<span class="ex-i">🏝️</span>';
        else h += '<span></span>';
      }
      return h + '</div>';
    },
    legend: l => 'La flèche sous la barque compte : → ↓ ↓ → → la barque sort à droite, en bas. Les flèches hors du chemin ne servent à rien.' + (l === 'E' ? ' Ici le tourbillon 🌀 fait tourner sa flèche d’un quart de tour : → devient ↓.' : ''),
    oops: 'Suis le chemin pas à pas depuis la barque, sans sauter de case.',
    goal: 1
  },
  cabines: {
    but: 'Range chaque animal à sa place',
    rules: {
      base: ['Lis tous les indices avant de placer un animal.', 'Touche un animal, puis la cabine où il va.', 'Tout est rangé ? Vérifie, puis touche « Valider ».'],
      N: ['Attention aux indices qui disent où l’animal n’est PAS.'], E: ['Attention aux indices qui disent où l’animal n’est PAS.']
    },
    ex: () => `<div class="ex-clue">Le 🐱 chat est dans la cabine tout à gauche.</div><div class="ex-clue">Le 🐶 chien est quelque part à gauche du 🐰 lapin.</div><div class="ex-cabs"><span>🐱<em>1</em></span><span>🐶<em>2</em></span><span>🐰<em>3</em></span></div>`,
    legend: () => 'Le chat va tout à gauche, en 1. Le chien doit être avant le lapin : chien en 2, lapin en 3. « Juste à côté » = collé ; « quelque part à gauche » = avant, collé ou pas. Pour changer d’avis, touche l’animal dans sa cabine.',
    oops: 'Un indice n’est pas respecté : relis-les un par un.',
    goal: 1
  },
  mouettes: {
    but: 'Devine la règle de tri secrète',
    rules: {
      base: ['Touche le panier où va la carte de la mouette.', 'Un ✓ ? Garde ta règle. Un ✗ ? Change de règle.', 'La règle secrète (couleur, forme ou nombre) change en cours de partie.'],
      F: ['Un message te prévient quand la règle change.'], N: ['Personne ne te prévient du changement : écoute les ✗.'], E: ['Personne ne te prévient du changement : lâche vite l’ancienne règle.']
    },
    ex: () => `<div class="ex-sort"><span class="ex-card">${shapeSVG(1, COLORS[0].h)}${shapeSVG(1, COLORS[0].h)}${shapeSVG(1, COLORS[0].h)}</span><div class="ex-baskets"><span>${shapeSVG(0, COLORS[0].h)}<em>si COULEUR</em></span><span>${shapeSVG(1, COLORS[1].h)}${shapeSVG(1, COLORS[1].h)}<em>si FORME</em></span><span>${shapeSVG(2, COLORS[2].h)}${shapeSVG(2, COLORS[2].h)}${shapeSVG(2, COLORS[2].h)}<em>si NOMBRE</em></span></div></div>`,
    legend: () => 'Trois carrés bleus : bleu comme le panier 1, carré comme le 2, trois comme le 3. Seuls ✓ et ✗ te disent quelle règle est la bonne.',
    oops: '✗ : ta règle ne marche pas. Essaie de trier autrement (couleur, forme ou nombre).',
    goal: 4
  }
};

function tutoRules(id, lvl) {
  const T = TUTOS[id], r = T.rules;
  return [...r.base, ...(r[lvl] || [])];
}
