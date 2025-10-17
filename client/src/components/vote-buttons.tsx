import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { canUpvote, canDownvote } from "@shared/schema";

interface VoteButtonsProps {
  promptId: string;
  compact?: boolean;
}

export function VoteButtons({ promptId, compact = false }: VoteButtonsProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch vote count
  const { data: voteData } = useQuery<{ upvotes: number; downvotes: number; total: number }>({
    queryKey: ["/api/v1/prompts", promptId, "votes"],
  });

  // Fetch user's vote
  const { data: userVote } = useQuery<{ voteType: string } | null>({
    queryKey: ["/api/v1/prompts", promptId, "user-vote"],
    enabled: !!user,
  });

  const voteMutation = useMutation({
    mutationFn: async (voteType: "upvote" | "downvote") => {
      const response = await apiRequest("POST", `/api/v1/votes`, { promptId, voteType });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/prompts", promptId, "votes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/prompts", promptId, "user-vote"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/prompts"] });
    },
    onError: (error: any) => {
      const errorData = error;
      toast({
        title: "Vote failed",
        description: errorData?.message || "Failed to submit vote",
        variant: "destructive",
      });
    },
  });

  const handleVote = (voteType: "upvote" | "downvote") => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to vote",
        variant: "destructive",
      });
      return;
    }

    // Check permissions
    const userReputation = user.reputation || 0;
    if (voteType === "upvote" && !canUpvote(userReputation)) {
      toast({
        title: "Insufficient reputation",
        description: `You need 15 reputation to upvote (you have ${userReputation})`,
        variant: "destructive",
      });
      return;
    }

    if (voteType === "downvote" && !canDownvote(userReputation)) {
      toast({
        title: "Insufficient reputation",
        description: `You need 125 reputation to downvote (you have ${userReputation})`,
        variant: "destructive",
      });
      return;
    }

    voteMutation.mutate(voteType);
  };

  const voteCount = voteData?.total || 0;
  const isUpvoted = userVote?.voteType === "upvote";
  const isDownvoted = userVote?.voteType === "downvote";

  const userReputation = user?.reputation || 0;
  const canUserUpvote = user && canUpvote(userReputation);
  const canUserDownvote = user && canDownvote(userReputation);

  const upvoteButton = (
    <Button
      variant={isUpvoted ? "default" : "ghost"}
      size="icon"
      onClick={() => handleVote("upvote")}
      disabled={!user || !canUserUpvote || voteMutation.isPending}
      data-testid={`button-upvote-${promptId}`}
    >
      <ArrowUp className="h-4 w-4" />
    </Button>
  );

  const downvoteButton = (
    <Button
      variant={isDownvoted ? "default" : "ghost"}
      size="icon"
      onClick={() => handleVote("downvote")}
      disabled={!user || !canUserDownvote || voteMutation.isPending}
      data-testid={`button-downvote-${promptId}`}
    >
      <ArrowDown className="h-4 w-4" />
    </Button>
  );

  return (
    <div className="flex items-center gap-1">
      {user && !canUserUpvote ? (
        <Tooltip>
          <TooltipTrigger asChild>{upvoteButton}</TooltipTrigger>
          <TooltipContent>
            <p>Requires 15 reputation (you have {userReputation})</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        upvoteButton
      )}
      <span 
        className="text-sm font-medium min-w-[2ch] text-center" 
        data-testid={`text-vote-count-${promptId}`}
      >
        {voteCount}
      </span>
      {user && !canUserDownvote ? (
        <Tooltip>
          <TooltipTrigger asChild>{downvoteButton}</TooltipTrigger>
          <TooltipContent>
            <p>Requires 125 reputation (you have {userReputation})</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        downvoteButton
      )}
    </div>
  );
}
