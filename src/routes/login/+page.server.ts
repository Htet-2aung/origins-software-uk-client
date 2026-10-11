import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { profiles } from '$lib/server/db/schema';
import { createSupabaseServerClient } from '$lib/server/supabase';

export const load = async ({ locals }) => {
  if (locals.user) throw redirect(303, '/');
};

export const actions = {
  default: async ({ request, cookies }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    if (!email || !password) return fail(400, { error: 'Enter your email and password.', email });

    const supabase = createSupabaseServerClient(cookies);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || !data.user) return fail(400, { error: 'The email or password is incorrect.', email });

    try {
      const [profile] = await db.select({ role: profiles.role }).from(profiles).where(eq(profiles.id, data.user.id)).limit(1);
      if (profile && profile.role !== 'client') {
        await supabase.auth.signOut();
        return fail(403, { error: 'This account uses the developer portal. Sign in at /developer/login.', email });
      }
    } catch (cause) {
      await supabase.auth.signOut();
      console.error('[client-login] Role verification failed', cause);
      throw error(503, 'Client portal access could not be verified. Please try again later.');
    }

    throw redirect(303, '/');
  }
};
