-- Fix security definer functions to handle NULL user IDs
CREATE OR REPLACE FUNCTION public.is_group_member(group_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN user_uuid IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.group_members
      WHERE group_id = group_uuid 
      AND user_id = user_uuid
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_group_creator(group_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN user_uuid IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.groups
      WHERE id = group_uuid 
      AND created_by = user_uuid
    )
  END;
$$;