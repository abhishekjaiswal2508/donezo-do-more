import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, Upload, CheckCircle, Download, Trash2 } from 'lucide-react';
import { format, isAfter } from 'date-fns';
import { useCompleteReminder, useUploadAssignment, useDeleteReminder, useDownloadFile } from '@/hooks/useReminders';
import { useAuth } from '@/hooks/useAuth';
import { useRef } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ReminderCardProps {
  reminder: {
    id: string;
    title: string;
    subject: string;
    deadline: string;
    description: string | null;
    created_by: string;
    created_at: string;
    completions: any[];
    totalStudents: number;
    isCompleted: boolean;
    priority?: 'high' | 'medium' | 'low';
  };
}

const ReminderCard = ({ reminder }: ReminderCardProps) => {
  const { user } = useAuth();
  const completeReminderMutation = useCompleteReminder();
  const uploadAssignmentMutation = useUploadAssignment();
  const deleteReminderMutation = useDeleteReminder();
  const { downloadFile } = useDownloadFile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deadline = new Date(reminder.deadline);
  const isOverdue = isAfter(new Date(), deadline);

  const handleComplete = () => {
    completeReminderMutation.mutate(reminder.id);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    uploadAssignmentMutation.mutate({ reminderId: reminder.id, file });
  };

  const handleDownload = async () => {
    const completedByCurrentUser = reminder.completions?.find(c => c.user_id === user?.id);
    if (completedByCurrentUser?.file_url) {
      const fileName = `${reminder.title}_${completedByCurrentUser.file_url.split('/').pop()}`;
      await downloadFile(completedByCurrentUser.file_url, fileName);
    }
  };

  const handleDelete = () => {
    deleteReminderMutation.mutate(reminder.id);
  };

  const isCreatedByCurrentUser = user?.id === reminder.created_by;
  const completedByCurrentUser = reminder.completions?.find(c => c.user_id === user?.id);
  const hasUploadedFile = completedByCurrentUser?.file_url;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg">{reminder.title}</CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline">{reminder.subject}</Badge>
              {reminder.priority && (
                <Badge className={getPriorityColor(reminder.priority)}>
                  {reminder.priority} priority
                </Badge>
              )}
              {reminder.isCompleted && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
          </div>
        </div>
        {reminder.description && (
          <CardDescription>{reminder.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{format(deadline, 'PPp')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className={`h-4 w-4 ${isOverdue ? 'text-red-500' : ''}`} />
            <span className={isOverdue ? 'text-red-500' : ''}>
              {isOverdue ? 'Overdue' : 'Upcoming'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>{reminder.completions?.length || 0} completed</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {!reminder.isCompleted && (
            <Button
              onClick={handleComplete}
              disabled={completeReminderMutation.isPending}
              size="sm"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {completeReminderMutation.isPending ? 'Marking...' : 'Mark Complete'}
            </Button>
          )}
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadAssignmentMutation.isPending}
            variant="outline"
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploadAssignmentMutation.isPending ? 'Uploading...' : 'Upload Assignment'}
          </Button>

          {hasUploadedFile && (
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}

          {isCreatedByCurrentUser && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
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
                    disabled={deleteReminderMutation.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteReminderMutation.isPending ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
          onChange={handleFileUpload}
        />
      </CardContent>
    </Card>
  );
};

export default ReminderCard;