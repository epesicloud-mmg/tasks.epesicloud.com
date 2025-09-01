import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { AIAssistantWidget } from '@/components/ai-assistant-widget';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  User, 
  Settings,
  Upload,
  FolderPlus,
  File,
  Folder,
  Download,
  Trash2,
  Share,
  Search,
  FileText,
  Image,
  Video,
  Archive,
  MoreHorizontal,
  Eye,
  Edit
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import Sidebar from '@/components/sidebar';
import NotificationsDropdown from '@/components/notifications-dropdown';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface VaultFile {
  id: number;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  extension?: string;
  path: string;
  projectId?: number;
  workspaceId: number;
  createdAt: string;
  updatedAt: string;
  parentId?: number;
  content?: string;
  url?: string;
}

interface FileExplorerProps {
  selectedProject: any;
  workspaceId: number;
  files: VaultFile[];
  onFileUpload: (file: File, projectId?: number, parentId?: number) => void;
  onFolderCreate: (name: string, projectId?: number, parentId?: number) => void;
  onFileDelete: (fileId: number) => void;
  onFileRename: (fileId: number, newName: string) => void;
}

const FileExplorer = ({ selectedProject, workspaceId, files, onFileUpload, onFolderCreate, onFileDelete, onFileRename }: FileExplorerProps) => {
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const getFileIcon = (file: VaultFile) => {
    if (file.type === 'folder') return Folder;
    
    const ext = file.extension?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext || '')) return Image;
    if (['mp4', 'avi', 'mov', 'mkv'].includes(ext || '')) return Video;
    if (['zip', 'rar', '7z', 'tar'].includes(ext || '')) return Archive;
    if (['txt', 'md', 'doc', 'docx'].includes(ext || '')) return FileText;
    return File;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = selectedProject ? file.projectId === selectedProject.id : !file.projectId;
    return matchesSearch && matchesProject;
  });

  const handleFileUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        Array.from(files).forEach(file => {
          onFileUpload(file, selectedProject?.id);
        });
      }
    };
    input.click();
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onFolderCreate(newFolderName.trim(), selectedProject?.id);
      setNewFolderName('');
      setShowCreateFolder(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* File Explorer Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {selectedProject ? `${selectedProject.name} Files` : 'Workspace Files'}
            </h2>
            <span className="text-sm text-gray-500">
              ({filteredFiles.length} items)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFileUploadClick}
            >
              <Upload className="h-4 w-4 mr-1" />
              Upload
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateFolder(true)}
            >
              <FolderPlus className="h-4 w-4 mr-1" />
              New Folder
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* File Grid/List */}
      <ScrollArea className="flex-1 p-4">
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Folder className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">No files yet</h3>
            <p className="text-gray-400 mb-4">
              {selectedProject 
                ? `Upload files to ${selectedProject.name} project`
                : 'Upload files to your workspace'
              }
            </p>
            <Button onClick={handleFileUploadClick}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredFiles.map((file) => {
              const IconComponent = getFileIcon(file);
              return (
                <Card key={file.id} className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center">
                      <div className="relative mb-3">
                        <IconComponent className={`h-12 w-12 ${
                          file.type === 'folder' ? 'text-blue-500' : 'text-gray-600'
                        }`} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Share className="h-4 w-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => onFileDelete(file.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <h4 className="font-medium text-sm truncate w-full mb-1">
                        {file.name}
                      </h4>
                      
                      {file.type === 'file' && (
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      )}
                      
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(file.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateFolder(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function VaultPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get workspace ID from URL or localStorage
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<number>(() => {
    const saved = localStorage.getItem('selectedWorkspaceId');
    return saved ? parseInt(saved) : 2;
  });

  // Vault state
  const [selectedProject, setSelectedProject] = useState<any>(null);

  // Data queries
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const { data: workspaces } = useQuery({
    queryKey: ["/api/workspaces"],
  });

  const { data: projects } = useQuery({
    queryKey: [`/api/workspaces/${currentWorkspaceId}/projects`],
    enabled: !!currentWorkspaceId,
  });

  // Check URL parameters for project selection
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project');
    if (projectId && projects) {
      const project = Array.isArray(projects) ? projects.find((p: any) => p.id === parseInt(projectId)) : null;
      if (project) {
        setSelectedProject(project);
      }
    }
  }, [projects]);

  const { data: categories } = useQuery({
    queryKey: [`/api/workspaces/${currentWorkspaceId}/categories`],
    enabled: !!currentWorkspaceId,
  });

  const { data: members } = useQuery({
    queryKey: [`/api/workspaces/${currentWorkspaceId}/members`],
    enabled: !!currentWorkspaceId,
  });

  const { data: files = [] } = useQuery({
    queryKey: [`/api/workspaces/${currentWorkspaceId}/files`],
    enabled: !!currentWorkspaceId,
  });

  const { data: recentFiles = [] } = useQuery({
    queryKey: [`/api/workspaces/${currentWorkspaceId}/files/recent`],
    enabled: !!currentWorkspaceId,
  });

  // Get current workspace
  const workspace = Array.isArray(workspaces) ? workspaces.find((w: any) => w.id === currentWorkspaceId) : null;

  const handleWorkspaceChange = (workspaceId: number) => {
    setCurrentWorkspaceId(workspaceId);
    localStorage.setItem('selectedWorkspaceId', workspaceId.toString());
  };

  // File operations
  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, projectId, parentId }: { file: File; projectId?: number; parentId?: number }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (projectId) formData.append('projectId', projectId.toString());
      if (parentId) formData.append('parentId', parentId.toString());
      
      const response = await fetch(`/api/workspaces/${currentWorkspaceId}/files/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${currentWorkspaceId}/files`] });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${currentWorkspaceId}/files/recent`] });
      toast({ title: "File uploaded successfully" });
    },
    onError: () => {
      toast({ title: "Failed to upload file", variant: "destructive" });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async ({ name, projectId, parentId }: { name: string; projectId?: number; parentId?: number }) => {
      return apiRequest(`/api/workspaces/${currentWorkspaceId}/files/folder`, 'POST', {
        name, projectId, parentId, workspaceId: currentWorkspaceId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${currentWorkspaceId}/files`] });
      toast({ title: "Folder created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create folder", variant: "destructive" });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      return apiRequest(`/api/workspaces/${currentWorkspaceId}/files/${fileId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${currentWorkspaceId}/files`] });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${currentWorkspaceId}/files/recent`] });
      toast({ title: "File deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete file", variant: "destructive" });
    },
  });

  const handleFileUpload = (file: File, projectId?: number, parentId?: number) => {
    uploadFileMutation.mutate({ file, projectId, parentId });
  };

  const handleFolderCreate = (name: string, projectId?: number, parentId?: number) => {
    createFolderMutation.mutate({ name, projectId, parentId });
  };

  const handleFileDelete = (fileId: number) => {
    deleteFileMutation.mutate(fileId);
  };

  const handleFileRename = (fileId: number, newName: string) => {
    // TODO: Implement rename functionality
    toast({ title: "Rename functionality coming soon" });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        workspaces={Array.isArray(workspaces) ? workspaces : []}
        currentWorkspaceId={currentWorkspaceId}
        onWorkspaceChange={handleWorkspaceChange}
        projects={Array.isArray(projects) ? projects : []}
        categories={Array.isArray(categories) ? categories : []}
        viewMode="home"
        onViewModeChange={(mode) => {
          if (mode === "kanban") {
            window.location.href = `/workspace/${currentWorkspaceId}`;
          }
        }}
        onProjectFilterChange={(projectId) => {
          window.location.href = `/workspace/${currentWorkspaceId}?projectFilter=${projectId}`;
        }}
        onCreateWorkspace={() => {}}
        onCreateProject={() => {}}
        onCreateCategory={() => {}}
        onCreateMember={() => {}}
        onEditProject={() => {}}
        onEditCategory={() => {}}
        currentPage="vault"
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {(workspace as any)?.name || 'Workspace'} - Vault
                </h1>
                <p className="text-sm text-gray-500">
                  File storage and project documents
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <NotificationsDropdown workspaceId={currentWorkspaceId} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium text-sm">
                        {(user as any)?.firstName && (user as any)?.lastName 
                          ? `${(user as any).firstName} ${(user as any).lastName}` 
                          : (user as any)?.firstName || (user as any)?.email || 'User'}
                      </p>
                      <p className="w-[200px] truncate text-xs text-muted-foreground">
                        {(user as any)?.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Vault Sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">Vault</h2>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Recent Documents */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Documents</h3>
                  <div className="space-y-1">
                    {Array.isArray(recentFiles) && recentFiles.slice(0, 5).map((file: any) => (
                      <Button
                        key={file.id}
                        variant="ghost"
                        className="w-full justify-start gap-2 h-auto p-2 text-left"
                        onClick={() => setSelectedProject(null)}
                      >
                        <File className="h-4 w-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{file.name}</div>
                          <div className="text-xs text-gray-500">
                            {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'Unknown date'}
                          </div>
                        </div>
                      </Button>
                    ))}
                    {(!Array.isArray(recentFiles) || recentFiles.length === 0) && (
                      <p className="text-sm text-gray-500 py-2">No recent files</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Project Vaults */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Project Vaults</h3>
                  <div className="space-y-1">
                    {/* All Files */}
                    <Button
                      variant="ghost"
                      className={`w-full justify-start gap-3 h-10 text-left ${
                        !selectedProject ? 'bg-gray-100' : ''
                      }`}
                      onClick={() => setSelectedProject(null)}
                    >
                      <Folder className="h-4 w-4" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">All Files</div>
                        <div className="text-xs text-gray-500">Workspace files</div>
                      </div>
                    </Button>

                    {/* Project Files */}
                    {Array.isArray(projects) && projects.map((project: any) => (
                      <Button
                        key={project.id}
                        variant="ghost"
                        className={`w-full justify-start gap-3 h-auto min-h-[2.5rem] py-2 text-left ${
                          selectedProject?.id === project.id ? 'bg-gray-100' : ''
                        }`}
                        onClick={() => setSelectedProject(project)}
                      >
                        <Folder className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{project.name}</div>
                          <div className="text-xs text-gray-500 leading-relaxed break-words">
                            {project.description && project.description.length > 60 
                              ? `${project.description.substring(0, 60)}...` 
                              : project.description || 'No description'}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Vault Explorer */}
          <FileExplorer
            selectedProject={selectedProject}
            workspaceId={currentWorkspaceId}
            files={Array.isArray(files) ? files : []}
            onFileUpload={handleFileUpload}
            onFolderCreate={handleFolderCreate}
            onFileDelete={handleFileDelete}
            onFileRename={handleFileRename}
          />
        </div>
      </div>

      {/* AI Assistant Widget - Available on all pages */}
      {currentWorkspaceId && <AIAssistantWidget workspaceId={currentWorkspaceId} />}
    </div>
  );
}