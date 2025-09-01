import { useState, useRef, useEffect } from 'react';
import { Search, X, Calendar, Users, Tag, FolderOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';

interface GlobalSearchProps {
  workspaceId: number | null;
  onTaskSelect?: (taskId: number) => void;
  onProjectSelect?: (projectId: number) => void;
  onMemberSelect?: (memberId: number) => void;
  onCategorySelect?: (categoryId: number) => void;
}

interface SearchResults {
  tasks: any[];
  projects: any[];
  members: any[];
  categories: any[];
}

export default function GlobalSearch({
  workspaceId,
  onTaskSelect,
  onProjectSelect,
  onMemberSelect,
  onCategorySelect
}: GlobalSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch search results when query changes
  const { data: searchResults, isLoading } = useQuery<SearchResults>({
    queryKey: ['/api/search', workspaceId, searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/search?workspaceId=${workspaceId}&q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: !!workspaceId && searchQuery.length >= 2 && isOpen,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Close search when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isOpen || !searchResults) return;

      const allResults = [
        ...searchResults.tasks,
        ...searchResults.projects,
        ...searchResults.members,
        ...searchResults.categories
      ];

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => (prev + 1) % allResults.length);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => prev <= 0 ? allResults.length - 1 : prev - 1);
          break;
        case 'Enter':
          event.preventDefault();
          if (selectedIndex >= 0) {
            handleResultSelect(allResults[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex]);

  const handleResultSelect = (result: any) => {
    if (result.title) {
      // It's a task
      onTaskSelect?.(result.id);
    } else if (result.name && result.description !== undefined) {
      // It's a project
      onProjectSelect?.(result.id);
    } else if (result.name && result.email) {
      // It's a member
      onMemberSelect?.(result.id);
    } else if (result.name && result.color !== undefined) {
      // It's a category
      onCategorySelect?.(result.id);
    }
    
    setIsOpen(false);
    setSearchQuery('');
    setSelectedIndex(-1);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const getResultIndex = (sectionResults: any[], sectionStartIndex: number, itemIndex: number) => {
    return sectionStartIndex + itemIndex;
  };

  const renderTaskResult = (task: any, index: number, globalIndex: number) => (
    <div
      key={`task-${task.id}`}
      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
        selectedIndex === globalIndex ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-gray-50'
      }`}
      onClick={() => handleResultSelect(task)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h4 className="text-sm font-medium text-gray-900 truncate">{task.title}</h4>
          <Badge variant={task.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
            {task.status}
          </Badge>
        </div>
        {task.description && (
          <p className="text-xs text-gray-500 mt-1 truncate">{task.description}</p>
        )}
        <div className="flex items-center space-x-3 mt-2 text-xs text-gray-400">
          {task.dueDate && (
            <span className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
          {task.projectName && (
            <span className="flex items-center">
              <FolderOpen className="h-3 w-3 mr-1" />
              {task.projectName}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const renderProjectResult = (project: any, index: number, globalIndex: number) => (
    <div
      key={`project-${project.id}`}
      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
        selectedIndex === globalIndex ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-gray-50'
      }`}
      onClick={() => handleResultSelect(project)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <FolderOpen className="h-4 w-4 text-blue-500" />
          <h4 className="text-sm font-medium text-gray-900 truncate">{project.name}</h4>
        </div>
        {project.description && (
          <p className="text-xs text-gray-500 mt-1 truncate">{project.description}</p>
        )}
      </div>
    </div>
  );

  const renderMemberResult = (member: any, index: number, globalIndex: number) => {
    const memberName = member.name || member.email;
    
    return (
      <div
        key={`member-${member.id}`}
        className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
          selectedIndex === globalIndex ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-gray-50'
        }`}
        onClick={() => handleResultSelect(member)}
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-semibold">
              {memberName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900">{memberName}</h4>
            {member.email && (
              <p className="text-xs text-gray-500">{member.email}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCategoryResult = (category: any, index: number, globalIndex: number) => (
    <div
      key={`category-${category.id}`}
      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
        selectedIndex === globalIndex ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-gray-50'
      }`}
      onClick={() => handleResultSelect(category)}
    >
      <div className="flex items-center space-x-3">
        <Tag className="h-4 w-4 text-green-500" />
        <h4 className="text-sm font-medium text-gray-900">{category.name}</h4>
      </div>
    </div>
  );

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search tasks, projects, members..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(e.target.value.length >= 2);
            setSelectedIndex(-1);
          }}
          onFocus={() => {
            if (searchQuery.length >= 2) {
              setIsOpen(true);
            }
          }}
          className="pl-10 pr-10 w-64 md:w-80"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && searchQuery.length >= 2 && (
        <Card className="absolute top-full left-0 mt-1 max-h-[600px] overflow-y-auto z-50 border shadow-lg w-[600px]">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span>Searching...</span>
                </div>
              </div>
            ) : searchResults ? (
              <div className="grid grid-cols-2 gap-0">
                {/* Tasks Section */}
                {searchResults.tasks && searchResults.tasks.length > 0 && (
                  <div className="border-r border-gray-100">
                    <div className="px-3 py-2 bg-gray-50 border-b">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-600" />
                        <h3 className="text-sm font-semibold text-gray-700">
                          Tasks ({searchResults.tasks.length})
                        </h3>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {searchResults.tasks.slice(0, 6).map((task, index) => 
                        renderTaskResult(task, index, getResultIndex([], 0, index))
                      )}
                      {searchResults.tasks.length > 6 && (
                        <div className="px-3 py-1 text-xs text-gray-400 bg-gray-25">
                          +{searchResults.tasks.length - 6} more tasks
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Projects Section */}
                {searchResults.projects && searchResults.projects.length > 0 && (
                  <div className={searchResults.tasks?.length ? "" : "border-r border-gray-100"}>
                    <div className="px-3 py-2 bg-gray-50 border-b">
                      <div className="flex items-center space-x-2">
                        <FolderOpen className="h-4 w-4 text-gray-600" />
                        <h3 className="text-sm font-semibold text-gray-700">
                          Projects ({searchResults.projects.length})
                        </h3>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {searchResults.projects.slice(0, 6).map((project, index) => 
                        renderProjectResult(project, index, getResultIndex(searchResults.tasks, searchResults.tasks?.length || 0, index))
                      )}
                      {searchResults.projects.length > 6 && (
                        <div className="px-3 py-1 text-xs text-gray-400 bg-gray-25">
                          +{searchResults.projects.length - 6} more projects
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Members Section */}
                {searchResults.members && searchResults.members.length > 0 && (
                  <div className={`${(searchResults.tasks?.length || searchResults.projects?.length) ? "border-t border-gray-100" : ""} border-r border-gray-100`}>
                    <div className="px-3 py-2 bg-gray-50 border-b">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-600" />
                        <h3 className="text-sm font-semibold text-gray-700">
                          Members ({searchResults.members.length})
                        </h3>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {searchResults.members.slice(0, 6).map((member, index) => 
                        renderMemberResult(member, index, getResultIndex(
                          [...(searchResults.tasks || []), ...(searchResults.projects || [])], 
                          (searchResults.tasks?.length || 0) + (searchResults.projects?.length || 0), 
                          index
                        ))
                      )}
                      {searchResults.members.length > 6 && (
                        <div className="px-3 py-1 text-xs text-gray-400 bg-gray-25">
                          +{searchResults.members.length - 6} more members
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Categories Section */}
                {searchResults.categories && searchResults.categories.length > 0 && (
                  <div className={(searchResults.tasks?.length || searchResults.projects?.length) ? "border-t border-gray-100" : ""}>
                    <div className="px-3 py-2 bg-gray-50 border-b">
                      <div className="flex items-center space-x-2">
                        <Tag className="h-4 w-4 text-gray-600" />
                        <h3 className="text-sm font-semibold text-gray-700">
                          Categories ({searchResults.categories.length})
                        </h3>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {searchResults.categories.slice(0, 6).map((category, index) => 
                        renderCategoryResult(category, index, getResultIndex(
                          [...(searchResults.tasks || []), ...(searchResults.projects || []), ...(searchResults.members || [])], 
                          (searchResults.tasks?.length || 0) + (searchResults.projects?.length || 0) + (searchResults.members?.length || 0), 
                          index
                        ))
                      )}
                      {searchResults.categories.length > 6 && (
                        <div className="px-3 py-1 text-xs text-gray-400 bg-gray-25">
                          +{searchResults.categories.length - 6} more categories
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* No Results */}
                {(!searchResults.tasks?.length && !searchResults.projects?.length && 
                  !searchResults.members?.length && !searchResults.categories?.length) && (
                  <div className="col-span-2 p-4 text-center text-gray-500">
                    <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No results found for "{searchQuery}"</p>
                    <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}