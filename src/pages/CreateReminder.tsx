import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateReminder, useSimilarReminders } from '@/hooks/useReminders';
import { useAuth } from '@/hooks/useAuth';
import { useGroups } from '@/hooks/useGroups';
import { useSubjects, useCreateSubject, useDeleteSubject } from '@/hooks/useSubjects';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

const CreateReminder = () => {
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    deadline: '',
    description: '',
    group_id: 'public',
  });

  const { user, loading } = useAuth();
  const { groups } = useGroups();
  const { data: subjects = [], isLoading: subjectsLoading } = useSubjects();
  const { data: similarReminders = [] } = useSimilarReminders(formData.title, formData.subject);
  const createReminderMutation = useCreateReminder();
  const createSubjectMutation = useCreateSubject();
  const deleteSubjectMutation = useDeleteSubject();
  const navigate = useNavigate();
  
  const [newSubject, setNewSubject] = useState('');
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleAddSubject = async () => {
    if (!newSubject.trim()) return;
    
    await createSubjectMutation.mutateAsync(newSubject.trim());
    setNewSubject('');
    setShowSubjectDialog(false);
  };

  const handleDeleteSubject = async (id: string) => {
    await deleteSubjectMutation.mutateAsync(id);
  };

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
              {similarReminders.length > 0 && (
                <Alert variant="default" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-1">Similar assignments found:</div>
                    <ul className="text-sm space-y-1">
                      {similarReminders.map((reminder) => (
                        <li key={reminder.id} className="text-muted-foreground">
                          • {reminder.title} ({reminder.subject}) - {new Date(reminder.deadline).toLocaleDateString()}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="subject">Subject *</Label>
                <Dialog open={showSubjectDialog} onOpenChange={setShowSubjectDialog}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="ghost" size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Subject
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Manage Subjects</DialogTitle>
                      <DialogDescription>
                        Add or remove subjects from your list
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="New subject name"
                          value={newSubject}
                          onChange={(e) => setNewSubject(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSubject();
                            }
                          }}
                        />
                        <Button 
                          type="button" 
                          onClick={handleAddSubject}
                          disabled={!newSubject.trim() || createSubjectMutation.isPending}
                        >
                          Add
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {subjectsLoading ? (
                          <p className="text-sm text-muted-foreground">Loading subjects...</p>
                        ) : subjects.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No subjects yet. Add one above!</p>
                        ) : (
                          subjects.map((subject) => {
                            const isSystemSubject = subject.created_by === '00000000-0000-0000-0000-000000000000';
                            return (
                              <div key={subject.id} className="flex items-center justify-between p-2 border rounded">
                                <span>{subject.name}</span>
                                {!isSystemSubject && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteSubject(subject.id)}
                                    disabled={deleteSubjectMutation.isPending}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowSubjectDialog(false)}>
                        Done
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <Select value={formData.subject} onValueChange={(value) => handleInputChange('subject', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjectsLoading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : subjects.length === 0 ? (
                    <SelectItem value="none" disabled>No subjects available</SelectItem>
                  ) : (
                    subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.name}>
                        {subject.name}
                      </SelectItem>
                    ))
                  )}
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
              <Select value={formData.group_id || 'public'} onValueChange={(value) => handleInputChange('group_id', value === 'public' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a group (or leave as public assignment)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public Assignment (No Group)</SelectItem>
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