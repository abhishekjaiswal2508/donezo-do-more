-- Fix the foreign key constraint on reminder_completions
-- The issue is that user_id should reference the users table's auth_user_id column
-- not the id column, since we're using auth.uid() which returns the auth user id

-- First, drop the existing foreign key constraint if it exists
ALTER TABLE public.reminder_completions 
DROP CONSTRAINT IF EXISTS reminder_completions_user_id_fkey;

-- Add the correct foreign key constraint
-- user_id in reminder_completions should reference auth_user_id in users table
ALTER TABLE public.reminder_completions
ADD CONSTRAINT reminder_completions_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users(auth_user_id) 
ON DELETE CASCADE;

-- Delete all existing default subjects so users can create their own
DELETE FROM public.subjects WHERE name IN ('Mathematics', 'Science', 'English', 'History', 'Geography', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Art', 'Music', 'Physical Education');