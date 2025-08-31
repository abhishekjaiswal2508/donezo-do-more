import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, X } from 'lucide-react';

interface SearchAndFilterProps {
  onSearchChange: (search: string) => void;
  onSubjectFilter: (subject: string) => void;
  onStatusFilter: (status: string) => void;
  searchValue: string;
  subjectFilter: string;
  statusFilter: string;
}

const SearchAndFilter = ({
  onSearchChange,
  onSubjectFilter,
  onStatusFilter,
  searchValue,
  subjectFilter,
  statusFilter,
}: SearchAndFilterProps) => {
  const subjects = ['All', 'Mathematics', 'Physics', 'English', 'Chemistry', 'Biology', 'History', 'Computer Science'];
  const statuses = ['All', 'Pending', 'Completed'];

  const clearFilters = () => {
    onSearchChange('');
    onSubjectFilter('All');
    onStatusFilter('All');
  };

  const hasActiveFilters = searchValue || subjectFilter !== 'All' || statusFilter !== 'All';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search assignments..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Subject Filter */}
        <Select value={subjectFilter} onValueChange={onSubjectFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((subject) => (
              <SelectItem key={subject} value={subject}>
                {subject}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters} className="w-full sm:w-auto">
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filters active</span>
        </div>
      )}
    </div>
  );
};

export default SearchAndFilter;