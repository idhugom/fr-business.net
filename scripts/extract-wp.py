#!/usr/bin/env python3
"""Extract all posts from fr-business.net WordPress REST API."""
import json, sys, time, urllib.request, urllib.error, os

BASE = "https://www.fr-business.net/wp-json/wp/v2"
OUT = os.environ.get("OUT", "scripts/data/wp-posts.json")
os.makedirs(os.path.dirname(OUT), exist_ok=True)

def fetch(url, retries=5):
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "migrator/1.0"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode())
        except Exception as e:
            print(f"  retry {i+1} for {url[:80]}: {e}", file=sys.stderr)
            time.sleep(2 * (i + 1))
    raise RuntimeError(f"failed: {url}")

posts = []
page = 1
per = 50
while True:
    url = (f"{BASE}/posts?per_page={per}&page={page}"
           f"&_embed=wp:featuredmedia"
           f"&_fields=id,slug,date,modified,title,excerpt,content,featured_media,categories,tags,link,_links,_embedded")
    try:
        batch = fetch(url)
    except RuntimeError:
        break
    if not batch:
        break
    for p in batch:
        fm = None
        alt = ""
        emb = p.get("_embedded", {})
        media = emb.get("wp:featuredmedia")
        if media and isinstance(media, list) and media[0].get("source_url"):
            fm = media[0]["source_url"]
            alt = media[0].get("alt_text", "") or ""
        posts.append({
            "id": p["id"],
            "slug": p["slug"],
            "date": p.get("date"),
            "modified": p.get("modified"),
            "title": p["title"]["rendered"],
            "excerpt_html": p["excerpt"]["rendered"],
            "content_html": p["content"]["rendered"],
            "featured_image": fm,
            "featured_alt": alt,
            "link": p.get("link"),
            "categories": p.get("categories", []),
            "tags": p.get("tags", []),
        })
    print(f"page {page}: got {len(batch)} (total {len(posts)})", file=sys.stderr)
    page += 1
    time.sleep(0.15)

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(posts, f, ensure_ascii=False, indent=1)
print(f"WROTE {len(posts)} posts to {OUT}")

# stats
with_img = sum(1 for p in posts if p["featured_image"])
print(f"with featured image: {with_img}/{len(posts)}")
