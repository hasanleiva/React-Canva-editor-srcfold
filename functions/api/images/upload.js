export async function onRequestPost(context) {
  try {
    const { request, env } = context;
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

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file' }), { status: 400 });
    }

    if (user && user.role === 'admin') {
      const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await env.R2_BUCKET.put(`images/${id}`, file);
      return new Response(JSON.stringify({ success: true, url: `/api/images/get/${id}` }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // User role: save in memory only (return base64)
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      return new Response(JSON.stringify({ success: true, data: `data:${file.type};base64,${base64}` }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
