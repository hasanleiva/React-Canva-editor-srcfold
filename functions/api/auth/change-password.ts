interface Env {
  DB: D1Database;
}

export async function onRequestPost(context: EventContext<Env, any, any>) {
  const { request, env } = context;
  
  try {
    const { email, newPassword } = await request.json() as any;
    
    if (!email || !newPassword) {
      return new Response(JSON.stringify({ error: 'Email and new password are required' }), { status: 400 });
    }

    // Hash the new password using WebCrypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(newPassword);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Update D1
    const result = await env.DB.prepare(
      'UPDATE users SET passwordHash = ? WHERE email = ?'
    )
      .bind(passwordHash, email)
      .run();

    if (result.success) {
      return new Response(JSON.stringify({ success: true }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ error: 'Failed to update password' }), { status: 500 });
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Internal Server Error' }), { status: 500 });
  }
}
