export async function onRequest(context) {
  const { env, params } = context;
  const pathArray = params.path;
  
  if (!pathArray || pathArray.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  const key = pathArray.map(decodeURIComponent).join('/');

  if (!env.FONTS_BUCKET) {
    return new Response("FONTS_BUCKET not bound in Cloudflare settings", { status: 500 });
  }

  const object = await env.FONTS_BUCKET.get(key);

  if (object === null) {
    return new Response("Font not found in R2 bucket", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Access-Control-Allow-Origin", "*");
  
  // Set appropriate content type for fonts if not set
  const ext = key.split('.').pop()?.toLowerCase();
  if (ext === 'ttf') headers.set("Content-Type", "font/ttf");
  else if (ext === 'otf') headers.set("Content-Type", "font/otf");
  else if (ext === 'woff') headers.set("Content-Type", "font/woff");
  else if (ext === 'woff2') headers.set("Content-Type", "font/woff2");

  return new Response(object.body, {
    headers,
  });
}
