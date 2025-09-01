import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User,
  Sparkles,
  BarChart3,
  FileText,
  ChevronUp,
  ChevronDown,
  Zap,
  Plus,
  History,
  Edit2,
  Trash2,
  Settings,
  CheckCircle,
  Info
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ChatMessage {
  id: number;
  message: string;
  response: string;
  createdAt: string;
  conversationId: string;
}

interface Conversation {
  conversationId: string;
  title: string | null;
  lastMessage: string;
  lastActivity: Date;
  messageCount: number;
}

interface AIAssistantWidgetProps {
  workspaceId: number;
}

// Helper function to get icon for message type
const getMessageTypeIcon = (messageType: string) => {
  switch (messageType) {
    case 'user':
      return <User className="h-4 w-4 text-blue-600" />;
    case 'ai':
      return <Bot className="h-4 w-4 text-purple-600" />;
    case 'system':
      return <Info className="h-4 w-4 text-gray-600" />;
    case 'context':
      return <FileText className="h-4 w-4 text-orange-600" />;
    case 'tool_call':
      return <Settings className="h-4 w-4 text-green-600" />;
    case 'tool_result':
      return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    default:
      return <MessageCircle className="h-4 w-4 text-gray-500" />;
  }
};

export function AIAssistantWidget({ workspaceId }: AIAssistantWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showConversations, setShowConversations] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Ensure workspaceId is valid
  const isValidWorkspace = !!(workspaceId && workspaceId > 0);

  // Fetch all conversations for this workspace
  const { data: conversationsList = [] } = useQuery<Conversation[]>({
    queryKey: [`/api/workspaces/${workspaceId}/conversations`],
    enabled: isValidWorkspace,
  });

  // Fetch messages for current conversation
  const { data: currentMessages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: currentConversationId 
      ? [`/api/workspaces/${workspaceId}/conversations/${currentConversationId}/messages`]
      : [`/api/workspaces/${workspaceId}/chat`],
    enabled: Boolean(isValidWorkspace),
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!isValidWorkspace) {
        throw new Error("No valid workspace selected");
      }
      
      const response = await fetch(`/api/workspaces/${workspaceId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ 
          message,
          conversationId: currentConversationId 
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Update current conversation ID if this was a new conversation
      if (!currentConversationId && data.conversationId) {
        setCurrentConversationId(data.conversationId);
      }
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/conversations`] });
      if (currentConversationId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/workspaces/${workspaceId}/conversations/${currentConversationId}/messages`] 
        });
      } else {
        queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/chat`] });
      }
      
      setMessage("");
      setIsExpanded(true);
      
      // Scroll to bottom after new message
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
    },
  });

  // Start new conversation
  const startNewConversation = () => {
    setCurrentConversationId(null);
    setShowConversations(false);
  };

  // Switch to a specific conversation
  const switchToConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setShowConversations(false);
  };

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await fetch(`/api/workspaces/${workspaceId}/conversations/${conversationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/conversations`] });
      if (currentConversationId) {
        setCurrentConversationId(null);
      }
    },
  });

  // Quick action mutations
  const quickActionMutation = useMutation({
    mutationFn: async (action: string) => {
      if (!isValidWorkspace) {
        throw new Error("No valid workspace selected");
      }
      
      const response = await fetch(`/api/workspaces/${workspaceId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ message: action }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/chat`] });
      setIsExpanded(true);
    },
  });

  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (widgetRef.current) {
      const rect = widgetRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && widgetRef.current) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep widget within viewport bounds
      const maxX = window.innerWidth - widgetRef.current.offsetWidth;
      const maxY = window.innerHeight - widgetRef.current.offsetHeight;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Prevent dragging on button/input interactions
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    // Don't start dragging if clicking on buttons or inputs
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'INPUT') {
      return;
    }
    handleMouseDown(e);
  };

  // Auto-scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatEndRef.current && isExpanded && currentMessages && Array.isArray(currentMessages) && currentMessages.length > 0) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [currentMessages, isExpanded]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSendMessage = () => {
    if (!message.trim() || sendMessageMutation.isPending) return;
    if (!isValidWorkspace) {
      console.error("No valid workspace selected for chat");
      return;
    }
    
    sendMessageMutation.mutate(message.trim());
    setIsExpanded(true);
  };

  const handleQuickAction = (action: string) => {
    quickActionMutation.mutate(action);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickActions = [
    { 
      label: "Give Insights", 
      icon: BarChart3, 
      action: "Analyze my task performance and provide insights on productivity patterns and bottlenecks" 
    },
    { 
      label: "Summarize my Task Status And Priorities", 
      icon: Sparkles, 
      action: "Summarize my current task status, priorities, and what I should focus on today" 
    },
  ];

  return (
    <div 
      ref={widgetRef}
      className="fixed z-50 w-full max-w-2xl px-4 pb-4"
      style={{
        bottom: position.y === 0 ? '0' : 'auto',
        left: position.x === 0 ? '50%' : position.x,
        top: position.y > 0 ? position.y : 'auto',
        transform: position.x === 0 && position.y === 0 ? 'translateX(-50%)' : 'none',
      }}
    >
      {/* Expanded Chat Panel */}
      {isExpanded && (
        <Card className="mb-4 bg-white/95 backdrop-blur-sm border shadow-2xl">
          <div 
            className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 cursor-move"
            onMouseDown={handleHeaderMouseDown}
          >
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">AI Assistant</h3>
                {conversationsList.length > 0 && (
                  <p className="text-xs text-gray-500">{conversationsList.length} conversations</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={startNewConversation}
                className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800"
                title="Start new conversation"
              >
                <Plus className="h-3 w-3" />
              </Button>
              {conversationsList.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConversations(!showConversations)}
                  className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800"
                  title="View conversation history"
                >
                  <History className="h-3 w-3" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsExpanded(false)}
                className="h-8 w-8 p-0"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Conversation List Modal */}
          <Dialog open={showConversations} onOpenChange={setShowConversations}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Conversation History</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {conversationsList.map((conv) => (
                  <div
                    key={conv.conversationId}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${
                      currentConversationId === conv.conversationId ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => switchToConversation(conv.conversationId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {conv.title || `Conversation ${conv.conversationId.slice(-4)}`}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {conv.lastMessage}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(conv.lastActivity).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTitle(conv.conversationId);
                            setNewTitle(conv.title || '');
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversationMutation.mutate(conv.conversationId);
                          }}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {conversationsList.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No conversations yet</p>
                    <p className="text-xs text-gray-400 mt-1">Start chatting to create your first conversation</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          <CardContent className="p-0">
            {/* Chat Messages */}
            <ScrollArea className="h-80 p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : currentMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bot className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">Start a conversation with your AI assistant</p>
                  <p className="text-xs text-gray-400 mt-1">I have access to your workspace activity for better context</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {[...(currentMessages as ChatMessage[])].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((conv: ChatMessage) => (
                    <div key={conv.id} className="space-y-3">
                      {/* User Message */}
                      <div className="flex justify-end items-start space-x-2">
                        <div className="max-w-xs lg:max-w-md">
                          <div className="bg-blue-500 text-white px-4 py-2 rounded-2xl rounded-br-sm">
                            <p className="text-sm">{conv.message}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 text-right">
                            {new Date(conv.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="mt-2 flex-shrink-0">
                          {getMessageTypeIcon('user')}
                        </div>
                      </div>
                      
                      {/* AI Response */}
                      <div className="flex justify-start items-start space-x-2">
                        <div className="mt-2 flex-shrink-0">
                          {getMessageTypeIcon('ai')}
                        </div>
                        <div className="max-w-xs lg:max-w-md">
                          <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-2xl rounded-bl-sm">
                            <div className="text-sm prose prose-sm max-w-none">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                                  li: ({ children }) => <li className="mb-1">{children}</li>,
                                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                  em: ({ children }) => <em className="italic">{children}</em>,
                                  code: ({ children }) => <code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                                  pre: ({ children }) => <pre className="bg-gray-200 p-2 rounded text-xs font-mono overflow-x-auto">{children}</pre>,
                                  h1: ({ children }) => <h1 className="text-base font-bold mb-2">{children}</h1>,
                                  h2: ({ children }) => <h2 className="text-sm font-bold mb-1">{children}</h2>,
                                  h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                                }}
                              >
                                {conv.response}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div ref={chatEndRef} />
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Command Bar */}
      <Card className="bg-white/95 backdrop-blur-sm border shadow-2xl">
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center space-x-3">
            {/* AI Avatar - Also serves as drag handle */}
            <div 
              className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 cursor-move" 
              onMouseDown={handleHeaderMouseDown}
              title="Drag to move AI assistant"
            >
              <Bot className="h-5 w-5 text-white" />
            </div>
            
            {/* Input Field */}
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask your AI assistant anything..."
                className="w-full pr-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                disabled={sendMessageMutation.isPending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || sendMessageMutation.isPending}
                size="sm"
                className="absolute right-1 top-1 h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600"
              >
                {sendMessageMutation.isPending ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            </div>

            {/* Expand/Collapse Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-10 w-10 p-0 flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Command Pill Buttons - Always visible below input */}
          <div className="flex justify-center space-x-2 pt-1">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(action.action)}
                disabled={quickActionMutation.isPending}
                className="bg-gray-50/80 border-gray-200 hover:bg-white hover:shadow-md transition-all duration-200 text-xs"
              >
                <action.icon className="h-3 w-3 mr-1" />
                {action.label}
              </Button>
            ))}
          </div>

          {/* Status Indicator */}
          {(sendMessageMutation.isPending || quickActionMutation.isPending) && (
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
              <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>AI is thinking...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}