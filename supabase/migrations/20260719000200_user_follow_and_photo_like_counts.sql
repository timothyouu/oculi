-- Public aggregate functions for real follower/like counts, mirroring
-- public.place_save_counts() (20260710000700_fix_place_save_counts_security_definer.sql)
-- now that lib/data.ts's followerCount/likeCount seed baselines are zeroed
-- (20260719000100_zero_seed_baselines.sql). Same rationale as that
-- migration's comment: followed_users/liked_photos are owner-scoped RLS
-- tables, so a plain view or invoker-scoped function would only ever see
-- the querying user's own rows. These SECURITY DEFINER functions expose
-- only the aggregate (followed_user_id + count, photo_id + count) --
-- never who follows/liked what -- with a pinned search_path, and are the
-- only thing granted EXECUTE to anon/authenticated.

create or replace function public.user_follow_counts()
returns table (user_id text, follow_count int)
language sql
stable
security definer
set search_path = public
as $$
  select followed_user_id as user_id, count(*)::int as follow_count
  from public.followed_users
  group by followed_user_id;
$$;

revoke all on function public.user_follow_counts() from public;
grant execute on function public.user_follow_counts() to anon;
grant execute on function public.user_follow_counts() to authenticated;

create or replace function public.photo_like_counts()
returns table (photo_id text, like_count int)
language sql
stable
security definer
set search_path = public
as $$
  select photo_id, count(*)::int as like_count
  from public.liked_photos
  group by photo_id;
$$;

revoke all on function public.photo_like_counts() from public;
grant execute on function public.photo_like_counts() to anon;
grant execute on function public.photo_like_counts() to authenticated;
