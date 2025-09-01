-- Enable realtime for reminders table
ALTER TABLE public.reminders REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.reminders;

-- Enable realtime for reminder_completions table  
ALTER TABLE public.reminder_completions REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.reminder_completions;