# MindSprint — mettre l'app en ligne et l'installer

## Contenu du dossier
| Fichier | Rôle |
|---|---|
| `index.html` | La page de l'app |
| `styles.css`, `design.css`, `theme.css` | Le design : base, éléments de jeu, puis thème clair « Archipel illustré » et sombre « Lagon phosphorescent » (`theme.css` a le dernier mot) |
| `games.js` | Les 22 épreuves |
| `questions.js` | La banque de questions du jeu « Les énigmes du phare » (mode d'emploi pour en ajouter en tête du fichier) |
| `tutos.js` | Les consignes, exemples illustrés et essais guidés |
| `scenes.js` | Les décors, la mascotte Mèche, étoiles, médailles et sons |
| `app.js` | Les écrans : défi du jour, Jouer seul, parcours thématique, partage du score, joker de série, duel contre Mèche, turbo, famille, entraînement, Mes progrès, badges |
| `fonts/` | Les polices Outfit et Nunito (licence OFL jointe) |
| `sw.js` | Le service worker, qui fait marcher l'app sans connexion |
| `manifest.webmanifest` + `icons/` | Ce qu'il faut pour l'installer sur l'écran d'accueil |

Pas de compilation, pas de dépendance : du HTML, du CSS et du JavaScript simples.

## En ligne
L'app est publiée par GitHub Pages depuis la branche `main` du dépôt `mbbouazza1975-sys/mindsprint` : chaque envoi (push) met le site à jour en une ou deux minutes.

## Autre option : Netlify (gratuit, environ 2 minutes)
1. Décompresse le zip.
2. Connecte-toi à ton compte Netlify, puis ouvre https://app.netlify.com/drop
3. Glisse le **dossier `mindsprint`** (celui qui contient `index.html`) dans la zone de dépôt.
4. Netlify te donne une adresse en `….netlify.app`. Tu peux la renommer dans *Site configuration → Change site name*.

⚠️ Si tu déposes le dossier sans être connecté, le site est supprimé au bout d'environ une heure, sauf si tu le réclames.

**Mettre à jour :** dans le tableau de bord du site, onglet *Deploys*, glisse le nouveau dossier.

## Installer sur le téléphone
- **Android (Chrome)** : ouvre l'adresse, puis menu ⋮ → *Installer l'application*. Le bouton « Installer l'app » peut aussi apparaître sur l'accueil.
- **iPhone (Safari)** : bouton *Partager* → *Sur l'écran d'accueil*.

Après la première ouverture, l'app marche sans connexion.

## À savoir
- Les records et les prénoms sont gardés **uniquement dans le téléphone**, dans le navigateur. Rien n'est envoyé sur internet.
- Sur iPhone, les vibrations ne marchent pas : Safari ne les gère pas.
- Les polices sont incluses dans l'app : aucun appel à Google Fonts.
- Le temps de réaction mesuré dépend un peu de l'écran du téléphone. Pour comparer les scores en famille, jouez sur le même appareil.
