import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Mail, User, Calendar, CheckCircle, Clock, AlertCircle, ArrowLeft, Bot, Settings, Building, UserCircle, LogOut, Trash2, UserMinus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import NotificationsDropdown from "@/components/notifications-dropdown";
import CreateWorkspaceModal from "@/components/modals/create-workspace-modal";
import CreateProjectModal from "@/components/modals/create-project-modal";
import CreateCategoryModal from "@/components/modals/create-category-modal";
import EditProjectModal from "@/components/modals/edit-project-modal";
import EditCategoryModal from "@/components/modals/edit-category-modal";
import AddMemberModal from "@/components/modals/add-member-modal";

interface Member {
  id: number;
  workspaceId: number;
  userId: string;
  name: string;
  memberType: string;
  role: string;
  isActive: boolean;
  email?: string;
  user?: {
    email: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
}

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: number;
  dueDate: string;
  projectId: number;
  categoryId: number;
  assignedMemberId: number;
  project?: {
    name: string;
  };
  category?: {
    name: string;
    color: string;
  };
}

interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  budget: number;
  spent: number;
}

export default function MembersPage() {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const currentWorkspaceId = parseInt(workspaceId || "1");

  // Modal states
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Data queries
  const { data: workspaces } = useQuery({
    queryKey: ["/api/workspaces"],
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: [`/api/workspaces/${currentWorkspaceId}/members`],
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: [`/api/workspaces/${currentWorkspaceId}/tasks`],
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: [`/api/workspaces/${currentWorkspaceId}/projects`],
  });

  const { data: categories = [] } = useQuery({
    queryKey: [`/api/workspaces/${currentWorkspaceId}/categories`],
  });

  // Check if current user is workspace owner
  const isWorkspaceOwner = workspaces?.find((ws: any) => ws.id === currentWorkspaceId)?.ownerId === user?.id;

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      return apiRequest(`/api/workspaces/${currentWorkspaceId}/members/${memberId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${currentWorkspaceId}/members`] });
      toast({
        title: "Member removed",
        description: "Member has been successfully removed from the workspace.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    },
  });

  const getMemberTasks = (memberId: number) => {
    return tasks.filter((task: Task) => task.assignedMemberId === memberId);
  };

  const getMemberProjects = (memberId: number) => {
    const memberTasks = getMemberTasks(memberId);
    const projectIds = [...new Set(memberTasks.map((task: Task) => task.projectId))];
    return projects.filter((project: Project) => projectIds.includes(project.id));
  };

  const getTaskStats = (memberId: number) => {
    const memberTasks = getMemberTasks(memberId);
    const total = memberTasks.length;
    const completed = memberTasks.filter((task: Task) => task.status === "completed").length;
    const inProgress = memberTasks.filter((task: Task) => task.status === "in_progress").length;
    const todo = memberTasks.filter((task: Task) => task.status === "todo").length;
    const overdue = memberTasks.filter((task: Task) => {
      if (!task.dueDate) return false;
      return new Date(task.dueDate) < new Date() && task.status !== "completed";
    }).length;

    return { total, completed, inProgress, todo, overdue };
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 3: return "bg-red-500";
      case 2: return "bg-orange-500";
      case 1: return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600 bg-green-100";
      case "in_progress": return "text-blue-600 bg-blue-100";
      case "todo": return "text-gray-600 bg-gray-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  if (membersLoading || tasksLoading || projectsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        workspaces={workspaces || []}
        currentWorkspaceId={currentWorkspaceId}
        onWorkspaceChange={() => {}}
        projects={projects || []}
        categories={categories || []}
        viewMode="home"
        onViewModeChange={() => {}}
        onProjectFilterChange={() => {}}
        onCreateWorkspace={() => setShowCreateWorkspace(true)}
        onCreateProject={() => setShowCreateProject(true)}
        onCreateCategory={() => setShowCreateCategory(true)}
        onCreateMember={() => setShowAddMember(true)}
        onEditProject={(project) => {
          setSelectedProject(project);
          setShowEditProject(true);
        }}
        onEditCategory={(category) => {
          setSelectedCategory(category);
          setShowEditCategory(true);
        }}
        currentPage="members"
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Workspace Members</h1>
                <p className="text-gray-600 text-sm">Manage and view member details, tasks, and performance</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-sm px-2 py-1">
                {members.length} Member{members.length !== 1 ? 's' : ''}
              </Badge>
              
              <NotificationsDropdown workspaceId={currentWorkspaceId} />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    <UserCircle className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <UserCircle className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Building className="h-4 w-4 mr-2" />
                    Workspace Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-full">

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {members.map((member: Member) => {
          const stats = getTaskStats(member.id);
          const memberProjects = getMemberProjects(member.id);
          const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
          const memberEmail = member.user?.email || member.email;
          const memberName = member.user?.firstName && member.user?.lastName 
            ? `${member.user.firstName} ${member.user.lastName}`
            : member.name;

          return (
            <Card key={member.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.user?.profileImageUrl} />
                    <AvatarFallback className="bg-primary text-white">
                      {memberName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{memberName}</CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant={member.memberType === 'user' ? 'default' : 'secondary'}>
                        {member.memberType === 'user' ? 'User' : 'AI Agent'}
                      </Badge>
                      {member.role && (
                        <Badge variant="outline">{member.role}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Contact Information */}
                {memberEmail && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{memberEmail}</span>
                  </div>
                )}

                {/* Task Statistics */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Task Completion</span>
                    <span className="text-sm text-gray-600">{completionRate}%</span>
                  </div>
                  <Progress value={completionRate} className="h-2" />
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Completed: {stats.completed}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3 text-blue-500" />
                      <span>In Progress: {stats.inProgress}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3 text-gray-500" />
                      <span>Todo: {stats.todo}</span>
                    </div>
                    {stats.overdue > 0 && (
                      <div className="flex items-center space-x-1">
                        <AlertCircle className="h-3 w-3 text-red-500" />
                        <span className="text-red-600">Overdue: {stats.overdue}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Projects */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Active Projects ({memberProjects.length})</h4>
                  <div className="space-y-1">
                    {memberProjects.slice(0, 3).map((project: Project) => (
                      <div key={project.id} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                        {project.name}
                      </div>
                    ))}
                    {memberProjects.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{memberProjects.length - 3} more projects
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Tasks */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Recent Tasks</h4>
                  <div className="space-y-1">
                    {getMemberTasks(member.id).slice(0, 2).map((task: Task) => (
                      <div key={task.id} className="text-xs bg-gray-50 p-2 rounded space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{task.title}</span>
                          <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`h-2 w-2 rounded-full ${getPriorityColor(task.priority)}`}></div>
                          {task.category && (
                            <span className="text-gray-500">{task.category.name}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {stats.total > 2 && (
                      <div className="text-xs text-gray-500">
                        +{stats.total - 2} more tasks
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <User className="h-3 w-3 mr-1" />
                    View Profile
                  </Button>
                  {memberEmail && (
                    <Button variant="outline" size="sm" className="flex-1">
                      <Mail className="h-3 w-3 mr-1" />
                      Contact
                    </Button>
                  )}
                  
                  {/* Remove member button - only for workspace owners */}
                  {isWorkspaceOwner && member.userId !== user?.id && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <UserMinus className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Member</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {memberName} from this workspace? 
                            This action cannot be undone and they will lose access to all workspace data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeMemberMutation.mutate(member.id)}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={removeMemberMutation.isPending}
                          >
                            {removeMemberMutation.isPending ? "Removing..." : "Remove Member"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {members.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No members found</h3>
          <p className="text-gray-600">This workspace doesn't have any members yet.</p>
        </div>
      )}
        </div>
      </main>

      {/* Modals */}
      <CreateWorkspaceModal
        open={showCreateWorkspace}
        onClose={() => setShowCreateWorkspace(false)}
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

      <AddMemberModal
        open={showAddMember}
        onClose={() => setShowAddMember(false)}
        workspaceId={currentWorkspaceId}
      />
    </div>
  );
}