import { createSupabaseServerClient } from '$lib/server/supabase';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const supabase = createSupabaseServerClient(event.cookies);
  const { data: { user } } = await supabase.auth.getUser();
  event.locals.user = user;
  return resolve(event);
};
