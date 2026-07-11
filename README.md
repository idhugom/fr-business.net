# Fr-business.net — v2

Refonte complète de [fr-business.net](https://www.fr-business.net) : magazine business /
tech / argent / art de vivre. Site **statique** (Astro) au design « Aurora Liquid »
(blanc + accent aqua `#ADFFFF`), déployé sur **Cloudflare Pages**.

## Stack

- **Astro 5** — génération statique, sortie dans `dist/`
- Collections de contenu : `src/content/posts/*.json` (un fichier par article)
- Polices auto-hébergées (Space Grotesk + Inter via Fontsource)
- Zéro dépendance JS lourde : curseur, parallaxe, reveals et magnétisme en vanilla JS
- Images à la une optimisées en `webp` dans `public/media/`

## URLs — SEO préservé

Les permaliens historiques sont reproduits **à l'identique** :

| Type      | URL                              |
| --------- | -------------------------------- |
| Article   | `/infos/{slug}.html`             |
| Accueil   | `/`                              |
| Archives  | `/articles`                      |
| À propos  | `/a-propos`                      |
| Contact   | `/contact`                       |
| Légales   | `/notification-legale`           |
| Sitemap   | `/sitemap.xml`                   |
| Flux RSS  | `/rss.xml`                       |

Les slugs et les images à la une des 933 articles sont conservés ; **le contenu a été
entièrement réécrit** par IA (voir ci-dessous).

## Développement

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # -> dist/
npm run preview
```

## Pipeline de migration (`scripts/`)

| Étape | Script | Rôle |
| ----- | ------ | ---- |
| 1 | `extract-wp.py` | Extrait les 933 posts de l'API REST WordPress → `scripts/data/wp-posts.json` |
| 2 | `download-images.mjs` | Télécharge + optimise les images à la une → `public/media/{id}.webp` |
| 3 | `build-collection.mjs` | Génère la collection Astro (baseline, slugs/titres/images conservés) |
| 4 | `gen-run.mjs` | **Régénère** le contenu via OpenAI (Responses API, concurrent, reprenable) |
| 4bis | `batch.mjs` | Variante **Batch API** (build / submit / status / fetch) |
| 5 | `gen-brand.mjs` | Génère logo, favicon apple-touch, image OG |
| 6 | `cf-setup.mjs` | Crée le projet Cloudflare Pages + domaine + DNS + redirection |

### Régénération du contenu — OpenAI

- **Modèle** : `gpt-5.6-terra`
- **Reasoning** : effort `high`, mode standard
- **Text verbosity** : `high` · **max_output_tokens** : `30000`
- **API** : Responses API + sortie structurée JSON (schéma strict)
- Consignes : contenu 100 % original, à forte valeur ajoutée, couvrant l'intention de
  recherche, avec tableaux, encadrés de mise en avant, comparatifs 2 colonnes et FAQ.

```bash
# synchrone (immédiat, reprenable)
OPENAI_API_KEY=… node scripts/gen-run.mjs
# ou Batch API (~50 % moins cher)
node scripts/batch.mjs build && node scripts/batch.mjs submit
node scripts/batch.mjs status && node scripts/batch.mjs fetch
```

## Déploiement — Cloudflare Pages

Projet **connecté à GitHub** (`idhugom/fr-business.net`) :

| Réglage | Valeur |
| ------- | ------ |
| Branche de production | `main` |
| Commande de build | `npm run build` |
| Répertoire de sortie | `dist` |
| Répertoire racine | *(vide)* |
| Commentaires de build (PR) | activés |

Le domaine `fr-business.net` (zone Cloudflare), le sous-domaine `www` et la redirection
**apex → www** sont préconfigurés par `scripts/cf-setup.mjs domains`. Ils deviennent
actifs dès la délégation des nameservers Cloudflare (`elliott` / `tani.ns.cloudflare.com`).
