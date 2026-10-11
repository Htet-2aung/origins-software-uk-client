import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { profiles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST = async ({ request, locals, fetch }) => {
  if (!locals.user) return json({ error: 'Authentication required.' }, { status: 401 });
  const [profile] = await db.select({ role: profiles.role }).from(profiles).where(eq(profiles.id, locals.user.id)).limit(1);
  if (!profile || profile.role === 'client') return json({ error: 'Developer access required.' }, { status: 403 });
  if (!env.OPENCLAW_API_URL || !env.OPENCLAW_API_TOKEN) return json({ error: 'AI integration is not configured yet. Set OPENCLAW_API_URL and OPENCLAW_API_TOKEN on the server.' }, { status: 503 });

  let body: { message?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'Send a valid JSON request.' }, { status: 400 }); }
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 4000) return json({ error: 'Message must be between 1 and 4,000 characters.' }, { status: 400 });

  try {
    const endpoint = env.OPENCLAW_API_URL.replace(/\/+$/, '');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENCLAW_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, user_id: locals.user.id, source: 'origins-developer-portal' }),
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) {
      console.error('[developer-assistant] Upstream status:', response.status);
      return json({ error: 'The AI service could not complete this request. Please try again.' }, { status: 502 });
    }
    const result: unknown = await response.json();
    return json({ result });
  } catch (cause) {
    console.error('[developer-assistant] Request failed', cause);
    return json({ error: 'The AI service is unreachable right now. Please try again shortly.' }, { status: 502 });
  }
};
