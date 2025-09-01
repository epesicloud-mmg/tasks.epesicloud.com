import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertTaskSchema } from "@shared/schema";
import { z } from "zod";

const createTaskSchema = insertTaskSchema.extend({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  projectId: z.number().optional(),
  categoryId: z.number().optional(),
  priority: z.number().min(0).max(3).default(0),
  status: z.enum(['todo', 'in_progress', 'review', 'completed']).default('todo'),
  dueDate: z.string().optional(),
  timeSlot: z.string().optional(),
  // Recurrence fields
  hasRecurrence: z.boolean().default(false),
  recurrenceType: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'custom']).optional(),
  recurrenceInterval: z.number().min(1).default(1),
  recurrenceEndType: z.enum(['never', 'after_count', 'on_date']).default('never'),
  recurrenceEndCount: z.number().min(1).optional(),
  recurrenceEndDate: z.string().optional(),
  weeklyDays: z.array(z.number()).optional(), // 0-6 for Sun-Sat
  monthlyOption: z.enum(['date', 'day']).optional(), // specific date or relative day
});

type CreateTaskForm = z.infer<typeof createTaskSchema>;

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: number | null;
  projects: any[];
  initialData?: {
    title?: string;
    description?: string;
    timeSlot?: string;
  };
}

export default function CreateTaskModal({
  open,
  onClose,
  workspaceId,
  projects,
  initialData,
}: CreateTaskModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch categories for the workspace
  const { data: categories = [] } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/categories`],
    enabled: !!workspaceId && open,
  });

  // Fetch workspace members
  const { data: members = [] } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/members`],
    enabled: !!workspaceId && open,
  });

  const form = useForm<CreateTaskForm>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      priority: 0,
      status: "todo",
      timeSlot: initialData?.timeSlot || "",
      workspaceId: workspaceId || 0,
      hasRecurrence: false,
      recurrenceType: "daily",
      recurrenceInterval: 1,
      recurrenceEndType: "never",
      weeklyDays: [],
      monthlyOption: "date",
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: CreateTaskForm) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return await apiRequest("POST", `/api/workspaces/${workspaceId}/tasks`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/tasks`] });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/tasks/due-today`] });
      toast({
        title: "Task created",
        description: "Your task has been created successfully.",
      });
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateTaskForm) => {
    createTaskMutation.mutate({
      ...data,
      workspaceId: workspaceId!,
    });
  };

  const timeSlotOptions = [
    { value: "06:00", label: "06:00 - 07:00" },
    { value: "07:00", label: "07:00 - 08:00" },
    { value: "08:00", label: "08:00 - 09:00" },
    { value: "09:00", label: "09:00 - 10:00" },
    { value: "10:00", label: "10:00 - 11:00" },
    { value: "11:00", label: "11:00 - 12:00" },
    { value: "12:00", label: "12:00 - 13:00" },
    { value: "13:00", label: "13:00 - 14:00" },
    { value: "14:00", label: "14:00 - 15:00" },
    { value: "15:00", label: "15:00 - 16:00" },
    { value: "16:00", label: "16:00 - 17:00" },
    { value: "17:00", label: "17:00 - 18:00" },
    { value: "18:00", label: "18:00 - 19:00" },
    { value: "19:00", label: "19:00 - 20:00" },
    { value: "20:00", label: "20:00 - 21:00" },
    { value: "21:00", label: "21:00 - 22:00" },
    { value: "22:00", label: "22:00 - 23:00" },
  ];

  const priorityOptions = [
    { value: 0, label: "No Priority" },
    { value: 1, label: "Low Priority" },
    { value: 2, label: "Medium Priority" },
    { value: 3, label: "High Priority" },
  ];

  const statusOptions = [
    { value: "todo", label: "Backlog" },
    { value: "in_progress", label: "Doing" },
    { value: "review", label: "Review" },
    { value: "completed", label: "Done" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter task title..." 
                      {...field} 
                      disabled={createTaskMutation.isPending}
                    />
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
                      placeholder="Enter task description..."
                      rows={3}
                      {...field}
                      disabled={createTaskMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                      value={field.value?.toString() || "none"}
                      disabled={createTaskMutation.isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project..." />
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
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                      value={field.value?.toString() || "none"}
                      disabled={createTaskMutation.isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Category</SelectItem>
                        {categories.map((category: any) => (
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                      disabled={createTaskMutation.isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value)}
                      value={field.value}
                      disabled={createTaskMutation.isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
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
                name="assignedMemberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                      value={field.value?.toString() || "none"}
                      disabled={createTaskMutation.isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select member..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {members.map((member: any) => (
                          <SelectItem key={member.id} value={member.id.toString()}>
                            {member.name} {member.memberType === 'agent' ? '🤖' : '👤'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div></div> {/* Empty grid cell for spacing */}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        disabled={createTaskMutation.isPending}
                      />
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
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                      value={field.value || "none"}
                      disabled={createTaskMutation.isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time slot..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Time Slot</SelectItem>
                        {timeSlotOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Task Recurrence Section */}
            <div className="space-y-4 border-t pt-4">
              <FormField
                control={form.control}
                name="hasRecurrence"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={createTaskMutation.isPending}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Task Repeats</FormLabel>
                      <p className="text-[0.8rem] text-muted-foreground">
                        Create recurring task instances based on schedule
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch("hasRecurrence") && (
                <div className="space-y-4 pl-6 border-l-2 border-muted">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="recurrenceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Repeat Pattern</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || "daily"}
                            disabled={createTaskMutation.isPending}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select pattern..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="recurrenceInterval"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Every</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              disabled={createTaskMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {form.watch("recurrenceType") === "weekly" && (
                    <div className="space-y-2">
                      <Label>Repeat On</Label>
                      <div className="flex flex-wrap gap-2">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
                          <div key={day} className="flex items-center space-x-2">
                            <Checkbox
                              id={`day-${index}`}
                              checked={form.watch("weeklyDays")?.includes(index) || false}
                              onCheckedChange={(checked) => {
                                const currentDays = form.watch("weeklyDays") || [];
                                if (checked) {
                                  form.setValue("weeklyDays", [...currentDays, index]);
                                } else {
                                  form.setValue("weeklyDays", currentDays.filter(d => d !== index));
                                }
                              }}
                              disabled={createTaskMutation.isPending}
                            />
                            <Label htmlFor={`day-${index}`} className="text-sm">{day}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="recurrenceEndType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Condition</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || "never"}
                            disabled={createTaskMutation.isPending}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select end condition..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="never">Never</SelectItem>
                              <SelectItem value="after_count">After X occurrences</SelectItem>
                              <SelectItem value="on_date">On specific date</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("recurrenceEndType") === "after_count" && (
                      <FormField
                        control={form.control}
                        name="recurrenceEndCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Occurrences</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="10"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                disabled={createTaskMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {form.watch("recurrenceEndType") === "on_date" && (
                      <FormField
                        control={form.control}
                        name="recurrenceEndDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                disabled={createTaskMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={createTaskMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTaskMutation.isPending}
              >
                {createTaskMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  "Create Task"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
