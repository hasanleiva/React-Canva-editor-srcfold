interface Env {
  DB: D1Database;
}

export async function onRequestPost(context: EventContext<Env, any, any>) {
  const { request, env } = context;
  
  try {
    const { email, password } = await request.json() as any;
    
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), { status: 400 });
    }

    // Hash the password using WebCrypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Query D1
    const user = await env.DB.prepare(
      'SELECT id, email FROM users WHERE email = ? AND passwordHash = ?'
    )
      .bind(email, passwordHash)
      .first();

    if (user) {
      return new Response(JSON.stringify(user), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 401 });
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Internal Server Error' }), { status: 500 });
  }
}
