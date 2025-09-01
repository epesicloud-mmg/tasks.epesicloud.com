import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import AiChat from "@/components/ai-chat";
import TimeSlotGrid from "@/components/time-slot-grid";
import RightPanel from "@/components/right-panel";
import NotificationsDropdown from "@/components/notifications-dropdown";
import { AIAssistantWidget } from "@/components/ai-assistant-widget";
import { PersonalizedInsightsCard } from "@/components/personalized-insights-card";
import GlobalSearch from "@/components/global-search";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Calendar,
  CalendarDays,
  CalendarRange,
  FolderOpen,
  FolderPlus,
  Tags,
  Search,
  Bell,
  User,
  Users,
  Plus,
  BarChart3,
  LayoutGrid,
  Settings,
  Archive,
  Clock,
  CheckCircle,
  Zap,
  Target,
  Briefcase,
  Home,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UserCircle,
  Building,
  HelpCircle,
  LogOut,
  Brain,
  Award,
  TrendingUp
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CreateTaskModal from "@/components/modals/create-task-modal";
import EditTaskModal from "@/components/modals/edit-task-modal";
import CreateProjectModal from "@/components/modals/create-project-modal";
import EditProjectModal from "@/components/modals/edit-project-modal";
import CreateWorkspaceModal from "@/components/modals/create-workspace-modal";
import CreateCategoryModal from "@/components/modals/create-category-modal";
import EditCategoryModal from "@/components/modals/edit-category-modal";
import AddMemberModal from "@/components/modals/add-member-modal";
import TaskCard from "@/components/task-card";

type ViewMode = 'home' | 'day' | 'week' | 'month' | 'project' | 'category' | 'team' | 'kanban';

export default function Dashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<number | null>(null);
  // Get default view mode from localStorage or use 'home' as fallback
  const getDefaultViewMode = (): ViewMode => {
    const saved = localStorage.getItem('defaultViewMode');
    return (saved as ViewMode) || 'home';
  };

  const [viewMode, setViewMode] = useState<ViewMode>(getDefaultViewMode());
  const [currentDate, setCurrentDate] = useState(() => {
    // Default to current date
    const defaultDate = new Date();
    return defaultDate;
  });

  // Check URL parameters for view mode and project filter (priority over localStorage)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlViewMode = urlParams.get('viewMode');
    const urlProject = urlParams.get('project');
    
    // Set URL parameters first (these take priority)
    if (urlViewMode && ['home', 'day', 'week', 'month', 'project', 'category', 'team', 'kanban'].includes(urlViewMode)) {
      setViewMode(urlViewMode as ViewMode);
    }
    
    if (urlProject) {
      setSelectedProjectId(urlProject);
      // Update localStorage with URL project filter
      localStorage.setItem('selectedProjectId', urlProject);
    } else {
      // Only restore from localStorage if no URL parameter
      const savedProjectId = localStorage.getItem('selectedProjectId');
      if (savedProjectId) {
        setSelectedProjectId(savedProjectId);
      }
    }
    
    // Clean up URL parameters after processing
    if (urlViewMode || urlProject) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showEditTask, setShowEditTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch workspaces
  const { data: workspaces = [], isLoading: workspacesLoading, error: workspacesError } = useQuery<any[]>({
    queryKey: ["/api/workspaces"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Handle workspace query errors
  useEffect(() => {
    if (workspacesError && isUnauthorizedError(workspacesError)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [workspacesError, toast]);

  // This effect is handled by the workspace persistence effect below

  // Fetch current workspace projects
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: [`/api/workspaces/${currentWorkspaceId}/projects`],
    enabled: !!currentWorkspaceId,
  });

  // Fetch current workspace tasks
  const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useQuery<any[]>({
    queryKey: [`/api/workspaces/${currentWorkspaceId}/tasks`],
    enabled: !!currentWorkspaceId,
  });



  // Fetch due today tasks
  const { data: dueTodayTasks = [] } = useQuery<any[]>({
    queryKey: [`/api/workspaces/${currentWorkspaceId}/tasks/due-today`],
    enabled: !!currentWorkspaceId,
  });

  // Fetch categories for current workspace
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: [`/api/workspaces/${currentWorkspaceId}/categories`],
    enabled: !!currentWorkspaceId,
  });

  // Fetch members for current workspace
  const { data: members = [] } = useQuery<any[]>({
    queryKey: [`/api/workspaces/${currentWorkspaceId}/members`],
    enabled: !!currentWorkspaceId,
  });

  // Initialize selected member to "all" by default and restore from localStorage
  useEffect(() => {
    if (user?.id) {
      // Clear any problematic cached filter values and reset to show all tasks
      localStorage.removeItem('selectedUserId');
      setSelectedUserId('all');
    }
  }, [user, members]);

  // Get current user's member ID in the workspace
  const currentUserMember = members.find((m: any) => m.user?.id === user?.id);
  const currentUserMemberId = currentUserMember?.id;

  // Calculate task sets for progress rings
  const allTasks = tasks || []; // All workspace tasks
  const userTasks = allTasks.filter((task: any) => task.assignedMemberId === currentUserMemberId); // User's assigned tasks
  const userDueTodayTasks = dueTodayTasks.filter(task => task.assignedMemberId === currentUserMemberId); // User's due today tasks

  // Save selected filters to localStorage
  useEffect(() => {
    if (selectedUserId) {
      localStorage.setItem('selectedUserId', selectedUserId);
    }
  }, [selectedUserId]);

  useEffect(() => {
    localStorage.setItem('selectedProjectId', selectedProjectId);
  }, [selectedProjectId]);

  useEffect(() => {
    localStorage.setItem('selectedCategoryId', selectedCategoryId);
  }, [selectedCategoryId]);

  // Restore category filter from localStorage (project filter handled in URL params effect)
  useEffect(() => {
    const savedCategoryId = localStorage.getItem('selectedCategoryId');
    
    if (savedCategoryId) {
      setSelectedCategoryId(savedCategoryId);
    }
  }, []);

  // Filter tasks by all three filters: member, project, and category
  const filteredTasks = tasks?.filter(task => {
    // Filter by workspace member (compare with assignedMemberId, not assignedTo)
    const memberMatch = selectedUserId === 'all' || task.assignedMemberId?.toString() === selectedUserId;
    
    // Filter by project
    const projectMatch = selectedProjectId === 'all' || task.projectId?.toString() === selectedProjectId;
    
    // Filter by category
    const categoryMatch = selectedCategoryId === 'all' || task.categoryId?.toString() === selectedCategoryId;
    
    return memberMatch && projectMatch && categoryMatch;
  }) || [];





  const handleEditTask = (task: any) => {
    setSelectedTask(task);
    setShowEditTask(true);
  };



  const handleEditProject = (project: any) => {
    setSelectedProject(project);
    setShowEditProject(true);
  };

  const handleEditCategory = (category: any) => {
    setSelectedCategory(category);
    setShowEditCategory(true);
  };

  // Handle workspace persistence, invitation completion, and default selection
  useEffect(() => {
    if (workspaces.length > 0) {
      // Check if user came from invitation first (highest priority)
      const urlParams = new URLSearchParams(window.location.search);
      const invitedWorkspaceId = urlParams.get('workspace');
      const wasInvited = urlParams.get('invited') === 'true';
      
      if (invitedWorkspaceId && wasInvited) {
        const workspaceId = parseInt(invitedWorkspaceId);
        const workspace = workspaces.find(w => w.id === workspaceId);
        if (workspace) {
          setCurrentWorkspaceId(workspaceId);
          localStorage.setItem('selectedWorkspaceId', workspaceId.toString());
          
          // Get workspace name from URL params or workspace object
          const urlParams = new URLSearchParams(window.location.search);
          const workspaceName = urlParams.get('workspaceName') || workspace.name;
          
          // Show welcome message with workspace name
          toast({
            title: `Welcome to ${workspaceName}!`,
            description: "You've successfully joined the workspace and it's now your active workspace.",
          });
          
          // Clean up URL parameters
          window.history.replaceState({}, document.title, '/');
          return;
        }
      }
      
      // Only set workspace if not already set
      if (!currentWorkspaceId) {
        // Try to restore from localStorage
        const savedWorkspaceId = localStorage.getItem('selectedWorkspaceId');
        if (savedWorkspaceId) {
          const parsedId = parseInt(savedWorkspaceId);
          // Check if saved workspace still exists
          const workspaceExists = workspaces.some(ws => ws.id === parsedId);
          if (workspaceExists) {
            setCurrentWorkspaceId(parsedId);
            return;
          }
        }
        
        // Fall back to personal workspace first, then first workspace
        const personalWorkspace = workspaces.find((w: any) => w.type === 'personal');
        setCurrentWorkspaceId(personalWorkspace?.id || workspaces[0].id);
      }
    }
  }, [workspaces, toast]);

  // Save workspace selection to localStorage
  const handleWorkspaceChange = (workspaceId: number) => {
    setCurrentWorkspaceId(workspaceId);
    localStorage.setItem('selectedWorkspaceId', workspaceId.toString());
  };

  // Date navigation functions
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        // Navigate by full weeks (Sunday to Saturday)
        // First, get current week's Sunday
        const currentSunday = new Date(newDate);
        currentSunday.setDate(newDate.getDate() - newDate.getDay());
        
        // Then move by 7 days to get to next/previous Sunday
        currentSunday.setDate(currentSunday.getDate() + (direction === 'next' ? 7 : -7));
        
        // Set the new date to the middle of that week (Wednesday) for consistent display
        newDate.setTime(currentSunday.getTime());
        newDate.setDate(currentSunday.getDate() + 3);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      default:
        return;
    }
    
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format date display based on view mode
  const getDateDisplayText = () => {
    const options: Intl.DateTimeFormatOptions = {};
    
    switch (viewMode) {
      case 'day':
        return currentDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'week':
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'month':
        return currentDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        });
      default:
        return '';
    }
  };

  if (isLoading || workspacesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  const currentWorkspace = workspaces.find((w: any) => w.id === currentWorkspaceId);
  const recentProjects = projects.slice(0, 3);
  const upcomingTasks = filteredTasks.filter((t: any) => t.status === 'todo').slice(0, 5);

  const viewModeIcons = {
    kanban: LayoutGrid,
    day: Calendar,
    week: CalendarDays,
    month: CalendarRange,
    project: FolderOpen,
    category: Tags,
    team: Users,
  };

  const viewModeLabels = {
    kanban: 'Kanban',
    day: 'Day',
    week: 'Week', 
    month: 'Month',
    project: 'Project',
    category: 'Category',
    team: 'Team',
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspaceId}
        onWorkspaceChange={handleWorkspaceChange}
        projects={projects}
        categories={categories}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onProjectFilterChange={setSelectedProjectId}
        onCreateWorkspace={() => setShowCreateWorkspace(true)}
        onCreateProject={() => setShowCreateProject(true)}
        onCreateCategory={() => setShowCreateCategory(true)}
        onCreateMember={() => setShowAddMember(true)}
        onEditProject={handleEditProject}
        onEditCategory={handleEditCategory}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex space-x-1">
                {(Object.keys(viewModeLabels) as ViewMode[]).map((mode) => {
                  const Icon = viewModeIcons[mode];
                  return (
                    <div key={mode} className="relative group">
                      <Button
                        variant={viewMode === mode ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode(mode)}
                        onDoubleClick={() => {
                          localStorage.setItem('defaultViewMode', mode);
                          toast({
                            title: "Default view updated",
                            description: `${viewModeLabels[mode]} is now your default view`,
                          });
                        }}
                        className={viewMode === mode ? "bg-primary text-white" : ""}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {viewModeLabels[mode]}
                        {localStorage.getItem('defaultViewMode') === mode && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                        )}
                      </Button>
                      {localStorage.getItem('defaultViewMode') !== mode && (
                        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          Double-click to set as default
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Global Search */}
              <div className="ml-6">
                <GlobalSearch
                  workspaceId={currentWorkspaceId}
                  onTaskSelect={(taskId) => {
                    // Find and edit the task
                    const task = filteredTasks.find((t: any) => t.id === taskId);
                    if (task) {
                      handleEditTask(task);
                    }
                  }}
                  onProjectSelect={(projectId) => {
                    // Switch to project view and filter by selected project
                    setViewMode('project');
                    setSelectedProjectId(projectId.toString());
                  }}
                  onMemberSelect={(memberId) => {
                    // Switch to team view and filter by selected member
                    setViewMode('team');
                    setSelectedUserId(memberId.toString());
                  }}
                  onCategorySelect={(categoryId) => {
                    // Switch to category view and filter by selected category
                    setViewMode('category');
                    setSelectedCategoryId(categoryId.toString());
                  }}
                />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Project Filter */}
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-40">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="By Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects?.map(project => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Category Filter */}
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger className="w-40">
                  <Tags className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="By Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map(category => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Workspace Members Filter */}
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-48">
                  <Users className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="By Member" />
                </SelectTrigger>
                <SelectContent>
                  {members?.map(member => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.user?.firstName && member.user?.lastName 
                        ? `${member.user.firstName} ${member.user.lastName}`
                        : member.user?.firstName || member.user?.email?.split('@')[0] || member.name || 'Unknown Member'}
                    </SelectItem>
                  ))}
                  <SelectItem value="all">All Members</SelectItem>
                </SelectContent>
              </Select>

              {/* Add Task Button */}
              <Button 
                onClick={() => setShowCreateTask(true)} 
                className="bg-primary hover:bg-primary/90"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
              
              <Button variant="ghost" size="sm">
                <Search className="h-4 w-4" />
              </Button>
              <NotificationsDropdown workspaceId={currentWorkspaceId} />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 hover:bg-gray-100">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm">
                      {user?.profileImageUrl ? (
                        <img 
                          src={user.profileImageUrl} 
                          alt="Profile" 
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {user?.firstName && user?.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user?.email || 'User'
                      }
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem className="flex items-center">
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>My Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center">
                    <Building className="mr-2 h-4 w-4" />
                    <span>Workspaces</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Support</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="flex items-center text-red-600 focus:text-red-600"
                    onClick={() => window.location.href = '/api/logout'}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 flex">
          {/* Main Content Area */}
          <div className="flex-1 p-6">
            {viewMode === 'kanban' ? (
              <TimeSlotGrid
                viewMode={viewMode}
                tasks={filteredTasks}
                workspaceId={currentWorkspaceId}
                onCreateTask={() => setShowCreateTask(true)}
                onEditTask={handleEditTask}
                selectedProjectId={selectedProjectId}
                selectedCategoryId={selectedCategoryId}
                selectedUserId={selectedUserId}
              />
            ) : viewMode === 'day' ? (
              <TimeSlotGrid
                viewMode={viewMode}
                tasks={filteredTasks}
                workspaceId={currentWorkspaceId}
                onCreateTask={() => setShowCreateTask(true)}
                onEditTask={handleEditTask}
                projects={projects}
                categories={categories}
                currentDate={currentDate}
                onNavigateDate={navigateDate}
              />
            ) : viewMode === 'week' ? (
              <TimeSlotGrid
                viewMode={viewMode}
                tasks={filteredTasks}
                workspaceId={currentWorkspaceId}
                onCreateTask={() => setShowCreateTask(true)}
                onEditTask={handleEditTask}
                projects={projects}
                categories={categories}
                currentDate={currentDate}
                onNavigateDate={navigateDate}
              />
            ) : viewMode === 'month' ? (
              <TimeSlotGrid
                viewMode={viewMode}
                tasks={filteredTasks}
                workspaceId={currentWorkspaceId}
                onCreateTask={() => setShowCreateTask(true)}
                onEditTask={handleEditTask}
                projects={projects}
                categories={categories}
                currentDate={currentDate}
                onNavigateDate={navigateDate}
              />
            ) : viewMode === 'project' ? (
              <TimeSlotGrid
                viewMode={viewMode}
                tasks={filteredTasks}
                workspaceId={currentWorkspaceId}
                onCreateTask={() => setShowCreateTask(true)}
                onEditTask={handleEditTask}
                projects={projects}
              />
            ) : viewMode === 'category' ? (
              <TimeSlotGrid
                viewMode={viewMode}
                tasks={filteredTasks}
                workspaceId={currentWorkspaceId}
                onCreateTask={() => setShowCreateTask(true)}
                onEditTask={handleEditTask}
                categories={categories}
              />
            ) : viewMode === 'team' ? (
              <TimeSlotGrid
                viewMode={viewMode}
                tasks={filteredTasks}
                workspaceId={currentWorkspaceId}
                onCreateTask={() => setShowCreateTask(true)}
                onEditTask={handleEditTask}
                members={members}
              />
            ) : (
              /* Professional Home Dashboard */
              <div className="flex-1 bg-gradient-to-br from-background via-background to-muted/20">
                <div className="max-w-full mx-auto p-4 space-y-6">
                  {/* Personalized Welcome Header - Compact */}
                  <div className="flex items-center justify-between py-4 px-2">
                    <div className="flex-1">
                      <h1 className="text-2xl font-light text-foreground">
                        Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.firstName || user?.email?.split('@')[0] || 'there'}
                      </h1>
                      <p className="text-muted-foreground text-sm">
                        {workspaces.find((w: any) => w.id === currentWorkspaceId)?.name || 'Your Workspace'} • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    
                    {/* Progress Rings - Workspace & User */}
                    <div className="flex items-center space-x-6">
                      {/* Workspace Progress */}
                      <div className="text-center">
                        <div className="relative w-20 h-20">
                          <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 120 120">
                            <circle
                              cx="60"
                              cy="60"
                              r="50"
                              stroke="currentColor"
                              strokeWidth="10"
                              fill="none"
                              className="text-muted/20"
                            />
                            <circle
                              cx="60"
                              cy="60"
                              r="50"
                              stroke="currentColor"
                              strokeWidth="10"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 50 * (allTasks.filter((t: any) => t.status === 'completed').length / Math.max(allTasks.length, 1))}, ${2 * Math.PI * 50}`}
                              className="text-blue-500 transition-all duration-1000 ease-out"
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-lg font-medium text-foreground">
                                {Math.round((allTasks.filter((t: any) => t.status === 'completed').length / Math.max(allTasks.length, 1)) * 100)}%
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Workspace</div>
                      </div>

                      {/* User Progress */}
                      <div className="text-center">
                        <div className="relative w-20 h-20">
                          <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 120 120">
                            <circle
                              cx="60"
                              cy="60"
                              r="50"
                              stroke="currentColor"
                              strokeWidth="10"
                              fill="none"
                              className="text-muted/20"
                            />
                            <circle
                              cx="60"
                              cy="60"
                              r="50"
                              stroke="currentColor"
                              strokeWidth="10"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 50 * (userTasks.filter((t: any) => t.status === 'completed').length / Math.max(userTasks.length, 1))}, ${2 * Math.PI * 50}`}
                              className="text-green-500 transition-all duration-1000 ease-out"
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-lg font-medium text-foreground">
                                {Math.round((userTasks.filter((t: any) => t.status === 'completed').length / Math.max(userTasks.length, 1)) * 100)}%
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Your Tasks</div>
                      </div>
                    </div>
                  </div>

                  {/* Analytics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-4 hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                            {projects.length}
                          </div>
                          <div className="text-sm text-blue-600/80 dark:text-blue-400/80 font-medium">
                            Active Projects
                          </div>
                        </div>
                        <FolderOpen className="h-8 w-8 text-blue-500/60" />
                      </div>
                    </Card>

                    <Card className="p-6 hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                            {filteredTasks.filter((t: any) => t.status !== 'completed').length}
                          </div>
                          <div className="text-sm text-orange-600/80 dark:text-orange-400/80 font-medium">
                            Pending Tasks
                          </div>
                        </div>
                        <Clock className="h-8 w-8 text-orange-500/60" />
                      </div>
                    </Card>

                    <Card className="p-4 hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                            {filteredTasks.filter((t: any) => t.status === 'completed').length}
                          </div>
                          <div className="text-sm text-green-600/80 dark:text-green-400/80 font-medium">
                            Completed
                          </div>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-500/60" />
                      </div>
                    </Card>

                    <Card className="p-4 hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                            {members.length}
                          </div>
                          <div className="text-sm text-purple-600/80 dark:text-purple-400/80 font-medium">
                            Team Members
                          </div>
                        </div>
                        <Users className="h-8 w-8 text-purple-500/60" />
                      </div>
                    </Card>
                  </div>

                  {/* Main Content Grid - Three Columns */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Personalized AI Insights */}
                    <PersonalizedInsightsCard workspaceId={currentWorkspaceId || 0} />

                    {/* Today's Focus */}
                    <Card className="p-6 border-0 shadow-lg">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-light text-foreground">Today's Focus</h2>
                        <Calendar className="h-5 w-5 text-primary/60" />
                      </div>
                      {userDueTodayTasks.length > 0 ? (
                        <div className="space-y-3">
                          {userDueTodayTasks.slice(0, 4).map((task: any) => (
                            <div key={task.id} className="group p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-all duration-200 cursor-pointer" onClick={() => handleEditTask(task)}>
                              <div className="flex items-start space-x-3">
                                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                  task.priority === 'high' ? 'bg-red-400' :
                                  task.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                                }`}></div>
                                <div className="flex-1 space-y-1">
                                  <p className="font-medium text-sm group-hover:text-primary transition-colors">
                                    {task.title}
                                  </p>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                      {projects.find((p: any) => p.id === task.projectId)?.name || 'Personal'}
                                    </Badge>
                                    {task.timeSlot && (
                                      <span className="text-xs text-muted-foreground">
                                        {task.timeSlot}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {userDueTodayTasks.length > 4 && (
                            <Button variant="ghost" size="sm" className="w-full text-primary hover:text-primary" onClick={() => setViewMode('day')}>
                              View all {userDueTodayTasks.length} tasks →
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                          <p className="text-muted-foreground text-sm">No tasks due today</p>
                          <p className="text-xs text-muted-foreground/70 mt-1">Great job staying on top of things!</p>
                        </div>
                      )}
                    </Card>

                    {/* Quick Actions */}
                    <Card className="p-6 border-0 shadow-lg">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-light text-foreground">Quick Actions</h2>
                        <Zap className="h-5 w-5 text-primary/60" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          variant="outline" 
                          className="h-20 flex-col space-y-2 hover:scale-105 transition-all duration-200 border-2 hover:border-primary/40"
                          onClick={() => setShowCreateTask(true)}
                        >
                          <Plus className="h-6 w-6 text-primary" />
                          <span className="text-xs font-medium">New Task</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-20 flex-col space-y-2 hover:scale-105 transition-all duration-200 border-2 hover:border-primary/40"
                          onClick={() => setShowCreateProject(true)}
                        >
                          <FolderOpen className="h-6 w-6 text-blue-600" />
                          <span className="text-xs font-medium">New Project</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-20 flex-col space-y-2 hover:scale-105 transition-all duration-200 border-2 hover:border-primary/40"
                          onClick={() => setViewMode('kanban')}
                        >
                          <LayoutGrid className="h-6 w-6 text-purple-600" />
                          <span className="text-xs font-medium">Kanban</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-20 flex-col space-y-2 hover:scale-105 transition-all duration-200 border-2 hover:border-primary/40"
                          onClick={() => setViewMode('team')}
                        >
                          <Users className="h-6 w-6 text-green-600" />
                          <span className="text-xs font-medium">Team View</span>
                        </Button>
                      </div>
                    </Card>
                  </div>

                  {/* Recent Activity & Project Highlights */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Active Projects */}
                    <Card className="p-8 border-0 shadow-lg">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-light text-foreground">Active Projects</h2>
                        <Briefcase className="h-5 w-5 text-primary/60" />
                      </div>
                      <div className="space-y-4">
                        {projects.slice(0, 3).map((project: any) => {
                          const projectTasks = filteredTasks.filter((t: any) => t.projectId === project.id);
                          const completedTasks = projectTasks.filter((t: any) => t.status === 'completed');
                          const progress = projectTasks.length > 0 ? (completedTasks.length / projectTasks.length) * 100 : 0;
                          
                          return (
                            <div key={project.id} className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h3 className="font-medium text-sm">{project.name}</h3>
                                <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                              </div>
                              <div className="w-full bg-muted/50 rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full transition-all duration-500 ease-out" 
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{projectTasks.length} tasks</span>
                                <span>{completedTasks.length} completed</span>
                              </div>
                            </div>
                          );
                        })}
                        {projects.length > 3 && (
                          <Button variant="ghost" size="sm" className="w-full text-primary hover:text-primary mt-4" onClick={() => setViewMode('project')}>
                            View all projects →
                          </Button>
                        )}
                      </div>
                    </Card>

                    {/* Team Overview */}
                    <Card className="p-8 border-0 shadow-lg">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-light text-foreground">Team Overview</h2>
                        <Users className="h-5 w-5 text-primary/60" />
                      </div>
                      <div className="space-y-4">
                        {members.slice(0, 4).map((member: any) => {
                          const memberTasks = filteredTasks.filter((t: any) => t.assignedMemberId === member.id);
                          const pendingTasks = memberTasks.filter((t: any) => t.status !== 'completed');
                          
                          return (
                            <div key={member.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs">
                                    {member.user?.firstName?.charAt(0) || member.user?.email?.charAt(0)?.toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">
                                    {member.user?.firstName && member.user?.lastName 
                                      ? `${member.user.firstName} ${member.user.lastName}`
                                      : member.user?.email?.split('@')[0] || 'Team Member'
                                    }
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {pendingTasks.length} pending task{pendingTasks.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">{memberTasks.length}</div>
                                <div className="text-xs text-muted-foreground">total</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Show on all views */}
          <RightPanel 
            workspaceId={currentWorkspaceId}
            dueTodayTasks={dueTodayTasks.filter(task => {
              const memberMatch = selectedUserId === 'all' || task.assignedMemberId?.toString() === selectedUserId;
              const projectMatch = selectedProjectId === 'all' || task.projectId?.toString() === selectedProjectId;
              const categoryMatch = selectedCategoryId === 'all' || task.categoryId?.toString() === selectedCategoryId;
              return memberMatch && projectMatch && categoryMatch;
            })}
            tasks={filteredTasks}
          />
        </div>
      </main>

      {/* Modals */}
      <CreateTaskModal
        open={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        workspaceId={currentWorkspaceId}
        projects={projects}
      />
      
      <EditTaskModal
        open={showEditTask}
        onClose={() => {
          setShowEditTask(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        workspaceId={currentWorkspaceId}
        projects={projects}
        categories={categories}
        members={members}
      />
      
      <CreateProjectModal
        open={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        workspaceId={currentWorkspaceId}
      />
      
      <EditProjectModal
        open={showEditProject}
        onClose={() => {
          setShowEditProject(false);
          setSelectedProject(null);
        }}
        project={selectedProject}
        workspaceId={currentWorkspaceId}
      />
      
      <CreateCategoryModal
        open={showCreateCategory}
        onClose={() => setShowCreateCategory(false)}
        workspaceId={currentWorkspaceId}
      />
      
      <EditCategoryModal
        open={showEditCategory}
        onClose={() => {
          setShowEditCategory(false);
          setSelectedCategory(null);
        }}
        category={selectedCategory}
        workspaceId={currentWorkspaceId}
      />
      
      <CreateWorkspaceModal
        open={showCreateWorkspace}
        onClose={() => setShowCreateWorkspace(false)}
      />

      <AddMemberModal
        open={showAddMember}
        onClose={() => setShowAddMember(false)}
        workspaceId={currentWorkspaceId}
      />

      {/* AI Assistant Widget - Available on all pages */}
      {currentWorkspaceId && <AIAssistantWidget workspaceId={currentWorkspaceId} />}
    </div>
  );
}
