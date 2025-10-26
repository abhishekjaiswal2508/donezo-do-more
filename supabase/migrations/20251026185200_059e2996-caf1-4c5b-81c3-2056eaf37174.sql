-- Add source column to reminders table to track where assignments come from
ALTER TABLE public.reminders 
ADD COLUMN source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'google_classroom', 'ms_teams'));

-- Create table to store OAuth tokens for external integrations
CREATE TABLE public.user_integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  platform text NOT NULL CHECK (platform IN ('google_classroom', 'ms_teams')),
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamp with time zone,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Enable RLS
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own integrations
CREATE POLICY "Users can view their own integrations"
ON public.user_integrations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own integrations"
ON public.user_integrations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations"
ON public.user_integrations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations"
ON public.user_integrations
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_integrations_updated_at
BEFORE UPDATE ON public.user_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_user_integrations_user_platform ON public.user_integrations(user_id, platform);