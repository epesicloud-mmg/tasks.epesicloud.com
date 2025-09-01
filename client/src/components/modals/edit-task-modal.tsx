import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const editTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "completed"]),
  priority: z.number().min(1).max(3),
  dueDate: z.string().optional(),
  timeSlot: z.string().optional(),
  projectId: z.number().optional(),
  categoryId: z.number().optional(),
  assignedMemberId: z.number().optional(),
  // Recurrence fields
  repeatTask: z.boolean().optional(),
  recurrenceType: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]).optional(),
  interval: z.number().min(1).optional(),
  endType: z.enum(["never", "after_count", "on_date"]).optional(),
  endCount: z.number().min(1).optional(),
  endDate: z.string().optional(),
  weeklyDays: z.array(z.number()).optional(),
  monthlyOption: z.enum(["date", "day"]).optional(),
});

type EditTaskForm = z.infer<typeof editTaskSchema>;

interface EditTaskModalProps {
  open: boolean;
  onClose: () => void;
  task: any;
  workspaceId: number | null;
  projects: any[];
  categories: any[];
  members: any[];
}

export default function EditTaskModal({
  open,
  onClose,
  task,
  workspaceId,
  projects,
  categories,
  members,
}: EditTaskModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [repeatTask, setRepeatTask] = useState(false);

  const form = useForm<EditTaskForm>({
    resolver: zodResolver(editTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: 2,
      dueDate: "",
      timeSlot: "",
      projectId: undefined,
      categoryId: undefined,
      assignedMemberId: undefined,
      repeatTask: false,
      recurrenceType: "daily",
      interval: 1,
      endType: "never",
      endCount: 1,
      endDate: "",
      weeklyDays: [],
      monthlyOption: "date",
    },
  });

  // Update form when task changes
  useEffect(() => {
    if (task && open) {
      form.reset({
        title: task.title || "",
        description: task.description || "",
        status: task.status || "todo",
        priority: task.priority || 2,
        dueDate: task.dueDate || "",
        timeSlot: task.timeSlot || "",
        projectId: task.projectId || undefined,
        categoryId: task.categoryId || undefined,
        assignedMemberId: task.assignedMemberId || undefined,
      });
    }
  }, [task, open, form]);

  const updateTaskMutation = useMutation({
    mutationFn: async (data: EditTaskForm) => {
      return await apiRequest("PATCH", `/api/tasks/${task.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/tasks`] });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      onClose();
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditTaskForm) => {
    updateTaskMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter task title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter task description"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">Low</SelectItem>
                        <SelectItem value="2">Medium</SelectItem>
                        <SelectItem value="3">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeSlot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Slot</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="06:00">06:00 - 07:00</SelectItem>
                        <SelectItem value="07:00">07:00 - 08:00</SelectItem>
                        <SelectItem value="08:00">08:00 - 09:00</SelectItem>
                        <SelectItem value="09:00">09:00 - 10:00</SelectItem>
                        <SelectItem value="10:00">10:00 - 11:00</SelectItem>
                        <SelectItem value="11:00">11:00 - 12:00</SelectItem>
                        <SelectItem value="12:00">12:00 - 13:00</SelectItem>
                        <SelectItem value="13:00">13:00 - 14:00</SelectItem>
                        <SelectItem value="14:00">14:00 - 15:00</SelectItem>
                        <SelectItem value="15:00">15:00 - 16:00</SelectItem>
                        <SelectItem value="16:00">16:00 - 17:00</SelectItem>
                        <SelectItem value="17:00">17:00 - 18:00</SelectItem>
                        <SelectItem value="18:00">18:00 - 19:00</SelectItem>
                        <SelectItem value="19:00">19:00 - 20:00</SelectItem>
                        <SelectItem value="20:00">20:00 - 21:00</SelectItem>
                        <SelectItem value="21:00">21:00 - 22:00</SelectItem>
                        <SelectItem value="22:00">22:00 - 23:00</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))} defaultValue={field.value?.toString() || "none"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No Project</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))} defaultValue={field.value?.toString() || "none"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No Category</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignedMemberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))} defaultValue={field.value?.toString() || "none"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateTaskMutation.isPending}>
                {updateTaskMutation.isPending ? "Updating..." : "Update Task"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}