/**
 * Cloudflare Pages middleware — runs at the edge on every request to the
 * project's custom domains. Forces the apex (fr-business.net) to redirect to
 * the canonical www host with a 301, preserving path + query string.
 * All other requests fall through to normal static asset serving.
 */
export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === 'fr-business.net') {
    url.hostname = 'www.fr-business.net';
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
}
