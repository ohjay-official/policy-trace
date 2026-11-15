-- Cover foreign keys flagged by the Supabase performance advisor.
-- Does not change run_lab, RLS, or grant behavior.

create index if not exists lab_shares_lab_id_idx
  on public.lab_shares (lab_id);

create index if not exists lab_shares_scenario_slug_idx
  on public.lab_shares (scenario_slug);

create index if not exists labs_scenario_slug_idx
  on public.labs (scenario_slug);
