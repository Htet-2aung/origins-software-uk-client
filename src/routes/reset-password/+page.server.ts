import { fail, redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/server/supabase';

export const actions = {
  default: async ({ request, cookies }) => {
    const form = await request.formData();
    const password = String(form.get('password') ?? '');
    const confirm = String(form.get('confirm') ?? '');
    if (password.length < 8) return fail(400, { error: 'Password must be at least 8 characters.' });
    if (password !== confirm) return fail(400, { error: 'Passwords do not match.' });
    const supabase = createSupabaseServerClient(cookies);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return fail(400, { error: error.message });
    throw redirect(303, '/login?reset=1');
  }
};
