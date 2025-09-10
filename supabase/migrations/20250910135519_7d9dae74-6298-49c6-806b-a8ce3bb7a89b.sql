-- Create groups table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_members table for managing group membership
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Enable RLS on groups table
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Enable RLS on group_members table  
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for groups
CREATE POLICY "Users can view groups they are members of" 
ON public.groups 
FOR SELECT 
USING (
  id IN (
    SELECT group_id 
    FROM public.group_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update their groups" 
ON public.groups 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Group creators can delete their groups" 
ON public.groups 
FOR DELETE 
USING (auth.uid() = created_by);

-- RLS policies for group_members
CREATE POLICY "Users can view group members for their groups" 
ON public.group_members 
FOR SELECT 
USING (
  group_id IN (
    SELECT group_id 
    FROM public.group_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Group creators can add members" 
ON public.group_members 
FOR INSERT 
WITH CHECK (
  group_id IN (
    SELECT id 
    FROM public.groups 
    WHERE created_by = auth.uid()
  )
);

CREATE POLICY "Users can remove themselves from groups" 
ON public.group_members 
FOR DELETE 
USING (user_id = auth.uid());

CREATE POLICY "Group creators can remove members" 
ON public.group_members 
FOR DELETE 
USING (
  group_id IN (
    SELECT id 
    FROM public.groups 
    WHERE created_by = auth.uid()
  )
);

-- Add group_id to reminders table
ALTER TABLE public.reminders ADD COLUMN group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;

-- Update reminders RLS policy to include group access
DROP POLICY "Anyone can view reminders" ON public.reminders;

CREATE POLICY "Users can view reminders in their groups or public reminders" 
ON public.reminders 
FOR SELECT 
USING (
  group_id IS NULL OR 
  group_id IN (
    SELECT group_id 
    FROM public.group_members 
    WHERE user_id = auth.uid()
  )
);

-- Add trigger for updating updated_at on groups
CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();