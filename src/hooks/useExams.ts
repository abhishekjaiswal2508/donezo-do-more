import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Exam {
  id: string;
  subject: string;
  exam_date: string;
  exam_type: 'Internal Test' | 'Viva' | 'Mid-Sem' | 'Final';
  description: string | null;
  group_id: string | null;
  created_by: string;
  uploader_name: string;
  created_at: string;
  updated_at: string;
  group?: {
    id: string;
    name: string;
  };
}

export const useExams = () => {
  return useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          groups (
            id,
            name
          )
        `)
        .order('exam_date', { ascending: true });

      if (error) throw error;
      return data as Exam[];
    },
  });
};

export const useCreateExam = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (exam: {
      subject: string;
      exam_date: string;
      exam_type: string;
      description?: string;
      group_id?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check for duplicates using AI
      const { data: duplicateCheck, error: duplicateError } = await supabase.functions.invoke('check-duplicate', {
        body: {
          type: 'exam',
          item: exam
        }
      });

      if (duplicateError) {
        console.error('Duplicate check error:', duplicateError);
        // Continue with creation if duplicate check fails
      } else if (duplicateCheck?.isDuplicate) {
        throw new Error(duplicateCheck.message || 'This exam is already registered');
      }

      // Get user profile for uploader name
      const { data: profile } = await supabase
        .from('users')
        .select('username')
        .eq('auth_user_id', user.id)
        .single();

      const { data, error } = await supabase
        .from('exams')
        .insert([
          {
            ...exam,
            created_by: user.id,
            uploader_name: profile?.username || user.email?.split('@')[0] || 'Unknown',
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast({
        title: "Success",
        description: "Exam schedule added successfully",
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

export const useDeleteExam = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (examId: string) => {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast({
        title: "Success",
        description: "Exam schedule deleted successfully",
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
