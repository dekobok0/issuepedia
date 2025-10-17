import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
      toast({
        title: "Vote failed",
        description: error.message || "Failed to submit vote",
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
    voteMutation.mutate(voteType);
  };

  const voteCount = voteData?.total || 0;
  const isUpvoted = userVote?.voteType === "upvote";
  const isDownvoted = userVote?.voteType === "downvote";

  return (
    <div className="flex items-center gap-1">
      <Button
        variant={isUpvoted ? "default" : "ghost"}
        size="icon"
        onClick={() => handleVote("upvote")}
        disabled={!user || voteMutation.isPending}
        data-testid={`button-upvote-${promptId}`}
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
      <span 
        className="text-sm font-medium min-w-[2ch] text-center" 
        data-testid={`text-vote-count-${promptId}`}
      >
        {voteCount}
      </span>
      <Button
        variant={isDownvoted ? "default" : "ghost"}
        size="icon"
        onClick={() => handleVote("downvote")}
        disabled={!user || voteMutation.isPending}
        data-testid={`button-downvote-${promptId}`}
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
