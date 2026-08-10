/*
  # Fix Mutable Search Path on get_my_session_ids Function

  ## Summary
  Recreates the `get_my_session_ids` function with a fixed `search_path` to prevent
  potential search path injection attacks. Setting `search_path = ''` and using
  fully qualified names ensures the function always resolves objects from the
  correct schema regardless of the caller's search_path setting.
*/

CREATE OR REPLACE FUNCTION public.get_my_session_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT session_id FROM public.mp_players WHERE user_id = (SELECT auth.uid()) AND is_active = true;
$$;
