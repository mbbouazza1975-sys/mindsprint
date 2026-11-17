# MindSprint — mettre l'app en ligne et l'installer

## Contenu du dossier
| Fichier | Rôle |
|---|---|
| `index.html` | La page de l'app |
| `styles.css` | Le design (couleurs, polices, mode sombre) |
| `games.js` | Les 12 épreuves |
| `app.js` | Les écrans, les modes solo, entraînement et famille, les records |
| `sw.js` | Le service worker, qui fait marcher l'app sans connexion |
| `manifest.webmanifest` + `icons/` | Ce qu'il faut pour l'installer sur l'écran d'accueil |

Pas de compilation, pas de dépendance : du HTML, du CSS et du JavaScript simples.

## Mettre en ligne (gratuit, environ 2 minutes)
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
- Les polices viennent de Google Fonts. Elles sont gardées en cache après la première visite.
- Le temps de réaction mesuré dépend un peu de l'écran du téléphone. Pour comparer les scores en famille, jouez sur le même appareil.
