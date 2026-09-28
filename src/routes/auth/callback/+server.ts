import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/server/supabase';

export const GET = async ({ url, cookies }) => {
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  const supabase = createSupabaseServerClient(cookies);
  if (code) await supabase.auth.exchangeCodeForSession(code);
  throw redirect(303, safeNext);
};
