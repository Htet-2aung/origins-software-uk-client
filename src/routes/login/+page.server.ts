import { fail, redirect } from '@sveltejs/kit';
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return fail(400, { error: 'The email or password is incorrect.', email });
    throw redirect(303, '/');
  }
};
