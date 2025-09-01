import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertWorkspaceMemberSchema } from "@shared/schema";
import { z } from "zod";
import { User, Bot } from "lucide-react";

const addMemberSchema = z.object({
  name: z.string().optional(),
  memberType: z.enum(['user', 'agent']).default('user'),
  email: z.string().email("Valid email required").optional(),
  alias: z.string().optional(),
  systemPrompt: z.string().optional(),
  workspaceId: z.number(),
}).refine((data) => {
  if (data.memberType === 'user') {
    return !!data.email;
  } else {
    return !!data.name;
  }
}, {
  message: "Email is required for users, Name is required for agents",
  path: ["email"],
});

type AddMemberForm = z.infer<typeof addMemberSchema>;

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: number | null;
}

export default function AddMemberModal({
  open,
  onClose,
  workspaceId,
}: AddMemberModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AddMemberForm>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      name: "",
      memberType: "user",
      email: "",
      alias: "",
      systemPrompt: "",
      workspaceId: workspaceId || 0,
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: AddMemberForm) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return await apiRequest("POST", `/api/workspaces/${workspaceId}/members`, data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/members`] });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/invitations`] });
      
      const currentMemberType = form.getValues("memberType");
      toast({
        title: currentMemberType === 'agent' ? "Agent added" : "Invitation sent",
        description: currentMemberType === 'agent' 
          ? "The AI agent has been added to the workspace successfully."
          : "An invitation has been sent to the user's email address.",
      });
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to add member. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddMemberForm) => {
    addMemberMutation.mutate({
      ...data,
      workspaceId: workspaceId!,
    });
  };

  const memberType = form.watch("memberType");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {memberType === 'agent' ? 'Add AI Agent' : 'Invite User to Workspace'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="memberType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Member Type</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Reset fields when switching member type
                      if (value === 'agent') {
                        form.setValue('email', '');
                      } else {
                        form.setValue('name', '');
                        form.setValue('alias', '');
                        form.setValue('systemPrompt', '');
                      }
                    }}
                    value={field.value}
                    disabled={addMemberMutation.isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select member type..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user" className="flex items-center">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          User (Team Member)
                        </div>
                      </SelectItem>
                      <SelectItem value="agent" className="flex items-center">
                        <div className="flex items-center">
                          <Bot className="h-4 w-4 mr-2" />
                          AI Agent
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {memberType === 'agent' && (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter agent name..." 
                        {...field} 
                        disabled={addMemberMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {memberType === 'user' && (
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="Enter email address..." 
                        {...field} 
                        disabled={addMemberMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {memberType === 'agent' && (
              <>
                <FormField
                  control={form.control}
                  name="alias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agent Alias</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., ContentBot, CodeReviewer, ProjectAssistant..." 
                          {...field} 
                          disabled={addMemberMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="systemPrompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>System Prompt</FormLabel>
                      <FormControl>
                        <textarea 
                          className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Define the agent's role, expertise, and how it should behave..."
                          {...field} 
                          disabled={addMemberMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={addMemberMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={addMemberMutation.isPending}
              >
                {addMemberMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  `${memberType === 'agent' ? 'Add Agent' : 'Send Invitation'}`
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}