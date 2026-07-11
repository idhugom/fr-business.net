// Shared prompt + request builders for content regeneration (gpt-5.6-terra).
import fs from 'node:fs';

export const MODEL = 'gpt-5.6-terra';
export const MAX_OUTPUT_TOKENS = 30000;

export const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    excerpt: {
      type: 'string',
      description: "Méta-description / chapô de 150 à 260 caractères, texte brut sans HTML, incitatif et fidèle au contenu.",
    },
    html: {
      type: 'string',
      description: "Corps de l'article en HTML sémantique (voir consignes de balisage).",
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: '3 à 6 mots-clés / thèmes en minuscules.',
    },
    faq: {
      type: 'array',
      minItems: 4,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          q: { type: 'string' },
          a: { type: 'string', description: 'Réponse claire (80-160 mots), HTML simple autorisé: <p>, <ul>, <li>, <strong>.' },
        },
        required: ['q', 'a'],
      },
    },
  },
  required: ['excerpt', 'html', 'tags', 'faq'],
};

const SYSTEM = `Tu es rédacteur en chef et expert SEO de Fr-business.net, un magazine francophone haut de gamme (business, finance, tech, immobilier, santé, art de vivre).
Ta mission : produire un article de fond ENTIÈREMENT ORIGINAL, en français impeccable, à très forte valeur ajoutée, qui répond de façon exhaustive à l'intention de recherche derrière le titre.

RÈGLES DE FOND
- N'invente jamais de fausses statistiques précises, de fausses études ni de fausses citations. Quand tu donnes un ordre de grandeur, reste prudent ("souvent", "en général", fourchettes réalistes).
- Couvre le sujet à 360° : définitions utiles, contexte, critères de décision, étapes concrètes, erreurs fréquentes, conseils d'expert, cas d'usage, coûts/ordres de grandeur quand c'est pertinent.
- Zéro remplissage, zéro formule creuse. Pas de "dans cet article, nous allons voir". On entre dans le vif du sujet.
- Ton : clair, expert, direct, orienté lecteur, agréable à lire.
- L'ancien contenu éventuellement fourni sert UNIQUEMENT à cerner le sujet : ne le recopie pas, ne le paraphrase pas.

STRUCTURE & BALISAGE (HTML uniquement, dans le champ html)
- Commence par une introduction de 2-3 paragraphes <p> (SANS titre), qui pose l'enjeu et donne envie.
- Découpe ensuite en sections <h2> (et <h3> pour les sous-parties). Titres concrets et informatifs, pas génériques.
- Paragraphes <p>, listes <ul>/<ol><li>, mise en gras <strong>, emphase <em>, citations <blockquote>.
- Éléments enrichis à utiliser quand ils apportent de la valeur (au moins un tableau ET un encadré par article) :
  • Tableau : <div class="table-wrap"><table><thead><tr><th>…</th></tr></thead><tbody><tr><td>…</td></tr></tbody></table></div>
  • Encadré mise en avant : <div class="callout key"><strong>Titre</strong> texte…</div> (variantes : class="callout info", "callout tip", "callout warn")
  • Bloc à retenir : <div class="takeaways"><div class="takeaways-title">L'essentiel</div><ul><li>…</li></ul></div>
  • Comparatif 2 colonnes (si pertinent) : <div class="compare pros-cons"><div><h4>Avantages</h4><ul><li>…</li></ul></div><div><h4>Limites</h4><ul><li>…</li></ul></div></div>
- INTERDIT dans html : <h1>, <img>, <script>, <style>, attributs style=, id=, class= autres que ceux listés, balises <details>/<summary> (la FAQ va dans le champ faq).
- Longueur : riche et complète, généralement 1100 à 2200 mots selon la profondeur nécessaire du sujet.

FAQ (champ faq)
- 4 à 6 vraies questions que se pose le lecteur, avec des réponses utiles et autonomes.

Réponds STRICTEMENT au format JSON demandé.`;

function cleanRef(html = '') {
  return html.replace(/<[^>]+>/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1400);
}

export function buildUserInput(post) {
  const ref = cleanRef(post.content_html || '');
  return `TITRE DE L'ARTICLE À RÉDIGER :
"${post.title}"

Sujet de référence (pour cerner le thème uniquement, à NE PAS réutiliser) :
${ref || '(aucun)'}

Rédige maintenant l'article original complet correspondant à ce titre, en respectant toutes les consignes.`;
}

export function buildResponsesBody(post) {
  return {
    model: MODEL,
    input: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: buildUserInput(post) },
    ],
    reasoning: { effort: 'high' },
    text: {
      verbosity: 'high',
      format: {
        type: 'json_schema',
        name: 'article',
        strict: true,
        schema: OUTPUT_SCHEMA,
      },
    },
    max_output_tokens: MAX_OUTPUT_TOKENS,
  };
}

// Parse a Responses API response object into {excerpt, html, faq, tags}
export function parseResponse(resp) {
  let txt = resp.output_text;
  if (!txt && Array.isArray(resp.output)) {
    for (const item of resp.output) {
      if (item.type === 'message' && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (c.type === 'output_text' && c.text) { txt = c.text; break; }
        }
      }
      if (txt) break;
    }
  }
  if (!txt) throw new Error('no output_text in response');
  return JSON.parse(txt);
}

export function loadPosts(root) {
  return JSON.parse(fs.readFileSync(`${root}/scripts/data/wp-posts.json`, 'utf8'));
}
