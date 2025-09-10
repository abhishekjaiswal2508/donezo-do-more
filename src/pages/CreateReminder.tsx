import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateReminder } from '@/hooks/useReminders';
import { useAuth } from '@/hooks/useAuth';
import { useGroups } from '@/hooks/useGroups';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { useEffect } from 'react';

const CreateReminder = () => {
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    deadline: '',
    description: '',
    group_id: '',
  });

  const { user, loading } = useAuth();
  const { groups } = useGroups();
  const createReminderMutation = useCreateReminder();
  const navigate = useNavigate();

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const subjects = ['Mathematics', 'Physics', 'English', 'Chemistry', 'Biology', 'History', 'Computer Science'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.subject || !formData.deadline) {
      return;
    }

    createReminderMutation.mutate(formData, {
      onSuccess: () => {
        navigate('/');
      },
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create Assignment Reminder</h1>
          <p className="text-muted-foreground">Add a new assignment to track</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Assignment
          </CardTitle>
          <CardDescription>
            Fill in the details for your new assignment reminder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Assignment Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Mathematics Quiz - Chapter 5"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Select value={formData.subject} onValueChange={(value) => handleInputChange('subject', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline *</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) => handleInputChange('deadline', e.target.value)}
                required
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Additional details about the assignment..."
                rows={4}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group">Group (Optional)</Label>
              <Select value={formData.group_id} onValueChange={(value) => handleInputChange('group_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a group (or leave as public assignment)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Public Assignment (No Group)</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={createReminderMutation.isPending}>
                {createReminderMutation.isPending ? 'Creating...' : 'Create Reminder'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateReminder;