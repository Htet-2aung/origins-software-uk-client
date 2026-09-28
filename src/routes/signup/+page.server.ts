import { fail, redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/server/supabase';

export const load = async ({ locals }) => {
  if (locals.user) throw redirect(303, '/');
};

export const actions = {
  default: async ({ request, cookies, url }) => {
    const form = await request.formData();
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const confirm = String(form.get('confirm') ?? '');
    if (!name || !email || password.length < 8) return fail(400, { error: 'Use your name, a valid email, and a password of at least 8 characters.', name, email });
    if (password !== confirm) return fail(400, { error: 'Passwords do not match.', name, email });

    const supabase = createSupabaseServerClient(cookies);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${url.origin}/auth/callback` , data: { full_name: name } }
    });
    if (error) return fail(400, { error: error.message, name, email });
    if (data.session) throw redirect(303, '/');
    return { success: 'Account created. Check your email to confirm your account, then sign in.' };
  }
};
