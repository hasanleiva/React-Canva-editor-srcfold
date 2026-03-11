import bcrypt from 'bcryptjs';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), { status: 400 });
    }

    const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
    }

    const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    await env.DB.prepare("INSERT INTO sessions (token, email, expires_at) VALUES (?, ?, datetime('now', '+7 days'))")
      .bind(token, email)
      .run();

    const headers = new Headers();
    headers.set('Set-Cookie', `auth_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax`);
    headers.set('Content-Type', 'application/json');

    return new Response(JSON.stringify({ success: true, user: { email: user.email, name: user.name, role: user.role } }), {
      status: 200,
      headers
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
