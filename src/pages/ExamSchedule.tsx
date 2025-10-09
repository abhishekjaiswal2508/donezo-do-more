import { useState } from 'react';
import { Calendar, Search, Plus, Trash2, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useExams, useCreateExam, useDeleteExam } from '@/hooks/useExams';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/hooks/useAuth';

const examTypes = ['Internal Test', 'Viva', 'Mid-Sem', 'Final'];

const ExamSchedule = () => {
  const { data: exams, isLoading } = useExams();
  const { groups } = useGroups();
  const { user } = useAuth();
  const createExam = useCreateExam();
  const deleteExam = useDeleteExam();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    subject: '',
    exam_date: '',
    exam_type: 'Internal Test',
    description: '',
    group_id: '',
  });

  const filteredExams = exams?.filter((exam) => {
    const matchesSearch = exam.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || exam.exam_type === filterType;
    return matchesSearch && matchesType;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createExam.mutate(
      {
        ...formData,
        group_id: formData.group_id || undefined,
      },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          setFormData({
            subject: '',
            exam_date: '',
            exam_type: 'Internal Test',
            description: '',
            group_id: '',
          });
        },
      }
    );
  };

  const handleDelete = (examId: string) => {
    if (window.confirm('Are you sure you want to delete this exam schedule?')) {
      deleteExam.mutate(examId);
    }
  };

  const getExamTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'Final':
        return 'bg-red-500/10 text-red-500 hover:bg-red-500/20';
      case 'Mid-Sem':
        return 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20';
      case 'Viva':
        return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
      default:
        return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
    }
  };

  const isUpcomingExam = (examDate: string) => {
    return new Date(examDate) > new Date();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exam Schedule</h1>
          <p className="text-muted-foreground">View and manage upcoming exams</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Exam
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Exam</DialogTitle>
              <DialogDescription>
                Add a new exam to the schedule. All group members will be notified.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exam_date">Date & Time *</Label>
                <Input
                  id="exam_date"
                  type="datetime-local"
                  value={formData.exam_date}
                  onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exam_type">Exam Type *</Label>
                <Select
                  value={formData.exam_type}
                  onValueChange={(value) => setFormData({ ...formData, exam_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {examTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="group_id">Group (Optional)</Label>
                <Select
                  value={formData.group_id}
                  onValueChange={(value) => setFormData({ ...formData, group_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Group</SelectItem>
                    {groups?.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details about the exam..."
                />
              </div>

              <Button type="submit" className="w-full" disabled={createExam.isPending}>
                {createExam.isPending ? 'Adding...' : 'Add Exam'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {examTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading exams...</div>
      ) : filteredExams && filteredExams.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam) => (
            <Card key={exam.id} className={isUpcomingExam(exam.exam_date) ? 'border-primary/50' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{exam.subject}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {exam.uploader_name}
                    </CardDescription>
                  </div>
                  {user?.id === exam.created_by && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleDelete(exam.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <Badge className={getExamTypeBadgeColor(exam.exam_type)}>
                  {exam.exam_type}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(exam.exam_date), 'PPP')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(exam.exam_date), 'p')}</span>
                </div>
                {exam.group && (
                  <Badge variant="outline" className="text-xs">
                    {exam.group.name}
                  </Badge>
                )}
                {exam.description && (
                  <p className="text-sm text-muted-foreground mt-2">{exam.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-xl font-semibold mb-2">No exams scheduled</p>
            <p className="text-muted-foreground mb-4">Add your first exam to get started</p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Exam
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExamSchedule;
