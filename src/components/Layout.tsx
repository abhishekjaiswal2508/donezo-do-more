import { Outlet, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useReminders } from '@/hooks/useReminders';
import { BookOpen, LogOut, Plus, User, Trophy, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';

const Layout = () => {
  const { user, signOut, loading } = useAuth();
  const { data: reminders } = useReminders();
  const { toast } = useToast();
  const location = useLocation();

  // Calculate notification count
  const notificationCount = useMemo(() => {
    if (!reminders || !user) return 0;
    
    const now = new Date();
    return reminders.filter(reminder => {
      const deadline = new Date(reminder.deadline);
      const isOverdue = deadline < now && !reminder.isCompleted;
      const isDueToday = deadline.toDateString() === now.toDateString() && !reminder.isCompleted;
      return isOverdue || isDueToday;
    }).length;
  }, [reminders, user]);

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Signed out successfully",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link to="/" className="mr-6 flex items-center space-x-2">
              <BookOpen className="h-6 w-6" />
              <span className="font-bold">Assignment Board</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Welcome back!
                </span>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/notifications" className="relative">
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                    {notificationCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                      >
                        {notificationCount}
                      </Badge>
                    )}
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/leaderboard">
                    <Trophy className="h-4 w-4 mr-2" />
                    Leaderboard
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/profile">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/create">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Assignment
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout}
                  disabled={loading}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {loading ? 'Signing out...' : 'Sign Out'}
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-6 px-4">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;