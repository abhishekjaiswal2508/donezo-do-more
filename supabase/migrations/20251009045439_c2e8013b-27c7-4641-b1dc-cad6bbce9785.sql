-- Create exams table for exam schedule management
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  exam_date TIMESTAMP WITH TIME ZONE NOT NULL,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('Internal Test', 'Viva', 'Mid-Sem', 'Final')),
  description TEXT,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  uploader_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- Create policies for exams
CREATE POLICY "Users can view exams in their groups"
ON public.exams
FOR SELECT
USING (
  (group_id IS NULL) OR 
  is_group_member(group_id, auth.uid()) OR 
  is_group_creator(group_id, auth.uid())
);

CREATE POLICY "Users can create exams"
ON public.exams
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own exams"
ON public.exams
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own exams"
ON public.exams
FOR DELETE
USING (auth.uid() = created_by);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_exams_updated_at
BEFORE UPDATE ON public.exams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_exams_group_id ON public.exams(group_id);
CREATE INDEX idx_exams_exam_date ON public.exams(exam_date);
CREATE INDEX idx_exams_subject ON public.exams(subject);