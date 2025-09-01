import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import TaskCard from "./task-card";
import { Plus, Calendar, Clock, FolderOpen, ChevronLeft, ChevronRight, Users, Bot, LayoutGrid, CalendarDays } from "lucide-react";
import { useState } from "react";

interface TimeSlotGridProps {
  viewMode: 'day' | 'week' | 'month' | 'project' | 'category' | 'team' | 'kanban';
  tasks: any[];
  workspaceId: number | null;
  onCreateTask: () => void;
  onEditTask?: (task: any) => void;
  projects?: any[];
  categories?: any[];
  members?: any[];
  currentDate?: Date;
  onNavigateDate?: (direction: 'prev' | 'next') => void;
  selectedProjectId?: string;
  selectedCategoryId?: string;
  selectedUserId?: string;
}

export default function TimeSlotGrid({ 
  viewMode, 
  tasks, 
  workspaceId, 
  onCreateTask,
  onEditTask,
  projects = [],
  categories = [],
  members = [],
  currentDate = new Date(),
  onNavigateDate,
  selectedProjectId = 'all',
  selectedCategoryId = 'all',
  selectedUserId = 'all'
}: TimeSlotGridProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for Month view expandable weeks - declared at top level to follow Rules of Hooks
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  
  // State for expandable task cards - tracks which sections show more than minimum cards
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // State for date range filtering in Project, Category, Team views
  const [dateRangeStart, setDateRangeStart] = useState<Date>(() => {
    // Default to start of current week (Sunday)
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  });

  const [dateRangeEnd, setDateRangeEnd] = useState<Date>(() => {
    // Default to end of current week (Saturday)
    const today = new Date();
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() - today.getDay() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return endOfWeek;
  });

  // State for showing date picker modal
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');

  // Helper function to determine how many cards to show (minimum 12, expandable)
  const getVisibleTaskCount = (sectionId: string, totalTasks: number) => {
    const minCards = Math.min(12, totalTasks); // Show minimum 12 or all if less than 12
    const isExpanded = expandedSections.has(sectionId);
    return isExpanded ? totalTasks : minCards;
  };

  // Helper function to toggle section expansion
  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Helper functions for date range navigation
  const navigateDateRange = (direction: 'prev' | 'next') => {
    const currentRangeDays = Math.ceil((dateRangeEnd.getTime() - dateRangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (direction === 'prev') {
      const newStart = new Date(dateRangeStart);
      newStart.setDate(dateRangeStart.getDate() - currentRangeDays);
      const newEnd = new Date(dateRangeEnd);
      newEnd.setDate(dateRangeEnd.getDate() - currentRangeDays);
      setDateRangeStart(newStart);
      setDateRangeEnd(newEnd);
    } else {
      const newStart = new Date(dateRangeStart);
      newStart.setDate(dateRangeStart.getDate() + currentRangeDays);
      const newEnd = new Date(dateRangeEnd);
      newEnd.setDate(dateRangeEnd.getDate() + currentRangeDays);
      setDateRangeStart(newStart);
      setDateRangeEnd(newEnd);
    }
  };

  // Helper function to update date range
  const updateDateRange = (start: Date, end: Date) => {
    setDateRangeStart(start);
    setDateRangeEnd(end);
    setShowDatePicker(false);
  };

  // Helper function to format date for input field
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Helper function to open date picker with current values
  const openDatePicker = () => {
    setTempStartDate(formatDateForInput(dateRangeStart));
    setTempEndDate(formatDateForInput(dateRangeEnd));
    setShowDatePicker(true);
  };

  // Helper function to apply date range changes
  const applyDateRange = () => {
    if (tempStartDate && tempEndDate) {
      const start = new Date(tempStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(tempEndDate);
      end.setHours(23, 59, 59, 999);
      
      if (start <= end) {
        updateDateRange(start, end);
      } else {
        toast({
          title: "Invalid Date Range",
          description: "Start date must be before or equal to end date.",
          variant: "destructive",
        });
      }
    }
  };

  // Helper function to filter tasks by date range
  const getDateRangeFilteredTasks = () => {
    const baseFilteredTasks = tasks.filter(task => {
      const memberMatch = selectedUserId === 'all' || task.assignedMemberId?.toString() === selectedUserId;
      const projectMatch = selectedProjectId === 'all' || task.projectId?.toString() === selectedProjectId;
      const categoryMatch = selectedCategoryId === 'all' || task.categoryId?.toString() === selectedCategoryId;
      return memberMatch && projectMatch && categoryMatch;
    });

    return baseFilteredTasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return taskDate >= dateRangeStart && taskDate <= dateRangeEnd;
    });
  };

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: number; updates: any }) => {
      return await apiRequest("PATCH", `/api/tasks/${taskId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/tasks`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const handleTaskStatusChange = (taskId: number, completed: boolean) => {
    updateTaskMutation.mutate({
      taskId,
      updates: { status: completed ? 'completed' : 'todo' },
    });
  };

  const handleTaskTimeSlotChange = (taskId: number, dropTarget: string) => {
    let updates: any = {};
    
    switch (viewMode) {
      case 'day':
        // For day view, update timeSlot
        updates = { timeSlot: dropTarget };
        break;
        
      case 'week':
        // For week view, update dueDate based on day name
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        
        // Map day names to indices (Sunday = 0)
        const dayMap: { [key: string]: number } = {
          'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 
          'thursday': 4, 'friday': 5, 'saturday': 6
        };
        
        let dayIndex: number;
        if (typeof dropTarget === 'string' && dropTarget in dayMap) {
          dayIndex = dayMap[dropTarget.toLowerCase()];
        } else {
          // If it's a numeric string, parse it
          dayIndex = parseInt(dropTarget);
        }
        
        const newDate = new Date(weekStart);
        newDate.setDate(weekStart.getDate() + dayIndex);
        updates = { dueDate: newDate.toISOString().split('T')[0] };
        break;
        
      case 'month':
        // For month view, handle week-based drop targets
        if (dropTarget.startsWith('week')) {
          // Extract week number for week-based month view
          const weekNumber = parseInt(dropTarget.replace('week', ''));
          
          // Calculate target date based on week within month
          const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          const firstDayOfWeek = new Date(monthStart);
          firstDayOfWeek.setDate(1 + (weekNumber - 1) * 7);
          
          // Set to the Monday of that week for consistency
          const dayOfWeek = firstDayOfWeek.getDay();
          const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          firstDayOfWeek.setDate(firstDayOfWeek.getDate() + mondayOffset);
          
          updates = { dueDate: firstDayOfWeek.toISOString().split('T')[0] };
        }
        break;
        
      case 'project':
        // For project view, update projectId
        const projectId = parseInt(dropTarget);
        if (!isNaN(projectId)) {
          updates = { projectId };
        }
        break;
        
      case 'category':
        // For category view, update categoryId
        const categoryId = parseInt(dropTarget);
        if (!isNaN(categoryId)) {
          updates = { categoryId };
        }
        break;
        
      case 'team':
        // For team view, update assignedMemberId
        const member = members.find(m => m.userId === dropTarget);
        if (member) {
          updates = { assignedMemberId: member.id };
        }
        break;
        
      case 'kanban':
        // For kanban view, update status
        updates = { status: dropTarget };
        break;
        
      default:
        updates = { timeSlot: dropTarget };
    }
    
    if (Object.keys(updates).length > 0) {
      updateTaskMutation.mutate({
        taskId,
        updates,
      });
    }
  };

  // Filter tasks based on view mode and active filters
  const getFilteredTasks = () => {
    console.log('DEBUG: Total tasks received:', tasks.length);
    console.log('DEBUG: First few task IDs:', tasks.slice(0, 5).map(t => t.id));
    console.log('DEBUG: Sample task data:', tasks[0]);
    
    // First apply the common filters (project, category, member) to all tasks
    const baseFilteredTasks = tasks.filter(task => {
      const memberMatch = selectedUserId === 'all' || 
                         (task.assignedMemberId && task.assignedMemberId.toString() === selectedUserId);
      const projectMatch = selectedProjectId === 'all' || 
                          (task.projectId && task.projectId.toString() === selectedProjectId);
      const categoryMatch = selectedCategoryId === 'all' || 
                           (task.categoryId && task.categoryId.toString() === selectedCategoryId);
      return memberMatch && projectMatch && categoryMatch;
    });

    // Then apply view-specific date filtering
    switch (viewMode) {
      case 'day':
        return baseFilteredTasks.filter(task => {
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          const taskDateStr = taskDate.toISOString().split('T')[0];
          const currentDateStr = currentDate.toISOString().split('T')[0];
          return taskDateStr === currentDateStr;
        });
      
      case 'week':
        return baseFilteredTasks.filter(task => {
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          const weekStart = new Date(currentDate);
          weekStart.setDate(currentDate.getDate() - currentDate.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return taskDate >= weekStart && taskDate <= weekEnd;
        });
      
      case 'month':
        return baseFilteredTasks.filter(task => {
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          return taskDate.getMonth() === currentDate.getMonth() && 
                 taskDate.getFullYear() === currentDate.getFullYear();
        });
      
      case 'project':
      case 'category':
      case 'team':
      case 'kanban':
        // For these views, return all filtered tasks (no date restriction)
        return baseFilteredTasks;
      
      default:
        return baseFilteredTasks;
    }
  };



  // Week View with day-based grid structure
  if (viewMode === 'week') {
    const weekDays = [
      { label: "Monday", value: "monday", period: "Week Day 1", color: "bg-blue-50 border-blue-200" },
      { label: "Tuesday", value: "tuesday", period: "Week Day 2", color: "bg-green-50 border-green-200" },
      { label: "Wednesday", value: "wednesday", period: "Week Day 3", color: "bg-yellow-50 border-yellow-200" },
      { label: "Thursday", value: "thursday", period: "Week Day 4", color: "bg-orange-50 border-orange-200" },
      { label: "Friday", value: "friday", period: "Week Day 5", color: "bg-purple-50 border-purple-200" },
      { label: "Saturday", value: "saturday", period: "Weekend", color: "bg-indigo-50 border-indigo-200" },
      { label: "Sunday", value: "sunday", period: "Weekend", color: "bg-pink-50 border-pink-200" },
    ];

    const getCurrentDay = () => {
      const today = new Date().getDay();
      const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      return dayMap[today];
    };

    const currentDay = getCurrentDay();
    const filteredTasks = getFilteredTasks();
    const unscheduledTasks = tasks.filter(task => {
      // First apply base filters
      const memberMatch = selectedUserId === 'all' || task.assignedMemberId?.toString() === selectedUserId;
      const projectMatch = selectedProjectId === 'all' || task.projectId?.toString() === selectedProjectId;
      const categoryMatch = selectedCategoryId === 'all' || task.categoryId?.toString() === selectedCategoryId;
      
      if (!memberMatch || !projectMatch || !categoryMatch) return false;
      
      // Task is unscheduled only if it has BOTH no assigned member AND no due date
      return !task.assignedMemberId && !task.dueDate;
    });

    // Date navigation function for Week view
    const navigateDate = (direction: 'prev' | 'next') => {
      if (onNavigateDate) {
        onNavigateDate(direction);
      }
    };

    return (
      <div className="space-y-6">
        {/* Date Navigation Header for Week view */}
        <div className="flex items-center justify-between max-w-2xl mx-auto mb-6 bg-white border border-gray-200 px-8 py-4 rounded-lg shadow-sm">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigateDate('prev')}
            className="rounded-full w-12 h-12 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {(() => {
                const weekStart = new Date(currentDate);
                weekStart.setDate(currentDate.getDate() - currentDate.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
              })()}
            </h2>
            <div className="flex items-center justify-center space-x-1 mt-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-500">
                {new Date().toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </span>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigateDate('next')}
            className="rounded-full w-12 h-12 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* Weekly Summary Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Weekly Summary</h3>
            <p className="text-sm text-gray-500">
              {(() => {
                const weekStart = new Date(currentDate);
                weekStart.setDate(currentDate.getDate() - currentDate.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
              })()}
            </p>
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {(() => {
                  // Get start and end of current week (Sunday to Saturday)
                  const weekStart = new Date(currentDate);
                  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
                  weekStart.setHours(0, 0, 0, 0);
                  
                  const weekEnd = new Date(weekStart);
                  weekEnd.setDate(weekStart.getDate() + 6);
                  weekEnd.setHours(23, 59, 59, 999);
                  
                  // Count tasks within the current week
                  const weekTasks = filteredTasks.filter(task => {
                    if (!task.dueDate) return false;
                    const taskDate = new Date(task.dueDate);
                    return taskDate >= weekStart && taskDate <= weekEnd;
                  });
                  
                  return weekTasks.length;
                })()}
              </div>
              <div className="text-sm text-gray-500 uppercase tracking-wide">
                Total Tasks
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {(() => {
                  const weekStart = new Date(currentDate);
                  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
                  weekStart.setHours(0, 0, 0, 0);
                  
                  const weekEnd = new Date(weekStart);
                  weekEnd.setDate(weekStart.getDate() + 6);
                  weekEnd.setHours(23, 59, 59, 999);
                  
                  const weekTasks = filteredTasks.filter(task => {
                    if (!task.dueDate) return false;
                    const taskDate = new Date(task.dueDate);
                    return taskDate >= weekStart && taskDate <= weekEnd;
                  });
                  
                  return weekTasks.filter(task => task.status === 'completed').length;
                })()}
              </div>
              <div className="text-sm text-gray-500 uppercase tracking-wide">
                Completed
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {(() => {
                  const weekStart = new Date(currentDate);
                  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
                  weekStart.setHours(0, 0, 0, 0);
                  
                  const weekEnd = new Date(weekStart);
                  weekEnd.setDate(weekStart.getDate() + 6);
                  weekEnd.setHours(23, 59, 59, 999);
                  
                  const weekTasks = filteredTasks.filter(task => {
                    if (!task.dueDate) return false;
                    const taskDate = new Date(task.dueDate);
                    return taskDate >= weekStart && taskDate <= weekEnd;
                  });
                  
                  return weekTasks.filter(task => task.status !== 'completed').length;
                })()}
              </div>
              <div className="text-sm text-gray-500 uppercase tracking-wide">
                Pending
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-cyan-600">
                {(() => {
                  const weekStart = new Date(currentDate);
                  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
                  weekStart.setHours(0, 0, 0, 0);
                  
                  const weekEnd = new Date(weekStart);
                  weekEnd.setDate(weekStart.getDate() + 6);
                  weekEnd.setHours(23, 59, 59, 999);
                  
                  const weekTasks = filteredTasks.filter(task => {
                    if (!task.dueDate) return false;
                    const taskDate = new Date(task.dueDate);
                    return taskDate >= weekStart && taskDate <= weekEnd;
                  });
                  
                  const completedTasks = weekTasks.filter(task => task.status === 'completed').length;
                  return weekTasks.length > 0 
                    ? Math.round((completedTasks / weekTasks.length) * 100)
                    : 0;
                })()}%
              </div>
              <div className="text-sm text-gray-500 uppercase tracking-wide">
                Progress
              </div>
            </div>
          </div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {weekDays.map((day) => {
            const dayTasks = filteredTasks.filter(task => {
              if (!task.dueDate) return false;
              const taskDate = new Date(task.dueDate);
              const taskDay = taskDate.getDay();
              const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
              
              // Check if task is on the specific day AND within the current week
              const weekStart = new Date(currentDate);
              weekStart.setDate(currentDate.getDate() - currentDate.getDay());
              weekStart.setHours(0, 0, 0, 0);
              
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekStart.getDate() + 6);
              weekEnd.setHours(23, 59, 59, 999);
              
              const isInCurrentWeek = taskDate >= weekStart && taskDate <= weekEnd;
              const isCorrectDay = dayMap[taskDay] === day.value;
              
              return isInCurrentWeek && isCorrectDay;
            });
            const isCurrentDay = currentDay === day.value;
            
            return (
              <Card 
                key={day.value}
                className={`relative transition-all duration-200 ${day.color} ${
                  isCurrentDay 
                    ? 'ring-2 ring-primary shadow-lg scale-[1.02]' 
                    : 'hover:shadow-md'
                }`}
                onDrop={(e) => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData("taskId");
                  if (taskId) {
                    handleTaskTimeSlotChange(parseInt(taskId), day.value);
                  }
                  e.currentTarget.classList.remove('ring-2', 'ring-primary/50');
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('ring-2', 'ring-primary/50');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('ring-2', 'ring-primary/50');
                }}
              >
                {isCurrentDay && (
                  <div className="absolute -top-1 -right-1">
                    <div className="bg-primary text-white text-xs px-2 py-1 rounded-full shadow-sm">
                      Today
                    </div>
                  </div>
                )}
                
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-800">
                        {day.label}
                      </CardTitle>
                      <p className="text-sm text-gray-600 font-medium">{day.period}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={dayTasks.length > 0 ? "default" : "outline"} 
                        className="text-xs"
                      >
                        {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3 min-h-[200px]">
                  {dayTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={(completed) => handleTaskStatusChange(task.id, completed)}
                      onEdit={onEditTask ? () => onEditTask(task) : undefined}
                      onDelete={() => {/* Task deletion handled automatically by component */}}
                      workspaceId={workspaceId}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("taskId", task.id.toString());
                      }}
                    />
                  ))}
                  
                  {/* Always show add task prompt */}
                  <div 
                    className={`flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:border-primary/50 hover:bg-white/50 transition-colors cursor-pointer group ${
                      dayTasks.length === 0 ? 'h-32' : 'h-16 mt-3'
                    }`}
                    onClick={onCreateTask}
                  >
                    <Plus className={`text-gray-400 group-hover:text-primary transition-colors ${
                      dayTasks.length === 0 ? 'h-6 w-6 mb-2' : 'h-4 w-4'
                    }`} />
                    {dayTasks.length === 0 ? (
                      <p className="text-sm text-gray-500 group-hover:text-gray-700">
                        Drop tasks here or click to add to {day.label}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 group-hover:text-gray-700">
                        Add to {day.label}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Unscheduled Tasks Section */}
        {unscheduledTasks.length > 0 && (
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Unscheduled Tasks ({unscheduledTasks.length})
              </CardTitle>
              <p className="text-sm text-gray-600">
                Drag these tasks to a day to schedule them
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {unscheduledTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={(completed) => handleTaskStatusChange(task.id, completed)}
                    onEdit={onEditTask ? () => onEditTask(task) : undefined}
                      onDelete={() => {/* Task deletion handled automatically by component */}}
                    workspaceId={workspaceId}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("taskId", task.id.toString());
                    }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Month View with navigation and stats
  if (viewMode === 'month') {
    const filteredTasks = getFilteredTasks();
    
    // Date navigation function for Month view
    const navigateDate = (direction: 'prev' | 'next') => {
      if (onNavigateDate) {
        onNavigateDate(direction);
      }
    };

    // Calculate monthly stats
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const monthlyTasks = filteredTasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return taskDate >= monthStart && taskDate <= monthEnd;
    });

    const completedTasks = monthlyTasks.filter(task => task.status === 'completed');
    const totalTasks = monthlyTasks.length;
    const pendingTasks = totalTasks - completedTasks.length;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;



    return (
      <div className="space-y-6">
        {/* Date Navigation Header for Month view */}
        <div className="flex items-center justify-between max-w-2xl mx-auto mb-6 bg-white border border-gray-200 px-8 py-4 rounded-lg shadow-sm">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigateDate('prev')}
            className="rounded-full w-12 h-12 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center justify-center space-x-1 mt-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-500">
                {new Date().toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </span>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigateDate('next')}
            className="rounded-full w-12 h-12 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* Monthly Summary Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Summary</h3>
            <p className="text-sm text-gray-500">
              {monthStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {monthEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalTasks}</div>
              <div className="text-sm text-gray-600">Total Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedTasks.length}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{pendingTasks}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{progressPercentage}%</div>
              <div className="text-sm text-gray-600">Progress</div>
            </div>
          </div>
        </div>

        {/* Weeks Grid - 4 per row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((weekNumber) => {
            // Calculate week dates within current month
            const weekStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1 + (weekNumber - 1) * 7);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            // Ensure week end doesn't go beyond current month
            const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            if (weekEnd > monthEnd) {
              weekEnd.setTime(monthEnd.getTime());
            }
            
            const weekTasks = monthlyTasks.filter(task => {
              if (!task.dueDate) return false;
              const taskDate = new Date(task.dueDate);
              return taskDate >= weekStart && taskDate <= weekEnd;
            });
            
            const colors = [
              "bg-blue-50 border-blue-200",
              "bg-green-50 border-green-200", 
              "bg-yellow-50 border-yellow-200",
              "bg-purple-50 border-purple-200"
            ];
            const weekColor = colors[weekNumber - 1];
            
            // Check if current week contains today
            const today = new Date();
            const isCurrentWeek = today >= weekStart && today <= weekEnd;
            const isExpanded = expandedWeeks.has(weekNumber);
            
            const formatDate = (date: Date) => {
              return `${date.getMonth() + 1}/${date.getDate()}`;
            };
            
            const dateRange = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
            
            return (
              <Card 
                key={weekNumber}
                className={`relative transition-all duration-200 ${weekColor} ${
                  isCurrentWeek 
                    ? 'ring-2 ring-primary shadow-lg scale-[1.02]' 
                    : 'hover:shadow-md'
                }`}
                onDrop={(e) => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData("taskId");
                  if (taskId) {
                    handleTaskTimeSlotChange(parseInt(taskId), `week${weekNumber}`);
                  }
                  e.currentTarget.classList.remove('ring-2', 'ring-primary/50');
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('ring-2', 'ring-primary/50');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('ring-2', 'ring-primary/50');
                }}
              >
                {isCurrentWeek && (
                  <div className="absolute -top-1 -right-1">
                    <div className="bg-primary text-white text-xs px-2 py-1 rounded-full shadow-sm">
                      Current
                    </div>
                  </div>
                )}
                
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-800">
                        Week {weekNumber}
                      </CardTitle>
                      <p className="text-sm text-gray-600 font-medium">{dateRange}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={weekTasks.length > 0 ? "default" : "outline"} 
                        className="text-xs"
                      >
                        {weekTasks.length} task{weekTasks.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3 min-h-[200px]">
                  {weekTasks.slice(0, getVisibleTaskCount(`month-week-${weekNumber}`, weekTasks.length)).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={(completed) => handleTaskStatusChange(task.id, completed)}
                      onEdit={onEditTask ? () => onEditTask(task) : undefined}
                      onDelete={() => {/* Task deletion handled automatically by component */}}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("taskId", task.id.toString());
                      }}
                    />
                  ))}
                  
                  {weekTasks.length > getVisibleTaskCount(`month-week-${weekNumber}`, weekTasks.length) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-center text-sm text-gray-500 py-2 bg-white/50 rounded hover:bg-white/80"
                      onClick={() => toggleSection(`month-week-${weekNumber}`)}
                    >
                      {expandedSections.has(`month-week-${weekNumber}`) 
                        ? 'Show less' 
                        : `See more (${weekTasks.length - getVisibleTaskCount(`month-week-${weekNumber}`, weekTasks.length)} more tasks)`
                      }
                    </Button>
                  )}
                  
                  {/* Always show add task prompt */}
                  <div 
                    className={`flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:border-primary/50 hover:bg-white/50 transition-colors cursor-pointer group ${
                      weekTasks.length === 0 ? 'h-32' : 'h-16 mt-3'
                    }`}
                    onClick={onCreateTask}
                  >
                    <Plus className={`text-gray-400 group-hover:text-primary transition-colors ${
                      weekTasks.length === 0 ? 'h-6 w-6 mb-2' : 'h-4 w-4'
                    }`} />
                    {weekTasks.length === 0 ? (
                      <p className="text-sm text-gray-500 group-hover:text-gray-700">
                        Drop tasks here or click to add to Week {weekNumber}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 group-hover:text-gray-700">
                        Add task to Week {weekNumber}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Unscheduled Tasks Section */}
        {monthlyTasks.filter(task => !task.assignedMemberId && !task.dueDate).length > 0 && (
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Unscheduled Tasks ({monthlyTasks.filter(task => !task.assignedMemberId && !task.dueDate).length})
              </CardTitle>
              <p className="text-sm text-gray-600">
                Drag these tasks to a week to schedule them
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {monthlyTasks.filter(task => !task.assignedMemberId && !task.dueDate).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={(completed) => handleTaskStatusChange(task.id, completed)}
                    onEdit={onEditTask ? () => onEditTask(task) : undefined}
                      onDelete={() => {/* Task deletion handled automatically by component */}}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("taskId", task.id.toString());
                    }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Team View
  if (viewMode === 'team') {
    const filteredTasks = getDateRangeFilteredTasks();
    const unscheduledTasks = tasks.filter(task => {
      // First apply base filters
      const memberMatch = selectedUserId === 'all' || task.assignedMemberId?.toString() === selectedUserId;
      const projectMatch = selectedProjectId === 'all' || task.projectId?.toString() === selectedProjectId;
      const categoryMatch = selectedCategoryId === 'all' || task.categoryId?.toString() === selectedCategoryId;
      
      if (!memberMatch || !projectMatch || !categoryMatch) return false;
      
      // Task is unscheduled only if it has BOTH no assigned member AND no due date
      return !task.assignedMemberId && !task.dueDate;
    });

    // Calculate stats for the date range
    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter(task => task.status === 'completed');
    const pendingTasks = totalTasks - completedTasks.length;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

    return (
      <div className="space-y-6">
        {/* Date Range Navigation Header */}
        <div className="flex items-center justify-between max-w-2xl mx-auto mb-6 bg-white border border-gray-200 px-8 py-4 rounded-lg shadow-sm">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigateDateRange('prev')}
            className="rounded-full w-12 h-12 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <div 
            className="text-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
            onClick={openDatePicker}
          >
            <h2 className="text-2xl font-bold text-gray-900 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 mr-2" />
              {dateRangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dateRangeEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </h2>
            <div className="flex items-center justify-center space-x-1 mt-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-500">
                {new Date().toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </span>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigateDateRange('next')}
            className="rounded-full w-12 h-12 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* Team Summary Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Team Summary</h3>
            <p className="text-sm text-gray-500">
              {dateRangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dateRangeEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalTasks}</div>
              <div className="text-sm text-gray-600">Total Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedTasks.length}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{pendingTasks}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{progressPercentage}%</div>
              <div className="text-sm text-gray-600">Progress</div>
            </div>
          </div>
        </div>

        {/* Team Members Grid - 4 per row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {members.map((member, index) => {
            const memberTasks = filteredTasks.filter(task => task.assignedMemberId === member.id);
            const completedTasks = memberTasks.filter(task => task.status === 'completed');
            const progressPercentage = memberTasks.length > 0 ? Math.round((completedTasks.length / memberTasks.length) * 100) : 0;
            
            const colors = [
              "bg-blue-50 border-blue-200",
              "bg-green-50 border-green-200",
              "bg-yellow-50 border-yellow-200",
              "bg-purple-50 border-purple-200",
              "bg-orange-50 border-orange-200",
              "bg-indigo-50 border-indigo-200",
              "bg-pink-50 border-pink-200",
              "bg-gray-50 border-gray-200"
            ];
            const memberColor = colors[index % colors.length];
            
            const memberName = member.user?.firstName 
              ? `${member.user.firstName} ${member.user.lastName || ''}`.trim()
              : member.user?.email?.split('@')[0] || member.name || 'Unknown Member';
            
            return (
              <Card 
                key={member.id}
                className={`relative transition-all duration-200 ${memberColor} ${
                  progressPercentage === 100
                    ? 'ring-2 ring-green-500 shadow-lg scale-[1.02]' 
                    : 'hover:shadow-md'
                }`}
                onDrop={(e) => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData("taskId");
                  if (taskId) {
                    handleTaskTimeSlotChange(parseInt(taskId), member.userId);
                  }
                  e.currentTarget.classList.remove('ring-2', 'ring-primary/50');
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('ring-2', 'ring-primary/50');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('ring-2', 'ring-primary/50');
                }}
              >
                {progressPercentage === 100 && (
                  <div className="absolute -top-1 -right-1">
                    <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                      Complete
                    </div>
                  </div>
                )}
                
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white">
                        {member.memberType === 'agent' ? (
                          <Bot className="h-5 w-5" />
                        ) : (
                          <span className="text-sm font-semibold">
                            {member.user?.firstName?.charAt(0) || member.user?.email?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-gray-800">
                          {memberName}
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          {member.memberType === 'agent' ? 'AI Agent' : member.role || 'Team Member'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={memberTasks.length > 0 ? "default" : "outline"} 
                        className="text-xs"
                      >
                        {memberTasks.length} task{memberTasks.length !== 1 ? 's' : ''}
                      </Badge>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-700">
                          {progressPercentage}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {completedTasks.length}/{memberTasks.length}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3 min-h-[200px]">
                  {memberTasks.slice(0, getVisibleTaskCount(`member-${member.id}`, memberTasks.length)).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={(completed) => handleTaskStatusChange(task.id, completed)}
                      onEdit={onEditTask ? () => onEditTask(task) : undefined}
                      onDelete={() => {/* Task deletion handled automatically by component */}}
                      workspaceId={workspaceId}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("taskId", task.id.toString());
                      }}
                    />
                  ))}
                  
                  {memberTasks.length > getVisibleTaskCount(`member-${member.id}`, memberTasks.length) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-center text-sm text-gray-500 py-2 bg-white/50 rounded hover:bg-white/80"
                      onClick={() => toggleSection(`member-${member.id}`)}
                    >
                      {expandedSections.has(`member-${member.id}`) 
                        ? 'Show less' 
                        : `See more (${memberTasks.length - getVisibleTaskCount(`member-${member.id}`, memberTasks.length)} more tasks)`
                      }
                    </Button>
                  )}
                  
                  {/* Always show add task prompt */}
                  <div 
                    className={`flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:border-primary/50 hover:bg-white/50 transition-colors cursor-pointer group ${
                      memberTasks.length === 0 ? 'h-32' : 'h-16 mt-3'
                    }`}
                    onClick={onCreateTask}
                  >
                    <Plus className={`text-gray-400 group-hover:text-primary transition-colors ${
                      memberTasks.length === 0 ? 'h-6 w-6 mb-2' : 'h-4 w-4'
                    }`} />
                    {memberTasks.length === 0 ? (
                      <p className="text-sm text-gray-500 group-hover:text-gray-700">
                        Drop tasks here or click to assign to {memberName}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 group-hover:text-gray-700">
                        Assign task to {memberName}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Unassigned Tasks Section */}
        {unscheduledTasks.length > 0 && (
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Unassigned Tasks ({unscheduledTasks.length})
              </CardTitle>
              <p className="text-sm text-gray-600">
                Drag these tasks to a team member to assign them
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {unscheduledTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={(completed) => handleTaskStatusChange(task.id, completed)}
                    onEdit={onEditTask ? () => onEditTask(task) : undefined}
                      onDelete={() => {/* Task deletion handled automatically by component */}}
                    workspaceId={workspaceId}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("taskId", task.id.toString());
                    }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Date Range Picker Modal */}
        <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Select Custom Date Range</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={tempStartDate}
                  onChange={(e) => setTempStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={tempEndDate}
                  onChange={(e) => setTempEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDatePicker(false)}
                >
                  Cancel
                </Button>
                <Button onClick={applyDateRange}>
                  Apply Range
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Kanban View
  if (viewMode === 'kanban') {
    const filteredTasks = getDateRangeFilteredTasks();
    
    // Calculate stats for the date range
    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter(task => task.status === 'completed');
    const pendingTasks = totalTasks - completedTasks.length;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

    const statusColumns = [
      { 
        id: 'todo', 
        title: 'Backlog', 
        color: 'bg-gray-50 border-gray-200',
        description: 'Tasks waiting to be started'
      },
      { 
        id: 'in_progress', 
        title: 'Doing', 
        color: 'bg-blue-50 border-blue-200',
        description: 'Tasks currently in progress'
      },
      { 
        id: 'review', 
        title: 'Review', 
        color: 'bg-yellow-50 border-yellow-200',
        description: 'Tasks waiting for review'
      },
      { 
        id: 'completed', 
        title: 'Done', 
        color: 'bg-green-50 border-green-200',
        description: 'Completed tasks'
      }
    ];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Kanban Board</h2>
            <p className="text-gray-500 mt-1">
              Organize tasks by status and workflow
            </p>
          </div>
          <Button onClick={onCreateTask} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>

        {/* Date Range Navigation */}
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newStart = new Date(dateRangeStart);
              const newEnd = new Date(dateRangeEnd);
              const diffDays = Math.ceil((newEnd - newStart) / (1000 * 60 * 60 * 24));
              newStart.setDate(newStart.getDate() - diffDays - 1);
              newEnd.setDate(newEnd.getDate() - diffDays - 1);
              updateDateRange(newStart, newEnd);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openDatePicker}
              className="font-medium"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {dateRangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dateRangeEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Button>
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newStart = new Date(dateRangeStart);
              const newEnd = new Date(dateRangeEnd);
              const diffDays = Math.ceil((newEnd - newStart) / (1000 * 60 * 60 * 24));
              newStart.setDate(newStart.getDate() + diffDays + 1);
              newEnd.setDate(newEnd.getDate() + diffDays + 1);
              updateDateRange(newStart, newEnd);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Kanban Summary Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Kanban Summary</h3>
            <p className="text-sm text-gray-500">
              {dateRangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dateRangeEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalTasks}</div>
              <div className="text-sm text-gray-600">Total Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedTasks.length}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{pendingTasks}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{progressPercentage}%</div>
              <div className="text-sm text-gray-600">Progress</div>
            </div>
          </div>
        </div>

        {/* Kanban Columns - 4 per row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statusColumns.map((column) => {
            const columnTasks = filteredTasks.filter(task => {
              // Map task status to column status
              if (column.id === 'todo') return task.status === 'todo' || !task.status;
              if (column.id === 'in_progress') return task.status === 'in_progress';
              if (column.id === 'review') return task.status === 'review';
              if (column.id === 'completed') return task.status === 'completed';
              return false;
            });
            
            const completedTasks = columnTasks.filter(task => task.status === 'completed');
            const progressPercentage = column.id === 'completed' ? 100 : 
              columnTasks.length > 0 ? Math.round((completedTasks.length / columnTasks.length) * 100) : 0;
            
            return (
              <Card 
                key={column.id}
                className={`relative transition-all duration-200 ${column.color} hover:shadow-md min-h-[500px]`}
                onDrop={(e) => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData("taskId");
                  if (taskId) {
                    // Update task status based on column
                    updateTaskMutation.mutate({
                      taskId: parseInt(taskId),
                      updates: { status: column.id }
                    });
                  }
                  e.currentTarget.classList.remove('ring-2', 'ring-primary/50');
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('ring-2', 'ring-primary/50');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('ring-2', 'ring-primary/50');
                }}
              >
                {column.id === 'completed' && columnTasks.length > 0 && (
                  <div className="absolute -top-1 -right-1">
                    <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                      Complete
                    </div>
                  </div>
                )}
                
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                        <LayoutGrid className="h-5 w-5 mr-2" />
                        {column.title}
                      </CardTitle>
                      <p className="text-sm text-gray-600">{column.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={columnTasks.length > 0 ? "default" : "outline"} 
                        className="text-xs"
                      >
                        {columnTasks.length} task{columnTasks.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3 flex-1">
                  {columnTasks.slice(0, getVisibleTaskCount(`kanban-${column.id}`, columnTasks.length)).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={(completed) => handleTaskStatusChange(task.id, completed)}
                      onEdit={onEditTask ? () => onEditTask(task) : undefined}
                      onDelete={() => {/* Task deletion handled automatically by component */}}
                      workspaceId={workspaceId}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("taskId", task.id.toString());
                      }}
                    />
                  ))}
                  
                  {columnTasks.length > getVisibleTaskCount(`kanban-${column.id}`, columnTasks.length) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-center text-sm text-gray-500 py-2 bg-white/50 rounded hover:bg-white/80"
                      onClick={() => toggleSection(`kanban-${column.id}`)}
                    >
                      {expandedSections.has(`kanban-${column.id}`) 
                        ? 'Show less' 
                        : `See more (${columnTasks.length - getVisibleTaskCount(`kanban-${column.id}`, columnTasks.length)} more tasks)`
                      }
                    </Button>
                  )}
                  
                  {/* Always show add task prompt */}
                  <div 
                    className={`flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:border-primary/50 hover:bg-white/50 transition-colors cursor-pointer group ${
                      columnTasks.length === 0 ? 'h-32' : 'h-16 mt-3'
                    }`}
                    onClick={onCreateTask}
                  >
                    <Plus className={`text-gray-400 group-hover:text-primary transition-colors ${
                      columnTasks.length === 0 ? 'h-6 w-6 mb-2' : 'h-4 w-4'
                    }`} />
                    {columnTasks.length === 0 ? (
                      <p className="text-sm text-gray-500 group-hover:text-gray-700">
                        Drop tasks here or click to add to {column.title}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 group-hover:text-gray-700">
                        Add task to {column.title}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Project View
  if (viewMode === 'project') {
    const filteredTasks = getDateRangeFilteredTasks();
    const unscheduledTasks = tasks.filter(task => {
      // First apply base filters
      const memberMatch = selectedUserId === 'all' || task.assignedMemberId?.toString() === selectedUserId;
      const projectMatch = selectedProjectId === 'all' || task.projectId?.toString() === selectedProjectId;
      const categoryMatch = selectedCategoryId === 'all' || task.categoryId?.toString() === selectedCategoryId;
      
      if (!memberMatch || !projectMatch || !categoryMatch) return false;
      
      // Task is unscheduled only if it has BOTH no assigned member AND no due date
      return !task.assignedMemberId && !task.dueDate;
    });

    // Calculate stats for the date range
    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter(task => task.status === 'completed');
    const pendingTasks = totalTasks - completedTasks.length;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

    return (
      <div className="space-y-6">
        {/* Date Range Navigation Header */}
        <div className="flex items-center justify-between max-w-2xl mx-auto mb-6 bg-white border border-gray-200 px-8 py-4 rounded-lg shadow-sm">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigateDateRange('prev')}
            className="rounded-full w-12 h-12 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <div 
            className="text-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
            onClick={openDatePicker}
          >
            <h2 className="text-2xl font-bold text-gray-900 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 mr-2" />
              {dateRangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dateRangeEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </h2>
            <div className="flex items-center justify-center space-x-1 mt-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-500">
                {new Date().toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </span>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigateDateRange('next')}
            className="rounded-full w-12 h-12 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* Project Summary Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Project Summary</h3>
            <p className="text-sm text-gray-500">
              {dateRangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dateRangeEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalTasks}</div>
              <div className="text-sm text-gray-600">Total Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedTasks.length}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{pendingTasks}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{progressPercentage}%</div>
              <div className="text-sm text-gray-600">Progress</div>
            </div>
          </div>
        </div>

        {/* Projects Grid - 4 per row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {projects.map((project, index) => {
            const projectTasks = filteredTasks.filter(task => task.projectId === project.id);
            const completedTasks = projectTasks.filter(task => task.status === 'completed');
            const progressPercentage = projectTasks.length > 0 ? Math.round((completedTasks.length / projectTasks.length) * 100) : 0;
            
            const colors = [
              "bg-blue-50 border-blue-200",
              "bg-green-50 border-green-200",
              "bg-yellow-50 border-yellow-200",
              "bg-purple-50 border-purple-200",
              "bg-orange-50 border-orange-200",
              "bg-indigo-50 border-indigo-200",
              "bg-pink-50 border-pink-200",
              "bg-gray-50 border-gray-200"
            ];
            const projectColor = colors[index % colors.length];
            
            return (
              <Card 
                key={project.id}
                className={`relative transition-all duration-200 ${projectColor} ${
                  progressPercentage === 100
                    ? 'ring-2 ring-green-500 shadow-lg scale-[1.02]' 
                    : 'hover:shadow-md'
                }`}
                onDrop={(e) => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData("taskId");
                  if (taskId) {
                    handleTaskTimeSlotChange(parseInt(taskId), project.id.toString());
                  }
                  e.currentTarget.classList.remove('ring-2', 'ring-primary/50');
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('ring-2', 'ring-primary/50');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('ring-2', 'ring-primary/50');
                }}
              >
                {progressPercentage === 100 && (
                  <div className="absolute -top-1 -right-1">
                    <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                      Complete
                    </div>
                  </div>
                )}
                
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-800">
                        {project.name}
                      </CardTitle>
                      <p className="text-sm text-gray-600">{project.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={projectTasks.length > 0 ? "default" : "outline"} 
                        className="text-xs"
                      >
                        {projectTasks.length} task{projectTasks.length !== 1 ? 's' : ''}
                      </Badge>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-700">
                          {progressPercentage}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {completedTasks.length}/{projectTasks.length}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3 min-h-[200px]">
                  {projectTasks.slice(0, getVisibleTaskCount(`project-${project.id}`, projectTasks.length)).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={(completed) => handleTaskStatusChange(task.id, completed)}
                      onEdit={onEditTask ? () => onEditTask(task) : undefined}
                      onDelete={() => {/* Task deletion handled automatically by component */}}
                      workspaceId={workspaceId}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("taskId", task.id.toString());
                      }}
                    />
                  ))}
                  
                  {projectTasks.length > getVisibleTaskCount(`project-${project.id}`, projectTasks.length) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-center text-sm text-gray-500 py-2 bg-white/50 rounded hover:bg-white/80"
                      onClick={() => toggleSection(`project-${project.id}`)}
                    >
                      {expandedSections.has(`project-${project.id}`) 
                        ? 'Show less' 
                        : `See more (${projectTasks.length - getVisibleTaskCount(`project-${project.id}`, projectTasks.length)} more tasks)`
                      }
                    </Button>
                  )}
                  
                  {/* Always show add task prompt */}
                  <div 
                    className={`flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:border-primary/50 hover:bg-white/50 transition-colors cursor-pointer group ${
                      projectTasks.length === 0 ? 'h-32' : 'h-16 mt-3'
                    }`}
                    onClick={onCreateTask}
                  >
                    <Plus className={`text-gray-400 group-hover:text-primary transition-colors ${
                      projectTasks.length === 0 ? 'h-6 w-6 mb-2' : 'h-4 w-4'
                    }`} />
                    {projectTasks.length === 0 ? (
                      <p className="text-sm text-gray-500 group-hover:text-gray-700">
                        Drop tasks here or click to add to {project.name}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 group-hover:text-gray-700">
                        Add task to {project.name}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Unscheduled Tasks Section */}
        {unscheduledTasks.length > 0 && (
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Unscheduled Tasks ({unscheduledTasks.length})
              </CardTitle>
              <p className="text-sm text-gray-600">
                Drag these tasks to a week to schedule them
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {unscheduledTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={(completed) => handleTaskStatusChange(task.id, completed)}
                    onEdit={onEditTask ? () => onEditTask(task) : undefined}
                      onDelete={() => {/* Task deletion handled automatically by component */}}
                    workspaceId={workspaceId}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("taskId", task.id.toString());
                    }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Project View
  if (viewMode === 'project') {
    const filteredTasks = getDateRangeFilteredTasks();
    const unscheduledTasks = tasks.filter(task => {
      // First apply base filters
      const memberMatch = selectedUserId === 'all' || task.assignedMemberId?.toString() === selectedUserId;
      const projectMatch = selectedProjectId === 'all' || task.projectId?.toString() === selectedProjectId;
      const categoryMatch = selectedCategoryId === 'all' || task.categoryId?.toString() === selectedCategoryId;
      
      if (!memberMatch || !projectMatch || !categoryMatch) return false;
      
      // Task is unscheduled only if it has BOTH no assigned member AND no due date
      return !task.assignedMemberId && !task.dueDate;
    });

    // Calculate stats for the date range
    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter(task => task.status === 'completed');
    const pendingTasks = totalTasks - completedTasks.length;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Project View</h2>
            <p className="text-gray-500 mt-1">
              Organize tasks by project
            </p>
          </div>
          <Button onClick={onCreateTask} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>

        {/* Date Range Navigation */}
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newStart = new Date(dateRangeStart);
              const newEnd = new Date(dateRangeEnd);
              const diffDays = Math.ceil((newEnd - newStart) / (1000 * 60 * 60 * 24));
              newStart.setDate(newStart.getDate() - diffDays - 1);
              newEnd.setDate(newEnd.getDate() - diffDays - 1);
              updateDateRange(newStart, newEnd);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openDatePicker}
              className="font-medium"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {dateRangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dateRangeEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Button>
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newStart = new Date(dateRangeStart);
              const newEnd = new Date(dateRangeEnd);
              const diffDays = Math.ceil((newEnd - newStart) / (1000 * 60 * 60 * 24));
              newStart.setDate(newStart.getDate() + diffDays + 1);
              newEnd.setDate(newEnd.getDate() + diffDays + 1);
              updateDateRange(newStart, newEnd);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Project Summary Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Project Summary</h3>
            <p className="text-sm text-gray-500">
              {dateRangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dateRangeEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalTasks}</div>
              <div className="text-sm text-gray-600">Total Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedTasks.length}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{pendingTasks}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{progressPercentage}%</div>
              <div className="text-sm text-gray-600">Progress</div>
            </div>
          </div>
        </div>

        {/* Projects Grid - 4 per row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {projects.map((project, index) => {
            const projectTasks = filteredTasks.filter(task => task.projectId === project.id);
            const completedTasks = projectTasks.filter(task => task.status === 'completed');
            const progressPercentage = projectTasks.length > 0 ? Math.round((completedTasks.length / projectTasks.length) * 100) : 0;
            
            const colors = [
              "bg-blue-50 border-blue-200",
              "bg-green-50 border-green-200",
              "bg-yellow-50 border-yellow-200",
              "bg-purple-50 border-purple-200",
              "bg-orange-50 border-orange-200",
              "bg-indigo-50 border-indigo-200",
              "bg-pink-50 border-pink-200",
              "bg-gray-50 border-gray-200"
            ];
            const projectColor = colors[index % colors.length];
            
            return (
              <Card 
                key={project.id}
                className={`relative transition-all duration-200 ${projectColor} hover:shadow-md`}
                onDrop={(e) => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData("taskId");
                  if (taskId) {
                    handleTaskTimeSlotChange(parseInt(taskId), `project-${project.id}`);
                  }
                  e.currentTarget.classList.remove('ring-2', 'ring-primary/50');
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('ring-2', 'ring-primary/50');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('ring-2', 'ring-primary/50');
                }}
              >
                {progressPercentage === 100 && (
                  <div className="absolute -top-1 -right-1">
                    <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                      Complete
                    </div>
                  </div>
                )}
                
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-800">
                        {project.name}
                      </CardTitle>
                      <p className="text-sm text-gray-600 font-medium">
                        {progressPercentage}% Complete ({completedTasks.length}/{projectTasks.length})
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={projectTasks.length > 0 ? "default" : "outline"} 
                        className="text-xs"
                      >
                        {projectTasks.length} task{projectTasks.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3 min-h-[200px]">
                  {projectTasks.slice(0, getVisibleTaskCount(`project-${project.id}`, projectTasks.length)).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={(completed) => handleTaskStatusChange(task.id, completed)}
                      workspaceId={workspaceId}
                      onEdit={onEditTask ? () => onEditTask(task) : undefined}
                      onDelete={() => {/* Task deletion handled automatically by component */}}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("taskId", task.id.toString());
                      }}
                    />
                  ))}
                  
                  {projectTasks.length > getVisibleTaskCount(`project-${project.id}`, projectTasks.length) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-center text-sm text-gray-500 py-2 bg-white/50 rounded hover:bg-white/80"
                      onClick={() => toggleSection(`project-${project.id}`)}
                    >
                      {expandedSections.has(`project-${project.id}`) 
                        ? 'Show less' 
                        : `See more (${projectTasks.length - getVisibleTaskCount(`project-${project.id}`, projectTasks.length)} more tasks)`
                      }
                    </Button>
                  )}
                  
                  {projectTasks.length === 0 && (
                    <div 
                      className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary/50 hover:bg-white/50 transition-colors cursor-pointer group"
                      onClick={onCreateTask}
                    >
                      <Plus className="h-6 w-6 text-gray-400 group-hover:text-primary transition-colors mb-2" />
                      <p className="text-sm text-gray-500 group-hover:text-gray-700">
                        Drop tasks here or click to add
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State for No Projects */}
        {projects.length === 0 && (
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="text-center py-12">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Found</h3>
              <p className="text-gray-500 mb-4">Create your first project to get started</p>
              <Button onClick={() => window.location.reload()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Unscheduled Tasks Section */}
        {unscheduledTasks.length > 0 && (
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Unassigned Tasks ({unscheduledTasks.length})
              </CardTitle>
              <p className="text-sm text-gray-600">
                Drag these tasks to a project to assign them
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {unscheduledTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={(completed) => handleTaskStatusChange(task.id, completed)}
                    onEdit={onEditTask ? () => onEditTask(task) : undefined}
                      onDelete={() => {/* Task deletion handled automatically by component */}}
                    workspaceId={workspaceId}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("taskId", task.id.toString());
                    }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Date Range Picker Modal */}
        <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Select Custom Date Range</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={tempStartDate}
                  onChange={(e) => setTempStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={tempEndDate}
                  onChange={(e) => setTempEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDatePicker(false)}
                >
                  Cancel
                </Button>
                <Button onClick={applyDateRange}>
                  Apply Range
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Category View with same grid structure as Day View
  if (viewMode === 'category') {
    const categoryIcons = {
      'Innovation Management': '💡',
      'Backend Development': '⚙️',
      'Frontend Development': '🎨',
      'Marketing': '📢',
      'Business Development': '💼'
    };
    
    const categoryColors = [
      'bg-blue-50 border-blue-200',
      'bg-green-50 border-green-200', 
      'bg-purple-50 border-purple-200',
      'bg-orange-50 border-orange-200',
      'bg-pink-50 border-pink-200'
    ];

    const workspaceCategories = categories.map((category, index) => ({
      id: category.id,
      label: category.name,
      value: category.id.toString(),
      color: categoryColors[index % categoryColors.length],
      icon: categoryIcons[category.name] || '📋'
    }));

    const filteredTasks = getDateRangeFilteredTasks();
    const uncategorizedTasks = tasks.filter(task => {
      // First apply base filters
      const memberMatch = selectedUserId === 'all' || task.assignedMemberId?.toString() === selectedUserId;
      const projectMatch = selectedProjectId === 'all' || task.projectId?.toString() === selectedProjectId;
      const categoryMatch = selectedCategoryId === 'all' || task.categoryId?.toString() === selectedCategoryId;
      
      if (!memberMatch || !projectMatch || !categoryMatch) return false;
      
      // Then check if task is uncategorized or outside date range
      if (!task.categoryId) return true;
      
      if (!task.dueDate) return true;
      const taskDate = new Date(task.dueDate);
      return taskDate < dateRangeStart || taskDate > dateRangeEnd;
    });

    // Calculate stats for the date range
    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter(task => task.status === 'completed');
    const pendingTasks = totalTasks - completedTasks.length;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

    return (
      <div className="space-y-6">
        {/* Date Range Navigation Header */}
        <div className="flex items-center justify-between max-w-2xl mx-auto mb-6 bg-white border border-gray-200 px-8 py-4 rounded-lg shadow-sm">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigateDateRange('prev')}
            className="rounded-full w-12 h-12 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <div 
            className="text-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
            onClick={openDatePicker}
          >
            <h2 className="text-2xl font-bold text-gray-900 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 mr-2" />
              {dateRangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dateRangeEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </h2>
            <div className="flex items-center justify-center space-x-1 mt-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-500">
                {new Date().toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </span>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigateDateRange('next')}
            className="rounded-full w-12 h-12 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* Category Summary Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Category Summary</h3>
            <p className="text-sm text-gray-500">
              {dateRangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dateRangeEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalTasks}</div>
              <div className="text-sm text-gray-600">Total Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedTasks.length}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{pendingTasks}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{progressPercentage}%</div>
              <div className="text-sm text-gray-600">Progress</div>
            </div>
          </div>
        </div>

        {/* Categories Grid - 4 per row but responsive */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {workspaceCategories.map((category) => {
            const categoryTasks = filteredTasks.filter(task => task.categoryId === category.id);
            
            return (
              <Card 
                key={category.value}
                className={`relative transition-all duration-200 ${category.color} hover:shadow-md`}
                onDrop={(e) => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData("taskId");
                  if (taskId) {
                    handleTaskTimeSlotChange(parseInt(taskId), category.value);
                  }
                  e.currentTarget.classList.remove('ring-2', 'ring-primary/50');
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('ring-2', 'ring-primary/50');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('ring-2', 'ring-primary/50');
                }}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                        <span className="text-xl mr-2">{category.icon}</span>
                        {category.label}
                      </CardTitle>
                      <p className="text-sm text-gray-600 font-medium">
                        {categoryTasks.length} task{categoryTasks.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={categoryTasks.length > 0 ? "default" : "outline"} 
                        className="text-xs"
                      >
                        {categoryTasks.length}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3 min-h-[200px]">
                  {categoryTasks.slice(0, getVisibleTaskCount(`category-${category.id}`, categoryTasks.length)).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      workspaceId={workspaceId}
                      onStatusChange={(completed) => handleTaskStatusChange(task.id, completed)}
                      onEdit={onEditTask ? () => onEditTask(task) : undefined}
                      onDelete={() => {/* Task deletion handled automatically by component */}}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("taskId", task.id.toString());
                      }}
                    />
                  ))}
                  
                  {categoryTasks.length > getVisibleTaskCount(`category-${category.id}`, categoryTasks.length) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-center text-sm text-gray-500 py-2 bg-white/50 rounded hover:bg-white/80"
                      onClick={() => toggleSection(`category-${category.id}`)}
                    >
                      {expandedSections.has(`category-${category.id}`) 
                        ? 'Show less' 
                        : `See more (${categoryTasks.length - getVisibleTaskCount(`category-${category.id}`, categoryTasks.length)} more tasks)`
                      }
                    </Button>
                  )}
                  
                  {/* Always show add task prompt */}
                  <div 
                    className={`flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:border-primary/50 hover:bg-white/50 transition-colors cursor-pointer group ${
                      categoryTasks.length === 0 ? 'h-32' : 'h-16 mt-3'
                    }`}
                    onClick={onCreateTask}
                  >
                    <Plus className={`text-gray-400 group-hover:text-primary transition-colors ${
                      categoryTasks.length === 0 ? 'h-6 w-6 mb-2' : 'h-4 w-4'
                    }`} />
                    {categoryTasks.length === 0 ? (
                      <p className="text-sm text-gray-500 group-hover:text-gray-700">
                        Drop tasks here or click to add to {category.label}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 group-hover:text-gray-700">
                        Add task to {category.label}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Uncategorized Tasks Section */}
        {uncategorizedTasks.length > 0 && (
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Uncategorized Tasks ({uncategorizedTasks.length})
              </CardTitle>
              <p className="text-sm text-gray-600">
                Drag these tasks to a category to organize them
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {uncategorizedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={(completed) => handleTaskStatusChange(task.id, completed)}
                    onEdit={onEditTask ? () => onEditTask(task) : undefined}
                      onDelete={() => {/* Task deletion handled automatically by component */}}
                    workspaceId={workspaceId}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("taskId", task.id.toString());
                    }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Date Range Picker Modal */}
        <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Select Custom Date Range</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={tempStartDate}
                  onChange={(e) => setTempStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={tempEndDate}
                  onChange={(e) => setTempEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDatePicker(false)}
                >
                  Cancel
                </Button>
                <Button onClick={applyDateRange}>
                  Apply Range
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }



  const getCurrentTime = () => {
    const now = new Date();
    const hour = now.getHours();
    
    if (hour >= 6 && hour < 9) return "6:00-9:00";
    if (hour >= 9 && hour < 12) return "9:00-12:00";
    if (hour >= 12 && hour < 15) return "12:00-15:00";
    if (hour >= 15 && hour < 18) return "15:00-18:00";
    if (hour >= 18 && hour < 21) return "18:00-21:00";
    if (hour >= 21 && hour < 23) return "21:00-23:00";
    return null;
  };

  const currentTimeSlot = getCurrentTime();
  const filteredTasks = getFilteredTasks();
  const unscheduledTasks = filteredTasks.filter(task => !task.assignedMemberId && !task.dueDate);

  // Define time slots for Day view - matching the actual task time slots in database
  const timeSlots = [
    { label: "6:00 - 9:00 AM", value: "6:00-9:00", time: "6:00-9:00", period: "Morning", color: "bg-yellow-50 border-yellow-200" },
    { label: "9:00 - 12:00 PM", value: "9:00-12:00", time: "9:00-12:00", period: "Late Morning", color: "bg-orange-50 border-orange-200" },
    { label: "1:00 - 4:00 PM", value: "13:00-16:00", time: "13:00-16:00", period: "Afternoon", color: "bg-blue-50 border-blue-200" },
    { label: "2:00 - 5:00 PM", value: "14:00-17:00", time: "14:00-17:00", period: "Late Afternoon", color: "bg-purple-50 border-purple-200" },
    { label: "6:00 - 9:00 PM", value: "18:00-21:00", time: "18:00-21:00", period: "Evening", color: "bg-indigo-50 border-indigo-200" },
    { label: "9:00 - 11:00 PM", value: "21:00-23:00", time: "21:00-23:00", period: "Late Evening", color: "bg-gray-50 border-gray-200" },
  ];

  // Date navigation functions - passed from parent
  const navigateDate = (direction: 'prev' | 'next') => {
    if (onNavigateDate) {
      onNavigateDate(direction);
    }
  };

  // Format date display based on view mode
  const getDateDisplayText = () => {
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
        return currentDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
    }
  };

  return (
    <div className="space-y-6">
      {/* Date Navigation Header for Day/Week/Month views */}
      {['day', 'week', 'month'].includes(viewMode) && (
        <div className="flex items-center justify-between max-w-2xl mx-auto mb-6 bg-white border border-gray-200 px-8 py-4 rounded-lg shadow-sm">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigateDate('prev')}
            className="rounded-full w-12 h-12 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {getDateDisplayText()}
            </h2>
            <div className="flex items-center justify-center space-x-1 mt-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-500">
                {new Date().toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </span>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigateDate('next')}
            className="rounded-full w-12 h-12 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Daily Stats for Day view */}
      {viewMode === 'day' && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {(() => {
                  // Count only tasks that are scheduled for time slots in Day view
                  const visibleTasks = timeSlots.reduce((total, slot) => {
                    return total + filteredTasks.filter(task => task.timeSlot === slot.value).length;
                  }, 0);
                  return visibleTasks;
                })()}
              </div>
              <div className="text-sm text-gray-500 uppercase tracking-wide">
                Total Tasks
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {(() => {
                  const visibleTasks = timeSlots.reduce((tasks, slot) => {
                    return [...tasks, ...filteredTasks.filter(task => task.timeSlot === slot.value)];
                  }, []);
                  return visibleTasks.filter(task => task.status === 'completed').length;
                })()}
              </div>
              <div className="text-sm text-gray-500 uppercase tracking-wide">
                Completed
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {(() => {
                  const visibleTasks = timeSlots.reduce((tasks, slot) => {
                    return [...tasks, ...filteredTasks.filter(task => task.timeSlot === slot.value)];
                  }, []);
                  return visibleTasks.filter(task => task.status !== 'completed').length;
                })()}
              </div>
              <div className="text-sm text-gray-500 uppercase tracking-wide">
                Pending
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-cyan-600">
                {(() => {
                  const visibleTasks = timeSlots.reduce((tasks, slot) => {
                    return [...tasks, ...filteredTasks.filter(task => task.timeSlot === slot.value)];
                  }, []);
                  const completedTasks = visibleTasks.filter(task => task.status === 'completed').length;
                  return visibleTasks.length > 0 
                    ? Math.round((completedTasks / visibleTasks.length) * 100)
                    : 0;
                })()}%
              </div>
              <div className="text-sm text-gray-500 uppercase tracking-wide">
                Progress
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Stats moved to Week view section above */}

      {/* Week View Grid */}
      {viewMode === 'week' ? (
        <div className="space-y-6">
          {/* Week Days Grid */}
          <div className="grid grid-cols-7 gap-4">
            {(() => {
              const weekStart = new Date(currentDate);
              // Ensure we start from Sunday (getDay() returns 0 for Sunday)
              const dayOfWeek = weekStart.getDay();
              weekStart.setDate(weekStart.getDate() - dayOfWeek);
              
              const days = [];
              for (let i = 0; i < 7; i++) {
                const day = new Date(weekStart);
                day.setDate(weekStart.getDate() + i);
                days.push(day);
              }
              
              return days.map((day, index) => {
                const dayTasks = filteredTasks.filter(task => {
                  if (!task.dueDate) return false;
                  const taskDate = new Date(task.dueDate);
                  const taskDateStr = taskDate.toISOString().split('T')[0];
                  const dayStr = day.toISOString().split('T')[0];
                  return taskDateStr === dayStr;
                });
                
                const isToday = day.toDateString() === new Date().toDateString();
                const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNumber = day.getDate();
                
                return (
                  <Card key={index} className={`${isToday ? 'ring-2 ring-primary bg-primary/5' : 'bg-white'}`}>
                    <CardHeader className="pb-3">
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-600">{dayName}</div>
                        <div className={`text-lg font-bold ${isToday ? 'text-primary' : 'text-gray-900'}`}>
                          {dayNumber}
                        </div>
                        <Badge variant={dayTasks.length > 0 ? "default" : "outline"} className="text-xs mt-1">
                          {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 min-h-[200px]">
                      {dayTasks.slice(0, getVisibleTaskCount(`day-${dayNumber}`, dayTasks.length)).map((task) => (
                        <TaskCard
                          key={task.id}
                          workspaceId={workspaceId}
                          task={task}
                          onStatusChange={(completed) => handleTaskStatusChange(task.id, completed)}
                          onEdit={onEditTask ? () => onEditTask(task) : undefined}
                      onDelete={() => {/* Task deletion handled automatically by component */}}
                        />
                      ))}
                      {dayTasks.length > getVisibleTaskCount(`day-${dayNumber}`, dayTasks.length) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs text-gray-500 text-center py-2 hover:bg-gray-100"
                          onClick={() => toggleSection(`day-${dayNumber}`)}
                        >
                          {expandedSections.has(`day-${dayNumber}`) 
                            ? 'Show less' 
                            : `See more (${dayTasks.length - getVisibleTaskCount(`day-${dayNumber}`, dayTasks.length)} more tasks)`
                          }
                        </Button>
                      )}
                      {/* Always show add task prompt */}
                      <div 
                        className={`flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:border-primary/50 transition-colors cursor-pointer group ${
                          dayTasks.length === 0 ? 'h-24' : 'h-12 mt-2'
                        }`}
                        onClick={onCreateTask}
                      >
                        <Plus className={`text-gray-400 group-hover:text-primary transition-colors ${
                          dayTasks.length === 0 ? 'h-4 w-4' : 'h-3 w-3'
                        }`} />
                        {dayTasks.length === 0 ? (
                          <p className="text-xs text-gray-500 group-hover:text-gray-700 mt-1">
                            Add task to {dayName}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500 group-hover:text-gray-700">
                            Add to {dayName}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              });
            })()}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {timeSlots.map((slot) => {
          const slotTasks = filteredTasks.filter(task => task.timeSlot === slot.value);
          const isCurrentSlot = currentTimeSlot === slot.value;
          
          return (
            <Card 
              key={slot.value}
              className={`relative transition-all duration-200 ${slot.color} ${
                isCurrentSlot 
                  ? 'ring-2 ring-primary shadow-lg scale-[1.02]' 
                  : 'hover:shadow-md'
              }`}
              onDrop={(e) => {
                e.preventDefault();
                const taskId = e.dataTransfer.getData("taskId");
                if (taskId) {
                  handleTaskTimeSlotChange(parseInt(taskId), slot.value);
                }
                e.currentTarget.classList.remove('ring-2', 'ring-primary/50');
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('ring-2', 'ring-primary/50');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('ring-2', 'ring-primary/50');
              }}
            >
              {isCurrentSlot && (
                <div className="absolute -top-1 -right-1">
                  <div className="bg-primary text-white text-xs px-2 py-1 rounded-full shadow-sm">
                    Current
                  </div>
                </div>
              )}
              
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-800">
                      {slot.label}
                    </CardTitle>
                    <p className="text-sm text-gray-600 font-medium">{slot.period}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={slotTasks.length > 0 ? "default" : "outline"} 
                      className="text-xs"
                    >
                      {slotTasks.length} task{slotTasks.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3 min-h-[200px]">
                {slotTasks.map((task) => (
                  <TaskCard
                    workspaceId={workspaceId}
                    key={task.id}
                    task={task}
                    onStatusChange={(completed) => handleTaskStatusChange(task.id, completed)}
                    onEdit={onEditTask ? () => onEditTask(task) : undefined}
                      onDelete={() => {/* Task deletion handled automatically by component */}}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("taskId", task.id.toString());
                    }}
                  />
                ))}
                
                {/* Always show add task prompt */}
                <div 
                  className={`flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:border-primary/50 hover:bg-white/50 transition-colors cursor-pointer group ${
                    slotTasks.length === 0 ? 'h-32' : 'h-16 mt-3'
                  }`}
                  onClick={onCreateTask}
                >
                  <Plus className={`text-gray-400 group-hover:text-primary transition-colors ${
                    slotTasks.length === 0 ? 'h-6 w-6 mb-2' : 'h-4 w-4'
                  }`} />
                  {slotTasks.length === 0 ? (
                    <p className="text-sm text-gray-500 group-hover:text-gray-700">
                      Drop tasks here or click to add to {slot.time}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 group-hover:text-gray-700">
                      Add task to {slot.time}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
          })}
        </div>
      )}

      {/* Unscheduled Tasks Section */}
      {unscheduledTasks.length > 0 && (
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Unscheduled Tasks ({unscheduledTasks.length})
            </CardTitle>
            <p className="text-sm text-gray-600">
              Drag these tasks to a time slot to schedule them
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {unscheduledTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={(completed) => handleTaskStatusChange(task.id, completed)}
                  onEdit={onEditTask ? () => onEditTask(task) : undefined}
                      onDelete={() => {/* Task deletion handled automatically by component */}}
                  workspaceId={workspaceId}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("taskId", task.id.toString());
                  }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Date Range Picker Modal */}
      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Custom Date Range</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={tempStartDate}
                onChange={(e) => setTempStartDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={tempEndDate}
                onChange={(e) => setTempEndDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowDatePicker(false)}
              >
                Cancel
              </Button>
              <Button onClick={applyDateRange}>
                Apply Range
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
