-- Create users table for user profiles
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reminders table
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES public.users(auth_user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reminder completions table
CREATE TABLE public.reminder_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reminder_id UUID NOT NULL REFERENCES public.reminders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(auth_user_id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  file_url TEXT,
  points_awarded INTEGER NOT NULL DEFAULT 10,
  UNIQUE(reminder_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_completions ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- Create policies for reminders table
CREATE POLICY "Anyone can view reminders" ON public.reminders FOR SELECT USING (true);
CREATE POLICY "Users can create reminders" ON public.reminders FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own reminders" ON public.reminders FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own reminders" ON public.reminders FOR DELETE USING (auth.uid() = created_by);

-- Create policies for reminder completions
CREATE POLICY "Users can view all completions" ON public.reminder_completions FOR SELECT USING (true);
CREATE POLICY "Users can create their own completions" ON public.reminder_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own completions" ON public.reminder_completions FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to award points when completing assignments
CREATE OR REPLACE FUNCTION public.award_points_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Award points to user when they complete an assignment
  UPDATE public.users 
  SET points = points + NEW.points_awarded 
  WHERE auth_user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to award points
CREATE TRIGGER award_points_trigger
  AFTER INSERT ON public.reminder_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.award_points_on_completion();

-- Create storage bucket for assignment PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('assignments', 'assignments', false);

-- Create storage policies
CREATE POLICY "Users can upload their own assignment files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'assignments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own assignment files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assignments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own assignment files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'assignments' AND auth.uid()::text = (storage.foldername(name))[1]);