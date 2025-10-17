import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, FileText, CheckCircle } from "lucide-react";
import type { User, PromptWithStats, Review } from "@shared/schema";

export default function UserProfile() {
  const { username } = useParams();

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/v1/users", username],
  });

  const { data: prompts, isLoading: promptsLoading } = useQuery<PromptWithStats[]>({
    queryKey: ["/api/v1/prompts"],
    enabled: !!user,
    queryFn: async () => {
      const response = await fetch(`/api/v1/prompts?authorId=${user?.id}&status=`);
      if (!response.ok) throw new Error("Failed to fetch prompts");
      return response.json();
    },
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: ["/api/v1/users", user?.id, "reviews"],
    enabled: !!user,
  });

  if (userLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">User not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const approvedPrompts = prompts?.filter(p => p.status === 'approved') || [];
  const pendingPrompts = prompts?.filter(p => p.status === 'pending_review') || [];
  const approveReviews = reviews?.filter(r => r.vote === 'approve') || [];
  const rejectReviews = reviews?.filter(r => r.vote === 'reject') || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* User Profile Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl" data-testid="text-username">
                {user.username}
              </CardTitle>
              <CardDescription className="text-base mt-2">
                {user.firstName} {user.lastName}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold" data-testid="text-reputation">
                {user.reputation}
              </span>
              <span className="text-sm text-muted-foreground">reputation</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs for Prompts and Reviews */}
      <Tabs defaultValue="prompts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="prompts" data-testid="tab-prompts">
            <FileText className="h-4 w-4 mr-2" />
            Prompts ({prompts?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="reviews" data-testid="tab-reviews">
            <CheckCircle className="h-4 w-4 mr-2" />
            Reviews ({reviews?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prompts" className="mt-6">
          {promptsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full mt-2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : !prompts || prompts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground" data-testid="text-no-prompts">
                  No prompts yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {prompts.map((prompt) => (
                <Link key={prompt.id} href={`/prompts/${prompt.id}`}>
                  <Card className="hover-elevate active-elevate-2 cursor-pointer" data-testid={`card-prompt-${prompt.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-xl" data-testid={`text-prompt-title-${prompt.id}`}>
                            {prompt.title}
                          </CardTitle>
                          <CardDescription className="mt-1" data-testid={`text-prompt-rationale-${prompt.id}`}>
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
                      {prompt.techniques && prompt.techniques.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {prompt.techniques.map((technique) => (
                            <Badge key={technique.id} variant="outline" data-testid={`badge-technique-${technique.id}`}>
                              {technique.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          {reviewsLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-full mt-2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : !reviews || reviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground" data-testid="text-no-reviews">
                  No reviews yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Approved</CardTitle>
                    <div className="text-2xl font-bold text-green-600" data-testid="text-approve-count">
                      {approveReviews.length}
                    </div>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Rejected</CardTitle>
                    <div className="text-2xl font-bold text-red-600" data-testid="text-reject-count">
                      {rejectReviews.length}
                    </div>
                  </CardHeader>
                </Card>
              </div>

              {reviews.map((review) => (
                <Card key={review.id} data-testid={`card-review-${review.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={review.vote === "approve" ? "default" : "destructive"}
                            data-testid={`badge-vote-${review.id}`}
                          >
                            {review.vote}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            on prompt {review.promptId}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="text-sm mt-2" data-testid={`text-comment-${review.id}`}>
                            {review.comment}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
