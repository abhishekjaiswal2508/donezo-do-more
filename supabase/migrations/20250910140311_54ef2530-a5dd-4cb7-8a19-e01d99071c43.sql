-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;
DROP POLICY IF EXISTS "Users can view group members for their groups" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can add members" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can remove members" ON public.group_members;
DROP POLICY IF EXISTS "Users can view reminders in their groups or public reminders" ON public.reminders;

-- Create security definer function to check group membership
CREATE OR REPLACE FUNCTION public.is_group_member(group_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE group_id = group_uuid 
    AND user_id = user_uuid
  );
$$;

-- Create security definer function to check if user is group creator
CREATE OR REPLACE FUNCTION public.is_group_creator(group_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups
    WHERE id = group_uuid 
    AND created_by = user_uuid
  );
$$;

-- Recreate simplified policies using the security definer functions
CREATE POLICY "Users can view groups they belong to" 
ON public.groups 
FOR SELECT 
USING (
  created_by = auth.uid() OR 
  public.is_group_member(id, auth.uid())
);

CREATE POLICY "Users can view group members" 
ON public.group_members 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  public.is_group_creator(group_id, auth.uid()) OR
  public.is_group_member(group_id, auth.uid())
);

CREATE POLICY "Group creators can add members" 
ON public.group_members 
FOR INSERT 
WITH CHECK (
  public.is_group_creator(group_id, auth.uid())
);

CREATE POLICY "Group creators can remove members" 
ON public.group_members 
FOR DELETE 
USING (
  public.is_group_creator(group_id, auth.uid()) OR 
  user_id = auth.uid()
);

-- Update reminders policy to use security definer function
CREATE POLICY "Users can view public reminders or group reminders they belong to" 
ON public.reminders 
FOR SELECT 
USING (
  group_id IS NULL OR 
  public.is_group_member(group_id, auth.uid())
);