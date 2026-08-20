-- Auto-create usuario when a user signs up in Supabase Auth.
-- Included in prisma/migrations/20260819000000_official_model.
-- Re-run in SQL Editor only if the trigger is missing.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuario (id_usuario, nome, email, data_criacao, ativo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Usuario'),
    new.email,
    now(),
    true
  )
  on conflict (id_usuario) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
