export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/auth_token=([^;]+)/);

    if (!match) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    const token = match[1];
    const session = await env.DB.prepare("SELECT email FROM sessions WHERE token = ?").bind(token).first();

    if (!session) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    const user = await env.DB.prepare("SELECT role FROM users WHERE email = ?").bind(session.email).first();

    if (user && user.role === 'admin') {
      const list = await env.R2_BUCKET.list({ prefix: 'images/' });
      const images = list.objects.map(obj => {
        const id = obj.key.replace('images/', '');
        return {
          id: id,
          documentId: id,
          img: {
            url: `/api/images/get/${id}`,
            mime: obj.httpMetadata?.contentType || 'image/png'
          }
        };
      });
      return new Response(JSON.stringify(images), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify([]), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
