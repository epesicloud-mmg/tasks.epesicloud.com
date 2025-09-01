import React, { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { 
  Bot, 
  MessageCircle, 
  Hash, 
  User, 
  ArrowLeft,
  Send,
  Users,
  Clock,
  Building,
  UserCircle,
  LogOut,
  Settings
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import NotificationsDropdown from '@/components/notifications-dropdown';


interface ChatContentProps {
  selectedChannel: string | null;
  channelType: 'bot' | 'recent' | 'project' | 'dm' | null;
  projects: any[];
  members: any[];
}

function ChatContent({ selectedChannel, channelType, projects, members }: ChatContentProps) {
  const [message, setMessage] = useState('');

  const getChannelTitle = () => {
    if (!selectedChannel) return 'Select a chat';
    
    switch (channelType) {
      case 'bot':
        return 'AI Assistant';
      case 'recent':
        return selectedChannel === 'recent-1' ? 'Project Planning' : 'Task Updates';
      case 'project':
        const projectId = selectedChannel.replace('project-', '');
        const project = projects.find(p => p.id.toString() === projectId);
        return project ? `# ${project.name}` : 'Project Channel';
      case 'dm':
        const userId = selectedChannel.replace('dm-', '');
        const member = members.find(m => m.userId === userId);
        return member ? `Direct Message with ${member.name}` : 'Direct Message';
      default:
        return 'Chat';
    }
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    // TODO: Implement message sending logic
    setMessage('');
  };

  if (!selectedChannel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to Chat</h3>
          <p className="text-gray-500">Select a channel or start a conversation to begin chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Chat Header */}
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">{getChannelTitle()}</h2>
        {channelType === 'project' && (
          <p className="text-sm text-gray-500">Project team discussion</p>
        )}
        {channelType === 'bot' && (
          <p className="text-sm text-gray-500">Your AI-powered productivity assistant</p>
        )}
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Sample messages based on channel type */}
          {channelType === 'bot' && (
            <>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <p className="text-sm">Hello! I'm your AI assistant. I can help you with task management, project insights, and productivity tips. What would you like to work on today?</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">AI Assistant • just now</p>
                </div>
              </div>
            </>
          )}
          
          {channelType === 'recent' && selectedChannel === 'recent-1' && (
            <>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <p className="text-sm">We need to finalize the project timeline for Q2. Can we schedule a meeting?</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Team Member • 2 hours ago</p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <div className="flex-1 max-w-md">
                  <div className="bg-blue-500 text-white rounded-lg p-3">
                    <p className="text-sm">Sure! How about tomorrow at 2 PM?</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-right">You • 1 hour ago</p>
                </div>
              </div>
            </>
          )}

          {channelType === 'project' && (
            <>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Hash className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <p className="text-sm">Project channel discussion will appear here. Team members can collaborate on project-specific topics.</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">System • now</p>
                </div>
              </div>
            </>
          )}

          {channelType === 'dm' && (
            <>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <p className="text-sm">Direct message conversation will appear here.</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Team Member • now</p>
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Message ${getChannelTitle().toLowerCase()}...`}
            className="flex-1"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button onClick={handleSendMessage} disabled={!message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const currentWorkspaceId = parseInt(workspaceId || "1");
  
  // Chat state
  const [selectedChannel, setSelectedChannel] = useState<string | null>('ai-assistant');
  const [channelType, setChannelType] = useState<'bot' | 'recent' | 'project' | 'dm' | null>('bot');

  // Check URL parameters for project-specific chat
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project');
    if (projectId) {
      setSelectedChannel(`project-${projectId}`);
      setChannelType('project');
    }
  }, []);



  // Data queries
  const { data: workspaces } = useQuery({
    queryKey: ["/api/workspaces"],
  });

  const { data: workspace } = useQuery({
    queryKey: [`/api/workspaces/${currentWorkspaceId}`],
  });

  const { data: projects = [] } = useQuery({
    queryKey: [`/api/workspaces/${currentWorkspaceId}/projects`],
  });

  const { data: categories = [] } = useQuery({
    queryKey: [`/api/workspaces/${currentWorkspaceId}/categories`],
  });

  const { data: members = [] } = useQuery({
    queryKey: [`/api/workspaces/${currentWorkspaceId}/members`],
  });

  const handleWorkspaceChange = (workspaceId: number) => {
    window.location.href = `/workspace/${workspaceId}/chat`;
  };

  const handleChannelSelect = (channel: string, type: 'bot' | 'recent' | 'project' | 'dm') => {
    setSelectedChannel(channel);
    setChannelType(type);
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
        currentPage="chat"
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {(workspace as any)?.name || 'Workspace'} - Chat
                </h1>
                <p className="text-sm text-gray-500">
                  Team communication and AI assistance
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <NotificationsDropdown workspaceId={currentWorkspaceId} />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <UserCircle className="h-6 w-6" />
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
                    <Building className="mr-2 h-4 w-4" />
                    <span>Workspace Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Account Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Sidebar */}
          <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
            {/* Chat with Bot Button */}
            <div className="p-4">
              <Button
                onClick={() => handleChannelSelect('ai-assistant', 'bot')}
                className={`w-full justify-start gap-3 h-12 ${
                  selectedChannel === 'ai-assistant' 
                    ? 'bg-blue-100 text-blue-700 border-blue-200' 
                    : 'bg-white hover:bg-gray-100'
                }`}
                variant={selectedChannel === 'ai-assistant' ? 'default' : 'outline'}
              >
                <Bot className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Chat With Bot</div>
                  <div className="text-xs opacity-75">AI Assistant</div>
                </div>
              </Button>
            </div>

            <Separator />

            <ScrollArea className="flex-1">
              {/* Recent Chats */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <h3 className="font-medium text-sm text-gray-700">Recent Chats</h3>
                </div>
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start gap-3 h-10 text-left ${
                      selectedChannel === 'recent-1' ? 'bg-gray-200' : ''
                    }`}
                    onClick={() => handleChannelSelect('recent-1', 'recent')}
                  >
                    <MessageCircle className="h-4 w-4" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">Project Planning</div>
                      <div className="text-xs text-gray-500 truncate">Last message 2 hours ago</div>
                    </div>
                    <Badge variant="secondary" className="text-xs">3</Badge>
                  </Button>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start gap-3 h-10 text-left ${
                      selectedChannel === 'recent-2' ? 'bg-gray-200' : ''
                    }`}
                    onClick={() => handleChannelSelect('recent-2', 'recent')}
                  >
                    <MessageCircle className="h-4 w-4" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">Task Updates</div>
                      <div className="text-xs text-gray-500 truncate">Last message yesterday</div>
                    </div>
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Project Channels */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Hash className="h-4 w-4 text-gray-500" />
                  <h3 className="font-medium text-sm text-gray-700">Project Channels</h3>
                </div>
                <div className="space-y-1">
                  {Array.isArray(projects) && projects.map((project: any) => (
                    <Button
                      key={project.id}
                      variant="ghost"
                      className={`w-full justify-start gap-3 h-10 text-left ${
                        selectedChannel === `project-${project.id}` ? 'bg-gray-200' : ''
                      }`}
                      onClick={() => handleChannelSelect(`project-${project.id}`, 'project')}
                    >
                      <Hash className="h-4 w-4" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{project.name}</div>
                        <div className="text-xs text-gray-500 truncate">{project.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Direct Messages */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-gray-500" />
                  <h3 className="font-medium text-sm text-gray-700">Direct Messages</h3>
                </div>
                <div className="space-y-1">
                  {Array.isArray(members) && members.filter((member: any) => member.userId !== user?.id).map((member: any) => (
                    <Button
                      key={member.id}
                      variant="ghost"
                      className={`w-full justify-start gap-3 h-10 text-left ${
                        selectedChannel === `dm-${member.userId}` ? 'bg-gray-200' : ''
                      }`}
                      onClick={() => handleChannelSelect(`dm-${member.userId}`, 'dm')}
                    >
                      <User className="h-4 w-4" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {member.name || member.email || `Member ${member.id}`}
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-gray-500">Online</span>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Chat Content */}
          <ChatContent 
            selectedChannel={selectedChannel}
            channelType={channelType}
            projects={Array.isArray(projects) ? projects : []}
            members={Array.isArray(members) ? members : []}
          />
        </div>
      </div>


    </div>
  );
}