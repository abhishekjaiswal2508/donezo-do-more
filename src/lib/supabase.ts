import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          registration_no: string;
          created_at: string;
          points: number;
        };
        Insert: {
          id?: string;
          registration_no: string;
          created_at?: string;
          points?: number;
        };
        Update: {
          id?: string;
          registration_no?: string;
          created_at?: string;
          points?: number;
        };
      };
      reminders: {
        Row: {
          id: string;
          title: string;
          subject: string;
          deadline: string;
          description: string;
          pdf_url: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          subject: string;
          deadline: string;
          description: string;
          pdf_url?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          subject?: string;
          deadline?: string;
          description?: string;
          pdf_url?: string | null;
          created_by?: string;
          created_at?: string;
        };
      };
      completions: {
        Row: {
          id: string;
          reminder_id: string;
          user_id: string;
          completed_at: string;
          assignment_url: string | null;
        };
        Insert: {
          id?: string;
          reminder_id: string;
          user_id: string;
          completed_at?: string;
          assignment_url?: string | null;
        };
        Update: {
          id?: string;
          reminder_id?: string;
          user_id?: string;
          completed_at?: string;
          assignment_url?: string | null;
        };
      };
    };
  };
};