-- Create a real empty client workspace for every newly registered Supabase user.
-- No demo projects, invoices, quotes, documents, or messages are created.

create or replace function public.handle_new_client_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_org_id uuid;
  display_name text;
  workspace_name text;
begin
  display_name := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1), 'Client');
  workspace_name := display_name || '''s Workspace';

  insert into public.organizations (name, slug)
  values (
    workspace_name,
    'client-' || replace(new.id::text, '-', '')
  )
  returning id into new_org_id;

  insert into public.profiles (id, organization_id, full_name, email, role)
  values (new.id, new_org_id, display_name, new.email, 'client');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_client on auth.users;
create trigger on_auth_user_created_client
after insert on auth.users
for each row execute procedure public.handle_new_client_user();
