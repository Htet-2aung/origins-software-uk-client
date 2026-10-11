import { fail, redirect, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { profiles } from '$lib/server/db/schema';
import { createSupabaseServerClient } from '$lib/server/supabase';

export const load = async ({ locals }) => {
  if (locals.user) {
    const [profile] = await db.select({ role: profiles.role }).from(profiles).where(eq(profiles.id, locals.user.id)).limit(1);
    if (profile && profile.role !== 'client') throw redirect(303, '/developer');
  }
  return {};
};

export const actions = {
  default: async ({ request, cookies }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const password = String(form.get('password') ?? '');
    if (!email || !password) return fail(400, { error: 'Enter your work email and password.', email });
    if (email.length > 320 || password.length > 1024) return fail(400, { error: 'Invalid email or password.', email });

    const supabase = createSupabaseServerClient(cookies);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || !data.user) return fail(400, { error: 'Unable to sign in with those credentials.', email });

    try {
      const [profile] = await db.select({ role: profiles.role }).from(profiles).where(eq(profiles.id, data.user.id)).limit(1);
      if (!profile || profile.role === 'client') {
        await supabase.auth.signOut();
        return fail(403, { error: 'This account is not authorized for the developer portal.', email });
      }
    } catch (cause) {
      await supabase.auth.signOut();
      console.error('[developer-login] Role verification failed', cause);
      throw error(503, 'Developer access could not be verified. Please try again later.');
    }

    throw redirect(303, '/developer');
  }
};
