import { useState, useEffect } from 'react';
import { useReminders } from '@/hooks/useReminders';
import { useAuth } from '@/hooks/useAuth';
import { useStats } from '@/hooks/useStats';
import ReminderCard from '@/components/ReminderCard';
import SearchAndFilter from '@/components/SearchAndFilter';
import { VoiceAssistant } from '@/components/VoiceAssistant';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen, CheckCircle, Clock, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { user } = useAuth();
  const { data: reminders, isLoading, error, refetch } = useReminders();
  const { data: stats } = useStats();
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Set up real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('reminders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminders'
        },
        () => {
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminder_completions'
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  // Filter reminders based on search and filters
  const filteredReminders = reminders?.filter(reminder => {
    const matchesSearch = search === '' || 
      reminder.title.toLowerCase().includes(search.toLowerCase()) ||
      reminder.description?.toLowerCase().includes(search.toLowerCase()) ||
      reminder.subject.toLowerCase().includes(search.toLowerCase());

    const matchesSubject = subjectFilter === 'All' || reminder.subject === subjectFilter;

    const matchesStatus = statusFilter === 'All' || 
      (statusFilter === 'Completed' && reminder.isCompleted) ||
      (statusFilter === 'Pending' && !reminder.isCompleted);

    return matchesSearch && matchesSubject && matchesStatus;
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Voice Assistant */}
      {user && <VoiceAssistant />}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assignment Board</h1>
          <p className="text-muted-foreground">Track and manage your assignments</p>
        </div>
        {user && (
          <Button asChild>
            <Link to="/create">
              <Plus className="h-4 w-4 mr-2" />
              Add Assignment
            </Link>
          </Button>
        )}
      </div>

      {/* Statistics */}
      {user && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <BookOpen className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalReminders}</p>
                  <p className="text-sm text-muted-foreground">Total Assignments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.completedReminders}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.pendingReminders}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Trophy className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.overdueReminders}</p>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filter */}
      {user && (
        <Card>
          <CardContent className="pt-6">
            <SearchAndFilter
              onSearchChange={setSearch}
              onSubjectFilter={setSubjectFilter}
              onStatusFilter={setStatusFilter}
              searchValue={search}
              subjectFilter={subjectFilter}
              statusFilter={statusFilter}
            />
          </CardContent>
        </Card>
      )}

      {/* Reminders List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Your Assignments ({filteredReminders.length})
            </CardTitle>
            <CardDescription>
              Track and manage your assignments
            </CardDescription>
          </div>
          {user && (
            <Button asChild>
              <Link to="/create">
                <Plus className="h-4 w-4 mr-2" />
                Add Assignment
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!user ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Please sign in to view and manage assignments</p>
              <Button asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading assignments...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-destructive">Error loading assignments</div>
            </div>
          ) : filteredReminders.length > 0 ? (
            <div className="space-y-4">
              {filteredReminders.map((reminder) => (
                <ReminderCard key={reminder.id} reminder={reminder} />
              ))}
            </div>
          ) : reminders && reminders.length > 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No assignments match your filters</p>
              <Button variant="outline" onClick={() => {
                setSearch('');
                setSubjectFilter('All');
                setStatusFilter('All');
              }}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No assignments yet</p>
              <Button asChild>
                <Link to="/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first assignment
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;