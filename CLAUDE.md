# CLAUDE.md — Fr-business.net

Guide de travail pour Claude sur ce dépôt. Ce fichier **complète** l'existant : il
décrit l'état actuel du projet et les règles à suivre pour toute intervention. Il ne
demande **aucune** refonte du site — on enrichit, on ne casse rien.

---

## Règles d'intervention (impératives)

### Règle n°1 — TOUJOURS travailler sur `main`

Toute session — développement, rédaction, amélioration, correction — se fait
**directement sur la branche `main`** et se pousse sur `main`. **Ne jamais créer de
branche**, ne jamais travailler sur une branche secondaire, ne jamais ouvrir de pull
request (sauf demande explicite du propriétaire).

`main` est la branche de **production Cloudflare Pages** : chaque push déclenche un
déploiement. Les commits doivent donc rester propres et le build doit passer
(`npm run build`) avant de pousser.

### Règle n°2 — Toujours en qualité optimale

Se placer systématiquement sur le **réglage le plus intelligent / le plus performant**
du modèle pour chaque intervention (rédaction, code, analyse). Seule exception : la
**génération d'image OpenAI**, qui reste en `quality: "medium"` (voir §6).

### Règle n°3 — Clés API / tokens depuis l'environnement

Les clés et tokens nécessaires sont fournis par l'**environnement cloud** de Claude
Code, via les variables d'environnement (`process.env`) :

| Variable | Usage |
| --- | --- |
| `OPENAI_API_KEY` | Génération des photos (et, historiquement, du texte) |
| `OPENAI_IMAGE_MODEL` | Modèle image (défaut : `gpt-image-2`) |
| `OPENAI_TEXT_MODEL` | Modèle texte du pipeline **legacy** (voir §0) |
| Clés Cloudflare (`CLOUDFLARE_*`) | Setup Pages / DNS via `scripts/cf-setup.mjs` |

Les récupérer **depuis l'environnement**. **Jamais** les redemander, **jamais** les
écrire en dur dans le code, un commit, un log ou ce fichier.

---

## Le projet en bref (état actuel)

- **Fr-business.net v2** — magazine francophone : business, finance, tech, immobilier,
  santé, art de vivre. Indépendant depuis 2016.
- **Stack** : **Astro 5**, génération **statique** → `dist/`, déployé sur **Cloudflare
  Pages** (branche de prod `main`, build `npm run build`, sortie `dist`).
- **Design** « Aurora Liquid » : blanc + accent aqua `#ADFFFF`. Polices auto-hébergées
  (Space Grotesk + Inter). JS vanilla léger (curseur, parallaxe, reveals).
- **Contenu** : un article = **un fichier JSON** dans `src/content/posts/{slug}.json`
  (~934 articles). Schéma validé dans `src/content.config.ts`.
- **Images** à la une optimisées en `webp` dans `public/media/{id}.webp`.

### URLs (SEO préservé — ne pas modifier)

| Type | URL |
| --- | --- |
| Article | `/infos/{slug}.html` |
| Accueil | `/` |
| Archives | `/articles` |
| À propos | `/a-propos` |
| Contact | `/contact` |
| Légales | `/notification-legale` |
| Sitemap | `/sitemap.xml` · Flux | `/rss.xml` |

Les slugs et images des articles historiques sont **conservés à l'identique**. Ne
jamais renommer un slug existant ni changer une URL.

### Commandes

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # -> dist/  (doit passer avant tout push)
npm run preview
```

---

## Règles de rédaction

> S'applique dès qu'on **crée** ou **enrichit** un article.

### 0. Règles d'or (prioritaires)

1. **Rédaction par Claude, pas par l'API.** Le contenu des articles est écrit **par
   Claude directement en session**, avec le réglage le plus performant du modèle.
   Le pipeline texte OpenAI (`scripts/gen-run.mjs`, `gen-lib.mjs`, `batch.mjs`,
   modèle `gpt-5.6-terra`) est **legacy** : il a servi à la migration initiale des 933
   articles WordPress et n'est **plus** la voie de rédaction. **Seules les images**
   passent désormais par OpenAI (§6).
2. **Anti-cannibalisation.** Si le sujet est libre, **vérifier d'abord l'existant**
   (`src/content/posts/`) : chaque nouvel article doit traiter un angle **différent**
   de ce qui est déjà publié (voir §3).
3. **Qualité avant tout.** Chaque article doit apporter la **meilleure information
   disponible** sur son sujet : profondeur réelle, détails utiles, et — selon la
   pertinence — éléments enrichis (tableau, comparatif, astuces, FAQ, chiffres
   prudents…). Ce sont des **exemples**, pas une checklist obligatoire (voir §4).
4. **Photo OpenAI obligatoire.** **Jamais** publier sans visuel : toujours une **vraie
   photo de couverture générée par OpenAI**, ultra-réaliste, avant publication (§6).
5. **Liens internes.** Ajouter **1 à 3 liens internes** (jusqu'à 4 si vraiment
   pertinent) vers d'autres pages du site (§5).

### 1. Le site en bref (ligne éditoriale)

Fr-business.net est un **magazine généraliste haut de gamme** qui aide le lecteur à
**décider mieux** — entreprendre, investir, comprendre la tech, mieux vivre. Univers
couverts : **business, finance/argent, tech, immobilier, santé/bien-être, art de vivre**
(voyage, maison, cuisine, mode, loisirs, éducation…). Le lecteur type cherche une
réponse **concrète, fiable et actionnable** à une question précise. La promesse :
« une longueur d'avance, sans perdre de temps ».

### 2. Identité & ton

- **Voix** : experte, claire, directe, orientée lecteur, agréable à lire. On parle en
  français impeccable, sans jargon inutile, sans anglicismes gratuits.
- **Posture** : utile avant tout, rigoureux, honnête. On aide à décider, on ne vend pas.
- **À proscrire** : le remplissage et les formules creuses (« dans cet article, nous
  allons voir… »), les superlatifs vides, le ton putaclic. On entre dans le vif du sujet.
- **Honnêteté factuelle** : ne **jamais** inventer de statistiques précises, d'études
  ou de citations. Pour un ordre de grandeur, rester prudent (« souvent », « en
  général », fourchettes réalistes). Rappeler le cadre français quand c'est pertinent
  (droit, fiscalité, assurance…), en restant général.
- **Auteur** : les articles sont signés au nom de l'organisation **Fr-business.net**
  (cf. JSON-LD `Article` de `src/pages/infos/[slug].astro`).

### 3. Avant d'écrire — anti-cannibalisation

Objectif : **un sujet = un article**. Éviter deux pages qui se disputent la même
requête Google.

1. **Explorer l'existant** dans `src/content/posts/` : rechercher par mots-clés du sujet
   (titres, slugs, tags) pour repérer un article proche.
2. Si un article **très proche** existe déjà : ne pas en créer un doublon. Soit choisir
   un **angle nettement différent** (intention de recherche distincte), soit
   **enrichir** l'article existant.
3. Vérifier que le **slug** envisagé est **unique** (aucun fichier `{slug}.json` de même
   nom) — le slug détermine l'URL `/infos/{slug}.html`.
4. Choisir des **liens internes** cohérents dès cette étape (§5).

### 4. Qualité rédactionnelle

Structure et exigences (à respecter dans le champ `html`, voir « Anatomie d'un
article ») :

- **Intro** : 2-3 paragraphes `<p>` **sans titre**, qui posent l'enjeu et donnent envie.
- **Corps** : sections `<h2>` (sous-parties `<h3>`), titres **concrets et informatifs**.
  Paragraphes `<p>`, listes `<ul>`/`<ol>`, `<strong>`, `<em>`, `<blockquote>`.
- **Couverture 360°** : définitions utiles, contexte, critères de décision, étapes
  concrètes, erreurs fréquentes, conseils d'expert, coûts/ordres de grandeur si
  pertinent.
- **Éléments enrichis** — à utiliser **quand ils apportent de la valeur** (pas tous à
  chaque fois ; viser au moins un tableau **ou** un encadré sur les articles de fond) :
  tableau, encadré `callout`, bloc `takeaways` (« L'essentiel »), comparatif 2 colonnes
  `compare`. Vocabulaire de balisage exact en fin de fichier.
- **FAQ** : 4 à 6 vraies questions du lecteur, réponses autonomes, dans le champ `faq`
  (**pas** dans `html`).
- **Longueur** : riche et complète, en général **1100–2200 mots** selon la profondeur
  nécessaire. La longueur suit le sujet, jamais l'inverse.
- **Excerpt** : chapô / méta-description de **150–260 caractères**, texte brut, fidèle
  et incitatif.
- **Tags** : 3 à 6 mots-clés en minuscules.

### 5. Liens internes (1 à 3 par article, jusqu'à 4)

- Insérer **1 à 3 liens internes** (max 4) dans le corps `html`, vers d'autres articles
  ou pages du site.
- Format article : `<a href="/infos/{slug-cible}.html">ancre descriptive</a>`.
  Pages fixes : `/articles`, `/a-propos`, `/contact`.
- **Vérifier que la cible existe** : le fichier `src/content/posts/{slug-cible}.json`
  doit être présent (sinon lien mort). Ne pas inventer de slug.
- **Ancre naturelle et pertinente** : un texte d'ancrage descriptif, jamais « cliquez
  ici ». Les liens doivent servir le lecteur et relier des sujets **complémentaires**.
- Ne pas sur-optimiser : pas de bourrage de liens, pas de liens hors-sujet.
- Les liens **externes** restent possibles quand ils sont réellement utiles ; les
  rendre `rel="noopener"` et `target="_blank"` si externes.

### 6. Photo — toujours une vraie photo OpenAI avant publication

**Règle absolue : jamais d'article sans visuel.** Toujours **une** photo de couverture
(hero) générée par OpenAI, **ultra-réaliste**, « photo généraliste sur le thème »,
**avant** publication. **Une seule image par article** (le hero) — **pas** de galerie,
**pas** d'image dans le corps.

- **Modèle & paramètres** (via `OPENAI_API_KEY` de l'environnement) :

  ```json
  { "model": "gpt-image-2", "size": "1536x1024", "quality": "medium" }
  ```

- **Prompt** : photographie éditoriale ultra-réaliste illustrant le thème du titre,
  lumière naturelle douce et cinématographique, faible profondeur de champ, composition
  moderne et épurée, léger accent cyan/aqua. **Sans texte, sans lettres, sans
  watermark, sans logo, sans graphique.**
- **Traitement** : optimiser en **`webp`** (via `sharp`) et enregistrer dans
  `public/media/{id}.webp`, puis renseigner `image` et `imageAlt` dans le JSON.
  Le script de référence existe déjà : **`scripts/gen-images.mjs`** (mêmes paramètres).
- `imageAlt` : description factuelle et concise de l'image (accessibilité + SEO).

---

## Anatomie d'un article (référence technique)

Un article = un fichier `src/content/posts/{slug}.json`. Schéma dans
`src/content.config.ts`. Exemple de champs :

```jsonc
{
  "id": 3676,                 // numérique unique — incrémenter le max existant
  "slug": "mon-nouveau-slug", // == nom de fichier, unique, définit l'URL
  "title": "Titre de l'article",
  "date": "2026-07-13T09:00:00",
  "modified": "2026-07-13T09:00:00",
  "excerpt": "Chapô 150–260 caractères, texte brut.",
  "image": "/media/3676.webp",
  "imageAlt": "Description concise de la photo de couverture.",
  "category": "infos",        // catégorie unique du site
  "tags": ["mot-cle-1", "mot-cle-2", "mot-cle-3"],
  "html": "<p>Intro…</p><h2>…</h2>…",
  "readingTime": 10,          // minutes, cohérent avec la longueur
  "faq": [ { "q": "Question ?", "a": "<p>Réponse…</p>" } ],
  "regenerated": true
}
```

- **`id`** : prendre `max(id existants) + 1` (dernier connu : **3675**). L'`id` sert au
  nom de l'image `/media/{id}.webp`.
- **URL** générée : `/infos/{slug}.html` (via `src/pages/infos/[slug].astro`).
- **Articles liés** (bloc « Dans la même veine ») : **automatiques** (3 articles suivants
  par date) — rien à faire côté rédaction ; c'est indépendant des liens internes du §5.

### Balisage `html` autorisé (le CSS ne stylise que ces classes)

- Titres : `<h2>`, `<h3>` — **jamais `<h1>`**.
- Texte : `<p>`, `<ul>`/`<ol>` + `<li>`, `<strong>`, `<em>`, `<blockquote>`, `<a>`.
- **Tableau** :
  `<div class="table-wrap"><table><thead><tr><th>…</th></tr></thead><tbody><tr><td>…</td></tr></tbody></table></div>`
- **Encadré** : `<div class="callout key"><strong>Titre</strong> texte…</div>`
  (variantes : `callout info`, `callout tip`, `callout warn`).
- **À retenir** :
  `<div class="takeaways"><div class="takeaways-title">L'essentiel</div><ul><li>…</li></ul></div>`
- **Comparatif 2 colonnes** :
  `<div class="compare pros-cons"><div><h4>…</h4><ul><li>…</li></ul></div><div><h4>…</h4><ul><li>…</li></ul></div></div>`

**Interdit dans `html`** : `<h1>`, `<img>`, `<script>`, `<style>`, attribut `style=`,
attribut `id=`, toute `class=` hors liste ci-dessus, et `<details>`/`<summary>`
(la FAQ va dans le champ `faq`, pas dans `html`).

### Checklist avant push (nouvel article)

1. Sujet vérifié anti-cannibalisation, slug unique (§3).
2. `html` conforme au balisage autorisé ; intro sans titre ; sections `<h2>`.
3. **1 à 3 liens internes** vers des cibles **existantes** (§5).
4. **Photo OpenAI** générée, optimisée en `webp` dans `public/media/{id}.webp`,
   `image` + `imageAlt` renseignés (§6).
5. `excerpt` (150–260), `tags` (3–6), `faq` (4–6), `readingTime` cohérents.
6. `npm run build` **passe** sans erreur.
7. Commit clair + **push sur `main`** (Règle n°1).
