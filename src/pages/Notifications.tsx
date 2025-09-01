import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bell, BellOff, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useReminders } from '@/hooks/useReminders';
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns';

interface Notification {
  id: string;
  type: 'deadline' | 'overdue' | 'completed';
  title: string;
  message: string;
  timestamp: Date;
  reminderId?: string;
  isRead: boolean;
}

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();
  const { data: reminders } = useReminders();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    generateNotifications();
  }, [user, reminders, navigate]);

  const generateNotifications = () => {
    if (!reminders) return;

    const notifs: Notification[] = [];
    const now = new Date();

    reminders.forEach((reminder) => {
      const deadline = new Date(reminder.deadline);
      const isUserCompleted = reminder.isCompleted;

      // Overdue notifications
      if (deadline < now && !isUserCompleted) {
        notifs.push({
          id: `overdue-${reminder.id}`,
          type: 'overdue',
          title: 'Assignment Overdue',
          message: `"${reminder.title}" was due ${format(deadline, 'PPp')}`,
          timestamp: deadline,
          reminderId: reminder.id,
          isRead: false,
        });
      }
      // Due today
      else if (isToday(deadline) && !isUserCompleted) {
        notifs.push({
          id: `today-${reminder.id}`,
          type: 'deadline',
          title: 'Due Today',
          message: `"${reminder.title}" is due today at ${format(deadline, 'p')}`,
          timestamp: deadline,
          reminderId: reminder.id,
          isRead: false,
        });
      }
      // Due tomorrow
      else if (isTomorrow(deadline) && !isUserCompleted) {
        notifs.push({
          id: `tomorrow-${reminder.id}`,
          type: 'deadline',
          title: 'Due Tomorrow',
          message: `"${reminder.title}" is due tomorrow at ${format(deadline, 'p')}`,
          timestamp: deadline,
          reminderId: reminder.id,
          isRead: false,
        });
      }
      // Due this week
      else if (isThisWeek(deadline) && !isUserCompleted) {
        notifs.push({
          id: `week-${reminder.id}`,
          type: 'deadline',
          title: 'Due This Week',
          message: `"${reminder.title}" is due ${format(deadline, 'EEEE')} at ${format(deadline, 'p')}`,
          timestamp: deadline,
          reminderId: reminder.id,
          isRead: false,
        });
      }

      // Completion notifications (recent)
      if (isUserCompleted) {
        notifs.push({
          id: `completed-${reminder.id}`,
          type: 'completed',
          title: 'Assignment Completed',
          message: `You completed "${reminder.title}"`,
          timestamp: new Date(), // Use current time as completion time
          reminderId: reminder.id,
          isRead: false,
        });
      }
    });

    // Sort by priority: overdue > today > tomorrow > this week > completed
    const priorityOrder = { overdue: 0, deadline: 1, completed: 2 };
    notifs.sort((a, b) => {
      if (a.type !== b.type) {
        return priorityOrder[a.type] - priorityOrder[b.type];
      }
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    setNotifications(notifs);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'overdue':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'deadline':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getNotificationBadgeColor = (type: string) => {
    switch (type) {
      case 'overdue':
        return 'bg-red-500 text-white';
      case 'deadline':
        return 'bg-yellow-500 text-white';
      case 'completed':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground">Stay updated on your assignments</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <BellOff className="h-4 w-4 mr-2" />
            Mark all as read ({unreadCount})
          </Button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">
                  {notifications.filter(n => n.type === 'overdue').length}
                </p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">
                  {notifications.filter(n => n.type === 'deadline').length}
                </p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {notifications.filter(n => n.type === 'completed').length}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Notifications
          </CardTitle>
          <CardDescription>Your assignment updates and reminders</CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No notifications at the moment</p>
              <p className="text-sm text-muted-foreground mt-2">
                You'll see assignment reminders and updates here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                    notification.isRead
                      ? 'bg-muted/50 border-muted'
                      : 'bg-background border-border shadow-sm'
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{notification.title}</h4>
                      <Badge className={getNotificationBadgeColor(notification.type)}>
                        {notification.type}
                      </Badge>
                      {!notification.isRead && (
                        <div className="h-2 w-2 bg-primary rounded-full" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(notification.timestamp, 'PPp')}
                    </p>
                  </div>

                  {notification.reminderId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/');
                      }}
                    >
                      View
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;