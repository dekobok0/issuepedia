import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Prompt } from "@shared/schema";

export default function ReviewQueue() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Check if user has sufficient reputation
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to access the review queue.",
        variant: "destructive",
      });
      navigate('/');
    } else if (!authLoading && user && user.reputation < 500) {
      toast({
        title: "Insufficient reputation",
        description: "You need at least 500 reputation points to access the review queue.",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [user, authLoading, navigate, toast]);

  const { data: prompts = [], isLoading, error } = useQuery<Prompt[]>({
    queryKey: ['/api/v1/reviews/queue'],
    enabled: !!user && user.reputation >= 500,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ promptId, vote }: { promptId: string; vote: 'approve' | 'reject' }) => {
      return await apiRequest('POST', '/api/v1/reviews', { promptId, vote });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/reviews/queue'] });
      toast({
        title: variables.vote === 'approve' ? "Prompt approved" : "Prompt rejected",
        description: `The prompt has been ${variables.vote === 'approve' ? 'approved' : 'rejected'}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Review failed",
        description: error.message || "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Show loading state while checking auth
  if (authLoading || !user || user.reputation < 500) {
    return null; // Will redirect in useEffect
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading review queue...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive" data-testid="text-error">
              {error instanceof Error ? error.message : "Failed to load review queue"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
          Review Queue
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Review prompts submitted by the community. Your reviews help maintain quality.
        </p>
      </div>

      {prompts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-muted-foreground" data-testid="text-empty-queue">
              No prompts pending review. Great job!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="mb-4">
            <Badge variant="outline" data-testid="badge-queue-count">
              {prompts.length} prompt{prompts.length !== 1 ? 's' : ''} pending review
            </Badge>
          </div>

          {prompts.map((prompt) => (
            <Card key={prompt.id} data-testid={`card-prompt-${prompt.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="mb-2" data-testid={`text-title-${prompt.id}`}>
                      {prompt.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary" data-testid={`badge-status-${prompt.id}`}>
                        pending review
                      </Badge>
                      <span>•</span>
                      <span data-testid={`text-author-${prompt.id}`}>
                        by {prompt.authorId}
                      </span>
                      <span>•</span>
                      <span data-testid={`text-version-${prompt.id}`}>
                        v{prompt.version}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {prompt.rationale && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Rationale</h4>
                    <p className="text-sm text-muted-foreground" data-testid={`text-rationale-${prompt.id}`}>
                      {prompt.rationale}
                    </p>
                  </div>
                )}
                
                {prompt.promptBodyText && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Prompt</h4>
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto font-mono" data-testid={`text-prompt-${prompt.id}`}>
                      {prompt.promptBodyText}
                    </pre>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex gap-2 flex-wrap">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => reviewMutation.mutate({ promptId: prompt.id, vote: 'approve' })}
                  disabled={reviewMutation.isPending}
                  data-testid={`button-approve-${prompt.id}`}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => reviewMutation.mutate({ promptId: prompt.id, vote: 'reject' })}
                  disabled={reviewMutation.isPending}
                  data-testid={`button-reject-${prompt.id}`}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/prompts/${prompt.id}`)}
                  data-testid={`button-view-${prompt.id}`}
                >
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
