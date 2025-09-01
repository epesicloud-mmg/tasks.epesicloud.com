import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, Target, Settings } from "lucide-react";
import TaskCard from "./task-card";
import BrainDump from "./brain-dump";

interface RightPanelProps {
  workspaceId: number | null;
  dueTodayTasks: any[];
  tasks: any[];
}

export default function RightPanel({ 
  workspaceId, 
  dueTodayTasks, 
  tasks 
}: RightPanelProps) {
  // Get top 3 priority tasks (priority 3 tasks first, then by due date)
  const topPriorities = tasks
    .filter(task => task.status === 'todo')
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    })
    .slice(0, 3);

  return (
    <aside className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto">
      {/* Due Today Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Due Today</h3>
          {dueTodayTasks.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {dueTodayTasks.length} items
            </Badge>
          )}
        </div>
        <div className="space-y-3">
          {dueTodayTasks.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tasks due today</p>
            </div>
          ) : (
            dueTodayTasks.map((task: any) => {
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
              return (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border ${
                    isOverdue 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-primary rounded mr-3 focus:ring-primary" 
                    />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
                      <p className={`text-xs flex items-center ${
                        isOverdue ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {isOverdue ? (
                          <>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Overdue
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            Due today
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Top 3 Priorities Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Top 3 Priorities</h3>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-3">
          {topPriorities.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No priority tasks</p>
            </div>
          ) : (
            topPriorities.map((task: any, index: number) => {
              const priorityColors = [
                'bg-primary text-white',
                'bg-secondary text-white', 
                'bg-accent text-white'
              ];
              const borderColors = [
                'border-primary/20 bg-primary/5',
                'border-secondary/20 bg-secondary/5',
                'border-accent/20 bg-accent/5'
              ];
              
              return (
                <div 
                  key={task.id}
                  className={`flex items-center p-3 border rounded-lg ${borderColors[index]}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${priorityColors[index]}`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
                    {task.project && (
                      <p className="text-xs text-gray-500">{task.project.name}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Brain Dump Section */}
      <BrainDump workspaceId={workspaceId} />
    </aside>
  );
}
