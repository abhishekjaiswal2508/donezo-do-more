import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Group {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  is_creator?: boolean;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  username?: string;
}

export const useGroups = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get groups where user is a member
      const { data: memberGroups, error: memberError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups!inner(
            id,
            name,
            description,
            created_by,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      // Transform the data and add metadata
      const groupsWithMetadata = await Promise.all(
        (memberGroups || []).map(async (member: any) => {
          const group = member.groups;
          
          // Get member count
          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          return {
            ...group,
            member_count: count || 0,
            is_creator: group.created_by === user.id
          };
        })
      );

      setGroups(groupsWithMetadata);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch groups",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async (name: string, description?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create the group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name,
          description,
          created_by: user.id
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'admin'
        });

      if (memberError) throw memberError;

      toast({
        title: "Success",
        description: "Group created successfully"
      });

      await fetchGroups();
      return group;
    } catch (error: any) {
      toast({
        title: "Error", 
        description: error.message || "Failed to create group",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Group deleted successfully"
      });

      await fetchGroups();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete group", 
        variant: "destructive"
      });
    }
  };

  const addMember = async (groupId: string, userEmail: string) => {
    try {
      // First find the user by email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('auth_user_id')
        .eq('email', userEmail)
        .single();

      if (userError || !userData) {
        throw new Error('User not found');
      }

      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: userData.auth_user_id,
          role: 'member'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member added successfully"
      });

      await fetchGroups();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add member",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchGroups();

    // Set up real-time subscription
    const channel = supabase
      .channel('groups-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'groups'
      }, () => {
        fetchGroups();
      })
      .on('postgres_changes', {
        event: '*', 
        schema: 'public',
        table: 'group_members'
      }, () => {
        fetchGroups();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    groups,
    loading,
    createGroup,
    deleteGroup,
    addMember,
    refetch: fetchGroups
  };
};