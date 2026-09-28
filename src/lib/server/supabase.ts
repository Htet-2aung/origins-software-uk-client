import { createServerClient } from '@supabase/ssr';
import { env } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

export function createSupabaseServerClient(cookies: any) {
  return createServerClient(
    env.PUBLIC_SUPABASE_URL,
    privateEnv.SUPABASE_ANON_KEY ?? env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookies.getAll(),
        setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => cookies.set(name, value, { ...options, path: '/' }))
      }
    }
  );
}
