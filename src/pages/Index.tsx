import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ReminderCard from '@/components/ReminderCard';
import { Search, Filter, Plus } from 'lucide-react';

const Index = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');

  // Mock data - replace with Supabase data
  const mockReminders = [
    {
      id: '1',
      title: 'Mathematics Assignment - Calculus',
      subject: 'Mathematics',
      deadline: '2025-01-02T23:59:59', // Close deadline
      description: 'Complete problems 1-20 from Chapter 5. Focus on integration by parts and substitution methods.',
      created_by: 'user1',
      completions: 12,
      totalStudents: 25,
      isCompleted: false
    },
    {
      id: '2',
      title: 'Physics Lab Report',
      subject: 'Physics',
      deadline: '2025-01-05T17:00:00', // Medium deadline
      description: 'Submit lab report on pendulum motion experiment with graphs and analysis.',
      created_by: 'user2',
      completions: 8,
      totalStudents: 25,
      isCompleted: true
    },
    {
      id: '3',
      title: 'English Essay - Shakespeare',
      subject: 'English',
      deadline: '2025-01-15T23:59:59', // Far deadline
      description: 'Write a 1500-word essay analyzing themes in Hamlet.',
      created_by: 'user3',
      completions: 3,
      totalStudents: 25,
      isCompleted: false
    }
  ];

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
  const remindersWithPriority = mockReminders.map(reminder => ({
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
    console.log('Mark as completed:', id);
  };

  const handleUpload = (id: string) => {
    console.log('Upload assignment for:', id);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assignment Board</h1>
          <p className="text-muted-foreground">Stay on top of your assignments</p>
        </div>
        <Button className="lg:w-auto">
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
          <div className="text-2xl font-bold text-primary">24</div>
          <div className="text-sm text-muted-foreground">Total Reminders</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-secondary">18</div>
          <div className="text-sm text-muted-foreground">Completed</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-accent">6</div>
          <div className="text-sm text-muted-foreground">Pending</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-destructive">2</div>
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
