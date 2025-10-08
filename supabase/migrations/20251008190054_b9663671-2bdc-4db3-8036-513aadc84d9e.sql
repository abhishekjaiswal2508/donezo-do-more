-- Create subjects table for custom subject management
CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Allow users to view all subjects
CREATE POLICY "Users can view all subjects"
ON public.subjects
FOR SELECT
USING (true);

-- Allow users to create subjects
CREATE POLICY "Users can create subjects"
ON public.subjects
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Allow users to delete their own subjects
CREATE POLICY "Users can delete their own subjects"
ON public.subjects
FOR DELETE
USING (auth.uid() = created_by);

-- Insert default subjects
INSERT INTO public.subjects (name, created_by) VALUES
  ('Mathematics', '00000000-0000-0000-0000-000000000000'),
  ('Physics', '00000000-0000-0000-0000-000000000000'),
  ('English', '00000000-0000-0000-0000-000000000000'),
  ('Chemistry', '00000000-0000-0000-0000-000000000000'),
  ('Biology', '00000000-0000-0000-0000-000000000000'),
  ('History', '00000000-0000-0000-0000-000000000000'),
  ('Computer Science', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (name) DO NOTHING;