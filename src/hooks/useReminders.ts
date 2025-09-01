import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Reminder {
  id: string;
  title: string;
  subject: string;
  deadline: string;
  description: string | null;
  created_by: string;
  created_at: string;
  completions: number;
  totalStudents: number;
  isCompleted: boolean;
  priority?: 'high' | 'medium' | 'low';
}

export const useReminders = () => {
  return useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      // Get all reminders with their completions
      const { data: reminders, error: remindersError } = await supabase
        .from('reminders')
        .select(`
          *,
          reminder_completions (
            id,
            user_id,
            file_url
          )
        `);

      if (remindersError) throw remindersError;

      // Get current user to check if they completed each reminder
      const { data: { user } } = await supabase.auth.getUser();

      // Transform the data to match our interface
      const transformedReminders = reminders.map((reminder) => {
        const completions = reminder.reminder_completions || [];
        const isCompleted = user ? completions.some((c: any) => c.user_id === user.id) : false;
        
        return {
          id: reminder.id,
          title: reminder.title,
          subject: reminder.subject,
          deadline: reminder.deadline,
          description: reminder.description,
          created_by: reminder.created_by,
          created_at: reminder.created_at,
          completions: completions,
          totalStudents: 25, // Mock total students for now
          isCompleted,
        };
      });

      return transformedReminders;
    },
  });
};

export const useCreateReminder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (reminder: {
      title: string;
      subject: string;
      deadline: string;
      description?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('reminders')
        .insert([
          {
            ...reminder,
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast({
        title: "Success",
        description: "Reminder created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Hook to delete a reminder
export const useDeleteReminder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { mutate: deleteReminder, isPending, error } = useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', reminderId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast({
        title: "Success",
        description: "Assignment deleted successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete assignment",
        variant: "destructive",
      });
    },
  });

  return {
    mutate: deleteReminder,
    isPending,
    error,
  };
};

// Hook to download assignment file
export const useDownloadFile = () => {
  const { toast } = useToast();

  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('assignments')
        .download(fileUrl);

      if (error) {
        throw error;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "File downloaded successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",  
        description: error.message || "Failed to download file",
        variant: "destructive",
      });
    }
  };

  return { downloadFile };
};

export const useCompleteReminder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('reminder_completions')
        .insert([
          {
            reminder_id: reminderId,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast({
        title: "Success",
        description: "Assignment marked as completed! You earned 10 points.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUploadAssignment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ reminderId, file }: { reminderId: string; file: File }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${reminderId}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('assignments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Update or create completion record with file URL
      const { data, error } = await supabase
        .from('reminder_completions')
        .upsert(
          {
            reminder_id: reminderId,
            user_id: user.id,
            file_url: uploadData.path,
          },
          {
            onConflict: 'reminder_id,user_id',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast({
        title: "Success",
        description: "Assignment uploaded successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};