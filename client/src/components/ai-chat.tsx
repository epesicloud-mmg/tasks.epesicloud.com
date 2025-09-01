import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Bot, Send, Mic, Lightbulb } from "lucide-react";

interface AiChatProps {
  workspaceId: number | null;
}

export default function AiChat({ workspaceId }: AiChatProps) {
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch chat history
  const { data: conversations = [] } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/chat`],
    enabled: !!workspaceId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return await apiRequest("POST", `/api/workspaces/${workspaceId}/chat`, {
        message: messageText,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/chat`] });
      setMessage("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!message.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(message.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedActions = [
    "📊 Show project overview",
    "⚡ Create quick task", 
    "📅 Schedule meeting",
    "💡 Get insights",
  ];

  return (
    <Card className="bg-white rounded-2xl shadow-sm border border-gray-200">
      <CardHeader>
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center text-white mr-3">
            <Bot className="h-4 w-4" />
          </div>
          <CardTitle className="text-lg font-semibold text-gray-900">AI Assistant</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chat Input Area */}
        <div className="relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask or find anything from your workspace... Try 'Show me overdue tasks' or 'Create a new project for client onboarding'"
            className="resize-none focus:ring-2 focus:ring-primary focus:border-transparent pr-20"
            rows={3}
            disabled={sendMessageMutation.isPending}
          />
          <div className="absolute bottom-3 right-3 flex space-x-2">
            <Button variant="ghost" size="sm" disabled>
              <Mic className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Suggested Actions */}
        <div className="flex flex-wrap gap-2">
          {suggestedActions.map((action, index) => (
            <Badge 
              key={index}
              variant="secondary"
              className="cursor-pointer hover:bg-gray-200 transition-colors"
              onClick={() => setMessage(action.replace(/^\S+\s/, ''))}
            >
              {action}
            </Badge>
          ))}
        </div>

        {/* Chat History */}
        <div className="border-t border-gray-100 pt-4">
          <div className="text-sm text-gray-500 mb-2">Recent conversation:</div>
          <ScrollArea className="h-48">
            <div className="space-y-3">
              {conversations.length === 0 ? (
                <div className="text-center py-4 text-gray-400">
                  <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Start a conversation with your AI assistant</p>
                </div>
              ) : (
                conversations
                  .slice()
                  .reverse()
                  .map((conv: any) => (
                    <div key={conv.id} className="space-y-2">
                      <div className="p-3 bg-gray-50 rounded-lg text-sm">
                        <strong>You:</strong> {conv.message}
                      </div>
                      {conv.response && (
                        <div className="p-3 bg-primary/5 rounded-lg text-sm">
                          <strong>AI:</strong> {conv.response}
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
