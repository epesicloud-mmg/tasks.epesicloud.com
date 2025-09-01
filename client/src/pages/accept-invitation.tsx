import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, Loader2, Users } from "lucide-react";

export default function AcceptInvitation() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Get token from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      setInvitationId(token);
    }
  }, []);

  const acceptMutation = useMutation({
    mutationFn: async (token: string) => {
      setIsProcessing(true);
      try {
        const response = await apiRequest(`/api/invitations/${token}/accept`, {
          method: 'POST'
        });
        return response;
      } catch (error) {
        setIsProcessing(false);
        throw error;
      }
    },
    onSuccess: (data) => {
      setWorkspaceName(data.workspaceName || "workspace");
      toast({
        title: "Welcome to the team!",
        description: `You've successfully joined the ${data.workspaceName} workspace.`,
      });
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        setLocation('/');
      }, 2000);
    },
    onError: (error: any) => {
      setIsProcessing(false);
      if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
        toast({
          title: "Login Required",
          description: "Please log in to accept this invitation.",
          variant: "destructive",
        });
        // Redirect to login
        setTimeout(() => {
          window.location.href = '/api/login';
        }, 1500);
      } else {
        toast({
          title: "Invitation Failed",
          description: error.message || "Failed to accept invitation. The link may be expired or invalid.",
          variant: "destructive",
        });
      }
    },
  });

  const handleAcceptInvitation = () => {
    if (invitationId) {
      acceptMutation.mutate(invitationId);
    }
  };

  if (!invitationId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Invalid Invitation Link
            </CardTitle>
            <CardDescription>
              The invitation link appears to be invalid or incomplete. Please check the URL and try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (acceptMutation.isSuccess || isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              {isProcessing ? "Processing..." : `Welcome to ${workspaceName}!`}
            </CardTitle>
            <CardDescription>
              {isProcessing 
                ? "Processing your invitation..." 
                : "You've successfully joined the workspace. Redirecting to dashboard..."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle>Join Workspace</CardTitle>
          <CardDescription>
            You've been invited to collaborate on a workspace. Accept the invitation to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleAcceptInvitation}
            disabled={acceptMutation.isPending}
            className="w-full"
            size="lg"
          >
            {acceptMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining Workspace...
              </>
            ) : (
              "Accept Invitation"
            )}
          </Button>
          
          {acceptMutation.isError && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
              {acceptMutation.error?.message || "Failed to accept invitation"}
            </div>
          )}
          
          <Button 
            variant="outline" 
            onClick={() => setLocation('/')} 
            className="w-full"
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}