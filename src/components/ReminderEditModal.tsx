import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Clock, Edit3, Trash2, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { useDeleteReminder } from '@/hooks/useReminders';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReminderEditModalProps {
  reminder: {
    id: string;
    title: string;
    subject: string;
    deadline: string;
    description: string | null;
    created_by: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const ReminderEditModal = ({ reminder, isOpen, onClose, onUpdate }: ReminderEditModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: reminder.title,
    subject: reminder.subject,
    deadline: reminder.deadline.slice(0, 16), // Format for datetime-local input
    description: reminder.description || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const deleteReminderMutation = useDeleteReminder();

  const handleSave = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('reminders')
        .update({
          title: formData.title,
          subject: formData.subject,
          deadline: formData.deadline,
          description: formData.description,
        })
        .eq('id', reminder.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignment updated successfully!",
      });
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update assignment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    deleteReminderMutation.mutate(reminder.id, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  const canEdit = user?.id === reminder.created_by;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Assignment Details</CardTitle>
            <CardDescription>View and manage assignment information</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && !isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {isEditing ? (
            // Edit Form
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Assignment Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter assignment title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter subject"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter assignment description"
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            // View Mode
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">{reminder.title}</h3>
                <div className="flex gap-2 mb-4">
                  <Badge variant="outline">{reminder.subject}</Badge>
                </div>
              </div>

              {reminder.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{reminder.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Deadline</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(reminder.deadline), 'PPp')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Time Left</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(reminder.deadline) > new Date() ? 'Upcoming' : 'Overdue'}
                    </p>
                  </div>
                </div>
              </div>

              {canEdit && (
                <div className="flex gap-2 pt-4 border-t">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Assignment
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this assignment? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReminderEditModal;