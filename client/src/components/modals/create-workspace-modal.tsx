import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, User } from "lucide-react";

interface CreateWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateWorkspaceModal({
  open,
  onClose,
}: CreateWorkspaceModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceType, setWorkspaceType] = useState("personal");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workspaceName.trim()) {
      toast({
        title: "Error",
        description: "Workspace name is required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log("Submitting workspace:", { name: workspaceName, type: workspaceType });
      
      const response = await apiRequest("POST", "/api/workspaces", {
        name: workspaceName.trim(),
        type: workspaceType,
      });
      
      console.log("Workspace created successfully:", response);
      
      await queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      
      toast({
        title: "Success",
        description: "Workspace created successfully!",
      });
      
      // Reset form and close modal
      setWorkspaceName("");
      setWorkspaceType("personal");
      onClose();
      
    } catch (error: any) {
      console.error("Failed to create workspace:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create workspace. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Workspace Name *</Label>
            <Input
              id="workspace-name"
              type="text"
              placeholder="Enter workspace name..."
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Workspace Type *</Label>
            <RadioGroup
              value={workspaceType}
              onValueChange={setWorkspaceType}
              disabled={isSubmitting}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="personal" id="personal" />
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="personal" className="font-medium cursor-pointer">
                      Personal Workspace
                    </Label>
                    <p className="text-xs text-gray-500">
                      Private workspace for individual tasks and projects
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="team" id="team" />
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center">
                    <Users className="h-4 w-4 text-secondary" />
                  </div>
                  <div>
                    <Label htmlFor="team" className="font-medium cursor-pointer">
                      Team Workspace
                    </Label>
                    <p className="text-xs text-gray-500">
                      Collaborative workspace for team projects and coordination
                    </p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Information box based on selected type */}
          <div className={`p-3 rounded-lg border ${
            workspaceType === 'personal' 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="text-sm">
              {workspaceType === 'personal' ? (
                <>
                  <strong className="text-blue-800">Personal Workspace:</strong>
                  <ul className="mt-1 text-blue-700 space-y-1">
                    <li>• Complete privacy with no sharing capabilities</li>
                    <li>• Default workspace for individual task management</li>
                    <li>• Perfect for personal organization and productivity</li>
                  </ul>
                </>
              ) : (
                <>
                  <strong className="text-green-800">Team Workspace:</strong>
                  <ul className="mt-1 text-green-700 space-y-1">
                    <li>• Collaborative environment with team members</li>
                    <li>• Shared projects and tasks coordination</li>
                    <li>• Role-based permissions and access control</li>
                  </ul>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                "Create Workspace"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
