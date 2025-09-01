import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

type ViewMode =
  | "home"
  | "day"
  | "week"
  | "month"
  | "project"
  | "category"
  | "team"
  | "kanban";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  FolderOpen,
  Tags,
  MessageSquare,
  Archive,
  Settings,
  Plus,
  ChevronDown,
  ChevronRight,
  User,
  Bot,
  BarChart3,
  CheckSquare,
  DollarSign,
  FileText,
  Users,
  Edit2,
  Home,
} from "lucide-react";

interface SidebarProps {
  workspaces: any[];
  currentWorkspaceId: number | null;
  onWorkspaceChange: (id: number) => void;
  projects: any[];
  categories: any[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onProjectFilterChange: (projectId: string) => void;
  onCreateWorkspace: () => void;
  onCreateProject: () => void;
  onCreateCategory: () => void;
  onCreateMember: () => void;
  onEditProject: (project: any) => void;
  onEditCategory: (category: any) => void;
  currentPage?: string;
}

export default function Sidebar({
  workspaces,
  currentWorkspaceId,
  onWorkspaceChange,
  projects,
  categories,
  viewMode,
  onViewModeChange,
  onProjectFilterChange,
  onCreateWorkspace,
  onCreateProject,
  onCreateCategory,
  onCreateMember,
  onEditProject,
  onEditCategory,
  currentPage,
}: SidebarProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(
    new Set(),
  );

  // Fetch workspace members
  const { data: members = [] } = useQuery({
    queryKey: [`/api/workspaces/${currentWorkspaceId}/members`],
    enabled: !!currentWorkspaceId,
  });

  // Check current path to determine active project and view
  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "";
  const currentSearch =
    typeof window !== "undefined" ? window.location.search : "";
  const urlParams = new URLSearchParams(currentSearch);
  const activeProjectId = urlParams.get("project");
  const isVaultActive = currentPath.includes("/vault");
  const isChatActive = currentPath.includes("/chat");
  const isFinancialsActive = currentPath.includes("/financials");

  // Auto-expand project if it's currently active
  React.useEffect(() => {
    if (activeProjectId) {
      const projectId = parseInt(activeProjectId);
      setExpandedProjects((prev) => new Set([...prev, projectId]));
    }
  }, [activeProjectId]);

  const toggleProject = (projectId: number) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const navigationItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "vault", label: "Vault", icon: Archive },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Workspace Selector */}
      <div className="p-4 border-b border-gray-200">
        <Select
          value={currentWorkspaceId?.toString() || ""}
          onValueChange={(value) => {
            if (value === "add_workspace") {
              onCreateWorkspace();
            } else {
              onWorkspaceChange(parseInt(value));
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select workspace..." />
          </SelectTrigger>
          <SelectContent>
            {workspaces.map((workspace) => (
              <SelectItem key={workspace.id} value={workspace.id.toString()}>
                {workspace.name}
              </SelectItem>
            ))}
            <SelectItem
              value="add_workspace"
              className="text-blue-600 font-medium bg-gray-100 hover:bg-gray-200 flex items-center"
            >
              <div className="flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Add Workspace
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto">
        {/* Main Navigation */}
        <div className="p-4">
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === "home" && viewMode === "home";
              return (
                <li key={item.id}>
                  {item.id === "chat" ? (
                    <Link href={`/workspace/${currentWorkspaceId}/chat`}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-sm font-medium text-gray-700 hover:bg-gray-100"
                      >
                        <Icon className="h-4 w-4 mr-3" />
                        {item.label}
                      </Button>
                    </Link>
                  ) : item.id === "vault" ? (
                    <Link href={`/workspace/${currentWorkspaceId}/vault`}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-sm font-medium text-gray-700 hover:bg-gray-100"
                      >
                        <Icon className="h-4 w-4 mr-3" />
                        {item.label}
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={`w-full justify-start text-sm font-medium ${
                        isActive
                          ? "bg-primary text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={() => {
                        if (item.id === "home") {
                          onViewModeChange("home");
                        }
                      }}
                    >
                      <Icon className="h-4 w-4 mr-3" />
                      {item.label}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Projects Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Projects
            </h3>
            <Button variant="ghost" size="sm" onClick={onCreateProject}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1">
            {projects.map((project: any) => {
              const isExpanded = expandedProjects.has(project.id);
              return (
                <div key={project.id}>
                  <Collapsible
                    open={isExpanded}
                    onOpenChange={() => toggleProject(project.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center w-full group">
                        <Button
                          variant="ghost"
                          className="flex-1 justify-start text-sm font-medium text-gray-700 hover:bg-gray-100"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3 mr-2" />
                          ) : (
                            <ChevronRight className="h-3 w-3 mr-2" />
                          )}
                          <FolderOpen className="h-4 w-4 text-primary mr-2" />
                          <span className="truncate">{project.name}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity mr-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditProject(project);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ml-5 space-y-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`w-full justify-start text-xs hover:bg-gray-100 ${
                          viewMode === "kanban" &&
                          activeProjectId === project.id.toString()
                            ? "bg-purple-50 text-purple-700 border-l-2 border-purple-500"
                            : "text-gray-600"
                        }`}
                        onClick={() => {
                          onViewModeChange("kanban");
                          onProjectFilterChange(project.id.toString());
                        }}
                      >
                        <CheckSquare className="h-3 w-3 mr-2" />
                        Tasks
                      </Button>
                      <Link
                        href={`/workspace/${currentWorkspaceId}/vault?project=${project.id}`}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`w-full justify-start text-xs hover:bg-gray-100 ${
                            isVaultActive &&
                            activeProjectId === project.id.toString()
                              ? "bg-blue-50 text-blue-700 border-l-2 border-blue-500"
                              : "text-gray-600"
                          }`}
                        >
                          <Archive className="h-3 w-3 mr-2" />
                          Vault
                        </Button>
                      </Link>
                      <Link
                        href={`/workspace/${currentWorkspaceId}/chat?project=${project.id}`}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`w-full justify-start text-xs hover:bg-gray-100 ${
                            isChatActive &&
                            activeProjectId === project.id.toString()
                              ? "bg-green-50 text-green-700 border-l-2 border-green-500"
                              : "text-gray-600"
                          }`}
                        >
                          <MessageSquare className="h-3 w-3 mr-2" />
                          Chat
                        </Button>
                      </Link>
                      <Link
                        href={`/workspace/${currentWorkspaceId}/financials?project=${project.id}`}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`w-full justify-start text-xs hover:bg-gray-100 ${
                            isFinancialsActive &&
                            activeProjectId === project.id.toString()
                              ? "bg-emerald-50 text-emerald-700 border-l-2 border-emerald-500"
                              : "text-gray-600"
                          }`}
                        >
                          <DollarSign className="h-3 w-3 mr-2" />
                          Financials
                        </Button>
                      </Link>
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs text-gray-600 hover:bg-gray-100"
                          >
                            <ChevronDown className="h-3 w-3 mr-2" />
                            <FileText className="h-3 w-3 mr-2" />
                            Pages
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="ml-5 space-y-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs text-gray-500 hover:bg-gray-100"
                          >
                            <FileText className="h-3 w-3 mr-2" />
                            Requirements
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs text-gray-500 hover:bg-gray-100"
                          >
                            <FileText className="h-3 w-3 mr-2" />
                            Design Brief
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs text-gray-400 hover:bg-gray-100"
                          >
                            <Plus className="h-3 w-3 mr-2" />
                            Add New Page
                          </Button>
                        </CollapsibleContent>
                      </Collapsible>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
            {projects.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-4">
                No projects yet
                <br />
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 text-xs"
                  onClick={onCreateProject}
                >
                  Create your first project
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Categories Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Categories
            </h3>
            <Button variant="ghost" size="sm" onClick={onCreateCategory}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ul className="space-y-1">
            {categories?.map((category: any) => (
              <li key={category.id} className="group">
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    className="flex-1 justify-start text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <Tags className="h-4 w-4 text-primary mr-3" />
                    <span className="truncate">{category.name}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity mr-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditCategory(category);
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              </li>
            ))}
            {(!categories || categories.length === 0) && (
              <li className="text-sm text-gray-500 text-center py-2">
                No categories yet
              </li>
            )}
          </ul>
        </div>

        {/* Members Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <Link href={`/workspace/${currentWorkspaceId}/members`}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-primary cursor-pointer transition-colors">
                Members
              </h3>
            </Link>
            <Button variant="ghost" size="sm" onClick={onCreateMember}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ul className="space-y-2">
            {members.map((member: any) => (
              <li key={member.id} className="flex items-center">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs mr-2">
                  {member.memberType === "agent" ? (
                    <Bot className="h-3 w-3" />
                  ) : (
                    <User className="h-3 w-3" />
                  )}
                </div>
                <span className="text-sm text-gray-700 flex-1">
                  {member.name}
                </span>
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              </li>
            ))}
            {members.length === 0 && (
              <li className="text-sm text-gray-500 text-center py-2">
                No members yet
              </li>
            )}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
