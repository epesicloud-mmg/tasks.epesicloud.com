import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { GripVertical, X, Plus, Lightbulb } from "lucide-react";

interface BrainDumpProps {
  workspaceId: number | null;
}

export default function BrainDump({ workspaceId }: BrainDumpProps) {
  const [newItem, setNewItem] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch brain dump items
  const { data: brainDumpItems = [], isLoading } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/brain-dump`],
    enabled: !!workspaceId,
  });

  // Add brain dump item mutation
  const addItemMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return await apiRequest("POST", `/api/workspaces/${workspaceId}/brain-dump`, {
        text,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/brain-dump`] });
      setNewItem("");
      toast({
        title: "Item added",
        description: "Brain dump item has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add brain dump item.",
        variant: "destructive",
      });
    },
  });

  // Remove brain dump item mutation
  const removeItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return await apiRequest("DELETE", `/api/brain-dump/${itemId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/brain-dump`] });
      toast({
        title: "Item removed",
        description: "Brain dump item has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove brain dump item.",
        variant: "destructive",
      });
    },
  });

  // Clear all brain dump items mutation
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace selected");
      return await apiRequest("DELETE", `/api/workspaces/${workspaceId}/brain-dump`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/brain-dump`] });
      toast({
        title: "Brain dump cleared",
        description: "All brain dump items have been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear brain dump.",
        variant: "destructive",
      });
    },
  });

  const handleAddItem = () => {
    if (!newItem.trim() || addItemMutation.isPending) return;
    addItemMutation.mutate(newItem.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddItem();
    }
  };

  const handleRemoveItem = (itemId: number) => {
    removeItemMutation.mutate(itemId);
  };

  const handleClearAll = () => {
    if (brainDumpItems.length === 0) return;
    clearAllMutation.mutate();
  };

  const handleDragStart = (e: React.DragEvent, item: any) => {
    e.dataTransfer.setData("application/json", JSON.stringify({
      type: "brain-dump-item",
      data: item,
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Brain Dump</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleClearAll}
          disabled={brainDumpItems.length === 0 || clearAllMutation.isPending}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Clear
        </Button>
      </div>

      {/* Add new item input */}
      <div className="mb-4">
        <div className="flex">
          <Input
            type="text"
            placeholder="Quick thoughts, ideas, or tasks..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={addItemMutation.isPending}
          />
          <Button 
            className="ml-2 px-3 py-2"
            onClick={handleAddItem}
            disabled={!newItem.trim() || addItemMutation.isPending}
          >
            {addItemMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Brain dump items list */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : brainDumpItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No ideas captured yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Add quick thoughts and drag them to time slots
            </p>
          </div>
        ) : (
          brainDumpItems.map((item: any) => (
            <div
              key={item.id}
              className="flex items-center p-2 bg-gray-50 rounded-lg border border-gray-200 cursor-move hover:bg-gray-100 group transition-colors"
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
            >
              <GripVertical className="h-4 w-4 text-gray-400 mr-2 group-hover:text-gray-600" />
              <span className="flex-1 text-sm text-gray-700">{item.text}</span>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 p-1 h-auto text-gray-400 hover:text-red-500"
                onClick={() => handleRemoveItem(item.id)}
                disabled={removeItemMutation.isPending}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Instruction tip */}
      {brainDumpItems.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center text-sm text-blue-800">
            <Lightbulb className="h-4 w-4 mr-2" />
            <span>Drag items to time slots to convert to tasks</span>
          </div>
        </div>
      )}
    </div>
  );
}
