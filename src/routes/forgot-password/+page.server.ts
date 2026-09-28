import { fail, redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/server/supabase';

export const load = async ({ locals }) => { if (locals.user) throw redirect(303, '/'); };

export const actions = {
  default: async ({ request, cookies, url }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();
    if (!email) return fail(400, { error: 'Enter your email address.', email });
    const supabase = createSupabaseServerClient(cookies);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${url.origin}/auth/callback?next=/reset-password` });
    if (error) return fail(400, { error: error.message, email });
    return { success: 'If an account exists for that email, we sent a password reset link.' };
  }
};
