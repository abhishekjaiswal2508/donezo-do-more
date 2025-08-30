import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ReminderCard from '@/components/ReminderCard';
import { Search, Filter, Plus, LogIn } from 'lucide-react';
import { useReminders, useCompleteReminder, useUploadAssignment } from '@/hooks/useReminders';
import { useStats } from '@/hooks/useStats';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Fetch reminders and stats from Supabase
  const { data: reminders = [], isLoading: remindersLoading } = useReminders();
  const { data: stats, isLoading: statsLoading } = useStats();
  const completeReminderMutation = useCompleteReminder();
  const uploadAssignmentMutation = useUploadAssignment();

  // Calculate priority based on deadline proximity
  const getAutomaticPriority = (deadline: string): 'high' | 'medium' | 'low' => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDeadline <= 3) return 'high';    // Red - 3 days or less
    if (daysUntilDeadline <= 7) return 'medium';  // Yellow - 4-7 days
    return 'low';                                  // Green - More than 7 days
  };

  // Add automatic priority to reminders
  const remindersWithPriority = reminders.map(reminder => ({
    ...reminder,
    priority: getAutomaticPriority(reminder.deadline)
  }));

  const subjects = ['All', 'Mathematics', 'Physics', 'English', 'Chemistry', 'Biology'];

  const filteredReminders = remindersWithPriority.filter(reminder => {
    const matchesSearch = reminder.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reminder.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'All' || reminder.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const sortedReminders = filteredReminders.sort((a, b) => 
    new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  );

  const handleComplete = (id: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to complete assignments",
        variant: "destructive",
      });
      return;
    }
    completeReminderMutation.mutate(id);
  };

  const handleUpload = (id: string) => {
    if (!user) {
      toast({
        title: "Authentication required", 
        description: "Please log in to upload assignments",
        variant: "destructive",
      });
      return;
    }
    
    // Create file input to let user select file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        uploadAssignmentMutation.mutate({ reminderId: id, file });
      }
    };
    input.click();
  };

  // Show loading state
  if (loading || remindersLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading assignments...</div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Assignment Board</h1>
          <p className="text-muted-foreground mb-6">Please log in to view and manage your assignments</p>
          <Button onClick={() => window.location.href = '/auth'}>
            <LogIn className="h-4 w-4 mr-2" />
            Log In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assignment Board</h1>
          <p className="text-muted-foreground">Stay on top of your assignments</p>
        </div>
        <Button className="lg:w-auto" onClick={() => navigate('/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Reminder
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search assignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {subjects.map((subject) => (
              <Badge
                key={subject}
                variant={selectedSubject === subject ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap"
                onClick={() => setSelectedSubject(subject)}
              >
                {subject}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-primary">{stats?.totalReminders || 0}</div>
          <div className="text-sm text-muted-foreground">Total Reminders</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-secondary">{stats?.completedReminders || 0}</div>
          <div className="text-sm text-muted-foreground">Completed</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-accent">{stats?.pendingReminders || 0}</div>
          <div className="text-sm text-muted-foreground">Pending</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-destructive">{stats?.overdueReminders || 0}</div>
          <div className="text-sm text-muted-foreground">Overdue</div>
        </Card>
      </div>

      {/* Reminders List */}
      <div className="space-y-4">
        {sortedReminders.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-muted-foreground">
              No assignments found. {searchTerm && 'Try adjusting your search.'}
            </div>
          </Card>
        ) : (
          sortedReminders.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              onComplete={handleComplete}
              onUpload={handleUpload}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Index;
