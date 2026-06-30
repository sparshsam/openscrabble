# OpenScrabble — Supabase Schema

> **Status:** Draft — not yet applied.
> These tables are proposed for when cloud features are activated.
> The app works fully offline/guest-mode without Supabase.

## Environment Variables

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

The app degrades gracefully when these are absent — guest mode requires no backend.

---

## Tables

### `profiles`

Stores user profile data, linked to Supabase Auth.

```sql
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  display_name text,
  avatar_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- RLS: users can read all profiles, update only their own
alter table public.profiles enable row level security;

create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'preferred_username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'preferred_username')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### `games`

One row per completed game.

```sql
create table public.games (
  id            uuid primary key default gen_random_uuid(),
  created_by    uuid references public.profiles(id),
  game_type     text not null default 'local' check (game_type in ('local', 'online')),
  status        text not null default 'completed' check (status in ('completed', 'abandoned')),
  winner_id     uuid references public.profiles(id),
  is_tie        boolean default false,
  total_turns   integer not null,
  duration_seconds integer,  -- nullable if not tracked
  created_at    timestamptz default now(),
  completed_at  timestamptz
);

alter table public.games enable row level security;

create policy "Games are readable by participants"
  on public.games for select
  using (
    auth.uid() = created_by
    or exists (
      select 1 from public.game_players
      where game_players.game_id = games.id
        and game_players.profile_id = auth.uid()
    )
  );

create policy "Users can insert their own games"
  on public.games for insert
  with check (auth.uid() = created_by);
```

### `game_players`

Many-to-many link between games and profiles, per-player scores.

```sql
create table public.game_players (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid references public.games(id) on delete cascade not null,
  profile_id uuid references public.profiles(id),
  player_name text not null,  -- display name at time of game
  score      integer not null default 0,
  player_order integer not null,  -- 0, 1, 2, 3 for turn order
  is_guest   boolean default true,
  created_at timestamptz default now(),

  unique (game_id, player_order)
);

alter table public.game_players enable row level security;

create policy "Game players are readable by participants"
  on public.game_players for select
  using (
    auth.uid() = profile_id
    or exists (
      select 1 from public.games
      where games.id = game_players.game_id
        and games.created_by = auth.uid()
    )
  );

create policy "Users can insert game players"
  on public.game_players for insert
  with check (true);
```

### `game_turns`

One row per turn in a completed game, for replay/history.

```sql
create table public.game_turns (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid references public.games(id) on delete cascade not null,
  turn_number   integer not null,
  player_order  integer not null,
  player_name   text not null,
  action_type   text not null check (action_type in ('place', 'pass', 'swap')),
  tiles_played  jsonb,       -- [{letter, points, row, col}, ...]
  words_formed  jsonb,       -- [{word, score}, ...]
  score_earned  integer not null default 0,
  cumulative_score integer not null,
  created_at    timestamptz default now(),

  unique (game_id, turn_number)
);

alter table public.game_turns enable row level security;

create policy "Turns are readable with game"
  on public.game_turns for select
  using (true);  -- gated by game-level RLS in the application
```

### `player_stats`

Aggregated stats per player.

```sql
create table public.player_stats (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid references public.profiles(id) on delete cascade unique not null,
  games_played    integer not null default 0,
  games_won       integer not null default 0,
  total_score     integer not null default 0,
  highest_score   integer not null default 0,
  best_word       text,
  best_word_score integer,
  total_moves     integer not null default 0,
  bingos          integer not null default 0,
  updated_at      timestamptz default now()
);

alter table public.player_stats enable row level security;

create policy "Player stats are publicly readable"
  on public.player_stats for select
  using (true);

create policy "Users can update their own stats"
  on public.player_stats for update
  using (auth.uid() = profile_id);
```

### `user_settings`

Per-user preferences.

```sql
create table public.user_settings (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid references public.profiles(id) on delete cascade unique not null,
  theme         text not null default 'system' check (theme in ('light', 'dark', 'system')),
  sound_enabled boolean not null default true,
  language      text not null default 'en',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.user_settings enable row level security;

create policy "Users can read/update their own settings"
  on public.user_settings for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
```

## Indexes

```sql
create index idx_game_players_game_id on public.game_players(game_id);
create index idx_game_players_profile_id on public.game_players(profile_id);
create index idx_game_turns_game_id on public.game_turns(game_id);
create index idx_games_created_by on public.games(created_by);
create index idx_games_created_at on public.games(created_at desc);
```

## RLS Summary

| Table | Select | Insert | Update | Delete |
|-------|--------|--------|--------|--------|
| profiles | ✅ Public | — (trigger) | ✅ Own | — |
| games | ✅ Participant | ✅ Own games | — | — |
| game_players | ✅ Participant | ✅ Anyone | — | — |
| game_turns | ✅ Public (app-gated) | — (via game insert) | — | — |
| player_stats | ✅ Public | — | ✅ Own | — |
| user_settings | ✅ Own | — | ✅ Own | — |
