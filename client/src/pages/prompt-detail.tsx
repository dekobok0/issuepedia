import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { VoteButtons } from "@/components/vote-buttons";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { formatDistance } from "date-fns";
import { GitFork } from "lucide-react";
import type { PromptWithTechniques, Comment } from "@shared/schema";
import { canComment } from "@shared/schema";

export default function PromptDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");

  const { data: prompt, isLoading: promptLoading } = useQuery<PromptWithTechniques>({
    queryKey: ["/api/v1/prompts", id],
  });

  const { data: comments, isLoading: commentsLoading } = useQuery<Comment[]>({
    queryKey: ["/api/v1/prompts", id, "comments"],
  });

  const forkMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/v1/prompts/${id}/fork`, {});
      return await response.json();
    },
    onSuccess: (forkedPrompt: any) => {
      toast({
        title: "Prompt forked!",
        description: "You can now edit your forked version",
      });
      navigate(`/prompts/${forkedPrompt.id}/edit`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to fork prompt",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/v1/comments`, { promptId: id, content });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/prompts", id, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/prompts"] });
      setCommentText("");
      toast({
        title: "Comment posted",
        description: "Your comment has been added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to post comment",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleSubmitComment = () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to comment",
        variant: "destructive",
      });
      return;
    }

    const userReputation = user.reputation || 0;
    if (!canComment(userReputation)) {
      toast({
        title: "Insufficient reputation",
        description: `You need 50 reputation to comment (you have ${userReputation})`,
        variant: "destructive",
      });
      return;
    }

    if (!commentText.trim()) {
      toast({
        title: "Empty comment",
        description: "Please enter a comment",
        variant: "destructive",
      });
      return;
    }
    commentMutation.mutate(commentText);
  };

  if (promptLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Prompt not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Prompt Details */}
      <Card className="mb-6" data-testid={`card-prompt-detail-${id}`}>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-3xl mb-2" data-testid="text-prompt-title">
                {prompt.title}
              </CardTitle>
              <CardDescription data-testid="text-prompt-rationale">
                {prompt.rationale}
              </CardDescription>
            </div>
            <Badge
              variant={
                prompt.status === "approved"
                  ? "default"
                  : prompt.status === "pending_review"
                  ? "secondary"
                  : "outline"
              }
              data-testid="badge-status"
            >
              {prompt.status.replace("_", " ")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Prompt</h3>
            <pre className="text-sm bg-muted p-4 rounded-md overflow-x-auto font-mono" data-testid="text-prompt-body">
              {prompt.promptBodyText}
            </pre>
          </div>
          {prompt.techniques && prompt.techniques.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Techniques</h3>
              <div className="flex flex-wrap gap-2" data-testid="techniques-list">
                {prompt.techniques.map((technique) => (
                  <Badge key={technique.id} variant="outline" data-testid={`badge-technique-${technique.id}`}>
                    {technique.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-between gap-4 flex-wrap">
          <VoteButtons promptId={prompt.id} />
          <div className="flex items-center gap-3">
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => forkMutation.mutate()}
                disabled={forkMutation.isPending}
                data-testid="button-fork"
              >
                <GitFork className="h-4 w-4 mr-2" />
                {forkMutation.isPending ? "Forking..." : "Fork"}
              </Button>
            )}
            <div className="text-sm text-muted-foreground" data-testid="text-author">
              by {prompt.authorId}
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Comments Section */}
      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Comment Form */}
          {user ? (
            <>
              {canComment(user.reputation || 0) ? (
                <div className="space-y-2" data-testid="comment-form">
                  <Textarea
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    disabled={commentMutation.isPending}
                    data-testid="input-comment"
                  />
                  <Button
                    onClick={handleSubmitComment}
                    disabled={commentMutation.isPending || !commentText.trim()}
                    data-testid="button-submit-comment"
                  >
                    {commentMutation.isPending ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground" data-testid="text-reputation-required">
                  You need 50 reputation to comment (you have {user.reputation || 0})
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground" data-testid="text-login-prompt">
              Please log in to comment
            </p>
          )}

          {/* Comments List */}
          <div className="space-y-4 mt-6">
            {commentsLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ))}
              </div>
            ) : !comments || comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-comments">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="border-l-2 border-muted pl-4 py-2"
                  data-testid={`comment-${comment.id}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium" data-testid={`comment-author-${comment.id}`}>
                      {comment.authorId}
                    </span>
                    <span className="text-xs text-muted-foreground" data-testid={`comment-time-${comment.id}`}>
                      {formatDistance(new Date(comment.createdAt), new Date(), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm" data-testid={`comment-content-${comment.id}`}>
                    {comment.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
