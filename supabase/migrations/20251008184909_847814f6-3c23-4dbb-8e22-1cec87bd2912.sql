-- Remove foreign key constraint from reminders.created_by to auth.users
-- This follows best practice of not referencing auth schema tables directly
ALTER TABLE public.reminders 
DROP CONSTRAINT IF EXISTS reminders_created_by_fkey;