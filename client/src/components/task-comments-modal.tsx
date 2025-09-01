import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Trash2, X, AtSign } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";

interface TaskComment {
  id: number;
  comment: string;
  userId: string;
  createdAt: string;
}

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: number;
  dueDate?: string;
  assignedMemberId?: number;
}

interface TaskCommentsModalProps {
  task: Task;
  workspaceId: number;
  onClose?: () => void;
  trigger?: React.ReactNode;
}

export default function TaskCommentsModal({ 
  task, 
  workspaceId, 
  onClose,
  trigger 
}: TaskCommentsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch task comments
  const { data: commentsData = [], isLoading } = useQuery({
    queryKey: ['task-comments', task.id],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${task.id}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
    enabled: isOpen,
  });

  // Ensure comments is always an array
  const comments = Array.isArray(commentsData) ? commentsData : [];

  // Fetch workspace members for assigned user names
  const { data: membersData } = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async () => {
      const response = await fetch(`/api/workspaces/${workspaceId}/members`);
      if (!response.ok) throw new Error('Failed to fetch members');
      return response.json();
    },
    enabled: !!workspaceId,
  });

  const members = Array.isArray(membersData) ? membersData : [];

  const getAssignedMemberName = (assignedMemberId: number) => {
    const member = members.find((m: any) => m.id === assignedMemberId);
    return member ? (member.name || member.email || `Member ${assignedMemberId}`) : `Member ${assignedMemberId}`;
  };

  // Handle @mention functionality
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart || 0;
    
    setNewComment(value);
    setCursorPosition(position);
    
    // Check if user typed @ symbol
    const atIndex = value.lastIndexOf('@', position - 1);
    if (atIndex !== -1) {
      const textAfterAt = value.substring(atIndex + 1, position);
      if (!textAfterAt.includes(' ')) {
        setMentionFilter(textAfterAt);
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const selectMention = (member: any) => {
    const atIndex = newComment.lastIndexOf('@', cursorPosition - 1);
    if (atIndex !== -1) {
      const beforeAt = newComment.substring(0, atIndex);
      const afterMention = newComment.substring(cursorPosition);
      const memberHandle = member.name || member.email?.split('@')[0] || `Member${member.id}`;
      const newValue = `${beforeAt}@${memberHandle} ${afterMention}`;
      
      setNewComment(newValue);
      setShowMentions(false);
      setMentionFilter("");
      
      // Focus back to input
      setTimeout(() => {
        if (inputRef.current) {
          const newPosition = beforeAt.length + memberHandle.length + 2;
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    }
  };

  // Filter members for mention dropdown
  const filteredMembers = members.filter((member: any) => {
    const name = member.name || member.email || '';
    return name.toLowerCase().includes(mentionFilter.toLowerCase());
  });

  // Extract mentioned users from comment
  const extractMentions = (comment: string) => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(comment)) !== null) {
      const handle = match[1];
      // Find member by name or email prefix
      const member = members.find((m: any) => {
        const name = m.name || '';
        const emailPrefix = m.email?.split('@')[0] || '';
        return name.toLowerCase() === handle.toLowerCase() || 
               emailPrefix.toLowerCase() === handle.toLowerCase() ||
               `member${m.id}` === handle.toLowerCase();
      });
      if (member) {
        mentions.push(member.userId);
      }
    }
    
    return mentions;
  };

  // Add new comment
  const addCommentMutation = useMutation({
    mutationFn: async (comment: string) => {
      const taggedUserIds = extractMentions(comment);
      const response = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment, workspaceId, taggedUserIds }),
      });
      if (!response.ok) throw new Error('Failed to add comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', task.id] });
      setNewComment("");
      setShowMentions(false);
    },
  });

  // Delete comment
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to delete comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', task.id] });
    },
  });

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment.trim());
    }
  };

  const handleDeleteComment = (commentId: number) => {
    if (confirm("Are you sure you want to delete this comment?")) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 3: return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case 2: return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case 1: return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getPriorityText = (priority: number) => {
    switch (priority) {
      case 3: return "Urgent";
      case 2: return "High";
      case 1: return "Medium";
      default: return "Low";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case 'in_progress': return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && onClose) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <MessageCircle className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Task Details & Comments</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Task Details */}
          <div className="space-y-4 pb-4">
            <div>
              <h3 className="text-lg font-semibold">{task.title}</h3>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {task.description}
                </p>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge className={getStatusColor(task.status)}>
                {task.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge className={getPriorityColor(task.priority)}>
                {getPriorityText(task.priority)} Priority
              </Badge>
              {task.dueDate && (
                <Badge variant="outline">
                  Due: {new Date(task.dueDate).toLocaleDateString()}
                </Badge>
              )}
              {task.assignedMemberId && (
                <Badge variant="secondary">
                  Assigned to: {getAssignedMemberName(task.assignedMemberId)}
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Comments Section */}
          <div className="flex-1 flex flex-col mt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Comments ({comments.length})</h4>
            </div>

            {/* Comments List */}
            <ScrollArea className="flex-1 pr-4">
              {isLoading ? (
                <div className="text-center text-muted-foreground py-4">
                  Loading comments...
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No comments yet. Be the first to comment!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment: any) => (
                    <div key={comment.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                            {(comment.userName || comment.userId).charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium">
                            {comment.userName || comment.userId}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(comment.createdAt)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteComment(comment.id)}
                            disabled={deleteCommentMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm">{comment.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Add Comment Form */}
            <div className="border-t pt-4 mt-4 relative">
              <form onSubmit={handleAddComment} className="flex space-x-2">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    placeholder="Add a comment... (Use @ to mention team members)"
                    value={newComment}
                    onChange={handleInputChange}
                    disabled={addCommentMutation.isPending}
                    className="flex-1"
                  />
                  
                  {/* Mention Dropdown */}
                  {showMentions && filteredMembers.length > 0 && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-32 overflow-y-auto z-50">
                      {filteredMembers.slice(0, 5).map((member: any) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => selectMention(member)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 text-sm"
                        >
                          <AtSign className="h-3 w-3" />
                          <span>{member.name || member.email || `Member ${member.id}`}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              <div className="text-xs text-muted-foreground mt-1">
                Type @ to mention team members and send them targeted notifications
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}