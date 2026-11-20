'use strict';
/* =========================================================
   MindSprint — banque de questions du jeu « Les énigmes du phare »
   ---------------------------------------------------------
   Questions de logique et d'observation : la réponse est sous les yeux,
   aucune culture générale n'est nécessaire. Toutes les questions sont
   écrites pour MindSprint (aucune reprise d'une émission ou d'un livre).

   AJOUTER UNE QUESTION
   1. Copie une ligne du bon niveau et change l'identifiant (id) : il doit
      être unique (F19, N19, E20…). Le jeu s'en sert pour ne pas reposer
      une question déjà vue.
   2. Champs :
        lv      'F' (Échauffement, lisible par un enfant de 8 ans),
                'N' (En forme) ou 'E' (Costaud, avec un vrai piège)
        type    'suite' | 'intrus' | 'deduction' | 'observation' |
                'calcul-astucieux' | 'mots'
        q       l'énoncé
        choices exactement 4 réponses, toutes différentes
                (l'ordre n'a pas d'importance : le jeu les mélange)
        a       l'index (0 à 3) de LA bonne réponse dans choices
        why     l'explication courte affichée après la réponse
   3. Vérifie qu'il n'y a qu'UNE réponse défendable : recalcule, relis le
      piège, demande-toi si une autre réponse pourrait se justifier.
   4. Garde au moins 15 questions par niveau (une partie en tire 6).
   5. Incrémente CACHE dans sw.js pour que les téléphones reçoivent la mise à jour.
   ========================================================= */

const QUESTIONS = [
  /* ---------- Échauffement (F) ---------- */
  { id: 'F01', lv: 'F', type: 'suite', q: 'Quel nombre continue la suite : 2, 4, 6, 8, … ?', choices: ['10', '9', '12', '16'], a: 0, why: 'On ajoute 2 à chaque fois : 8 + 2 = 10.' },
  { id: 'F02', lv: 'F', type: 'suite', q: 'Qu’est-ce qui vient ensuite : 🐟 🦀 🐟 🦀 🐟 … ?', choices: ['🦀', '🐟', '🐙', '🐚'], a: 0, why: 'Le poisson et le crabe passent chacun leur tour. Après un poisson vient un crabe.' },
  { id: 'F03', lv: 'F', type: 'mots', q: 'Lequel de ces mots n’a pas 5 lettres ?', choices: ['MOUETTE', 'PHARE', 'PLAGE', 'VAGUE'], a: 0, why: 'PHARE, PLAGE et VAGUE ont 5 lettres. MOUETTE en a 7.' },
  { id: 'F04', lv: 'F', type: 'deduction', q: 'Léa est plus grande que Tom. Tom est plus grand que Zoé. Qui est le plus petit des trois ?', choices: ['Zoé', 'Tom', 'Léa', 'On ne peut pas savoir'], a: 0, why: 'Léa dépasse Tom, et Tom dépasse Zoé : c’est Zoé la plus petite.' },
  { id: 'F05', lv: 'F', type: 'observation', q: 'Combien y a-t-il de voyelles dans le mot BATEAU ?', choices: ['4', '3', '2', '5'], a: 0, why: 'B-A-T-E-A-U : les voyelles sont A, E, A et U. Ça fait 4.' },
  { id: 'F06', lv: 'F', type: 'calcul-astucieux', q: 'Combien font 5 + 5 + 5 + 5 − 5 ?', choices: ['15', '20', '10', '25'], a: 0, why: 'Le « − 5 » efface un « + 5 » : il reste trois fois 5, donc 15.' },
  { id: 'F07', lv: 'F', type: 'mots', q: 'Quel mot se lit pareil dans les deux sens ?', choices: ['KAYAK', 'CANOT', 'BARQUE', 'RADEAU'], a: 0, why: 'K-A-Y-A-K se lit pareil de gauche à droite et de droite à gauche.' },
  { id: 'F08', lv: 'F', type: 'deduction', q: 'Une barque transporte 4 enfants. 2 enfants descendent, puis 1 enfant monte. Combien d’enfants y a-t-il dans la barque ?', choices: ['3', '5', '1', '2'], a: 0, why: '4 − 2 = 2, puis 2 + 1 = 3.' },
  { id: 'F09', lv: 'F', type: 'observation', q: 'Quelle est la 3e lettre du mot MARÉE ?', choices: ['R', 'A', 'É', 'M'], a: 0, why: 'M est la 1re, A la 2e, R la 3e.' },
  { id: 'F10', lv: 'F', type: 'suite', q: 'Quel nombre continue la suite : 1, 3, 5, 7, … ?', choices: ['9', '8', '10', '11'], a: 0, why: 'On ajoute 2 à chaque fois : 7 + 2 = 9.' },
  { id: 'F11', lv: 'F', type: 'suite', q: 'Quelle lettre continue la suite : A, B, C, D, E, … ?', choices: ['F', 'G', 'H', 'A'], a: 0, why: 'Ce sont les lettres de l’alphabet dans l’ordre : après E vient F.' },
  { id: 'F12', lv: 'F', type: 'intrus', q: 'Quel est l’intrus : ⚽ 🏀 🎾 📦 ?', choices: ['📦', '⚽', '🏀', '🎾'], a: 0, why: 'Le ballon de foot, le ballon de basket et la balle de tennis sont ronds. Le carton, lui, a des coins.' },
  { id: 'F13', lv: 'F', type: 'deduction', q: 'Le chat dort à gauche du chien. Le lapin dort à droite du chien. Qui dort au milieu ?', choices: ['Le chien', 'Le chat', 'Le lapin', 'Personne'], a: 0, why: 'De gauche à droite : le chat, le chien, le lapin. Le chien est au milieu.' },
  { id: 'F14', lv: 'F', type: 'calcul-astucieux', q: 'Combien font 10 + 10 + 10 − 30 + 7 ?', choices: ['7', '37', '30', '17'], a: 0, why: '10 + 10 + 10 = 30, et 30 − 30 = 0. Il ne reste que le 7.' },
  { id: 'F15', lv: 'F', type: 'mots', q: 'Lis « ELIOV » en partant de la fin. Quel mot obtiens-tu ?', choices: ['VOILE', 'OLIVE', 'LIVRE', 'VILLE'], a: 0, why: 'De droite à gauche : V-O-I-L-E. OLIVE a les mêmes lettres, mais pas dans cet ordre.' },
  { id: 'F16', lv: 'F', type: 'observation', q: 'Combien de fois vois-tu la lettre A dans : LA BARQUE A UNE RAME ?', choices: ['4', '3', '5', '2'], a: 0, why: 'Un A dans LA, un dans BARQUE, le mot A tout seul, et un dans RAME : 4.' },
  { id: 'F17', lv: 'F', type: 'deduction', q: 'Je suis un nombre entre 5 et 9. Je suis pair. Je ne suis pas 6. Qui suis-je ?', choices: ['8', '6', '7', '9'], a: 0, why: 'Entre 5 et 9 il y a 6, 7 et 8. Les pairs : 6 et 8. Ce n’est pas 6, donc c’est 8.' },
  { id: 'F18', lv: 'F', type: 'suite', q: 'Quel nombre continue la suite : 20, 18, 16, 14, … ?', choices: ['12', '10', '13', '15'], a: 0, why: 'On enlève 2 à chaque fois : 14 − 2 = 12.' },

  /* ---------- En forme (N) ---------- */
  { id: 'N01', lv: 'N', type: 'suite', q: 'Quel nombre continue la suite : 3, 6, 12, 24, … ?', choices: ['48', '36', '30', '42'], a: 0, why: 'Chaque nombre est le double du précédent : 24 × 2 = 48.' },
  { id: 'N02', lv: 'N', type: 'suite', q: 'Quel nombre continue la suite : 1, 4, 9, 16, … ?', choices: ['25', '20', '24', '32'], a: 0, why: 'Les écarts font +3, +5, +7, puis +9 : 16 + 9 = 25.' },
  { id: 'N03', lv: 'N', type: 'suite', q: 'Quel nombre continue la suite : 2, 3, 5, 8, 12, … ?', choices: ['17', '16', '18', '20'], a: 0, why: 'On ajoute 1, puis 2, puis 3, puis 4… donc maintenant 5 : 12 + 5 = 17.' },
  { id: 'N04', lv: 'N', type: 'intrus', q: 'Quel nombre est l’intrus : 12, 18, 25, 30 ?', choices: ['25', '12', '18', '30'], a: 0, why: '12, 18 et 30 sont pairs et dans la table de 6. Pas 25.' },
  { id: 'N05', lv: 'N', type: 'intrus', q: 'Trois de ces mots s’écrivent avec exactement les lettres de RAME. Lequel est l’intrus ?', choices: ['MÈRE', 'MARE', 'AMER', 'ARME'], a: 0, why: 'MARE, AMER et ARME utilisent R, A, M et E. MÈRE a deux E et pas de A.' },
  { id: 'N06', lv: 'N', type: 'deduction', q: 'Dans une file d’attente, Paul est 4e en partant de l’avant et 2e en partant de l’arrière. Combien de personnes y a-t-il dans la file ?', choices: ['5', '6', '4', '7'], a: 0, why: '3 personnes devant Paul, Paul lui-même, 1 personne derrière lui : 3 + 1 + 1 = 5.' },
  { id: 'N07', lv: 'N', type: 'deduction', q: 'Ana, Bea et Cléo ont un bonnet chacune : un rouge, un bleu et un vert. Ana n’a pas le rouge. Bea a le bleu. De quelle couleur est le bonnet de Cléo ?', choices: ['Rouge', 'Vert', 'Bleu', 'On ne peut pas savoir'], a: 0, why: 'Bea a le bleu. Ana n’a pas le rouge, donc elle a le vert. Il reste le rouge pour Cléo.' },
  { id: 'N08', lv: 'N', type: 'calcul-astucieux', q: 'Combien font 25 × 4 × 3 ?', choices: ['300', '250', '120', '400'], a: 0, why: 'Astuce : 25 × 4 = 100, puis 100 × 3 = 300.' },
  { id: 'N09', lv: 'N', type: 'calcul-astucieux', q: 'Combien font 1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 ?', choices: ['45', '50', '40', '55'], a: 0, why: 'Fais des paires qui font 10 : 1 + 9, 2 + 8, 3 + 7, 4 + 6. Quatre fois 10, plus le 5 tout seul : 45.' },
  { id: 'N10', lv: 'N', type: 'observation', q: 'Dans la phrase « le phare éclaire la mer la nuit », quel mot est écrit deux fois ?', choices: ['la', 'le', 'mer', 'nuit'], a: 0, why: 'le, phare, éclaire, la, mer, la, nuit : « la » revient deux fois.' },
  { id: 'N11', lv: 'N', type: 'observation', q: 'Combien de chiffres 1 faut-il pour écrire tous les nombres de 1 à 12 ?', choices: ['5', '4', '3', '6'], a: 0, why: '1, 10, 11 (deux fois), 12 : 1 + 1 + 2 + 1 = 5.' },
  { id: 'N12', lv: 'N', type: 'mots', q: 'Quel mot s’écrit avec les lettres de PORT, sans en ajouter ni en enlever ?', choices: ['TROP', 'PORTE', 'TORT', 'POTE'], a: 0, why: 'TROP utilise P, O, R et T une fois chacune. PORTE ajoute un E, TORT n’a pas de P, POTE n’a pas de R.' },
  { id: 'N13', lv: 'N', type: 'mots', q: 'Quelle lettre vient juste après la lettre qui est juste avant le M ?', choices: ['M', 'L', 'N', 'K'], a: 0, why: 'Juste avant M, il y a L. Et juste après L… on revient au M !' },
  { id: 'N14', lv: 'N', type: 'deduction', q: 'Tous les bateaux de ce port sont rouges. Mon bateau est dans ce port. Que peut-on dire à coup sûr ?', choices: ['Mon bateau est rouge.', 'Mon bateau n’est pas rouge.', 'Tous les bateaux rouges sont dans ce port.', 'On ne peut rien dire.'], a: 0, why: 'Mon bateau fait partie des bateaux du port, donc il est rouge. Mais d’autres bateaux rouges peuvent être ailleurs.' },
  { id: 'N15', lv: 'N', type: 'calcul-astucieux', q: 'Tom a 4 ans de plus que sa sœur. Dans 5 ans, combien d’années de plus qu’elle aura-t-il ?', choices: ['4', '9', '5', '1'], a: 0, why: 'Les deux vieillissent de 5 ans en même temps : l’écart reste de 4 ans.' },
  { id: 'N16', lv: 'N', type: 'suite', q: 'Quelle lettre continue la suite : Z, X, V, T, … ?', choices: ['R', 'S', 'Q', 'U'], a: 0, why: 'On recule dans l’alphabet en sautant une lettre : Z (y) X (w) V (u) T (s) R.' },
  { id: 'N17', lv: 'N', type: 'calcul-astucieux', q: 'Un phare lance un éclair toutes les 2 secondes. Combien de secondes passent entre le 1er et le 4e éclair ?', choices: ['6', '8', '4', '2'], a: 0, why: 'Entre le 1er et le 4e éclair, il y a 3 attentes de 2 secondes : 6 secondes.' },
  { id: 'N18', lv: 'N', type: 'observation', q: 'Combien y a-t-il de triangles pleins ici : ▲ △ ▲ ▲ △ ▲ △ ?', choices: ['4', '3', '7', '5'], a: 0, why: 'Les triangles pleins sont aux places 1, 3, 4 et 6 : il y en a 4. Les △ sont vides.' },

  /* ---------- Costaud (E) ---------- */
  { id: 'E01', lv: 'E', type: 'suite', q: 'Quel nombre continue la suite : 2, 2, 4, 6, 10, 16, … ?', choices: ['26', '24', '22', '32'], a: 0, why: 'Chaque nombre est la somme des deux précédents : 10 + 16 = 26.' },
  { id: 'E02', lv: 'E', type: 'suite', q: 'Quel nombre continue la suite : 1, 2, 6, 24, … ?', choices: ['120', '48', '96', '72'], a: 0, why: 'On multiplie par 2, puis par 3, puis par 4… donc par 5 : 24 × 5 = 120.' },
  { id: 'E03', lv: 'E', type: 'suite', q: 'Quel nombre continue la suite : 3, 5, 9, 17, … ?', choices: ['33', '31', '25', '34'], a: 0, why: 'Les écarts doublent : +2, +4, +8, puis +16 : 17 + 16 = 33.' },
  { id: 'E04', lv: 'E', type: 'suite', q: 'Quelle lettre continue la suite : U, D, T, Q, C, … ?', choices: ['S', 'H', 'X', 'N'], a: 0, why: 'Ce sont les initiales de Un, Deux, Trois, Quatre, Cinq… puis Six.' },
  { id: 'E05', lv: 'E', type: 'deduction', q: 'Dans une famille, chaque enfant a au moins un frère et au moins une sœur. Combien d’enfants y a-t-il, au minimum ?', choices: ['4', '3', '2', '5'], a: 0, why: 'Avec 3 enfants, l’un d’eux manque forcément de frère ou de sœur. Avec 2 garçons et 2 filles, chacun a les deux : 4.' },
  { id: 'E06', lv: 'E', type: 'deduction', q: 'Quatre enfants font une course. Jade n’est pas première. Hugo arrive juste après Jade. Inès arrive avant Jade. Malo arrive dernier. Qui gagne ?', choices: ['Inès', 'Jade', 'Hugo', 'Malo'], a: 0, why: 'Malo est 4e. Hugo suit Jade et Jade n’est pas 1re : Jade 2e, Hugo 3e. Inès gagne.' },
  { id: 'E07', lv: 'E', type: 'calcul-astucieux', q: 'Combien font 37 × 3 × 3 × 3 ?', choices: ['999', '1 011', '333', '9 999'], a: 0, why: '37 × 3 = 111, puis 111 × 3 = 333, puis 333 × 3 = 999.' },
  { id: 'E08', lv: 'E', type: 'calcul-astucieux', q: 'Combien font 1 − 2 + 3 − 4 + 5 − 6 + 7 − 8 + 9 − 10 ?', choices: ['−5', '5', '−1', '0'], a: 0, why: 'Regroupe par deux : (1 − 2), (3 − 4)… Chaque paire vaut −1, et il y a 5 paires : −5.' },
  { id: 'E09', lv: 'E', type: 'observation', q: 'Tu écris tous les nombres de 60 à 80. Combien de fois écris-tu le chiffre 7 ?', choices: ['12', '11', '10', '13'], a: 0, why: 'Une fois dans 67, dix fois au début de 70 à 79, et une deuxième fois dans 77 : 1 + 10 + 1 = 12.' },
  { id: 'E10', lv: 'E', type: 'mots', q: 'Quel mot contient les cinq voyelles A, E, I, O et U ?', choices: ['OISEAU', 'BATEAU', 'MOUETTE', 'POISSON'], a: 0, why: 'O-I-S-E-A-U contient O, I, E, A et U. Il manque des voyelles à tous les autres.' },
  { id: 'E11', lv: 'E', type: 'mots', q: 'Si BAR devient CBS (chaque lettre avance d’un rang dans l’alphabet), que devient MER ?', choices: ['NFS', 'NES', 'LDQ', 'NFR'], a: 0, why: 'M devient N, E devient F, R devient S : NFS.' },
  { id: 'E12', lv: 'E', type: 'deduction', q: 'Un sac contient des billes de 3 couleurs. Les yeux fermés, combien dois-tu en prendre, au minimum, pour être sûr d’en avoir 3 de la même couleur ?', choices: ['7', '6', '9', '3'], a: 0, why: 'Avec 6 billes, tu pourrais avoir 2 de chaque couleur. La 7e fait forcément une 3e bille d’une même couleur.' },
  { id: 'E13', lv: 'E', type: 'observation', q: 'Combien de lettres compte le mot ALPHABET ?', choices: ['8', '26', '6', '9'], a: 0, why: 'A-L-P-H-A-B-E-T : 8 lettres. Le piège, c’est 26, le nombre de lettres DE l’alphabet.' },
  { id: 'E14', lv: 'E', type: 'calcul-astucieux', q: 'On coupe une corde de 10 m en morceaux de 2 m. Combien de coups de ciseaux faut-il ?', choices: ['4', '5', '6', '10'], a: 0, why: 'Chaque coup ajoute un morceau. On veut 5 morceaux en partant d’une seule corde : 4 coups suffisent.' },
  { id: 'E15', lv: 'E', type: 'suite', q: 'Quel nombre continue la suite : 2, 6, 12, 20, 30, … ?', choices: ['42', '40', '36', '44'], a: 0, why: 'Les écarts font +4, +6, +8, +10, puis +12 : 30 + 12 = 42.' },
  { id: 'E16', lv: 'E', type: 'deduction', q: 'Quatre phares : A, B, C et D. A est plus haut que B. B est plus haut que D. C est moins haut que D. Lequel est le plus petit ?', choices: ['C', 'D', 'B', 'A'], a: 0, why: 'A dépasse B, B dépasse D, D dépasse C : C est le plus petit.' },
  { id: 'E17', lv: 'E', type: 'mots', q: 'Combien de ces mots se lisent pareil à l’envers : RADAR, SOLOS, ÉTÉ, NON, ANNA, PHARE ?', choices: ['5', '4', '6', '3'], a: 0, why: 'RADAR, SOLOS, ÉTÉ, NON et ANNA se lisent dans les deux sens. PHARE à l’envers donne ERAHP.' },
  { id: 'E18', lv: 'E', type: 'calcul-astucieux', q: 'Je pense à un nombre. Je le double, j’ajoute 6, je divise par 2, puis j’enlève le nombre de départ. Que reste-t-il ?', choices: ['3', '6', '0', 'Ça dépend du nombre'], a: 0, why: 'Doubler puis diviser par 2 s’annulent, et on retire le nombre de départ. Il reste la moitié de 6 : 3.' },
  { id: 'E19', lv: 'E', type: 'intrus', q: 'Quel nombre est l’intrus : 121, 343, 565, 789 ?', choices: ['789', '121', '343', '565'], a: 0, why: '121, 343 et 565 se lisent pareil dans les deux sens. Pas 789.' }
];
