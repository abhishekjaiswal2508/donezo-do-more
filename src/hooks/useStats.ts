import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useStats = () => {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get total reminders count
      const { count: totalReminders } = await supabase
        .from('reminders')
        .select('*', { count: 'exact', head: true });

      // Get completed reminders count (user-specific)
      const { count: completedReminders } = await supabase
        .from('reminder_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // Get pending reminders count
      const { data: allReminders } = await supabase
        .from('reminders')
        .select(`
          id,
          reminder_completions!inner (
            user_id
          )
        `);

      // Count reminders not completed by current user
      const { data: userCompletions } = await supabase
        .from('reminder_completions')
        .select('reminder_id')
        .eq('user_id', user?.id);

      const completedIds = new Set(userCompletions?.map(c => c.reminder_id) || []);
      const pendingReminders = (allReminders?.length || 0) - completedIds.size;

      // Get overdue reminders count
      const now = new Date().toISOString();
      const { data: overdueRemindersData } = await supabase
        .from('reminders')
        .select(`
          id,
          deadline,
          reminder_completions (
            user_id
          )
        `)
        .lt('deadline', now);

      const overdueCount = overdueRemindersData?.filter(reminder => {
        const isCompleted = reminder.reminder_completions.some((c: any) => c.user_id === user?.id);
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