import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Medal, Award, Star, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardUser {
  id: string;
  username: string;
  email: string;
  points: number;
  completedAssignments: number;
}

const Leaderboard = () => {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchLeaderboardData();
  }, [user, navigate]);

  const fetchLeaderboardData = async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) throw usersError;

      // Get completion counts for each user
      const leaderboardData = await Promise.all(
        usersData.map(async (userData) => {
          const { count } = await supabase
            .from('reminder_completions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userData.auth_user_id);

          return {
            id: userData.id,
            username: userData.username,
            email: userData.email,
            points: userData.points,
            completedAssignments: count || 0,
          };
        })
      );

      // Sort by points and then by completed assignments
      const sortedData = leaderboardData.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.completedAssignments - a.completedAssignments;
      });

      setUsers(sortedData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 1:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 2:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <Star className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 1:
        return 'bg-gradient-to-r from-gray-300 to-gray-500';
      case 2:
        return 'bg-gradient-to-r from-amber-400 to-amber-600';
      default:
        return 'bg-muted';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leaderboard</h1>
          <p className="text-muted-foreground">Top performers in assignment completion</p>
        </div>
      </div>

      {/* Top 3 Podium */}
      {users.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* Second Place */}
          <Card className="relative">
            <CardContent className="pt-6 text-center">
              <div className="flex justify-center mb-4">
                <Medal className="h-12 w-12 text-gray-400" />
              </div>
              <Avatar className="mx-auto mb-2 h-16 w-16">
                <AvatarFallback className="text-lg">
                  {users[1]?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-semibold">{users[1]?.username}</h3>
              <p className="text-lg font-bold text-primary">{users[1]?.points} pts</p>
              <p className="text-sm text-muted-foreground">
                {users[1]?.completedAssignments} completed
              </p>
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gray-400">
                #2
              </Badge>
            </CardContent>
          </Card>

          {/* First Place */}
          <Card className="relative transform scale-105">
            <CardContent className="pt-6 text-center">
              <div className="flex justify-center mb-4">
                <Trophy className="h-16 w-16 text-yellow-500" />
              </div>
              <Avatar className="mx-auto mb-2 h-20 w-20">
                <AvatarFallback className="text-xl">
                  {users[0]?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-bold text-lg">{users[0]?.username}</h3>
              <p className="text-2xl font-bold text-primary">{users[0]?.points} pts</p>
              <p className="text-sm text-muted-foreground">
                {users[0]?.completedAssignments} completed
              </p>
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-yellow-500">
                #1
              </Badge>
            </CardContent>
          </Card>

          {/* Third Place */}
          <Card className="relative">
            <CardContent className="pt-6 text-center">
              <div className="flex justify-center mb-4">
                <Award className="h-12 w-12 text-amber-600" />
              </div>
              <Avatar className="mx-auto mb-2 h-16 w-16">
                <AvatarFallback className="text-lg">
                  {users[2]?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-semibold">{users[2]?.username}</h3>
              <p className="text-lg font-bold text-primary">{users[2]?.points} pts</p>
              <p className="text-sm text-muted-foreground">
                {users[2]?.completedAssignments} completed
              </p>
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-amber-600">
                #3
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Full Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Full Rankings</CardTitle>
          <CardDescription>Complete leaderboard of all users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((userData, index) => (
              <div
                key={userData.id}
                className={`flex items-center gap-4 p-4 rounded-lg ${
                  userData.email === user?.email ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-lg font-bold w-8 text-center">#{index + 1}</div>
                  {getRankIcon(index)}
                </div>
                
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {userData.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{userData.username}</h3>
                    {userData.email === user?.email && (
                      <Badge variant="secondary">You</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{userData.email}</p>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">{userData.points} pts</div>
                  <div className="text-sm text-muted-foreground">
                    {userData.completedAssignments} completed
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Leaderboard;