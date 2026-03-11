export async function onRequestDelete(context) {
  try {
    const { request, env, params } = context;
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/auth_token=([^;]+)/);

    if (!match) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }

    const token = match[1];
    const session = await env.DB.prepare("SELECT email FROM sessions WHERE token = ?").bind(token).first();

    if (!session) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 });
    }

    const user = await env.DB.prepare("SELECT role FROM users WHERE email = ?").bind(session.email).first();

    if (user && user.role === 'admin') {
      const id = params.id;
      await env.R2_BUCKET.delete(`images/${id}`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
