import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { User, Bot, Edit2, MessageCircle, Trash2 } from "lucide-react";
import TaskCommentsModal from "./task-comments-modal";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

interface TaskCardProps {
  task: any;
  onStatusChange: (completed: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  workspaceId?: number;
}

export default function TaskCard({ 
  task, 
  onStatusChange, 
  onEdit,
  onDelete,
  draggable = false,
  onDragStart,
  workspaceId 
}: TaskCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState<'single' | 'all'>('single');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!workspaceId) {
      toast({
        title: "Error",
        description: "Unable to delete task: workspace not found",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    
    try {
      if (task.taskRecurrenceId && deleteType === 'all') {
        // Delete all future recurring tasks
        await apiRequest('DELETE', `/api/task-recurrences/${task.taskRecurrenceId}`);
        
        toast({
          title: "Recurring tasks deleted",
          description: `This instance and all future recurring instances of "${task.title}" have been deleted.`,
        });
      } else {
        // Delete single task
        await apiRequest('DELETE', `/api/tasks/${task.id}`);
        
        toast({
          title: "Task deleted",
          description: `"${task.title}" has been deleted successfully.`,
        });
      }

      // Invalidate cache to refresh task list
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/tasks`] });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/tasks/due-today`] });
      
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };
  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 3: return "bg-red-100 border-red-200 text-red-800";
      case 2: return "bg-yellow-100 border-yellow-200 text-yellow-800";
      case 1: return "bg-blue-100 border-blue-200 text-blue-800";
      default: return "bg-gray-100 border-gray-200 text-gray-600";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return "bg-green-100 border-green-200";
      case 'in_progress': return "bg-yellow-100 border-yellow-200";
      default: return "bg-white border-gray-200";
    }
  };

  return (
    <>
      <div
        className={`p-3 border rounded-lg ${getStatusColor(task.status)} ${
          draggable ? 'cursor-move' : ''
        } hover:shadow-sm transition-shadow`}
        draggable={draggable}
        onDragStart={onDragStart}
      >
      <div className="flex items-start space-x-2">
        <Checkbox
          checked={task.status === 'completed'}
          onCheckedChange={(checked) => onStatusChange(!!checked)}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-medium truncate ${
            task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
          }`}>
            {task.title}
          </h4>
          {task.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-2 flex-wrap">
              {task.priority > 0 && (
                <Badge 
                  variant="outline" 
                  className={`text-xs px-1 py-0 ${getPriorityColor(task.priority)}`}
                >
                  P{task.priority}
                </Badge>
              )}
              {task.assignedMemberId && task.assignedMember && (
                <Badge variant="outline" className="text-xs px-1 py-0 bg-blue-50 text-blue-700">
                  {task.assignedMember.memberType === 'agent' ? (
                    <div className="flex items-center space-x-1">
                      <Bot className="h-2.5 w-2.5" />
                      <span>AI Agent</span>
                    </div>
                  ) : (
                    task.assignedMember.user?.firstName || 
                    task.assignedMember.user?.email?.split('@')[0] || 
                    'Assigned'
                  )}
                </Badge>
              )}
            </div>
            <div className="flex flex-col items-end text-xs text-gray-400 space-y-0.5">
              {task.project && (
                <span className="truncate max-w-20">{task.project.name}</span>
              )}
              {task.category && (
                <span className="truncate max-w-20">{task.category.name}</span>
              )}
              {task.dueDate && (
                <span className="text-gray-500 font-medium">
                  {new Date(task.dueDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {task.assignedMemberId && task.assignedMember && (
            <div className="flex items-center">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                  {task.assignedMember.memberType === 'agent' ? (
                    <Bot className="h-3 w-3" />
                  ) : (
                    task.assignedMember.user?.firstName?.charAt(0) || 
                    task.assignedMember.user?.email?.charAt(0)?.toUpperCase() || 
                    <User className="h-3 w-3" />
                  )}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
          {workspaceId && (
            <TaskCommentsModal 
              task={task}
              workspaceId={workspaceId}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                >
                  <MessageCircle className="h-3 w-3" />
                </Button>
              }
            />
          )}
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditClick}
              className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
          )}
          {workspaceId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="h-6 w-6 p-0 opacity-70 hover:opacity-100 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>

    {/* Delete Confirmation Modal */}
    <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Task</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <span className="font-semibold">"{task.title}"</span>? 
            This action cannot be undone.
          </p>
          
          {task.taskRecurrenceId && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-800 mb-2">
                This is a recurring task
              </p>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="deleteType"
                    value="single"
                    checked={deleteType === 'single'}
                    onChange={(e) => setDeleteType(e.target.value as 'single' | 'all')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Delete only this instance</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="deleteType"
                    value="all"
                    checked={deleteType === 'all'}
                    onChange={(e) => setDeleteType(e.target.value as 'single' | 'all')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Delete this instance and all future recurring instances</span>
                </label>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowDeleteModal(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirmDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : (deleteType === 'all' && task.taskRecurrenceId ? "Delete All" : "Delete Task")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
