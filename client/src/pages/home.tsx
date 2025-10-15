import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown, MessageSquare, Plus } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { PromptWithTechniques } from "@shared/schema";

export default function Home() {
  const { data: prompts, isLoading } = useQuery<PromptWithTechniques[]>({
    queryKey: ["/api/v1/prompts"],
  });

  const { user } = useAuth();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-semibold mb-2" data-testid="text-page-title">
            Prompt Library
          </h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Discover and share effective prompt engineering techniques
          </p>
        </div>
        {user && (
          <Button asChild data-testid="button-create-prompt">
            <Link to="/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Prompt
            </Link>
          </Button>
        )}
      </div>

      {!prompts || prompts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4" data-testid="text-empty-state">
              No prompts yet. Be the first to contribute!
            </p>
            {user && (
              <Button asChild data-testid="button-create-first-prompt">
                <Link to="/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create the First Prompt
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {prompts.map((prompt) => (
            <Card key={prompt.id} className="hover-elevate" data-testid={`card-prompt-${prompt.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Link to={`/prompts/${prompt.id}`}>
                      <CardTitle className="text-xl hover:text-primary transition-colors cursor-pointer" data-testid={`text-prompt-title-${prompt.id}`}>
                        {prompt.title}
                      </CardTitle>
                    </Link>
                    <CardDescription className="mt-2" data-testid={`text-prompt-rationale-${prompt.id}`}>
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
                    data-testid={`badge-status-${prompt.id}`}
                  >
                    {prompt.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2 font-mono" data-testid={`text-prompt-body-${prompt.id}`}>
                  {prompt.promptBodyText}
                </p>
                {prompt.techniques && prompt.techniques.length > 0 && (
                  <div className="flex flex-wrap gap-2" data-testid={`techniques-list-${prompt.id}`}>
                    {prompt.techniques.map((technique) => (
                      <Badge 
                        key={technique.id} 
                        variant="outline" 
                        className="text-xs"
                        data-testid={`badge-technique-${technique.id}-${prompt.id}`}
                      >
                        {technique.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!user}
                      data-testid={`button-upvote-${prompt.id}`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[2ch] text-center" data-testid={`text-vote-count-${prompt.id}`}>
                      0
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!user}
                      data-testid={`button-downvote-${prompt.id}`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    <span data-testid={`text-comment-count-${prompt.id}`}>0</span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground" data-testid={`text-author-${prompt.id}`}>
                  by {prompt.authorId}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
