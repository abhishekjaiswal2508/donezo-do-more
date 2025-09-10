import { useState } from 'react';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Plus, Settings, Trash2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const Groups = () => {
  const { user, loading: authLoading } = useAuth();
  const { groups, loading, createGroup, deleteGroup, addMember } = useGroups();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [memberEmail, setMemberEmail] = useState('');
  const [creating, setCreating] = useState(false);

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleCreateGroup = async () => {
    if (!formData.name.trim()) return;
    
    setCreating(true);
    try {
      await createGroup(formData.name, formData.description);
      setFormData({ name: '', description: '' });
      setShowCreateDialog(false);
    } finally {
      setCreating(false);
    }
  };

  const handleAddMember = async (groupId: string) => {
    if (!memberEmail.trim()) return;
    
    await addMember(groupId, memberEmail);
    setMemberEmail('');
    setShowAddMemberDialog(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">My Groups</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Groups</h1>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
              <DialogDescription>
                Create a group for your class or study group
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Math 101, Computer Science Class"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the group..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateGroup} disabled={creating || !formData.name.trim()}>
                {creating ? 'Creating...' : 'Create Group'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No Groups Yet</CardTitle>
            <CardDescription className="mb-4">
              Create or join a group to start collaborating on assignments
            </CardDescription>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {group.description || 'No description'}
                    </CardDescription>
                  </div>
                  {group.is_creator && (
                    <Badge variant="secondary">Admin</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-muted-foreground mb-4">
                  <Users className="h-4 w-4 mr-2" />
                  {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                </div>
                
                <div className="flex gap-2">
                  {group.is_creator && (
                    <>
                      <Dialog open={showAddMemberDialog === group.id} onOpenChange={(open) => setShowAddMemberDialog(open ? group.id : null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-1" />
                            Add Member
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Member to {group.name}</DialogTitle>
                            <DialogDescription>
                              Enter the email address of the user you want to add
                            </DialogDescription>
                          </DialogHeader>
                          <div>
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                              id="email"
                              type="email"
                              value={memberEmail}
                              onChange={(e) => setMemberEmail(e.target.value)}
                              placeholder="user@example.com"
                            />
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowAddMemberDialog(null)}>
                              Cancel
                            </Button>
                            <Button onClick={() => handleAddMember(group.id)} disabled={!memberEmail.trim()}>
                              Add Member
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteGroup(group.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!showAddMemberDialog} onOpenChange={() => setShowAddMemberDialog(null)}>
        {/* Dialog content is rendered above */}
      </Dialog>
    </div>
  );
};

export default Groups;