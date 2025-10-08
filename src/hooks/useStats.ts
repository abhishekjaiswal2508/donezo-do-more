import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useStats = () => {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          totalReminders: 0,
          completedReminders: 0,
          pendingReminders: 0,
          overdueReminders: 0,
        };
      }

      // Get total reminders count
      const { count: totalReminders } = await supabase
        .from('reminders')
        .select('*', { count: 'exact', head: true });

      // Get completed reminders count (user-specific)
      const { count: completedReminders } = await supabase
        .from('reminder_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Calculate pending: total minus completed by current user
      const pendingReminders = (totalReminders || 0) - (completedReminders || 0);

      // Get overdue reminders count (not completed and past deadline)
      const now = new Date().toISOString();
      const { data: overdueRemindersData } = await supabase
        .from('reminders')
        .select(`
          id,
          deadline,
          reminder_completions!left (
            user_id
          )
        `)
        .lt('deadline', now);

      const overdueCount = overdueRemindersData?.filter(reminder => {
        const isCompleted = reminder.reminder_completions?.some((c: any) => c.user_id === user.id);
        return !isCompleted;
      }).length || 0;

      return {
        totalReminders: totalReminders || 0,
        completedReminders: completedReminders || 0,
        pendingReminders: Math.max(0, pendingReminders),
        overdueReminders: overdueCount,
      };
    },
    enabled: true,
  });
};