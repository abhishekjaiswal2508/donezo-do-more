import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, FileText, Users, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ReminderCardProps {
  reminder: {
    id: string;
    title: string;
    subject: string;
    deadline: string;
    description: string;
    created_by: string;
    priority: 'high' | 'medium' | 'low';
    completions?: number;
    totalStudents?: number;
    isCompleted?: boolean;
  };
  onComplete?: (id: string) => void;
  onUpload?: (id: string) => void;
}

const ReminderCard = ({ reminder, onComplete, onUpload }: ReminderCardProps) => {
  const deadline = new Date(reminder.deadline);
  const isOverdue = deadline < new Date();
  const timeLeft = formatDistanceToNow(deadline, { addSuffix: true });
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-priority-high text-priority-high-foreground';
      case 'medium': return 'bg-priority-medium text-priority-medium-foreground';
      case 'low': return 'bg-priority-low text-priority-low-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <Card className="p-6 shadow-donezo hover:shadow-donezo-lg transition-all duration-300">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-card-foreground">{reminder.title}</h3>
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-xs">
                {reminder.subject}
              </Badge>
              <Badge className={`text-xs capitalize ${getPriorityColor(reminder.priority)}`}>
                {reminder.priority} Priority
              </Badge>
            </div>
          </div>
          {reminder.isCompleted && (
            <CheckCircle className="h-6 w-6 text-secondary" />
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {reminder.description}
        </p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{deadline.toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className={`h-4 w-4 ${isOverdue ? 'text-destructive' : ''}`} />
            <span className={isOverdue ? 'text-destructive' : ''}>{timeLeft}</span>
          </div>
        </div>

        {reminder.completions !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {reminder.completions}/{reminder.totalStudents || 0} completed
            </span>
            <div className="flex-1 bg-muted rounded-full h-2">
              <div 
                className="bg-secondary h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(reminder.completions / (reminder.totalStudents || 1)) * 100}%` 
                }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {!reminder.isCompleted && onComplete && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onComplete(reminder.id)}
            >
              Mark Complete
            </Button>
          )}
          {onUpload && (
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => onUpload(reminder.id)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Upload Assignment
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ReminderCard;