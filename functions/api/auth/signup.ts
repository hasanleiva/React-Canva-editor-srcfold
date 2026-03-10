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

    const id = crypto.randomUUID();

    // Insert into D1
    const result = await env.DB.prepare(
      'INSERT INTO users (id, email, passwordHash) VALUES (?, ?, ?)'
    )
      .bind(id, email, passwordHash)
      .run();

    if (result.success) {
      return new Response(JSON.stringify({ id, email }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ error: 'Failed to create user' }), { status: 500 });
    }
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint failed')) {
      return new Response(JSON.stringify({ error: 'User already exists' }), { status: 400 });
    }
    return new Response(JSON.stringify({ error: e.message || 'Internal Server Error' }), { status: 500 });
  }
}
